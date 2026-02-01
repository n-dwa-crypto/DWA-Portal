import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { IntelligenceData } from '../components/Dashboard';
import { RecordType } from '../types';

const DEFAULT_URL = 'https://kfinarzxfnzllyaywwqh.supabase.co';
const DEFAULT_ANON_KEY = 'sb_publishable_si1K_mlQyiCL4Gze_HymDw_IdhkoHYA';

export interface CloudRecord {
  id: string;
  type: RecordType;
  content: string;
  intelligence: IntelligenceData | null;
  created_at: string;
}

export type DbHealthStatus = 'checking' | 'ready' | 'missing_table' | 'unauthorized' | 'error';

class SupabaseService {
  private publicClient: SupabaseClient;

  constructor() {
    this.publicClient = createClient(DEFAULT_URL, DEFAULT_ANON_KEY);
  }

  private getAdminClient(dbKey: string) {
    return createClient(DEFAULT_URL, dbKey);
  }

  public async checkHealth(dbKey?: string): Promise<DbHealthStatus> {
    const client = dbKey ? this.getAdminClient(dbKey) : this.publicClient;
    try {
      // Fix: Destructure 'status' from the response as it is not a property of PostgrestError
      const { error, status } = await client.from('dwa_records').select('id').limit(1);
      if (!error) return 'ready';
      if (error.code === '42P01' || error.message?.includes('does not exist')) return 'missing_table';
      // Fix: Check status from the response object instead of error.status
      if (error.code === '42501' || status === 401 || status === 403) return 'unauthorized';
      return 'error';
    } catch (e) {
      return 'error';
    }
  }

  public async getLatestIntelligence(): Promise<CloudRecord | null> {
    try {
      const { data, error } = await this.publicClient
        .from('dwa_records')
        .select('*')
        .eq('type', RecordType.NEWS)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) return null;
      return data;
    } catch (e) {
      return null;
    }
  }

  public async getAllRecords(): Promise<CloudRecord[]> {
    try {
      const { data, error } = await this.publicClient
        .from('dwa_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) return [];
      return data || [];
    } catch (e) {
      return [];
    }
  }

  public async saveRecord(
    type: RecordType, 
    content: string, 
    intelligence: IntelligenceData | null, 
    dbKey: string
  ): Promise<{success: boolean, error?: string}> {
    if (!dbKey) return { success: false, error: 'Missing API Key' };
    
    try {
      const adminClient = this.getAdminClient(dbKey);
      const { error } = await adminClient
        .from('dwa_records')
        .insert([{ type, content, intelligence }]);

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}

export const supabaseService = new SupabaseService();