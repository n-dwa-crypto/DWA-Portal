import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  ShieldAlert, 
  BrainCircuit, 
  Link as LinkIcon, 
  Lightbulb, 
  ArrowRight, 
  Database, 
  Bitcoin, 
  Globe, 
  Loader2, 
  RefreshCw,
  WifiOff,
  ShieldCheck,
  AlertCircle,
  Clock,
  Zap,
  AlertTriangle,
  Cloud,
  ListFilter,
  Coins,
  ShieldX,
  Layers
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { DbRecord, RecordType } from '../types';
import { supabaseService } from '../services/supabase';

// --- INTELLIGENCE LIBRARY (Pre-defined for cycling) ---

const INTEL_LIBRARY: IntelligenceData[] = [
  {
    correlations: [
      {
        entity_name: "Trump Family Ecosystem ($TRUMP/$MELANIA)",
        correlation_type: "Speculative Volatility Contagion",
        confidence: "HIGH",
        related_cryptos: [
          { symbol: "TRUMP", name: "MAGA Memecoin", correlation_strength: 0.98 },
          { symbol: "MELANIA", name: "Melania Memecoin", correlation_strength: 0.94 }
        ],
        risk_level: "HIGH"
      },
      {
        entity_name: "Trump Media & Technology Group (TMTG)",
        correlation_type: "Operational Diversification Risk",
        confidence: "MEDIUM",
        related_cryptos: [
          { symbol: "HYPE", name: "Hyperliquid", correlation_strength: 0.45 },
          { symbol: "BTC", name: "Bitcoin", correlation_strength: 0.32 }
        ],
        risk_level: "MEDIUM"
      }
    ],
    intelligence: {
      total_correlations: 2,
      high_risk: 1,
      medium_risk: 1,
      recommendations: [
        {
          priority: "HIGH",
          action: "Volatility Safeguard",
          description: "Initiate liquidity monitoring for $TRUMP holders ahead of the token distribution.",
          assigned_to: "Market Risk Division"
        }
      ]
    }
  },
  {
    correlations: [
      {
        entity_name: "U.S. Treasury / Fed Policy",
        correlation_type: "Macro Liquidity Transmission",
        confidence: "HIGH",
        related_cryptos: [
          { symbol: "BTC", name: "Bitcoin", correlation_strength: 0.92 },
          { symbol: "ETH", name: "Ethereum", correlation_strength: 0.85 }
        ],
        risk_level: "HIGH"
      },
      {
        entity_name: "Risk-Off Market Sentiment",
        correlation_type: "Capital Flight Correlation",
        confidence: "HIGH",
        related_cryptos: [
          { symbol: "SOL", name: "Solana", correlation_strength: 0.78 },
          { symbol: "NEAR", name: "NEAR Protocol", correlation_strength: 0.65 }
        ],
        risk_level: "MEDIUM"
      }
    ],
    intelligence: {
      total_correlations: 2,
      high_risk: 1,
      medium_risk: 1,
      recommendations: [
        {
          priority: "HIGH",
          action: "De-Risk Exposure",
          description: "Temporary reduction in altcoin leverage is advised during US fiscal deadlock phases.",
          assigned_to: "Macro Strategy Dept"
        }
      ]
    }
  },
  {
    correlations: [
      {
        entity_name: "Global AML/KYC Regulatory Frameworks",
        correlation_type: "Compliance Enforcement Risk",
        confidence: "VERY HIGH",
        related_cryptos: [
          { symbol: "USDT", name: "Tether", correlation_strength: 0.88 },
          { symbol: "USDC", name: "USD Coin", correlation_strength: 0.82 }
        ],
        risk_level: "HIGH"
      },
      {
        entity_name: "Offshore Exchange Ecosystems",
        correlation_type: "Operational Jurisdictional Risk",
        confidence: "MEDIUM",
        related_cryptos: [
          { symbol: "BNB", name: "BNB", correlation_strength: 0.74 },
          { symbol: "XMR", name: "Monero", correlation_strength: 0.95 }
        ],
        risk_level: "HIGH"
      }
    ],
    intelligence: {
      total_correlations: 2,
      high_risk: 2,
      medium_risk: 0,
      recommendations: [
        {
          priority: "HIGH",
          action: "Audit Protocol Scan",
          description: "Increase monitoring on cross-border stablecoin flows exceeding $100k for potential laundered signatures.",
          assigned_to: "Financial Crimes Unit"
        }
      ]
    }
  }
];

