
import React, { useEffect, useState, useCallback } from 'react';
import { dbService } from './services/mockDb';
import { ConnectionStatus, DbRecord, RecordType, SystemStats } from './types';
import { DbStatus } from './components/DbStatus';
import { ActionWidget } from './components/ActionWidget';
import { Feed } from './components/Feed';
import { Dashboard } from './components/Dashboard';
import { 
  LayoutDashboard, 
  History, 
  Menu, 
  X, 
  Home, 
  RefreshCw, 
  Cpu,
  Lock,
  Key,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Chrome
} from 'lucide-react';

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    aistudio?: AIStudio;
  }
}

const App: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [stats, setStats] = useState<SystemStats>({ totalNews: 0, totalSanctions: 0, lastSync: null });
  const [records, setRecords] = useState<DbRecord[]>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // API Key Management
  const [userApiKey, setUserApiKey] = useState<string>(localStorage.getItem('dwa_user_api_key') || '');
  const [showKey, setShowKey] = useState(false);
  const [keySaved, setKeySaved] = useState(false);
  const [hasGoogleKey, setHasGoogleKey] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'portal' | 'history'>('dashboard');

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        try {
          const hasKey = await window.aistudio.hasSelectedApiKey();
          setHasGoogleKey(hasKey);
        } catch (e) {
          console.debug("Optional key check failed");
        }
      }
    };
    checkKey();
  }, []);

  const handleLinkGoogle = async () => {
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        setHasGoogleKey(true);
        setErrorMessage(null);
      } catch (err) {
        console.error("Failed to open key selector", err);
      }
    }
  };

  const handleSaveKey = () => {
    localStorage.setItem('dwa_user_api_key', userApiKey);
    setKeySaved(true);
    setErrorMessage(null);
    setTimeout(() => setKeySaved(false), 3000);
  };

  const refreshData = useCallback(async () => {
    setIsLoadingFeed(true);
    try {
      const data = await dbService.fetchRecords();
      setRecords(data);
      setStats(dbService.getStats());
    } finally {
      setIsLoadingFeed(false);
    }
  }, []);

  const handleAddRecord = async (type: RecordType, content: string) => {
    try {
      await dbService.addRecord(type, content);
      await refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const unsubscribe = dbService.subscribeToStatus((status) => {
      setConnectionStatus(status);
      if (status === ConnectionStatus.CONNECTED) {
        refreshData();
      }
    });
    return () => unsubscribe();
  }, [refreshData]);

  const LogoImage = () => (
    <img 
      src="https://assets.zyrosite.com/cdn-cgi/image/format=auto,w=375,h=146,fit=crop/mP4MZ3DvE9fbN33K/dwa-logo---original-size-AGBbqzN3p1TJKPJO.png"
      alt="DWA"
      className="h-10 w-auto object-contain"
    />
  );

  return (
    <div className="min-h-screen text-slate-100 font-sans flex flex-col md:flex-row relative z-10">
      
      <div className="md:hidden flex items-center justify-between p-4 bg-black/40 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
        <LogoImage />
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-slate-300 hover:text-white transition-colors">
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

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
          <button onClick={() => { setActiveTab('portal'); setMobileMenuOpen(false); }} className={`w-full flex items-center justify-between gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group ${activeTab === 'portal' ? 'bg-white/10 text-white ring-1 ring-white/10' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
            <div className="flex items-center gap-4">
              <LayoutDashboard size={22} className={activeTab === 'portal' ? 'text-blue-400' : 'group-hover:text-blue-300'} />
              <span className="font-medium text-lg">Admin Portal</span>
            </div>
            {errorMessage && (
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.8)]"></div>
            )}
          </button>
          <button onClick={() => { setActiveTab('history'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group ${activeTab === 'history' ? 'bg-white/10 text-white ring-1 ring-white/10' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
            <History size={22} className={activeTab === 'history' ? 'text-purple-400' : 'group-hover:text-purple-300'} />
            <span className="font-medium text-lg">Audit Log</span>
          </button>
        </div>
        <div className="p-6">
           <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                 <Cpu size={12} /> System Status
              </div>
              <div className="flex items-center gap-2">
                 <div className={`w-2 h-2 rounded-full ${errorMessage ? 'bg-rose-500' : (hasGoogleKey || userApiKey ? 'bg-emerald-500' : 'bg-emerald-500/50')}`}></div>
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                   {errorMessage ? 'Link Alert' : (hasGoogleKey ? 'Cloud Key Active' : (userApiKey ? 'Manual Key Active' : 'Free Tier Active'))}
                 </span>
              </div>
           </div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col h-full md:h-screen overflow-hidden">
        <header className="hidden md:flex items-center justify-between px-10 py-6">
           <div>
             <h2 className="text-3xl font-bold text-white tracking-tight">
               {activeTab === 'portal' ? 'Admin Portal' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
             </h2>
             <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-1 opacity-60">DWA Enterprise Terminal</p>
           </div>
           <DbStatus status={connectionStatus} lastSync={stats.lastSync} />
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-10 scroll-smooth custom-scrollbar">
          {activeTab === 'dashboard' && <Dashboard userRecords={records} userApiKey={userApiKey} />}

          {activeTab === 'portal' && (
            <div className="max-w-7xl mx-auto space-y-10 pb-20">
              
              <div className="bg-white/5 backdrop-blur-3xl rounded-[40px] border border-white/10 p-1 shadow-2xl overflow-hidden group hover:border-blue-500/30 transition-all">
                <div className="bg-black/40 p-10 rounded-[38px]">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                      <div className="flex items-center gap-5">
                          <div className="p-4 rounded-2xl bg-blue-500/10 text-blue-400 ring-1 ring-white/10">
                              <Key size={32} />
                          </div>
                          <div>
                              <h3 className="text-2xl font-black text-white uppercase tracking-tight">Intelligence Config</h3>
                              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1 opacity-70">Manage AI Signal Credentials</p>
                          </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-3">
                          <button 
                            onClick={handleLinkGoogle}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all shadow-xl active:scale-95 ${
                              hasGoogleKey ? 'bg-emerald-500 text-white' : 'bg-white text-black hover:bg-slate-200'
                            }`}
                          >
                             <Chrome size={16} /> {hasGoogleKey ? 'Google Account Linked' : 'Link Google Account'}
                          </button>
                      </div>
                  </div>

                  {errorMessage && (
                    <div className="mb-10 p-6 bg-rose-500/10 border border-rose-500/20 rounded-[32px] flex items-start gap-5 animate-in fade-in slide-in-from-top-4">
                        <AlertCircle size={32} className="text-rose-400 shrink-0 mt-1" />
                        <div>
                           <p className="text-md font-black text-rose-100 mb-1 uppercase tracking-tight">Signal Link Interrupted</p>
                           <p className="text-sm text-rose-300 leading-relaxed font-medium">{errorMessage}</p>
                        </div>
                    </div>
                  )}

                  <div className="space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-white/10"></div>
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">or Manual Entry</span>
                        <div className="h-px flex-1 bg-white/10"></div>
                      </div>
                      <div className="relative">
                          <input 
                              type={showKey ? "text" : "password"}
                              value={userApiKey}
                              onChange={(e) => setUserApiKey(e.target.value)}
                              placeholder="sk-manual-intelligence-key..."
                              className="w-full bg-black/40 border border-white/5 rounded-[24px] py-5 pl-8 pr-16 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 placeholder:text-slate-700 transition-all shadow-inner"
                          />
                          <button 
                              onClick={() => setShowKey(!showKey)}
                              className="absolute right-6 top-1/2 -translate-y-1/2 p-2 text-slate-600 hover:text-white transition-colors"
                          >
                              {showKey ? <EyeOff size={20} /> : <Eye size={20} />}
                          </button>
                      </div>
                      <div className="flex flex-col md:flex-row justify-between items-center gap-6 px-4">
                          <p className="text-[11px] text-slate-500 font-bold max-w-lg leading-relaxed">
                            Bypass system-wide rate limits by providing your own key. Link your Google account above to use your personal cloud projects (Free or Paid).
                          </p>
                          <button 
                            onClick={handleSaveKey}
                            className={`px-10 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center gap-3 transition-all ${
                                keySaved ? 'bg-emerald-500 text-white' : 'bg-white/5 hover:bg-white/10 border border-white/10 text-white'
                            }`}
                          >
                              {keySaved ? <CheckCircle2 size={16} /> : <RefreshCw size={16} />}
                              {keySaved ? 'Settings Saved' : 'Apply Manual Key'}
                          </button>
                      </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <ActionWidget 
                  type={RecordType.NEWS}
                  title="Add Crypto News"
                  description="Publish verified market updates for AI analysis."
                  onSubmit={(content) => handleAddRecord(RecordType.NEWS, content)}
                />
                <ActionWidget 
                  type={RecordType.SANCTION}
                  title="Add Sanction"
                  description="Log restricted international entities for risk correlation."
                  onSubmit={(content) => handleAddRecord(RecordType.SANCTION, content)}
                />
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="max-w-5xl mx-auto pb-20">
               <div className="mb-8 flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-white tracking-tight">Audit Log</h3>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">Immutable Activity Trail</p>
                    </div>
                    <button onClick={refreshData} className="text-[10px] font-black uppercase tracking-widest px-6 py-2.5 bg-white/5 rounded-full border border-white/10 hover:bg-white/10 transition-colors flex items-center gap-2">
                       <RefreshCw size={14} /> Re-sync
                    </button>
               </div>
               <Feed items={records} loading={isLoadingFeed} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
