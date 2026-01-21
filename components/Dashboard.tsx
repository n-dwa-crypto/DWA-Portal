
import React, { useEffect, useState, useMemo, useCallback } from 'react';
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
  MapPin,
  AlertTriangle,
  Zap,
  RefreshCw,
  ExternalLink,
  WifiOff,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { DbRecord, RecordType } from '../types';

// --- UNIVERSAL COUNTRY LOOKUP ---
const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

const getCountryName = (code: string) => {
  if (!code) return '';
  try {
    return regionNames.of(code) || code;
  } catch (e) {
    return code;
  }
};

// --- TYPES FOR INTELLIGENCE ---
export interface GroundingSource {
  title: string;
  uri: string;
}

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
  sources?: GroundingSource[];
}

export type AIStatus = 'connecting' | 'active' | 'fallback' | 'error';

// --- HELPER COMPONENTS ---

interface CryptoRowProps {
  item: any;
}

const CryptoRow: React.FC<CryptoRowProps> = ({ item }) => {
  const isPositive = item.change_24h >= 0;
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
           {item.symbol[0]}
        </div>
        <div>
          <div className="font-bold text-sm text-white">{item.symbol}</div>
          <div className="text-xs text-slate-400">{item.name}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="font-mono text-sm font-medium text-white">${item.price.toLocaleString()}</div>
        <div className={`text-xs font-bold flex items-center justify-end gap-1 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
           {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
           {Math.abs(item.change_24h).toFixed(2)}%
        </div>
      </div>
    </div>
  );
};

interface EntityRowProps {
  item: any;
  type: 'add' | 'del';
}

const EntityRow: React.FC<EntityRowProps> = ({ item, type }) => (
  <div className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5 group">
    <div className="flex justify-between items-start mb-1">
       <div className="flex items-center gap-2 overflow-hidden">
          {item.country_code && (
            <div className="flex items-center gap-1.5 shrink-0 bg-white/10 px-1.5 py-0.5 rounded border border-white/10">
              <img 
                src={`https://flagcdn.com/w20/${item.country_code.toLowerCase()}.png`} 
                alt={item.country_code}
                className="w-4 h-auto rounded-sm object-cover"
              />
              <span className="text-[10px] font-mono font-bold text-slate-300">{item.country_code}</span>
            </div>
          )}
          <span className="font-semibold text-sm text-slate-200 line-clamp-1 group-hover:text-white transition-colors">{item.name}</span>
       </div>
       <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
         type === 'add' 
           ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
           : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
       }`}>
         {type === 'add' ? 'ADDED' : 'DEL'}
       </span>
    </div>
    <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono">
       <span>ID: {item.id}</span>
       <span>•</span>
       <span>Pub: {item.publication_id}</span>
    </div>
  </div>
);

interface DashboardProps {
  userRecords?: DbRecord[];
  userApiKey?: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ userRecords = [], userApiKey }) => {
  const [sanctions, setSanctions] = useState<any[]>([]);
  const [cryptoStable, setCryptoStable] = useState<any[]>([]);
  const [cryptoAlt, setCryptoAlt] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [intelligence, setIntelligence] = useState<IntelligenceData | null>(null);
  const [aiStatus, setAiStatus] = useState<AIStatus>('connecting');

  const generateHeuristicIntelligence = useCallback((sanctionsData: any[], cryptoData: any[]): IntelligenceData => {
    const topVolatile = [...cryptoData].sort((a, b) => Math.abs(b.change_24h) - Math.abs(a.change_24h)).slice(0, 2);
    return {
      correlations: [
        {
          entity_name: "Local Risk Node",
          correlation_type: "Heuristic Baseline",
          confidence: "Internal",
          risk_level: "MEDIUM",
          related_cryptos: topVolatile.map(c => ({
            symbol: c.symbol,
            name: c.name,
            correlation_strength: 0.85
          }))
        }
      ],
      intelligence: {
        total_correlations: 1,
        high_risk: 0,
        medium_risk: 1,
        recommendations: [
          {
            priority: "LOW",
            action: "Monitor Local Feed",
            description: "Establishing link to agentic reasoning core...",
            assigned_to: "System Admin"
          }
        ]
      }
    };
  }, []);

  const runIntelligenceAnalysis = useCallback(async (sanctionsData: any[], cryptoData: any[]) => {
    // Immediate Guard: Don't run if data isn't ready
    if (sanctionsData.length === 0 || cryptoData.length === 0) return;

    const rawApiKey = userApiKey || process.env.API_KEY || '';
    const effectiveApiKey = (rawApiKey === 'undefined' || !rawApiKey) ? '' : rawApiKey;

    if (!effectiveApiKey) {
      setAiStatus('fallback');
      setIntelligence(generateHeuristicIntelligence(sanctionsData, cryptoData));
      return;
    }

    setIsAnalyzing(true);
    setAiStatus('connecting');
    
    try {
      const ai = new GoogleGenAI({ apiKey: effectiveApiKey });
      // Enhanced prompt focusing on the provided CSV data and real-world current affairs known to the model.
      const prompt = `Act as an expert Crypto Intelligence Analyst. 
      I am providing you with two datasets:
      1. Global Sanctions: ${JSON.stringify(sanctionsData.slice(0, 8))}
      2. Market Pulse (Tokens & Coins): ${JSON.stringify(cryptoData.slice(0, 15))}
      
      Perform a deep risk correlation between these market conditions and the listed entities. 
      Consider recent real-world crypto trends (e.g., regulatory shifts, ETF flows, institutional movements) for these specific symbols.
      Identify potential "hotspots" where sanctioned entities might be moving assets through the specified crypto networks based on their recent volatility.
      
      Return strictly JSON with this schema:
      {
        "correlations": [{"entity_name": string, "correlation_type": string, "confidence": string, "related_cryptos": [{"symbol": string, "name": string, "correlation_strength": number}], "risk_level": "LOW"|"MEDIUM"|"HIGH"}],
        "intelligence": {"total_correlations": number, "high_risk": number, "medium_risk": number, "recommendations": [{"priority": string, "action": string, "description": string, "assigned_to": string}]}
      }`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
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
                  },
                  required: ["entity_name", "correlation_type", "confidence", "related_cryptos", "risk_level"]
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
                },
                required: ["total_correlations", "high_risk", "medium_risk", "recommendations"]
              }
            },
            required: ["correlations", "intelligence"]
          }
        }
      });

      const responseText = response.text;
      if (!responseText) throw new Error("Empty AI Response");

      let result: IntelligenceData = JSON.parse(responseText);
      setIntelligence(result);
      setAiStatus('active');
    } catch (err: any) {
      console.warn("Intelligence link error", err);
      setAiStatus('error');
      // If error occurs, we still show the heuristic data so the UI isn't empty
      if (!intelligence) {
        setIntelligence(generateHeuristicIntelligence(sanctionsData, cryptoData));
      }
    } finally {
      setIsAnalyzing(false);
    }
  }, [userApiKey, generateHeuristicIntelligence, intelligence]);

  // Initial Data Fetch
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [sanctionsRes, stableRes, altRes] = await Promise.all([
          fetch('data/sanctions.json').catch(() => fetch('./data/sanctions.json')),
          fetch('data/crypto_stable.json').catch(() => fetch('./data/crypto_stable.json')),
          fetch('data/crypto_alt.json').catch(() => fetch('./data/crypto_alt.json'))
        ]);
        if (!sanctionsRes.ok || !stableRes.ok || !altRes.ok) throw new Error('Data Link Failure');
        const [sanctionsData, stableData, altData] = await Promise.all([
          sanctionsRes.json(), stableRes.json(), altRes.json()
        ]);
        setSanctions(sanctionsData);
        setCryptoStable(stableData);
        setCryptoAlt(altData);
      } catch (err: any) {
        console.warn(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Separate effect to trigger analysis when data OR the key changes. 
  // This solves the "stuck in fallback" bug when entering a key manually.
  useEffect(() => {
    if (!isLoading && sanctions.length > 0 && (cryptoStable.length > 0 || cryptoAlt.length > 0)) {
      runIntelligenceAnalysis(sanctions, [...cryptoStable, ...cryptoAlt]);
    }
  }, [userApiKey, sanctions, cryptoStable, cryptoAlt, isLoading]);

  const allCrypto = useMemo(() => [...cryptoStable, ...cryptoAlt], [cryptoStable, cryptoAlt]);
  const highVolatilityCount = useMemo(() => allCrypto.filter(c => Math.abs(c.change_24h) > 5).length, [allCrypto]);
  const mostVolatileAsset = useMemo(() => {
    if (allCrypto.length === 0) return null;
    return [...allCrypto].sort((a, b) => Math.abs(b.change_24h) - Math.abs(a.change_24h))[0];
  }, [allCrypto]);

  const { topCountry } = useMemo(() => {
    const freq: Record<string, number> = {};
    sanctions.forEach(s => { if (s.country_code) freq[s.country_code] = (freq[s.country_code] || 0) + 1; });
    const entries = Object.entries(freq).sort((a, b) => b[1] - a[1]);
    return { topCountry: entries.length > 0 ? { code: entries[0][0], count: entries[0][1] } : null };
  }, [sanctions]);

  return (
    <div className="max-w-[1800px] mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[32px] p-8 text-center shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
         <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-200 via-white to-purple-200 mb-2 tracking-tight text-white">
           Multi-Agent AI Risk Dashboard
         </h1>
         <p className="text-slate-400 font-medium opacity-80 uppercase tracking-widest text-[10px] font-black">Three-Tier Agentic Intelligence System | Real-time Global Monitoring</p>
      </div>

      <section className="space-y-4">
        <div className="flex items-center gap-3 px-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
            <span className="text-[10px] font-black tracking-[0.3em] text-slate-500 uppercase">Tier 1 • Monitoring</span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative rounded-[40px] overflow-hidden p-1 bg-gradient-to-br from-purple-500/10 to-rose-500/10 border border-white/5 shadow-2xl">
             <div className="absolute inset-0 bg-black/40 backdrop-blur-3xl"></div>
             <div className="relative z-10 p-10 h-full flex flex-col lg:flex-row gap-10">
                <div className="lg:w-1/2 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-8">
                       <div className="p-3 rounded-2xl bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/30">
                          <Database size={24} />
                       </div>
                       <div className="flex flex-col text-white">
                          <h2 className="text-xl font-black leading-none uppercase tracking-tight">Global Sanctions</h2>
                          <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest mt-1">Operational Feed</span>
                       </div>
                    </div>
                    <div className="text-8xl font-black text-white tracking-tighter mb-2">{isLoading ? "..." : sanctions.length}</div>
                  </div>
                </div>
                <div className="lg:w-1/2 flex-1 flex items-center justify-center">
                  <div className="w-full h-full min-h-[250px] rounded-[32px] bg-black/40 border border-white/5 p-8 flex flex-col justify-center items-center text-center">
                    {topCountry ? (
                      <div className="animate-in fade-in duration-700 w-full flex flex-col items-center text-white">
                        <img src={`https://flagcdn.com/w160/${topCountry.code.toLowerCase()}.png`} alt={topCountry.code} className="w-20 h-auto rounded-lg shadow-2xl mb-4 border border-white/10" />
                        <h3 className="text-xl font-black uppercase tracking-tight">{getCountryName(topCountry.code)}</h3>
                        <p className="text-[10px] text-rose-400 font-black uppercase mt-2 tracking-widest">Target Hotspot</p>
                      </div>
                    ) : <div className="text-slate-500 font-black uppercase text-xs">Awaiting Data...</div>}
                  </div>
                </div>
             </div>
          </div>

          <div className="relative rounded-[40px] overflow-hidden p-1 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-white/5 shadow-2xl">
             <div className="absolute inset-0 bg-black/40 backdrop-blur-3xl"></div>
             <div className="relative z-10 p-10 h-full flex flex-col lg:flex-row gap-10">
                <div className="lg:w-1/2 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-8">
                       <div className="p-3 rounded-2xl bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/30">
                          <Activity size={24} />
                       </div>
                       <div className="flex flex-col text-white">
                          <h2 className="text-xl font-black leading-none uppercase tracking-tight">Market Pulse</h2>
                          <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mt-1">Node Activity</span>
                       </div>
                    </div>
                    <div className="text-8xl font-black text-white tracking-tighter mb-2">{isLoading ? "..." : highVolatilityCount}</div>
                  </div>
                </div>
                <div className="lg:w-1/2 flex-1 flex items-center justify-center">
                  <div className="w-full h-full min-h-[250px] rounded-[32px] bg-black/40 border border-white/5 p-8 flex flex-col justify-center items-center text-center">
                    {mostVolatileAsset ? (
                      <div className="animate-in fade-in duration-700 w-full flex flex-col items-center text-white">
                        <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 mb-4">{mostVolatileAsset.symbol}</div>
                        <h3 className="text-xl font-black uppercase tracking-tight">{mostVolatileAsset.name}</h3>
                        <div className={`text-[10px] font-black uppercase mt-2 ${mostVolatileAsset.change_24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                           {Math.abs(mostVolatileAsset.change_24h).toFixed(2)}% Velocity
                        </div>
                      </div>
                    ) : <div className="text-slate-500 font-black uppercase text-xs">Scanning...</div>}
                  </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-3 px-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
            <span className="text-[10px] font-black tracking-[0.3em] text-slate-500 uppercase">Tier 2 • Analysis</span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          <div className="bg-black/40 backdrop-blur-xl border border-white/5 rounded-[40px] p-8 h-[600px] flex flex-col shadow-2xl">
             <h3 className="font-black text-sm text-white flex items-center gap-2 uppercase tracking-widest mb-6 text-emerald-400">
                <ShieldAlert size={16} />
                Sanctions
             </h3>
             <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {sanctions.map((item, i) => <EntityRow key={i} item={item} type="add" />)}
             </div>
          </div>

          <div className="flex flex-col gap-6 h-[600px]">
             <div className="bg-black/40 backdrop-blur-xl border border-white/5 rounded-[40px] p-8 flex-1 flex flex-col shadow-2xl overflow-hidden group">
                <h3 className="font-black text-sm text-white flex items-center gap-2 uppercase tracking-widest mb-4 text-amber-400">
                   <Bitcoin size={16} />
                   Crypto Coins
                </h3>
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                   {cryptoStable.map((item, i) => <CryptoRow key={i} item={item} />)}
                </div>
             </div>
             
             <div className="bg-black/40 backdrop-blur-xl border border-white/5 rounded-[40px] p-8 flex-1 flex flex-col shadow-2xl overflow-hidden group">
                <h3 className="font-black text-sm text-white flex items-center gap-2 uppercase tracking-widest mb-4 text-indigo-400">
                   <Globe size={16} />
                   Crypto Tokens
                </h3>
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                   {cryptoAlt.map((item, i) => <CryptoRow key={i} item={item} />)}
                </div>
             </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-3 px-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
            <span className="text-[10px] font-black tracking-[0.3em] text-slate-500 uppercase">Tier 3 • Intelligence Agent</span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
        </div>

        <div className={`bg-white/5 backdrop-blur-3xl border rounded-[40px] p-10 shadow-2xl relative overflow-hidden transition-all duration-700 ${
            aiStatus === 'active' ? 'border-emerald-500/20' : 'border-white/10'
        }`}>
            {/* Ambient Background Glow */}
            <div className={`absolute -bottom-32 -right-32 w-96 h-96 rounded-full blur-[120px] opacity-[0.05] transition-colors duration-1000 ${
                aiStatus === 'active' ? 'bg-emerald-500' : 'bg-blue-500'
            }`}></div>

            <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
                <div className="flex items-center gap-4">
                    {aiStatus === 'active' ? (
                      <div className="flex items-center gap-2 px-5 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
                         <ShieldCheck size={18} className="text-emerald-400" />
                         <span className="text-[10px] font-black text-emerald-200 uppercase tracking-[0.2em]">Agent Verified</span>
                      </div>
                    ) : aiStatus === 'fallback' ? (
                      <div className="flex items-center gap-2 px-5 py-2 bg-amber-500/10 border border-amber-500/30 rounded-full">
                         <WifiOff size={18} className="text-amber-400" />
                         <span className="text-[10px] font-black text-amber-200 uppercase tracking-[0.2em]">Heuristic Fallback</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-5 py-2 bg-rose-500/10 border border-rose-500/30 rounded-full">
                         <AlertCircle size={18} className="text-rose-400" />
                         <span className="text-[10px] font-black text-rose-200 uppercase tracking-[0.2em]">Agent Offline</span>
                      </div>
                    )}
                </div>
                {isAnalyzing && (
                  <div className="flex items-center gap-3 px-5 py-2 bg-blue-500/10 border border-blue-500/30 rounded-full">
                    <Loader2 size={18} className="text-blue-400 animate-spin" />
                    <span className="text-[10px] font-black text-blue-200 uppercase tracking-[0.2em]">Synthesizing Risk Signals...</span>
                  </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-6">
                   <h3 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-tight">
                      <LinkIcon size={22} className="text-emerald-400" /> Neural Correlations
                   </h3>
                   {(!intelligence || intelligence.correlations.length === 0) && !isAnalyzing && (
                       <div className="p-10 border border-dashed border-white/10 rounded-[32px] text-center text-slate-600 font-bold uppercase text-[10px] tracking-[0.2em]">
                           Awaiting Analysis Initialization...
                       </div>
                   )}
                   {(intelligence?.correlations || []).map((corr, i) => (
                     <div key={i} className="bg-black/60 rounded-[32px] p-8 border-l-8 border-emerald-500 shadow-2xl transition-all hover:bg-black/70 hover:scale-[1.01] border border-white/5">
                        <div className="flex justify-between items-start mb-6">
                           <div>
                              <h4 className="font-black text-white text-lg tracking-tight">{corr.entity_name}</h4>
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{corr.correlation_type}</p>
                           </div>
                           <span className={`px-3 py-1 text-[9px] font-black rounded-full border uppercase tracking-tighter ${
                             corr.risk_level === 'HIGH' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 
                             'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                           }`}>{corr.risk_level} Impact</span>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                              {corr.related_cryptos.map((rc, j) => (
                                <div key={j} className="bg-white/5 rounded-2xl p-4 flex justify-between items-center text-white border border-white/5">
                                   <span className="text-sm font-black">{rc.symbol}</span>
                                   <div className="flex items-center gap-2">
                                       <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
                                           <div className="h-full bg-emerald-500" style={{ width: `${rc.correlation_strength * 100}%` }}></div>
                                       </div>
                                       <span className="text-[10px] font-black text-emerald-400">{(rc.correlation_strength * 100).toFixed(0)}%</span>
                                   </div>
                                </div>
                              ))}
                        </div>
                     </div>
                   ))}
                </div>
                <div className="space-y-6">
                   <h3 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-tight">
                      <Lightbulb size={22} className="text-amber-400" /> Strategic Directives
                   </h3>
                   <div className="grid grid-cols-1 gap-4">
                    {(intelligence?.intelligence.recommendations || []).map((rec, i) => (
                      <div key={i} className="bg-black/40 rounded-[32px] p-8 border border-white/5 hover:border-amber-500/30 transition-all shadow-2xl">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-black text-slate-100 uppercase text-xs tracking-widest">{rec.action}</h4>
                            <span className={`text-[9px] font-black uppercase ${
                                rec.priority === 'HIGH' ? 'text-rose-400' : 'text-amber-500/70'
                            }`}>{rec.priority} PRIORITY</span>
                          </div>
                          <p className="text-slate-400 text-[13px] leading-relaxed font-medium">{rec.description}</p>
                          <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                              <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Target: {rec.assigned_to}</span>
                              <ArrowRight size={14} className="text-slate-700" />
                          </div>
                      </div>
                    ))}
                   </div>
                </div>
            </div>
        </div>
      </section>
    </div>
  );
};