const CYCLE_IDS = [
    'bootstrap-news-trump-001',
    'news-fiscal-uncertainty-2025',
    'news-illicit-activity-2025'
];

let regionNames: any = null;
try {
  if (typeof Intl !== 'undefined' && (Intl as any).DisplayNames) {
    regionNames = new (Intl as any).DisplayNames(['en'], { type: 'region' });
  }
} catch (e) {}

const getCountryName = (code: string) => {
  if (!code) return '';
  try {
    return regionNames ? (regionNames.of(code) || code) : code;
  } catch (e) {
    return code;
  }
};

export interface IntelligenceData {
  correlations: Array<{
    entity_name: string;
    correlation_type: string;
    confidence: string;
    related_cryptos: Array<{ symbol: string; name: string; correlation_strength: number }>;
    risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  }>;
  intelligence: {
    total_correlations: number;
    high_risk: number;
    medium_risk: number;
    recommendations: Array<{
      priority: string;
      action: string;
      description: string;
      assigned_to: string;
    }>;
  };
}

export type AIStatus = 'connecting' | 'active' | 'heuristic' | 'error' | 'cloud';

interface CryptoRowProps {
  item: any;
}

const CryptoRow: React.FC<CryptoRowProps> = ({ item }) => {
  const isPositive = (item.change_24h || 0) >= 0;
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all border border-white/5 group">
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black ring-1 ring-white/10 ${isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
           {item.symbol ? item.symbol.slice(0, 3) : '?'}
        </div>
        <div>
          <div className="font-black text-sm text-white group-hover:text-blue-400 transition-colors">{item.symbol}</div>
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{item.name}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="font-mono text-sm font-bold text-white tracking-tight">${item.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</div>
        <div className={`text-[10px] font-black flex items-center justify-end gap-1 mt-0.5 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
           {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
           {Math.abs(item.change_24h || 0).toFixed(2)}%
        </div>
      </div>
    </div>
  );
};

interface SanctionRowProps {
  item: any;
}

const SanctionRow: React.FC<SanctionRowProps> = ({ item }) => {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all border border-white/5 border-l-4 border-l-rose-500/50">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl overflow-hidden bg-black/40 flex items-center justify-center ring-1 ring-white/10">
          {item.country_code ? (
            <img 
              src={`https://flagcdn.com/w80/${item.country_code.toLowerCase()}.png`} 
              alt={item.country_code}
              className="w-full h-full object-cover"
            />
          ) : <ShieldX size={18} className="text-slate-600" />}
        </div>
        <div>
          <div className="font-black text-xs text-white uppercase tracking-tight line-clamp-1">{item.name}</div>
          <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest flex items-center gap-2 mt-0.5">
            <span className="text-rose-500">ID: {item.id}</span>
            <span className="opacity-40">|</span>
            <span>{getCountryName(item.country_code)}</span>
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">{item.publication_date}</div>
        <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Entry Logged</div>
      </div>
    </div>
  );
};

interface DashboardProps {
  userRecords?: DbRecord[];
  userApiKey?: string;
  onPromoteRecord?: (id: string) => Promise<void>;
}

