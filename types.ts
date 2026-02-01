
export enum RecordType {
  NEWS = 'NEWS',
  SANCTION = 'SANCTION',
  THANK_YOU = 'THANK_YOU'
}

export interface DbRecord {
  id: string;
  type: RecordType;
  content: string;
  timestamp: number;
  synced: boolean;
  intelligence?: any; // Added to support cloud-synced AI analysis
}

export enum ConnectionStatus {
  CONNECTED = 'CONNECTED',
  CONNECTING = 'CONNECTING',
  DISCONNECTED = 'DISCONNECTED',
  ERROR = 'ERROR'
}

export interface SystemStats {
  totalNews: number;
  totalSanctions: number;
  lastSync: number | null;
}