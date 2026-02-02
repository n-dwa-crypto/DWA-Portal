
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { dbService } from './services/mockDb';
import { supabaseService, CloudRecord, DbHealthStatus } from './services/supabase';
import { ConnectionStatus, DbRecord, RecordType, SystemStats } from './types';
import { DbStatus } from './components/DbStatus';
import { ActionWidget } from './components/ActionWidget';
import { Feed } from './components/Feed';
import { Dashboard, IntelligenceData } from './components/Dashboard';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  LayoutDashboard, 
  History, 
  Menu, 
  X, 
  Home, 
  RefreshCw, 
  Cpu,
  Key,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ShieldOff,
  CloudLightning,
  Database,
  Terminal,
  Copy,
  AlertTriangle,
  Lock,
  Heart
} from 'lucide-react';

const App: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [dbHealth, setDbHealth] = useState<DbHealthStatus>('checking');
  const [stats, setStats] = useState<SystemStats>({ totalNews: 0, totalSanctions: 0, lastSync: null });
  const [records, setRecords] = useState<DbRecord[]>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  
  const [isAdmin, setIsAdmin] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('user') === 'admin';
    } catch (e) { return false; }
  });

  const [dbKey, setDbKey] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const keyParam = params.get('dbkey');
      if (keyParam && keyParam.trim() !== '') return keyParam.trim();
      return localStorage.getItem('dwa_supabase_db_key') || '';
    } catch (e) { return ''; }
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'portal' | 'history'>('dashboard');

  const toggleAdmin = () => {
    const newAdminState = !isAdmin;
    setIsAdmin(newAdminState);
    try {
      const url = new URL(window.location.href);
      if (newAdminState) url.searchParams.set('user', 'admin');
      else {
        url.searchParams.delete('user');
        // Reset tab to dashboard if admin is deactivated on a restricted tab
        if (activeTab === 'portal' || activeTab === 'history') {
          setActiveTab('dashboard');
        }
      }
      window.history.pushState({}, '', url);
    } catch (e) {}
  };

  const [showDbKey, setShowDbKey] = useState(false);
  const [dbKeySaved, setDbKeySaved] = useState(false);

  const checkDbReady = useCallback(async (currentKey?: string) => {
    const keyToUse = currentKey !== undefined ? currentKey : dbKey;
    const status = await supabaseService.checkHealth(keyToUse);
    setDbHealth(status);
    return status === 'ready';
  }, [dbKey]);

  const refreshData = useCallback(async () => {
    setIsLoadingFeed(true);
    try {
      const localData = await dbService.fetchRecords();
      const cloudData = await supabaseService.getAllRecords();
      
      const mappedCloud: DbRecord[] = cloudData.map(c => ({
        id: c.id,
        type: c.type,
        content: c.content,
        timestamp: new Date(c.created_at).getTime(),
        synced: true,
        intelligence: c.intelligence
      }));

      const combined = [...mappedCloud, ...localData].sort((a, b) => b.timestamp - a.timestamp);
      
      setRecords(combined);
      setStats({
        totalNews: combined.filter(r => r.type === RecordType.NEWS).length,
        totalSanctions: combined.filter(r => r.type === RecordType.SANCTION).length,
        lastSync: Date.now()
      });
      
      await checkDbReady();
    } catch (e) {
      console.error("Refresh data failed:", e);
    } finally {
      setIsLoadingFeed(false);
    }
  }, [checkDbReady]);

  const handlePromoteRecord = async (id: string) => {
    await dbService.promoteRecord(id);
    await refreshData();
  };

  // generateIntelligence updated to strictly use process.env.API_KEY as per guidelines
  const generateIntelligence = async (content: string): Promise<IntelligenceData | null> => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return null;
    try {
      // Always initialize the client with the named apiKey parameter
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Analyze this news for entity risks and crypto correlations: "${content}". Focus on BTC, ETH, SOL, TRUMP. 

REQUIREMENTS:
1. Output STRICT JSON.
2. Provide at least 3 Strategic Directives in the intelligence.recommendations array.
3. Ensure at least one directive is HIGH priority, at least one is MEDIUM priority, and at least one is LOW priority.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              correlations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    entity_name: { type: Type.STRING },
                    correlation_type: { type: Type.STRING },
                    confidence: { type: Type.STRING },
                    related_cryptos: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          symbol: { type: Type.STRING },
                          name: { type: Type.STRING },
                          correlation_strength: { type: Type.NUMBER }
                        }
                      }
                    },
                    risk_level: { type: Type.STRING }
                  }
                }
              },
              intelligence: {
                type: Type.OBJECT,
                properties: {
                  total_correlations: { type: Type.NUMBER },
                  high_risk: { type: Type.NUMBER },
                  medium_risk: { type: Type.NUMBER },
                  recommendations: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        priority: { type: Type.STRING, description: "Must be HIGH, MEDIUM, or LOW" },
                        action: { type: Type.STRING },
                        description: { type: Type.STRING },
                        assigned_to: { type: Type.STRING }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });
      // Extract generated text using the .text property
      return JSON.parse(response.text || '{}');
    } catch (e) {
      console.error("AI intelligence generation failed:", e);
      return null;
    }
  };

  const handleAddRecord = async (type: RecordType, content: string) => {
    try {
      await dbService.addRecord(type, content);
      
      if (isAdmin && dbKey) {
        setIsCloudSyncing(true);
        let intel = null;
        if (type === RecordType.NEWS) {
          intel = await generateIntelligence(content);
        }
        
        const result = await supabaseService.saveRecord(type, content, intel, dbKey);
        
        if (!result.success && result.error?.includes('does not exist')) {
           setDbHealth('missing_table');
           alert("CLOUD SYNC FAILED: The database table 'dwa_records' is not initialized.");
        }
        setIsCloudSyncing(false);
      }
      
      await refreshData();
    } catch (err) {
      console.error("Add record failed:", err);
      setIsCloudSyncing(false);
    }
  };

  const handleCopySql = () => {
    const sql = `CREATE TABLE dwa_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL, -- 'NEWS', 'SANCTION', or 'THANK_YOU'
  content text NOT NULL,
  intelligence jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE dwa_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON dwa_records FOR SELECT USING (true);
CREATE POLICY "Allow admin write" ON dwa_records FOR INSERT WITH CHECK (true);`;
    try {
      navigator.clipboard.writeText(sql);
      alert("SQL Schema copied to clipboard!");
    } catch (e) {}
  };

  const handleSaveDbKey = () => {
    try {
      localStorage.setItem('dwa_supabase_db_key', dbKey);
      setDbKeySaved(true);
      checkDbReady(dbKey);
      setTimeout(() => setDbKeySaved(false), 3000);
    } catch (e) {}
  };

  useEffect(() => {
    const unsubscribe = dbService.subscribeToStatus((status) => {
      setConnectionStatus(status);
      if (status === ConnectionStatus.CONNECTED) refreshData();
    });
    return () => unsubscribe();
  }, [refreshData]);

  useEffect(() => {
    const autoRefreshInterval = setInterval(() => {
      if (connectionStatus === ConnectionStatus.CONNECTED) {
        refreshData();
      }
    }, 60000);
    return () => clearInterval(autoRefreshInterval);
  }, [connectionStatus, refreshData]);

  const LogoImage = () => (
    <img 
      src="https://assets.zyrosite.com/cdn-cgi/image/format=auto,w=375,h=146,fit=crop/mP4MZ3DvE9fbN33K/dwa-logo---original-size-AGBbqzN3p1TJKPJO.png"
      alt="DWA"
      className="h-10 w-auto object-contain"
    />
  );

  return (
    <div className="min-h-screen text-slate-100 font-sans flex flex-col md:flex-row relative z-10">
      <nav className={`
        fixed md:relative inset-0 z-40 md:w-72 md:bg-black/10 md:backdrop-blur-xl md:border-r md:border-white/5
        bg-black/80 backdrop-blur-xl transform transition-transform duration-500 flex flex-col
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-8 hidden md:flex items-center gap-4 mb-4">
            <LogoImage />
        </div>
        <div className="flex-1 px-6 space-y-3 mt-20 md:mt-4">
          <button onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group ${activeTab === 'dashboard' ? 'bg-white/10 text-white ring-1 ring-white/10' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
            <Home size={22} className={activeTab === 'dashboard' ? 'text-teal-400' : 'group-hover:text-teal-300'} />
            <span className="font-medium text-lg">Dashboard</span>
          </button>
          
          {isAdmin && (
            <>
              <button onClick={() => { setActiveTab('portal'); setMobileMenuOpen(false); }} className={`w-full flex items-center justify-between gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group ${activeTab === 'portal' ? 'bg-white/10 text-white ring-1 ring-white/10' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                <div className="flex items-center gap-4">
                  <LayoutDashboard size={22} className={activeTab === 'portal' ? 'text-blue-400' : 'group-hover:text-blue-300'} />
                  <span className="font-medium text-lg">Admin Portal</span>
                </div>
              </button>

              <button onClick={() => { setActiveTab('history'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group ${activeTab === 'history' ? 'bg-white/10 text-white ring-1 ring-white/10' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                <History size={22} className={activeTab === 'history' ? 'text-purple-400' : 'group-hover:text-purple-300'} />
                <span className="font-medium text-lg">Audit Log</span>
              </button>
            </>
          )}
        </div>
        
        <div className="p-6 space-y-3">
           <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                 <Cpu size={12} /> System Status
              </div>
              <div className="flex items-center gap-2">
                 <div className={`w-2 h-2 rounded-full ${dbHealth === 'ready' ? 'bg-emerald-500' : dbHealth === 'missing_table' ? 'bg-rose-500 animate-pulse' : 'bg-slate-500'}`}></div>
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                   {dbHealth === 'ready' ? 'Unified Node Active' : dbHealth === 'missing_table' ? 'Schema Update Req.' : 'Sync Offline'}
                 </span>
              </div>
           </div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col h-full md:h-screen overflow-hidden">
        <header className="hidden md:flex items-center justify-between px-10 py-6">
           <div>
             <h2 className="text-3xl font-bold text-white tracking-tight">
               {activeTab === 'portal' ? 'Admin Portal' : activeTab === 'history' ? 'Audit Log' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
             </h2>
             <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.3em] mt-1 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]">DWA Enterprise Terminal</p>
           </div>
           <div className="flex items-center gap-4">
              {isCloudSyncing && (
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full animate-pulse">
                   <CloudLightning size={14} />
                   <span className="text-[10px] font-black uppercase tracking-widest">Global Broadcast...</span>
                </div>
              )}
              <DbStatus status={connectionStatus} lastSync={stats.lastSync} />
           </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-10 scroll-smooth custom-scrollbar">
          {/* Fix: Removed unused userApiKey prop to resolve TypeScript error */}
          {activeTab === 'dashboard' && <Dashboard userRecords={records} onPromoteRecord={handlePromoteRecord} />}

          {activeTab === 'portal' && isAdmin && (
            <div className="max-w-7xl mx-auto space-y-10 pb-20">
              <div className={`rounded-[40px] p-1 border transition-all duration-700 ${dbHealth === 'ready' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20 shadow-[0_0_50px_rgba(244,63,94,0.1)]'}`}>
                <div className="bg-black/60 backdrop-blur-3xl p-10 rounded-[38px] flex flex-col lg:flex-row gap-10 items-start">
                    <div className="lg:w-1/3">
                      <div className="flex items-center gap-4 mb-6">
                          <div className={`p-4 rounded-2xl ${dbHealth === 'ready' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'} ring-1 ring-white/10`}>
                            <Terminal size={32} />
                          </div>
                          <div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-tight">Unified Node</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Status: {dbHealth.replace('_', ' ')}</p>
                          </div>
                      </div>
                      <p className="text-sm text-slate-400 font-medium leading-relaxed mb-6">
                          {dbHealth === 'ready' 
                            ? 'Your unified cloud record node is operational. Intelligence and Sanctions are synced globally.' 
                            : 'The legacy intelligence table is being replaced by the Unified Records Blueprint. Update your schema below.'}
                      </p>
                      <button onClick={refreshData} className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10 transition-all">
                          <RefreshCw size={14} /> Re-verify Node
                      </button>
                    </div>

                    <div className="lg:w-2/3 w-full">
                      {dbHealth === 'ready' ? (
                        <div className="h-full min-h-[150px] flex flex-col items-center justify-center bg-emerald-500/5 rounded-3xl border border-emerald-500/20">
                            <CheckCircle2 size={48} className="text-emerald-400 mb-4" />
                            <span className="text-[11px] font-black text-emerald-400 uppercase tracking-[0.3em]">Master Schema Online</span>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <AlertTriangle size={12} className="text-rose-500" /> Unified Blueprint Required
                              </span>
                              <button onClick={handleCopySql} className="text-[10px] font-black text-blue-400 hover:text-white flex items-center gap-2 transition-colors">
                                <Copy size={12} /> Copy Master SQL
                              </button>
                          </div>
                          <div className="bg-black/80 rounded-2xl p-6 border border-white/5 font-mono text-xs text-slate-400 overflow-x-auto shadow-inner h-[180px]">
                              <pre className="whitespace-pre">
{`CREATE TABLE dwa_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL, -- NEWS, SANCTION, or THANK_YOU
  content text NOT NULL,
  intelligence jsonb,
  created_at timestamptz DEFAULT now()
);

-- Master Access Policies
ALTER TABLE dwa_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read" ON dwa_records FOR SELECT USING (true);
CREATE POLICY "Admin Write" ON dwa_records FOR INSERT WITH CHECK (true);`}
                              </pre>
                          </div>
                          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center gap-4">
                              <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                                <AlertCircle size={16} />
                              </div>
                              <p className="text-[10px] font-bold text-blue-300 uppercase tracking-wide leading-relaxed">
                                Paste this script into your <span className="text-white">Supabase SQL Editor</span> to migrate to the master record system.
                              </p>
                          </div>
                        </div>
                      )}
                    </div>
                </div>
              </div>

              <div className="max-w-2xl mx-auto w-full">
                {/* Node Sync Card - Removed manual Gemini API Key management card as per guidelines */}
                <div className="bg-white/5 backdrop-blur-3xl rounded-[40px] border border-white/10 p-1 shadow-2xl overflow-hidden group hover:border-emerald-500/30 transition-all">
                  <div className="bg-black/40 p-10 rounded-[38px] h-full flex flex-col">
                    <div className="flex items-center gap-5 mb-10">
                        <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-400 ring-1 ring-white/10">
                            <Database size={32} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-tight">Node Sync</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1 opacity-70">Secret Data Access</p>
                        </div>
                    </div>
                    <div className="space-y-6 flex-1 flex flex-col justify-between">
                        <div className="relative">
                            <input 
                                type={showDbKey ? "text" : "password"}
                                value={dbKey}
                                onChange={(e) => setDbKey(e.target.value)}
                                placeholder="Supabase Secret Key (Service Role)..."
                                className="w-full bg-black/40 border border-white/5 rounded-[24px] py-5 pl-8 pr-16 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 placeholder:text-slate-700 transition-all"
                            />
                            <button onClick={() => setShowDbKey(!showDbKey)} className="absolute right-6 top-1/2 -translate-y-1/2 p-2 text-slate-600 hover:text-white transition-colors">
                                {showDbKey ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                        <button onClick={handleSaveDbKey} className={`w-full py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${dbKeySaved ? 'bg-emerald-500 text-white' : 'bg-white/5 hover:bg-white/10 border border-white/10 text-white'}`}>
                            {dbKeySaved ? <CheckCircle2 size={16} /> : <Lock size={16} />}
                            {dbKeySaved ? 'Node Linked' : 'Apply Secret Key'}
                        </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <ActionWidget 
                  type={RecordType.NEWS}
                  title="Add Crypto News"
                  description="Publish market intelligence."
                  onSubmit={(content) => handleAddRecord(RecordType.NEWS, content)}
                />
                <ActionWidget 
                  type={RecordType.SANCTION}
                  title="Add Sanction"
                  description="Register entity compliance risks."
                  onSubmit={(content) => handleAddRecord(RecordType.SANCTION, content)}
                />
                <ActionWidget 
                  type={RecordType.THANK_YOU}
                  title="Add Appreciation"
                  description="Post community thank you note."
                  onSubmit={(content) => handleAddRecord(RecordType.THANK_YOU, content)}
                />
              </div>
            </div>
          )}

          {activeTab === 'history' && isAdmin && (
            <div className="max-w-5xl mx-auto pb-20">
               <div className="mb-8 flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-white tracking-tight">Audit Log</h3>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">Immutable Global Broadcast Trail</p>
                    </div>
                    <button onClick={refreshData} className="text-[10px] font-black uppercase tracking-widest px-6 py-2.5 bg-white/5 rounded-full border border-white/10 hover:bg-white/10 transition-colors flex items-center gap-2">
                       <RefreshCw size={14} /> Re-sync
                    </button>
               </div>
               <Feed items={records} loading={isLoadingFeed} />
            </div>
          )}

          {(activeTab === 'portal' || activeTab === 'history') && !isAdmin && (
             <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500">
                <AlertCircle size={48} className="mb-4 opacity-20" />
                <h3 className="text-xl font-bold text-white uppercase tracking-widest">Access Restricted</h3>
                <p className="text-sm font-medium opacity-60">Admin privileges required for this module.</p>
                <button onClick={toggleAdmin} className="mt-6 px-8 py-3 bg-white/10 hover:bg-white/20 rounded-full text-[11px] font-black uppercase tracking-widest text-white transition-all border border-white/10">
                  Enable Simulated Admin Mode
                </button>
             </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