export const Dashboard: React.FC<DashboardProps> = ({ userRecords = [], userApiKey, onPromoteRecord }) => {
  const [sanctions, setSanctions] = useState<any[]>([]);
  const [cryptoStable, setCryptoStable] = useState<any[]>([]);
  const [cryptoAlt, setCryptoAlt] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [latestForecast, setLatestForecast] = useState<IntelligenceData | null>(null);
  const [forecastStatus, setForecastStatus] = useState<AIStatus>('connecting');
  const [cycleIndex, setCycleIndex] = useState(0);

  // Ref to track manual mode to prevent initial useEffect from overriding the cycle
  const manualCycleMode = useRef(false);

  const sanitizeApiKey = (key: any): string => {
    if (!key) return '';
    const clean = String(key).trim();
    if (clean === 'undefined' || clean === 'null' || !clean) return '';
    return clean.replace(/[^\x20-\x7E]/g, '');
  };

  const getEffectiveApiKey = useCallback(() => {
    if (userApiKey && userApiKey.trim() !== '') return sanitizeApiKey(userApiKey);
    const envKey = typeof process !== 'undefined' ? process.env.API_KEY : '';
    return sanitizeApiKey(envKey);
  }, [userApiKey]);

  const loadLatestIntelligence = useCallback(async (content?: string, recordId?: string, isManualCycle = false) => {
    try {
      // 1. Check cloud first (only if not manually cycling)
      if (!isManualCycle && !manualCycleMode.current) {
        const cloudRecord = await supabaseService.getLatestIntelligence();
        if (cloudRecord && cloudRecord.intelligence) {
          setLatestForecast(cloudRecord.intelligence);
          setForecastStatus('cloud');
          return;
        }
      }

      // 2. Logic to determine target heuristic set
      if (isManualCycle && onPromoteRecord) {
        manualCycleMode.current = true;
        const nextIndex = (cycleIndex + 1) % CYCLE_IDS.length;
        const nextId = CYCLE_IDS[nextIndex];
        // Promoting the record will trigger a global state update via App.tsx
        // which will eventually call this function again with the promoted recordId
        await onPromoteRecord(nextId);
        return;
      } else {
        // Only run this if not in manual mode or if strictly requested
        let target = 0;
        if (recordId === 'news-fiscal-uncertainty-2025') target = 1;
        else if (recordId === 'news-illicit-activity-2025') target = 2;
        
        setCycleIndex(target);
        setLatestForecast(INTEL_LIBRARY[target]);
      }

      setForecastStatus('heuristic');

    } catch (e) {
      console.warn("Intelligence fetch error:", e);
      setLatestForecast(INTEL_LIBRARY[0]);
      setForecastStatus('heuristic');
    }
  }, [cycleIndex, onPromoteRecord]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        const fetchJson = async (path: string) => {
          try {
            const res = await fetch(path);
            if (!res.ok) return [];
            const data = await res.json();
            return Array.isArray(data) ? data : [];
          } catch { return []; }
        };

        const [sanctionsData, stableData, altData] = await Promise.all([
          fetchJson('data/sanctions.json'),
          fetchJson('data/crypto_stable.json'),
          fetchJson('data/crypto_alt.json')
        ]);

        setSanctions(sanctionsData);
        setCryptoStable(stableData);
        setCryptoAlt(altData);
        
        // Find the absolute latest news item to sync heuristics
        const latestNews = userRecords?.find(r => r.type === RecordType.NEWS);
        await loadLatestIntelligence(latestNews?.content, latestNews?.id);
      } catch (err) {
        console.warn("Static data fetch failed:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [loadLatestIntelligence, userRecords]);

  // Tier 3: Heuristic Feedback auto-refresh every 60 seconds
  useEffect(() => {
    const autoCycle = setInterval(() => {
      loadLatestIntelligence(undefined, undefined, true);
    }, 60000); // 60 seconds
    
    return () => clearInterval(autoCycle);
  }, [loadLatestIntelligence]);

  const allCrypto = useMemo(() => [...cryptoStable, ...cryptoAlt], [cryptoStable, cryptoAlt]);
  const highVolatilityCount = useMemo(() => allCrypto.filter(c => Math.abs(c.change_24h || 0) > 5).length, [allCrypto]);
  const mostVolatileAsset = useMemo(() => {
    if (allCrypto.length === 0) return null;
    return [...allCrypto].sort((a, b) => Math.abs(b.change_24h || 0) - Math.abs(a.change_24h || 0))[0];
  }, [allCrypto]);

  const topCountry = useMemo(() => {
    const freq: Record<string, number> = {};
    sanctions.forEach(s => { if (s.country_code) freq[s.country_code] = (freq[s.country_code] || 0) + 1; });
    const entries = Object.entries(freq).sort((a, b) => b[1] - a[1]);
    return entries.length > 0 ? { code: entries[0][0], count: entries[0][1] } : null;
  }, [sanctions]);

  return (
    <div className="max-w-[1800px] mx-auto space-y-12 pb-20 animate-in fade-in duration-500">
      {/* Header Panel */}
      <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[40px] p-10 text-center shadow-2xl relative overflow-hidden group">
         <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-emerald-500 to-indigo-500"></div>
         <h1 className="text-5xl md:text-6xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-200 via-white to-emerald-200 mb-2 tracking-tighter text-white group-hover:scale-[1.01] transition-transform duration-700">
           DWA Intelligence Hub
         </h1>
         <p className="text-slate-400 font-bold opacity-60 uppercase tracking-[0.4em] text-[10px]">Global Node Cluster | Unified Risk Observation</p>
      </div>

      {/* Tier 1: Operational Monitoring */}
      <section className="space-y-6">
        <div className="flex items-center gap-6 px-4">
            <div className="h-0.5 flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
            <span className="text-[12px] font-black tracking-[0.5em] text-white uppercase drop-shadow-lg">Tier 1: Operational Monitoring</span>
            <div className="h-0.5 flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="relative rounded-[45px] overflow-hidden p-1 bg-gradient-to-br from-purple-500/20 to-rose-500/20 border border-white/5 shadow-2xl">
             <div className="absolute inset-0 bg-black/60 backdrop-blur-3xl"></div>
             <div className="relative z-10 p-10 h-full flex flex-col lg:flex-row gap-10">
                <div className="lg:w-1/2 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-4 mb-10">
                       <div className="p-4 rounded-2xl bg-purple-500/20 text-purple-300 ring-1 ring-white/10">
                          <Database size={28} />
                       </div>
                       <div>
                          <h2 className="text-2xl font-black text-white uppercase tracking-tight">Sanctions</h2>
                          <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Global Registry</p>
                       </div>
                    </div>
                    <div className="text-9xl font-black text-white tracking-tighter mb-2 leading-none">{isLoading ? "..." : sanctions.length}</div>
                  </div>
                </div>
                <div className="lg:w-1/2 flex-1">
                  <div className="w-full h-full min-h-[250px] rounded-[35px] bg-black/40 border border-white/5 p-8 flex flex-col justify-center items-center text-center shadow-inner">
                    {topCountry ? (
                      <div className="animate-in fade-in duration-700 w-full flex flex-col items-center text-white">
                        <img src={`https://flagcdn.com/w160/${topCountry.code.toLowerCase()}.png`} alt={topCountry.code} className="w-24 h-auto rounded-2xl shadow-2xl mb-6 ring-1 ring-white/20" />
                        <h3 className="text-2xl font-black uppercase tracking-tight">{getCountryName(topCountry.code)}</h3>
                        <p className="text-[10px] text-rose-400 font-black uppercase mt-3 tracking-[0.2em]">{topCountry.count} Entities Targeted</p>
                      </div>
                    ) : <div className="text-slate-600 font-black uppercase text-xs animate-pulse">Establishing Node...</div>}
                  </div>
                </div>
             </div>
          </div>

          <div className="relative rounded-[45px] overflow-hidden p-1 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-white/5 shadow-2xl">
             <div className="absolute inset-0 bg-black/60 backdrop-blur-3xl"></div>
             <div className="relative z-10 p-10 h-full flex flex-col lg:flex-row gap-10">
                <div className="lg:w-1/2 flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-4 mb-10">
                       <div className="p-4 rounded-2xl bg-cyan-500/20 text-cyan-300 ring-1 ring-white/10">
                          <Activity size={28} />
                       </div>
                       <div>
                          <h2 className="text-2xl font-black text-white uppercase tracking-tight">Volatility</h2>
                          <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Market Scan</p>
                       </div>
                    </div>
                    <div className="text-9xl font-black text-white tracking-tighter mb-2 leading-none">{isLoading ? "..." : highVolatilityCount}</div>
                  </div>
                </div>
                <div className="lg:w-1/2 flex-1">
                  <div className="w-full h-full min-h-[250px] rounded-[35px] bg-black/40 border border-white/5 p-8 flex flex-col justify-center items-center text-center shadow-inner">
                    {mostVolatileAsset ? (
                      <div className="animate-in fade-in duration-700 w-full flex flex-col items-center text-white">
                        <div className={`w-24 h-24 rounded-[30px] flex items-center justify-center text-4xl font-black border-2 mb-6 ${mostVolatileAsset.change_24h >= 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                           {mostVolatileAsset.symbol || '?'}
                        </div>
                        <h3 className="text-2xl font-black uppercase tracking-tight">{mostVolatileAsset.name}</h3>
                        <div className={`text-[10px] font-black uppercase mt-3 tracking-[0.2em] ${mostVolatileAsset.change_24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                           {Math.abs(mostVolatileAsset.change_24h || 0).toFixed(2)}% Active Shift
                        </div>
                      </div>
                    ) : <div className="text-slate-600 font-black uppercase text-xs animate-pulse">Syncing Pulse...</div>}
                  </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Tier 2: Statistical Intelligence */}
      <section className="space-y-6">
        <div className="flex items-center gap-6 px-4">
            <div className="h-0.5 flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
            <span className="text-[12px] font-black tracking-[0.5em] text-white uppercase drop-shadow-lg">Tier 2: Statistical Intelligence</span>
            <div className="h-0.5 flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
           {/* Sanctions Registry - 4 Columns */}
           <div className="xl:col-span-4 bg-white/5 backdrop-blur-3xl rounded-[40px] border border-white/10 overflow-hidden flex flex-col shadow-2xl h-[700px]">
              <div className="p-8 border-b border-white/5 bg-black/20 flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl">
                       <ListFilter size={20} />
                    </div>
                    <div>
                       <h3 className="text-lg font-black text-white uppercase tracking-tight">Sanctions Registry</h3>
                       <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-0.5">Live Compliance Ledger</p>
                    </div>
                 </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-black/10">
                 {isLoading ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4">
                       <Loader2 size={32} className="animate-spin opacity-20" />
                       <span className="text-[10px] font-black uppercase tracking-widest">Decrypting Registry...</span>
                    </div>
                 ) : sanctions.map((item, idx) => (
                    <SanctionRow key={idx} item={item} />
                 ))}
              </div>
           </div>

           {/* Market Assets - 8 Columns */}
           <div className="xl:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-8 h-[700px]">
              {/* Crypto Coin */}
              <div className="bg-white/5 backdrop-blur-3xl rounded-[40px] border border-white/10 overflow-hidden flex flex-col shadow-2xl">
                 <div className="p-8 border-b border-white/5 bg-black/20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                       <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
                          <Bitcoin size={20} />
                       </div>
                       <div>
                          <h3 className="text-lg font-black text-white uppercase tracking-tight">Crypto Coin</h3>
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-0.5">Tier 1 Currencies</p>
                       </div>
                    </div>
                 </div>
                 <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
                    {cryptoStable.map((item, idx) => (
                       <CryptoRow key={idx} item={item} />
                    ))}
                 </div>
              </div>

              {/* Crypto Tokens */}
              <div className="bg-white/5 backdrop-blur-3xl rounded-[40px] border border-white/10 overflow-hidden flex flex-col shadow-2xl">
                 <div className="p-8 border-b border-white/5 bg-black/20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                       <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
                          <Layers size={20} />
                       </div>
                       <div>
                          <h3 className="text-lg font-black text-white uppercase tracking-tight">Crypto Tokens</h3>
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-0.5">Ecosystem Signals</p>
                       </div>
                    </div>
                 </div>
                 <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
                    {cryptoAlt.map((item, idx) => (
                       <CryptoRow key={idx} item={item} />
                    ))}
                 </div>
              </div>
           </div>
        </div>
      </section>

      {/* Tier 3: Agentic Intelligence */}
      <section className="space-y-6">
        <div className="flex items-center gap-6 px-4">
            <div className="h-0.5 flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
            <span className="text-[12px] font-black tracking-[0.5em] text-white uppercase drop-shadow-lg">Tier 3: Agentic Intelligence</span>
            <div className="h-0.5 flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
        </div>

        <div className="bg-gradient-to-br from-blue-900/40 to-indigo-900/40 backdrop-blur-3xl border border-blue-500/20 rounded-[50px] p-12 shadow-2xl relative overflow-hidden transition-all duration-700 ring-1 ring-white/10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16 relative z-10">
              <div className="flex items-center gap-5">
                  {forecastStatus === 'cloud' ? (
                    <div className="flex items-center gap-3 px-8 py-3 bg-blue-500/10 border border-blue-500/30 rounded-2xl shadow-[0_0_30px_rgba(59,130,246,0.1)]">
                       <Cloud size={24} className="text-blue-400" />
                       <span className="text-xs font-black text-blue-200 uppercase tracking-[0.3em]">Global Node Sync</span>
                    </div>
                  ) : forecastStatus === 'active' ? (
                    <div className="flex items-center gap-3 px-8 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                       <ShieldCheck size={24} className="text-emerald-400" />
                       <span className="text-xs font-black text-emerald-200 uppercase tracking-[0.3em]">Neural Core Active</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 px-8 py-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
                       <BrainCircuit size={24} className="text-amber-400" />
                       <span className="text-xs font-black text-amber-200 uppercase tracking-[0.3em]">Heuristic Feedback</span>
                    </div>
                  )}
              </div>

              <button 
                onClick={() => loadLatestIntelligence(undefined, undefined, true)}
                className="p-4 bg-white/5 border border-white/10 rounded-2xl text-white hover:bg-white/10 transition-all hover:scale-110 active:rotate-180 duration-500 shadow-2xl group"
              >
                <RefreshCw size={22} className="group-hover:text-blue-400 transition-colors" />
              </button>
          </div>

          {latestForecast && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 animate-in fade-in slide-in-from-bottom-12 relative z-10">
                <div className="space-y-8">
                    <h3 className="text-2xl font-black text-white flex items-center gap-4 uppercase tracking-tight mb-10">
                       <div className="w-1.5 h-8 bg-emerald-500 rounded-full"></div>
                       Entity Risk Matrix
                    </h3>
                    <div className="grid grid-cols-1 gap-6">
                      {latestForecast.correlations?.map((corr, i) => (
                          <div key={i} className="bg-black/40 rounded-[35px] p-10 border border-white/5 border-l-8 border-l-emerald-500 shadow-2xl group hover:bg-black/60 transition-all hover:-translate-y-2">
                              <div className="flex justify-between items-start mb-8">
                                  <div>
                                      <h4 className="font-black text-white text-2xl tracking-tight mb-2">{corr.entity_name}</h4>
                                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{corr.correlation_type}</p>
                                  </div>
                                  <span className={`px-5 py-2 text-[10px] font-black rounded-xl border uppercase tracking-[0.2em] ${
                                    corr.risk_level === 'HIGH' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 
                                    'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                  }`}>{corr.risk_level} Impact</span>
                              </div>
                              <div className="space-y-4">
                                    {corr.related_cryptos?.map((rc, j) => (
                                      <div key={j} className="bg-white/5 rounded-[20px] p-6 flex justify-between items-center text-white border border-white/5 group/row hover:bg-white/10 transition-colors">
                                         <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center font-black text-sm text-emerald-400 border border-emerald-500/20 group-hover/row:scale-110 transition-transform">
                                               {rc.symbol ? rc.symbol.slice(0, 2) : '?'}
                                            </div>
                                            <span className="text-base font-black uppercase tracking-tight">{rc.name}</span>
                                         </div>
                                         <div className="flex items-center gap-6">
                                             <div className="w-32 h-2 bg-black/60 rounded-full overflow-hidden shadow-inner">
                                                 <div className="h-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" style={{ width: `${(rc.correlation_strength || 0) * 100}%` }}></div>
                                             </div>
                                             <span className="text-sm font-mono font-black text-emerald-400">{((rc.correlation_strength || 0) * 100).toFixed(0)}%</span>
                                         </div>
                                      </div>
                                    ))}
                              </div>
                          </div>
                      ))}
                    </div>
                </div>

                <div className="space-y-8">
                    <h3 className="text-2xl font-black text-white flex items-center gap-4 uppercase tracking-tight mb-10">
                       <div className="w-1.5 h-8 bg-amber-500 rounded-full"></div>
                       Strategic Directives
                    </h3>
                    <div className="grid grid-cols-1 gap-8">
                      {latestForecast.intelligence?.recommendations?.map((rec, i) => (
                          <div key={i} className="bg-black/40 rounded-[35px] p-10 border border-white/5 hover:border-amber-500/30 transition-all shadow-2xl relative group overflow-hidden">
                              <div className={`absolute top-0 right-0 w-1.5 h-full transition-colors ${
                                 rec.priority === 'HIGH' ? 'bg-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.5)]' : 'bg-amber-500/50'
                              }`}></div>
                              <div className="flex items-center justify-between mb-6">
                                <h4 className="font-black text-slate-100 uppercase text-sm tracking-[0.3em]">{rec.action}</h4>
                                <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-lg border ${
                                    rec.priority === 'HIGH' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-white/5 text-slate-400 border-white/10'
                                }`}>{rec.priority} Priority</span>
                              </div>
                              <p className="text-slate-400 text-base leading-relaxed font-medium mb-10 opacity-80">{rec.description}</p>
                              <div className="pt-8 border-t border-white/5 flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <Zap size={14} className="text-amber-500" />
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Division: {rec.assigned_to}</span>
                                  </div>
                                  <ArrowRight size={20} className="text-slate-700 group-hover:text-amber-400 group-hover:translate-x-2 transition-all" />
                              </div>
                          </div>
                      ))}
                    </div>
                </div>
            </div>
          )}

          {/* Node Source ID Footer */}
          <div className="mt-16 text-center">
             <span className="text-[8px] font-mono text-white/5 uppercase tracking-[0.4em] select-none">
               Active Node ID: {CYCLE_IDS[cycleIndex]}
             </span>
          </div>
        </div>
      </section>
    </div>
  );
};