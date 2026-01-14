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
}

export const Dashboard: React.FC<DashboardProps> = ({ userRecords = [] }) => {
  const [sanctions, setSanctions] = useState<any[]>([]);
  const [cryptoStable, setCryptoStable] = useState<any[]>([]);
  const [cryptoAlt, setCryptoAlt] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [intelligence, setIntelligence] = useState<IntelligenceData | null>(null);
  const [aiStatus, setAiStatus] = useState<AIStatus>('connecting');
  const [aiErrorMessage, setAiErrorMessage] = useState<string | null>(null);

  const generateHeuristicIntelligence = useCallback((sanctionsData: any[], cryptoData: any[]): IntelligenceData => {
    const topVolatile = [...cryptoData].sort((a, b) => Math.abs(b.change_24h) - Math.abs(a.change_24h)).slice(0, 2);
    return {
      correlations: [
        {
          entity_name: "[Local] Narrative Spike",
          correlation_type: "Heuristic Cross-Referencing",
          confidence: "Local Mode",
          risk_level: "HIGH",
          related_cryptos: topVolatile.map(c => ({
            symbol: c.symbol,
            name: c.name,
            correlation_strength: 0.85
          }))
        }
      ],
      intelligence: {
        total_correlations: 1,
        high_risk: 1,
        medium_risk: 0,
        recommendations: [
          {
            priority: "HIGH",
            action: "Apply Volatility Bands",
            description: "Local model detected unusual sentiment signals. Risk thresholds adjusted.",
            assigned_to: "Base Agent"
          }
        ]
      }
    };
  }, []);

  const runIntelligenceAnalysis = useCallback(async (sanctionsData: any[], cryptoData: any[]) => {
    setIsAnalyzing(true);
    setAiStatus('connecting');
    
    const heuristicData = generateHeuristicIntelligence(sanctionsData, cryptoData);
    setIntelligence(heuristicData);

    try {
      if (!process.env.API_KEY || process.env.API_KEY === 'undefined') {
         setAiStatus('fallback');
         setAiErrorMessage("AI Link Broken: API_KEY missing.");
         setIsAnalyzing(false);
         return;
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Act as a senior agentic intelligence strategist specializing in narrative-driven risk.
      
      INPUTS:
      - Global Sanctions Context: ${JSON.stringify(sanctionsData.slice(0, 5))}
      - Live Market Data: ${JSON.stringify(cryptoData.slice(0, 10))}
      - RECENT USER INTEL (PRIORITY): ${JSON.stringify(userRecords.slice(0, 5))}
      
      TASK:
      Correlate these datasets. If there are new user-defined news events, prioritize analyzing their impact on market volatility and sanction risk.
      
      Return a high-fidelity JSON analysis with 'correlations' and 'intelligence' recommendations.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
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
      if (!responseText) throw new Error("Empty payload.");

      let result: IntelligenceData = JSON.parse(responseText);
      const sources: GroundingSource[] = [];
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        chunks.forEach((chunk: any) => {
          if (chunk.web) {
            sources.push({ title: chunk.web.title || 'Source', uri: chunk.web.uri });
          }
        });
      }
      
      result.sources = sources;
      setIntelligence(result);
      setAiStatus('active');
      setAiErrorMessage(null);
    } catch (err: any) {
      setAiStatus('error');
      setAiErrorMessage(`AI Link Interrupted: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  }, [generateHeuristicIntelligence, userRecords]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [sanctionsRes, stableRes, altRes] = await Promise.all([
          fetch('data/sanctions.json').catch(() => fetch('./data/sanctions.json')),
          fetch('data/crypto_stable.json').catch(() => fetch('./data/crypto_stable.json')),
          fetch('data/crypto_alt.json').catch(() => fetch('./data/crypto_alt.json'))
        ]);
        if (!sanctionsRes.ok || !stableRes.ok || !altRes.ok) throw new Error('Sync Required');
        const [sanctionsData, stableData, altData] = await Promise.all([
          sanctionsRes.json(), stableRes.json(), altRes.json()
        ]);
        setSanctions(sanctionsData);
        setCryptoStable(stableData);
        setCryptoAlt(altData);
        runIntelligenceAnalysis(sanctionsData, [...stableData, ...altData]);
      } catch (err: any) {
        console.warn(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [runIntelligenceAnalysis]);

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
    <div className="max-w-[1800px] mx-auto space-y-8 animate-in fade-in zoom-in duration-500 pb-20">
      {/* Header */}
      <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[32px] p-8 text-center shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
         <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-200 via-white to-purple-200 mb-2 tracking-tight text-white">
           Multi-Agent AI Risk Dashboard
         </h1>
         <p className="text-slate-400 font-medium">Three-Tier Agentic Intelligence System | Real-time Global Monitoring</p>
         
         <div className="mt-4 flex items-center justify-center gap-4">
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 uppercase tracking-widest">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                Live Node Feed
            </span>
            <span className="text-[10px] font-bold text-slate-500 bg-white/5 px-3 py-1 rounded-full border border-white/5 uppercase tracking-widest">
                Nodes: Sanctions | Market | Intelligence
            </span>
         </div>
      </div>

      {/* TIER 1: ALERTS & MONITORING */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 px-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            <span className="text-xs font-bold tracking-[0.2em] text-purple-300 uppercase">Tier 1 • Monitoring Agent</span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative rounded-[40px] overflow-hidden p-1 bg-gradient-to-br from-purple-500/20 to-rose-500/20 border border-purple-500/30 shadow-[0_0_40px_rgba(168,85,247,0.2)] group">
             <div className="absolute inset-0 bg-black/40 backdrop-blur-3xl"></div>
             <div className="relative z-10 p-10 h-full flex flex-col lg:flex-row gap-10">
                <div className="lg:w-1/2 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-8">
                       <div className="p-3 rounded-2xl bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/30 shadow-lg">
                          <Database size={24} />
                       </div>
                       <div className="flex flex-col">
                          <h2 className="text-xl font-black text-white leading-none uppercase tracking-tight">Global Operational Feed</h2>
                          <span className="text-[10px] font-black text-purple-400/80 uppercase tracking-widest mt-1">Real-time sync</span>
                       </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <div className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-purple-200 tracking-tighter mb-2">
                        {isLoading ? "..." : sanctions.length}
                      </div>
                    </div>
                    <p className="text-purple-300/60 font-bold uppercase text-[10px] tracking-[0.2em]">Total entity updates verified across network</p>
                  </div>
                </div>
                <div className="lg:w-1/2 flex-1 relative flex items-center justify-center">
                  <div className="w-full h-full min-h-[300px] rounded-[32px] bg-gradient-to-br from-rose-500/10 to-transparent border border-rose-500/20 p-8 flex flex-col justify-center items-center text-center overflow-hidden">
                    <div className="absolute top-6 right-6 animate-pulse text-rose-500"><AlertTriangle size={24} /></div>
                    {topCountry ? (
                      <div className="animate-in fade-in zoom-in-95 duration-700 w-full flex flex-col items-center text-white">
                        <div className="text-[10px] font-black text-rose-400 uppercase tracking-[0.3em] mb-6">Territory Risk Hotspot</div>
                        <img 
                          src={`https://flagcdn.com/w160/${topCountry.code.toLowerCase()}.png`} 
                          alt={topCountry.code} 
                          className="w-32 h-auto rounded-2xl shadow-2xl border-4 border-white/10 mb-4"
                        />
                        <h3 className="text-3xl font-black uppercase">{getCountryName(topCountry.code)}</h3>
                      </div>
                    ) : <div className="text-slate-500 font-black uppercase text-xs">Analysis in progress...</div>}
                  </div>
                </div>
             </div>
          </div>

          <div className="relative rounded-[40px] overflow-hidden p-1 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 shadow-[0_0_40px_rgba(6,182,212,0.15)] group">
             <div className="absolute inset-0 bg-black/40 backdrop-blur-3xl"></div>
             <div className="relative z-10 p-10 h-full flex flex-col lg:flex-row gap-10">
                <div className="lg:w-1/2 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-8">
                       <div className="p-3 rounded-2xl bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/30 shadow-lg">
                          <Activity size={24} />
                       </div>
                       <div className="flex flex-col text-white">
                          <h2 className="text-xl font-black leading-none uppercase tracking-tight">Market Momentum</h2>
                          <span className="text-[10px] font-black text-cyan-400/80 uppercase tracking-widest mt-1">Asset Volatility Scan</span>
                       </div>
                    </div>
                    <div className="text-8xl font-black text-white tracking-tighter mb-2">{isLoading ? "..." : highVolatilityCount}</div>
                  </div>
                </div>
                <div className="lg:w-1/2 flex-1 relative flex items-center justify-center">
                  <div className="w-full h-full min-h-[300px] rounded-[32px] bg-gradient-to-br from-cyan-500/10 to-transparent border border-cyan-500/20 p-8 flex flex-col justify-center items-center text-center overflow-hidden">
                    <div className="absolute top-6 right-6 animate-pulse text-cyan-400"><Zap size={24} /></div>
                    {mostVolatileAsset ? (
                      <div className="animate-in fade-in zoom-in-95 duration-700 w-full flex flex-col items-center text-white">
                        <div className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.3em] mb-6">Momentum Spotlight</div>
                        <div className="w-32 h-32 rounded-full flex items-center justify-center text-5xl font-black bg-cyan-500/10 text-cyan-400 border border-white/10 mb-6">
                           {mostVolatileAsset.symbol}
                        </div>
                        <h3 className="text-3xl font-black uppercase">{mostVolatileAsset.name}</h3>
                        <div className={`text-[11px] font-black uppercase flex items-center gap-1.5 mt-2 ${mostVolatileAsset.change_24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                           {Math.abs(mostVolatileAsset.change_24h).toFixed(2)}% Velocity
                        </div>
                      </div>
                    ) : <div className="text-slate-500 font-black uppercase text-xs">Scanning markets...</div>}
                  </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* TIER 2: ANALYSIS WIDGETS */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 px-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            <span className="text-xs font-bold tracking-[0.2em] text-blue-300 uppercase">Tier 2 • Analysis Agent</span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          <div className="bg-black/30 backdrop-blur-xl border-l-4 border-emerald-500 rounded-r-[40px] rounded-l-md p-8 h-[500px] flex flex-col shadow-2xl">
             <h3 className="font-black text-xl text-emerald-100 flex items-center gap-2 uppercase tracking-tight mb-6 text-white">
                <ShieldAlert size={20} className="text-emerald-500" />
                Sanctions Log
             </h3>
             <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {sanctions.map((item, i) => <EntityRow key={i} item={item} type="add" />)}
             </div>
          </div>
          <div className="space-y-6">
             <div className="bg-black/30 backdrop-blur-xl border-l-4 border-amber-500 rounded-r-[40px] rounded-l-md p-8 h-[240px] flex flex-col shadow-2xl">
                <h3 className="font-black text-xl text-amber-100 flex items-center gap-2 uppercase tracking-tight mb-4 text-white">
                   <Bitcoin size={20} className="text-amber-500" />
                   Crypto Coins
                </h3>
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                   {cryptoStable.map((item, i) => <CryptoRow key={i} item={item} />)}
                </div>
             </div>
             <div className="bg-black/30 backdrop-blur-xl border-l-4 border-indigo-500 rounded-r-[40px] rounded-l-md p-8 h-[240px] flex flex-col shadow-2xl">
                <h3 className="font-black text-xl text-indigo-100 flex items-center gap-2 uppercase tracking-tight mb-4 text-white">
                   <Globe size={20} className="text-indigo-500" />
                   Crypto Tokens
                </h3>
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                   {cryptoAlt.map((item, i) => <CryptoRow key={i} item={item} />)}
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* TIER 3: INTELLIGENCE */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 px-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            <span className="text-xs font-bold tracking-[0.2em] text-emerald-300 uppercase">Tier 3 • Intelligence Agent</span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
        </div>

        <div className="bg-gradient-to-br from-emerald-900/40 to-teal-900/40 backdrop-blur-3xl border border-emerald-500/20 rounded-[40px] p-10 shadow-2xl relative overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    {aiStatus === 'active' ? (
                      <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
                         <ShieldCheck size={16} className="text-emerald-400" />
                         <span className="text-[10px] font-black text-emerald-200 uppercase tracking-widest">Live AI Agent Linked</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-full">
                         <WifiOff size={16} className="text-amber-400" />
                         <span className="text-[10px] font-black text-amber-200 uppercase tracking-widest">Heuristic Fallback Active</span>
                      </div>
                    )}
                </div>
                {isAnalyzing && (
                  <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-full animate-pulse">
                    <Loader2 size={16} className="text-emerald-400 animate-spin" />
                    <p className="text-[10px] font-black text-emerald-200 uppercase tracking-widest">Analyzing Live Data...</p>
                  </div>
                )}
            </div>

            {aiErrorMessage && (
              <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-3">
                  <AlertCircle size={18} className="text-rose-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-rose-200 font-mono">{aiErrorMessage}</p>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-10">
                   <div>
                      <h3 className="text-2xl font-black text-white mb-6 flex items-center gap-3 uppercase tracking-tight">
                         <LinkIcon size={24} className="text-emerald-400" />
                         Detected Correlations
                      </h3>
                      <div className="space-y-6">
                         {(intelligence?.correlations || []).map((corr, i) => (
                           <div key={i} className="bg-black/40 rounded-[32px] p-8 border-l-8 border-emerald-500 shadow-2xl">
                              <div className="flex justify-between items-start mb-1">
                                 <h4 className="font-black text-white text-xl">{corr.entity_name}</h4>
                                 <span className={`px-3 py-1 text-[10px] font-black rounded-full border uppercase ${
                                   corr.risk_level === 'HIGH' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 
                                   'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                 }`}>{corr.risk_level} RISK</span>
                              </div>
                              <p className="text-xs text-emerald-400 font-bold uppercase mb-4 opacity-80">Narrative Analytics Trigger</p>
                              <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                                    {corr.related_cryptos.map((rc, j) => (
                                      <div key={j} className="bg-white/5 rounded-2xl p-4 flex justify-between items-center text-white">
                                         <span className="text-sm font-black">{rc.symbol} - {rc.name}</span>
                                         <span className="text-[10px] font-black text-emerald-400 uppercase">Impact: {(rc.correlation_strength * 100).toFixed(0)}%</span>
                                      </div>
                                    ))}
                              </div>
                           </div>
                         ))}
                      </div>
                   </div>
                   <div>
                      <h3 className="text-2xl font-black text-white mb-6 flex items-center gap-3 uppercase tracking-tight">
                         💡 Actionable Intelligence
                      </h3>
                      <div className="space-y-6">
                         {(intelligence?.intelligence.recommendations || []).map((rec, i) => (
                           <div key={i} className="bg-black/40 rounded-[32px] p-8 border border-white/10 hover:border-emerald-500/30 transition-all shadow-2xl">
                              <h4 className="font-black text-slate-100 text-lg uppercase mb-4">
                                 [{rec.priority}] {rec.action}
                              </h4>
                              <p className="text-slate-400 text-sm mb-6 leading-relaxed font-medium">{rec.description}</p>
                              <div className="flex items-center justify-between pt-5 border-t border-white/5 text-[10px] text-slate-500 font-black uppercase">
                                 <span className="flex items-center gap-2"><BrainCircuit size={14} /> Agent: {rec.assigned_to}</span>
                                 <button className="text-emerald-400 flex items-center gap-2 hover:text-emerald-300 transition-colors uppercase">EXECUTE <ArrowRight size={14} /></button>
                              </div>
                           </div>
                         ))}
                      </div>
                   </div>
                </div>
            </div>
        </div>
      </section>
    </div>
  );
};
