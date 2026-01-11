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
  RefreshCw
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";

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
interface IntelligenceData {
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

export const Dashboard: React.FC = () => {
  const [sanctions, setSanctions] = useState<any[]>([]);
  const [cryptoStable, setCryptoStable] = useState<any[]>([]);
  const [cryptoAlt, setCryptoAlt] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [intelligence, setIntelligence] = useState<IntelligenceData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runIntelligenceAnalysis = useCallback(async (sanctionsData: any[], cryptoData: any[]) => {
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const prompt = `Perform a high-level strategic intelligence analysis.
      Context: 
      - Sanctions List: ${JSON.stringify(sanctionsData)}
      - Crypto Market: ${JSON.stringify(cryptoData)}
      - Task: Generate smart strategic insights. Identify correlations between sanctioned entities/countries and specific crypto assets. 
      - Tone: Diplomatic, professional, institutional.
      - External Context: Consider current global affairs, geopolitical tensions, and recent financial news.
      - Goal: Provide 2 key correlations and 2-3 strategic recommendations for an investment risk profile.`;

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
                    risk_level: { type: Type.STRING, description: 'Must be LOW, MEDIUM, or HIGH' }
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

      const result = JSON.parse(response.text);
      setIntelligence(result);
    } catch (err) {
      console.error("AI Analysis Error:", err);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [sanctionsRes, stableRes, altRes] = await Promise.all([
          fetch('./data/sanctions.json'),
          fetch('./data/crypto_stable.json'),
          fetch('./data/crypto_alt.json')
        ]);

        if (!sanctionsRes.ok || !stableRes.ok || !altRes.ok) {
          throw new Error('System sync required');
        }

        const [sanctionsData, stableData, altData] = await Promise.all([
          sanctionsRes.json(),
          stableRes.json(),
          altRes.json()
        ]);

        setSanctions(sanctionsData);
        setCryptoStable(stableData);
        setCryptoAlt(altData);

        // Run intelligence analysis once data is loaded
        const combinedCrypto = [...stableData, ...altData];
        runIntelligenceAnalysis(sanctionsData, combinedCrypto);
      } catch (err: any) {
        console.warn("Failed to fetch JSON data:", err.message);
        setError("Initializing data intelligence nodes...");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [runIntelligenceAnalysis]);

  // Calculate dynamic stats from the data
  const allCrypto = useMemo(() => [...cryptoStable, ...cryptoAlt], [cryptoStable, cryptoAlt]);
  const highVolatilityCount = useMemo(() => allCrypto.filter(c => Math.abs(c.change_24h) > 5).length, [allCrypto]);
  const stableAvgChange = useMemo(() => cryptoStable.reduce((acc, c) => acc + c.change_24h, 0) / (cryptoStable.length || 1), [cryptoStable]);
  const altAvgChange = useMemo(() => cryptoAlt.reduce((acc, c) => acc + c.change_24h, 0) / (cryptoAlt.length || 1), [cryptoAlt]);

  // Identify Most Volatile Asset
  const mostVolatileAsset = useMemo(() => {
    if (allCrypto.length === 0) return null;
    return [...allCrypto].sort((a, b) => Math.abs(b.change_24h) - Math.abs(a.change_24h))[0];
  }, [allCrypto]);

  // Country Risk Analysis
  const { topCountry } = useMemo(() => {
    const freq: Record<string, number> = {};
    sanctions.forEach(s => {
      if (s.country_code) {
        freq[s.country_code] = (freq[s.country_code] || 0) + 1;
      }
    });

    const entries = Object.entries(freq);
    const sorted = entries.sort((a, b) => b[1] - a[1]);
    
    return { 
      topCountry: sorted.length > 0 ? { code: sorted[0][0], count: sorted[0][1] } : null 
    };
  }, [sanctions]);

  return (
    <div className="max-w-[1800px] mx-auto space-y-8 animate-in fade-in zoom-in duration-500">
      
      {/* Header */}
      <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[32px] p-8 text-center shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
         <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-200 via-white to-purple-200 mb-2 tracking-tight">
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

      {/* TIER 1: ALERTS */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 px-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            <span className="text-xs font-bold tracking-[0.2em] text-purple-300 uppercase">Tier 1 • Monitoring Agent</span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Sanctions Card - HEATMAP */}
          <div className="relative rounded-[40px] overflow-hidden p-1 bg-gradient-to-br from-purple-500/20 to-rose-500/20 border border-purple-500/30 shadow-[0_0_40px_rgba(168,85,247,0.2)] group">
             <div className="absolute inset-0 bg-black/40 backdrop-blur-3xl"></div>
             
             <div className="relative z-10 p-10 h-full flex flex-col lg:flex-row gap-10">
                {/* Left: Global Stats */}
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

                  <div className="grid grid-cols-2 gap-4 mt-10">
                    <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/5">
                        <div className="text-2xl font-black text-white">{isLoading ? "-" : sanctions.length}</div>
                        <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">Verified Adds</div>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/5">
                        <div className="text-2xl font-black text-slate-500">0</div>
                        <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">Deletions</div>
                    </div>
                  </div>
                </div>

                {/* Right: High Impact Risk Heatmap - CENTERED FLAG */}
                <div className="lg:w-1/2 flex-1 relative flex items-center justify-center">
                  <div className="w-full h-full min-h-[300px] rounded-[32px] bg-gradient-to-br from-rose-500/10 to-transparent border border-rose-500/20 p-8 flex flex-col justify-center items-center text-center overflow-hidden">
                    <div className="absolute top-6 right-6 animate-pulse">
                      <AlertTriangle size={24} className="text-rose-500" />
                    </div>
                    
                    {topCountry ? (
                      <div className="animate-in fade-in zoom-in-95 duration-700 w-full flex flex-col items-center">
                        <div className="text-[10px] font-black text-rose-400 uppercase tracking-[0.3em] mb-6">Territory Risk Hotspot</div>
                        
                        <div className="relative mb-8 flex items-center justify-center">
                           <div className="absolute w-40 h-40 bg-rose-500/20 blur-[60px] rounded-full"></div>
                           <img 
                              src={`https://flagcdn.com/w160/${topCountry.code.toLowerCase()}.png`} 
                              alt={topCountry.code} 
                              className="w-32 h-auto relative z-10 rounded-2xl shadow-2xl border-4 border-white/10 ring-8 ring-rose-500/10 transition-transform duration-500 hover:scale-105"
                            />
                        </div>

                        <h3 className="text-3xl font-black text-white tracking-tight mb-2 uppercase">{getCountryName(topCountry.code)}</h3>
                        <div className="inline-flex items-center gap-2 bg-rose-500/20 px-4 py-1.5 rounded-full border border-rose-500/30 mb-8">
                           <span className="text-rose-300 text-[11px] font-black uppercase tracking-wider">{topCountry.count} Targeted Actions Detected</span>
                        </div>

                        <div className="bg-black/60 backdrop-blur-md rounded-2xl p-5 border border-rose-500/20 w-full shadow-2xl">
                           <div className="flex items-center justify-center gap-2 text-rose-200">
                             <ShieldAlert size={14} className="shrink-0" />
                             <p className="text-[11px] font-black uppercase tracking-tight">
                                CRITICAL: High Exposure Zone
                             </p>
                           </div>
                           <p className="text-[9px] text-rose-400/60 font-black uppercase tracking-[0.2em] mt-2">
                              INVESTMENT REVIEW REQUIRED
                           </p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-slate-500 font-black uppercase text-xs">Analysis in progress...</div>
                    )}
                  </div>
                </div>
             </div>
          </div>

          {/* Market momentum Card - MOMENTUM HEATMAP */}
          <div className="relative rounded-[40px] overflow-hidden p-1 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 shadow-[0_0_40px_rgba(6,182,212,0.15)] group">
             <div className="absolute inset-0 bg-black/40 backdrop-blur-3xl"></div>
             
             <div className="relative z-10 p-10 h-full flex flex-col lg:flex-row gap-10">
                {/* Left: Global Momentum Stats */}
                <div className="lg:w-1/2 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-8">
                       <div className="p-3 rounded-2xl bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/30 shadow-lg">
                          <Activity size={24} />
                       </div>
                       <div className="flex flex-col">
                          <h2 className="text-xl font-black text-white leading-none uppercase tracking-tight">Market Momentum</h2>
                          <span className="text-[10px] font-black text-cyan-400/80 uppercase tracking-widest mt-1">Asset Volatility Scan</span>
                       </div>
                    </div>
                    
                    <div className="flex items-baseline gap-2">
                      <div className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-cyan-200 tracking-tighter mb-2">
                        {isLoading ? "..." : highVolatilityCount}
                      </div>
                    </div>
                    <p className="text-cyan-300/60 font-bold uppercase text-[10px] tracking-[0.2em]">High Impact Volatility Targets Detected</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-10">
                    <div className={`bg-white/5 rounded-2xl p-4 text-center border border-white/5`}>
                        <div className={`text-2xl font-black ${stableAvgChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isLoading ? "-" : `${stableAvgChange.toFixed(1)}%`}
                        </div>
                        <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">Stability Index</div>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/5">
                        <div className={`text-2xl font-black ${altAvgChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isLoading ? "-" : `${altAvgChange.toFixed(1)}%`}
                        </div>
                        <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">Alt Asset Avg</div>
                    </div>
                  </div>
                </div>

                {/* Right: Asset Volatility Spotlight */}
                <div className="lg:w-1/2 flex-1 relative flex items-center justify-center">
                  <div className="w-full h-full min-h-[300px] rounded-[32px] bg-gradient-to-br from-cyan-500/10 to-transparent border border-cyan-500/20 p-8 flex flex-col justify-center items-center text-center overflow-hidden">
                    <div className="absolute top-6 right-6 animate-pulse">
                      <Zap size={24} className="text-cyan-400" />
                    </div>
                    
                    {mostVolatileAsset ? (
                      <div className="animate-in fade-in zoom-in-95 duration-700 w-full flex flex-col items-center">
                        <div className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.3em] mb-6">Momentum Spotlight</div>
                        
                        <div className="relative mb-8 flex items-center justify-center">
                           <div className={`absolute w-40 h-40 blur-[60px] rounded-full ${mostVolatileAsset.change_24h >= 0 ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}></div>
                           <div className={`
                              w-32 h-32 relative z-10 rounded-full flex items-center justify-center text-5xl font-black shadow-2xl border-4 border-white/10 ring-8 
                              ${mostVolatileAsset.change_24h >= 0 ? 'bg-emerald-500/20 text-emerald-400 ring-emerald-500/10' : 'bg-rose-500/20 text-rose-400 ring-rose-500/10'}
                              transition-transform duration-500 hover:scale-110
                           `}>
                              {mostVolatileAsset.symbol}
                           </div>
                        </div>

                        <h3 className="text-3xl font-black text-white tracking-tight mb-2 uppercase">{mostVolatileAsset.name}</h3>
                        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mb-8 ${
                          mostVolatileAsset.change_24h >= 0 ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-rose-500/20 border-rose-500/30'
                        }`}>
                           <span className={`text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                             mostVolatileAsset.change_24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
                           }`}>
                             {mostVolatileAsset.change_24h >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                             {Math.abs(mostVolatileAsset.change_24h).toFixed(2)}% Daily Velocity
                           </span>
                        </div>

                        <div className="bg-black/60 backdrop-blur-md rounded-2xl p-5 border border-white/5 w-full shadow-2xl">
                           <div className="flex items-center justify-center gap-2 text-cyan-200">
                             <Activity size={14} className="shrink-0" />
                             <p className="text-[11px] font-black uppercase tracking-tight">
                                CRITICAL: High Volatility Node
                             </p>
                           </div>
                           <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em] mt-2">
                              LIQUIDITY REVIEW RECOMMENDED
                           </p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-slate-500 font-black uppercase text-xs">Scanning markets...</div>
                    )}
                  </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* TIER 2: ANALYSIS */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 px-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            <span className="text-xs font-bold tracking-[0.2em] text-blue-300 uppercase">Tier 2 • Analysis Agent</span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {/* Sanctions Analysis Column */}
          <div className="space-y-6">
            <div className="bg-black/30 backdrop-blur-xl border-l-4 border-emerald-500 rounded-r-[40px] rounded-l-md p-8 h-[624px] flex flex-col relative overflow-hidden shadow-2xl">
               <div className="flex justify-between items-center mb-6">
                  <div className="flex flex-col">
                    <h3 className="font-black text-xl text-emerald-100 flex items-center gap-2 uppercase tracking-tight">
                      <ShieldAlert size={20} className="text-emerald-500" />
                      Detailed Sanctions List
                    </h3>
                    {topCountry && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <MapPin size={12} className="text-emerald-400" />
                        <span className="text-[11px] uppercase font-black tracking-widest text-emerald-400/80">
                           Focus Zone: {getCountryName(topCountry.code)}
                        </span>
                      </div>
                    )}
                  </div>
                  <span className="bg-emerald-500 text-white px-3 py-1 rounded-xl text-sm font-black shrink-0 shadow-lg">{sanctions.length}</span>
               </div>
               
               <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-500">
                      <Loader2 className="animate-spin" size={24} />
                      <span className="text-xs font-black uppercase tracking-widest">Polling secure nodes...</span>
                    </div>
                  ) : error ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center px-4">
                      <Database size={32} className="mb-2 opacity-20" />
                      <span className="text-xs font-black uppercase tracking-widest text-rose-400">{error}</span>
                    </div>
                  ) : (
                    sanctions.map((item, i) => (
                      <EntityRow 
                        key={i} 
                        item={item} 
                        type="add" 
                      />
                    ))
                  )}
               </div>
            </div>
          </div>

          {/* Crypto Analysis Column */}
          <div className="space-y-6">
             {/* BTC & Stable */}
             <div className="bg-black/30 backdrop-blur-xl border-l-4 border-amber-500 rounded-r-[40px] rounded-l-md p-8 h-[300px] flex flex-col shadow-2xl">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="font-black text-xl text-amber-100 flex items-center gap-2 uppercase tracking-tight">
                    <Bitcoin size={20} className="text-amber-500" />
                    Market Caps
                  </h3>
                  <span className="bg-amber-500/20 text-amber-400 px-3 py-1 rounded-xl text-sm font-black shadow-lg">{cryptoStable.length}</span>
               </div>
               <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-500">
                      <Loader2 className="animate-spin" size={16} />
                    </div>
                  ) : (
                    cryptoStable.map((item, i) => (
                      <CryptoRow key={i} item={item} />
                    ))
                  )}
               </div>
            </div>

            {/* Altcoins */}
            <div className="bg-black/30 backdrop-blur-xl border-l-4 border-indigo-500 rounded-r-[40px] rounded-l-md p-8 h-[300px] flex flex-col shadow-2xl">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="font-black text-xl text-indigo-100 flex items-center gap-2 uppercase tracking-tight">
                    <Globe size={20} className="text-indigo-500" />
                    Emerging Alts
                  </h3>
                  <span className="bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-xl text-sm font-black shadow-lg">{cryptoAlt.length}</span>
               </div>
               <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-500">
                      <Loader2 className="animate-spin" size={16} />
                    </div>
                  ) : (
                    cryptoAlt.map((item, i) => (
                      <CryptoRow key={i} item={item} />
                    ))
                  )}
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
            {isAnalyzing && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-md z-50 flex flex-col items-center justify-center gap-4 transition-all duration-500">
                <RefreshCw size={48} className="text-emerald-400 animate-spin" />
                <div className="text-center">
                  <p className="text-xl font-black text-white uppercase tracking-widest">Generating AI Intelligence</p>
                  <p className="text-xs text-emerald-300/60 font-black uppercase tracking-[0.3em] mt-2">Consulting Global Knowledge Graph...</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-6 mb-10">
                <div className="text-center p-6 bg-black/30 rounded-3xl border border-white/5 shadow-inner">
                   <div className="text-4xl font-black text-emerald-400">{intelligence?.intelligence.total_correlations || 0}</div>
                   <div className="text-[10px] text-slate-500 font-black uppercase mt-1 tracking-widest">Detected Patterns</div>
                </div>
                <div className="text-center p-6 bg-black/30 rounded-3xl border border-white/5 shadow-inner">
                   <div className="text-4xl font-black text-rose-500">{intelligence?.intelligence.high_risk || 0}</div>
                   <div className="text-[10px] text-slate-500 font-black uppercase mt-1 tracking-widest">Actionable Risks</div>
                </div>
                <div className="text-center p-6 bg-black/30 rounded-3xl border border-white/5 shadow-inner">
                   <div className="text-4xl font-black text-amber-400">{intelligence?.intelligence.medium_risk || 0}</div>
                   <div className="text-[10px] text-slate-500 font-black uppercase mt-1 tracking-widest">Moderate Alerts</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div>
                   <h3 className="text-2xl font-black text-white mb-6 flex items-center gap-3 tracking-tight uppercase">
                      <LinkIcon size={24} className="text-emerald-400" />
                      Sector Interoperability
                   </h3>
                   <div className="space-y-6">
                      {intelligence?.correlations.map((corr, i) => (
                        <div key={i} className="bg-black/40 rounded-[32px] p-8 border-l-8 border-emerald-500 shadow-2xl">
                           <div className="flex justify-between items-start mb-4">
                              <h4 className="font-black text-white text-xl tracking-tight">{corr.entity_name}</h4>
                              <span className={`px-3 py-1 text-[10px] font-black rounded-full border uppercase tracking-widest ${
                                corr.risk_level === 'HIGH' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 
                                corr.risk_level === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                                'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              }`}>{corr.risk_level} RISK</span>
                           </div>
                           <div className="text-[11px] text-slate-500 font-black uppercase tracking-widest mb-4">
                              Pattern: <span className="text-emerald-300">{corr.correlation_type}</span> • Confidence: {corr.confidence}
                           </div>
                           <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
                              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">Linked Assets Under Scan</div>
                              {corr.related_cryptos.map((rc, j) => (
                                <div key={j} className="flex justify-between text-sm py-1">
                                   <span className="text-white font-bold">{rc.symbol} - {rc.name}</span>
                                   <span className="text-emerald-400 font-black">{(rc.correlation_strength * 100).toFixed(0)}% STRENGTH</span>
                                </div>
                              ))}
                           </div>
                        </div>
                      ))}
                      {!intelligence && !isAnalyzing && (
                         <p className="text-slate-500 text-sm font-black uppercase text-center p-10 border border-dashed border-white/5 rounded-[32px]">No patterns analyzed.</p>
                      )}
                   </div>
                </div>

                <div>
                   <h3 className="text-2xl font-black text-white mb-6 flex items-center gap-3 tracking-tight uppercase">
                      <Lightbulb size={24} className="text-yellow-400" />
                      Strategic Insights
                   </h3>
                   <div className="space-y-6">
                      {intelligence?.intelligence.recommendations.map((rec, i) => (
                        <div key={i} className="bg-black/40 rounded-[32px] p-8 border border-white/10 hover:border-emerald-500/30 transition-all duration-500 shadow-2xl group">
                           <div className="flex items-center gap-3 mb-4">
                              <span className="px-3 py-1 bg-white/10 text-white text-[9px] font-black rounded-full uppercase tracking-widest">{rec.priority}</span>
                              <h4 className="font-black text-slate-100 text-lg uppercase tracking-tight">{rec.action}</h4>
                           </div>
                           <p className="text-slate-400 text-sm mb-6 leading-relaxed font-medium">{rec.description}</p>
                           <div className="flex items-center justify-between pt-5 border-t border-white/5">
                              <span className="text-[10px] text-slate-500 font-black flex items-center gap-2 uppercase tracking-widest">
                                 <BrainCircuit size={14} /> Agent: {rec.assigned_to}
                              </span>
                              <button className="text-[11px] font-black text-emerald-400 flex items-center gap-2 hover:text-emerald-300 transition-colors uppercase tracking-widest">
                                 Initiate Protocol <ArrowRight size={14} />
                              </button>
                           </div>
                        </div>
                      ))}
                      {!intelligence && !isAnalyzing && (
                        <p className="text-slate-500 text-sm font-black uppercase text-center p-10 border border-dashed border-white/5 rounded-[32px]">Consulting intelligence nodes...</p>
                      )}
                   </div>
                </div>
            </div>
        </div>
      </section>

      <div className="text-center pb-12 pt-6">
         <div className="inline-block px-6 py-3 rounded-full bg-black/40 backdrop-blur-3xl border border-white/10 text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] shadow-2xl">
            System Synchronization: {new Date().toLocaleTimeString()} | Multi-Agent AI Ops v1.4
         </div>
      </div>
    </div>
  );
};