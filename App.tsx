import React, { useEffect, useState, useCallback } from 'react';
import { dbService } from './services/mockDb';
import { ConnectionStatus, DbRecord, RecordType, SystemStats } from './types';
import { DbStatus } from './components/DbStatus';
import { ActionWidget } from './components/ActionWidget';
import { Feed } from './components/Feed';
import { Dashboard, IntelligenceData, AIStatus } from './components/Dashboard';
import { 
  LayoutDashboard, 
  History, 
  Menu, 
  X, 
  Home, 
  BrainCircuit, 
  Zap, 
  RefreshCw, 
  WifiOff, 
  AlertTriangle,
  Clock,
  TrendingUp,
  ShieldAlert,
  ArrowRight,
  Cpu,
  Lock,
  Key,
  Eye,
  EyeOff,
  CheckCircle2
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";

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

  const [latestForecast, setLatestForecast] = useState<IntelligenceData | null>(null);
  const [isForecasting, setIsForecasting] = useState(false);
  const [forecastStatus, setForecastStatus] = useState<AIStatus>('connecting');
  const [analysisTime, setAnalysisTime] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'portal' | 'history'>('dashboard');

  const handleSaveKey = () => {
    localStorage.setItem('dwa_user_api_key', userApiKey);
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 3000);
    
    // Attempt to re-run intelligence with new key if news exists
    const lastNews = records.find(r => r.type === RecordType.NEWS);
    if (lastNews) {
      analyzeNewsImpact(lastNews.content);
    }
  };

  const getEffectiveApiKey = () => {
    return userApiKey || process.env.API_KEY || '';
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

  const analyzeNewsImpact = async (content: string) => {
    const apiKey = getEffectiveApiKey();
    if (!apiKey || apiKey === 'undefined' || apiKey === '') {
      setForecastStatus('fallback');
      setErrorMessage("Missing Intelligence Link: No API Key detected. Please configure in Admin Portal.");
      return;
    }

    setIsForecasting(true);
    setForecastStatus('connecting');
    setErrorMessage(null);
    const startTime = performance.now();
    
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Act as a high-frequency market intelligence agent. Analyze: "${content}". Return JSON.`,
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
                        priority: { type: Type.STRING },
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

      const responseText = response.text;
      if (!responseText) throw new Error("Empty AI Response");

      const forecast: IntelligenceData = JSON.parse(responseText);
      const endTime = performance.now();
      setAnalysisTime(Math.round(endTime - startTime));
      setLatestForecast(forecast);
      setForecastStatus('active');
    } catch (e: any) {
      console.error("Impact Analysis Error:", e);
      setForecastStatus('error');
      if (e.message?.includes('403') || e.message?.includes('leaked')) {
        setErrorMessage("API Key Error: Invalid or Leaked Key. Update credentials in settings.");
      } else {
        setErrorMessage(e.message || "Failed to connect to Intelligence Node.");
      }
    } finally {
      setIsForecasting(false);
    }
  };

  const handleAddRecord = async (type: RecordType, content: string) => {
    try {
      await dbService.addRecord(type, content);
      await refreshData();
      if (type === RecordType.NEWS) {
        analyzeNewsImpact(content);
      }
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
      
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-black/40 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
        <LogoImage />
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-slate-300 hover:text-white transition-colors">
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
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
          <button onClick={() => { setActiveTab('portal'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group ${activeTab === 'portal' ? 'bg-white/10 text-white ring-1 ring-white/10' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
            <LayoutDashboard size={22} className={activeTab === 'portal' ? 'text-blue-400' : 'group-hover:text-blue-300'} />
            <span className="font-medium text-lg">Admin Portal</span>
          </button>
          <button onClick={() => { setActiveTab('history'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group ${activeTab === 'history' ? 'bg-white/10 text-white ring-1 ring-white/10' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
            <History size={22} className={activeTab === 'history' ? 'text-purple-400' : 'group-hover:text-purple-300'} />
            <span className="font-medium text-lg">Audit Log</span>
          </button>
        </div>
        <div className="p-6">
           <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                 <Cpu size={12} /> System Node Config
              </div>
              <div className="flex items-center gap-2">
                 <div className={`w-2 h-2 rounded-full ${userApiKey ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                   {userApiKey ? 'Custom Key Active' : 'System Default'}
                 </span>
              </div>
           </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full md:h-screen overflow-hidden">
        <header className="hidden md:flex items-center justify-between px-10 py-6">
           <div>
             <h2 className="text-3xl font-bold text-white tracking-tight">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h2>
             <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-1 opacity-60">Operational Secure Access Node</p>
           </div>
           <DbStatus status={connectionStatus} lastSync={stats.lastSync} />
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-10 scroll-smooth custom-scrollbar">
          {activeTab === 'dashboard' && <Dashboard userRecords={records} userApiKey={userApiKey} />}

          {activeTab === 'portal' && (
            <div className="max-w-7xl mx-auto space-y-10 pb-20">
              
              {/* API KEY CONFIGURATION WIDGET */}
              <div className="bg-white/5 backdrop-blur-3xl rounded-[40px] border border-white/10 p-8 shadow-2xl relative overflow-hidden group hover:border-blue-500/30 transition-all">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 relative z-10">
                      <div className="flex items-center gap-5">
                          <div className="p-4 rounded-2xl bg-blue-500/10 text-blue-400 ring-1 ring-white/10">
                              <Key size={28} />
                          </div>
                          <div>
                              <h3 className="text-xl font-black text-white uppercase tracking-tight">Intelligence Configuration</h3>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 opacity-70">Manage Local Agent Credentials</p>
                          </div>
                      </div>
                      <div className="flex gap-2">
                          {userApiKey && (
                             <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[9px] font-black text-emerald-400 uppercase flex items-center gap-1.5">
                                <ShieldAlert size={10} /> Local Override
                             </div>
                          )}
                      </div>
                  </div>

                  <div className="relative z-10 space-y-4">
                      <div className="relative">
                          <input 
                              type={showKey ? "text" : "password"}
                              value={userApiKey}
                              onChange={(e) => setUserApiKey(e.target.value)}
                              placeholder="Enter Gemini API Key..."
                              className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-6 pr-14 text-white font-mono text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50 placeholder:text-slate-600 transition-all"
                          />
                          <button 
                              onClick={() => setShowKey(!showKey)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-white transition-colors"
                          >
                              {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                      </div>
                      <div className="flex flex-col md:flex-row justify-between items-center gap-4 px-2">
                          <p className="text-[10px] text-slate-500 font-bold max-w-md">Your key is stored locally in your browser. Use Referrer Restrictions in GCP Console to secure public deployments.</p>
                          <button 
                            onClick={handleSaveKey}
                            className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
                                keySaved ? 'bg-emerald-500 text-white' : 'bg-blue-600 hover:bg-blue-50 text-white shadow-lg shadow-blue-500/20'
                            }`}
                          >
                              {keySaved ? <CheckCircle2 size={14} /> : <RefreshCw size={14} />}
                              {keySaved ? 'Credentials Updated' : 'Apply Settings'}
                          </button>
                      </div>
                  </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <ActionWidget 
                  type={RecordType.NEWS}
                  title="Push Market News"
                  description="Publish verified crypto updates for AI correlation."
                  onSubmit={(content) => handleAddRecord(RecordType.NEWS, content)}
                />
                <ActionWidget 
                  type={RecordType.SANCTION}
                  title="Log Sanction Entry"
                  description="Identify international restricted entities."
                  onSubmit={(content) => handleAddRecord(RecordType.SANCTION, content)}
                />
              </div>

              {/* AI IMPACT PANEL */}
              <div className="bg-gradient-to-br from-blue-900/30 to-indigo-900/30 backdrop-blur-3xl border border-blue-500/30 rounded-[40px] p-8 shadow-2xl relative overflow-hidden">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 relative z-10">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Zap size={24} className="text-amber-400" />
                            <h3 className="text-2xl font-black text-white uppercase tracking-tight">Live Impact Analysis</h3>
                        </div>
                        <p className="text-blue-200/50 font-bold text-[10px] uppercase tracking-[0.2em]">Automated Intelligence Forecasting</p>
                      </div>
                      <div className="flex items-center gap-3">
                          {analysisTime && !isForecasting && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full animate-in fade-in zoom-in">
                                <Clock size={12} className="text-slate-500" />
                                <span className="text-[10px] font-mono font-black text-slate-300 uppercase">Process: {analysisTime}ms</span>
                            </div>
                          )}
                          <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${
                            forecastStatus === 'active' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                          }`}>
                            {isForecasting ? <RefreshCw size={14} className="animate-spin" /> : <Lock size={14} />}
                            {isForecasting ? 'Agent Reasoning...' : (errorMessage ? 'Security Alert' : 'Node Ready')}
                          </div>
                      </div>
                  </div>

                  {errorMessage && (
                    <div className="mb-6 p-6 bg-rose-500/10 border border-rose-500/20 rounded-3xl flex items-start gap-4 animate-in fade-in zoom-in">
                        <AlertTriangle size={24} className="text-rose-400 shrink-0 mt-1" />
                        <div>
                           <p className="text-sm font-bold text-rose-200 mb-1">Intelligence Link Interrupted</p>
                           <p className="text-xs text-rose-300/70 leading-relaxed font-mono">{errorMessage}</p>
                        </div>
                    </div>
                  )}

                  {!latestForecast && !isForecasting && !errorMessage && (
                    <div className="h-48 flex flex-col items-center justify-center text-slate-600 border border-dashed border-white/10 rounded-3xl bg-black/20">
                        <AlertTriangle size={32} className="mb-4 opacity-10" />
                        <p className="font-black uppercase text-[10px] tracking-[0.3em]">Awaiting Data Feed for Impact Projection</p>
                    </div>
                  )}

                  {isForecasting && (
                    <div className="h-48 flex items-center justify-center bg-black/40 rounded-3xl border border-white/5">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                            <span className="text-[10px] font-black text-blue-300 uppercase tracking-[0.3em] animate-pulse">Mapping Global Correlations</span>
                        </div>
                    </div>
                  )}

                  {latestForecast && !isForecasting && !errorMessage && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-6 relative z-10">
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                               <TrendingUp size={14} /> Asset Volatility Prediction
                            </h4>
                            <div className="grid grid-cols-1 gap-3">
                              {latestForecast.correlations.map((corr, i) => (
                                  <div key={i} className="bg-white/5 border border-white/10 p-5 rounded-2xl flex justify-between items-center hover:bg-white/10 transition-all">
                                      <div>
                                          <p className="text-sm font-black text-white">{corr.entity_name}</p>
                                          <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">{corr.correlation_type}</p>
                                      </div>
                                      <div className={`px-3 py-1 text-[10px] font-black rounded-full border ${corr.risk_level === 'HIGH' ? 'text-rose-400 border-rose-500/20' : 'text-emerald-400 border-emerald-500/20'}`}>
                                          {corr.risk_level} IMPACT
                                      </div>
                                  </div>
                              ))}
                            </div>
                        </div>
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                               <BrainCircuit size={14} /> Intelligence Directives
                            </h4>
                            <div className="grid grid-cols-1 gap-3">
                              {latestForecast.intelligence.recommendations.map((rec, i) => (
                                  <div key={i} className="bg-black/40 border border-white/5 p-5 rounded-2xl border-l-4 border-l-amber-500">
                                      <div className="flex items-center justify-between mb-2">
                                          <h5 className="text-xs font-black text-slate-100 uppercase">{rec.action}</h5>
                                          <span className="text-[9px] font-black text-amber-500/60 uppercase">{rec.priority} PRIORITY</span>
                                      </div>
                                      <p className="text-[11px] text-slate-400 leading-relaxed font-medium">{rec.description}</p>
                                  </div>
                              ))}
                            </div>
                        </div>
                    </div>
                  )}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="max-w-5xl mx-auto pb-20">
               <div className="mb-8 flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-white tracking-tight">Audit Trail</h3>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">System Wide Events</p>
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
