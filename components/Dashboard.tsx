
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
    if (sanctionsData.length === 0 || cryptoData.length === 0) return;

    // Aggressive API key sanitization to avoid header encoding issues
    const sanitizeKey = (key: any) => {
      if (!key) return '';
      const str = String(key).trim().replace(/[\n\r\t]/g, '');
      return (str === 'undefined' || str === 'null') ? '' : str;
    };

    const envKey = sanitizeKey(process.env.API_KEY);
    const manualKey = sanitizeKey(userApiKey);
    const effectiveApiKey = manualKey || envKey;

    if (!effectiveApiKey) {
      setAiStatus('fallback');
      setIntelligence(generateHeuristicIntelligence(sanctionsData, cryptoData));
      return;
    }

    setIsAnalyzing(true);
    setAiStatus('connecting');
    
    try {
      const ai = new GoogleGenAI({ apiKey: effectiveApiKey });
      
      const tokenSummary = cryptoData.map(c => `${c.name} (${c.symbol}) Price: $${c.price}, 24h: ${c.change_24h}%`).join('; ');
      const entitySummary = sanctionsData.slice(0, 8).map(s => `${s.name} (${s.country_code})`).join('; ');

      const prompt = `Act as a senior Crypto Forensic AI. Cross-correlate these global datasets for systemic risk and return a detailed intelligence assessment based on current affairs for these specific tokens.
      
      GLOBAL SANCTIONS (from registry): ${entitySummary}
      MARKET PORTFOLIO (from CSV): ${tokenSummary}
      
      Analyze:
      1. Institutional flow anomalies for major coins like Bitcoin, Ethereum, Solana.
      2. Regulatory pressure on Stablecoins (USDT, USDC).
      3. Project-specific current affairs for alt-tokens (LINK, SUI, HYPE, NEAR, etc.) in relation to global entities.
      4. Risk of money laundering or obfuscation via high-volatility tokens.
      
      You MUST return the output strictly in JSON format matching the schema exactly.`;

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
      if (!responseText) throw new Error("Empty AI signal");

      const result: IntelligenceData = JSON.parse(responseText);
      setIntelligence(result);
      setAiStatus('active');
    } catch (err: any) {
      console.error("Tier 3 Agent Intelligence Error:", err);
      setAiStatus('error');
      // On failure, we show heuristic fallback so UI isn't broken
      if (!intelligence) {
        setIntelligence(generateHeuristicIntelligence(sanctionsData, cryptoData));
      }
    } finally {
      setIsAnalyzing(false);
    }
  }, [userApiKey, generateHeuristicIntelligence, intelligence]);

  // Data Loading
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [sanctionsRes, stableRes, altRes] = await Promise.all([
          fetch('data/sanctions.json').catch(() => fetch('./data/sanctions.json')),
          fetch('data/crypto_stable.json').catch(() => fetch('./data/crypto_stable.json')),
          fetch('data/crypto_alt.json').catch(() => fetch('./data/crypto_alt.json'))
        ]);
        if (!sanctionsRes.ok || !stableRes.ok || !altRes.ok) throw new Error('CSV Link Failure');
        const [sanctionsData, stableData, altData] = await Promise.all([
          sanctionsRes.json(), stableRes.json(), altRes.json()
        ]);
        setSanctions(sanctionsData);
        setCryptoStable(stableData);
        setCryptoAlt(altData);
      } catch (err) {
        console.warn("Dashboard sync error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Sync analysis when data or key changes
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
      {/* Header */}
      <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[32px] p-8 text-center shadow-2xl relative overflow-hidden group">
         <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-emerald-500 to-indigo-500"></div>
         <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-200 via-white to-emerald-200 mb-2 tracking-tight text-white group-hover:scale-[1.01] transition-transform duration-700">
           DWA Market Intelligence
         </h1>
         <p className="text-slate-400 font-medium opacity-80 uppercase tracking-widest text-[10px] font-black">AI Risk Synthesis | CSV & Real-time Integration</p>
      </div>

      {/* Tier 1 Feeds */}
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
                        <p className="text-[10px] text-rose-400 font-black uppercase mt-2 tracking-widest">{topCountry.count} Entities Logged</p>
                      </div>
                    ) : <div className="text-slate-500 font-black uppercase text-xs">Waiting for Data Sync...</div>}
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
                          <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mt-1">Active Volatility</span>
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
                           {Math.abs(mostVolatileAsset.change_24h).toFixed(2)}% Intensity
                        </div>
                      </div>
                    ) : <div className="text-slate-500 font-black uppercase text-xs">Scanning CSV Node...</div>}
                  </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Tier 2 Data Registry */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 px-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
            <span className="text-[10px] font-black tracking-[0.3em] text-slate-500 uppercase">Tier 2 • Analysis</span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          <div className="bg-black/40 backdrop-blur-xl border border-white/5 rounded-[40px] p-8 h-[600px] flex flex-col shadow-2xl overflow-hidden">
             <h3 className="font-black text-sm text-white flex items-center gap-2 uppercase tracking-widest mb-6 text-rose-400">
                <ShieldAlert size={16} />
                Sanctions Registry
             </h3>
             <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {sanctions.length > 0 ? sanctions.map((item, i) => <EntityRow key={i} item={item} type="add" />) : <div className="p-10 text-center opacity-20"><Loader2 className="animate-spin mx-auto" /></div>}
             </div>
          </div>

          <div className="flex flex-col gap-6 h-[600px]">
             <div className="bg-black/40 backdrop-blur-xl border border-white/5 rounded-[40px] p-8 flex-1 flex flex-col shadow-2xl overflow-hidden group">
                <h3 className="font-black text-sm text-white flex items-center gap-2 uppercase tracking-widest mb-4 text-amber-400">
                   <Bitcoin size={16} />
                   Market Coins
                </h3>
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                   {cryptoStable.map((item, i) => <CryptoRow key={i} item={item} />)}
                </div>
             </div>
             
             <div className="bg-black/40 backdrop-blur-xl border border-white/5 rounded-[40px] p-8 flex-1 flex flex-col shadow-2xl overflow-hidden group">
                <h3 className="font-black text-sm text-white flex items-center gap-2 uppercase tracking-widest mb-4 text-indigo-400">
                   <Globe size={16} />
                   Network Tokens
                </h3>
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                   {cryptoAlt.map((item, i) => <CryptoRow key={i} item={item} />)}
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Tier 3 Intelligence Agent */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 px-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
            <span className="text-[10px] font-black tracking-[0.3em] text-slate-500 uppercase">Tier 3 • Intelligence Agent</span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
        </div>

        <div className={`bg-white/5 backdrop-blur-3xl border rounded-[40px] p-10 shadow-2xl relative overflow-hidden transition-all duration-700 ${
            aiStatus === 'active' ? 'border-emerald-500/30 bg-emerald-500/[0.02]' : 'border-white/10'
        }`}>
            {/* Ambient Background */}
            <div className={`absolute -bottom-32 -right-32 w-96 h-96 rounded-full blur-[140px] opacity-[0.08] transition-colors duration-1000 ${
                aiStatus === 'active' ? 'bg-emerald-500' : 'bg-blue-500'
            }`}></div>

            <div className="flex flex-wrap items-center justify-between gap-6 mb-12 relative z-10">
                <div className="flex items-center gap-4">
                    {aiStatus === 'active' ? (
                      <div className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                         <ShieldCheck size={20} className="text-emerald-400" />
                         <span className="text-[11px] font-black text-emerald-200 uppercase tracking-[0.2em]">Neural Node Verified</span>
                      </div>
                    ) : aiStatus === 'fallback' ? (
                      <div className="flex items-center gap-2 px-6 py-2.5 bg-amber-500/10 border border-amber-500/30 rounded-full">
                         <WifiOff size={20} className="text-amber-400" />
                         <span className="text-[11px] font-black text-amber-200 uppercase tracking-[0.2em]">Heuristic Fallback</span>
                      </div>
                    ) : aiStatus === 'connecting' ? (
                      <div className="flex items-center gap-2 px-6 py-2.5 bg-blue-500/10 border border-blue-500/30 rounded-full">
                         <Loader2 size={20} className="text-blue-400 animate-spin" />
                         <span className="text-[11px] font-black text-blue-200 uppercase tracking-[0.2em]">Establishing Connection...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-6 py-2.5 bg-rose-500/10 border border-rose-500/30 rounded-full shadow-[0_0_20px_rgba(244,63,94,0.1)]">
                         <AlertCircle size={20} className="text-rose-400" />
                         <span className="text-[11px] font-black text-rose-200 uppercase tracking-[0.2em]">Agent Offline (Check Settings)</span>
                      </div>
                    )}
                </div>

                <div className="flex items-center gap-3">
                  {isAnalyzing && (
                    <div className="flex items-center gap-3 px-6 py-2.5 bg-blue-500/10 border border-blue-500/30 rounded-full animate-pulse">
                      <span className="text-[11px] font-black text-blue-200 uppercase tracking-[0.2em]">Processing Node Inference...</span>
                    </div>
                  )}
                  <button 
                    onClick={() => runIntelligenceAnalysis(sanctions, allCrypto)}
                    className="p-3 bg-white/5 border border-white/10 rounded-full text-white hover:bg-white/10 transition-all hover:scale-110 active:rotate-180 duration-500 shadow-xl"
                    title="Force Global Risk Sync"
                  >
                    <RefreshCw size={18} className={isAnalyzing ? 'animate-spin' : ''} />
                  </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 relative z-10">
                <div className="space-y-6">
                   <h3 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-tight mb-8">
                      <LinkIcon size={22} className="text-emerald-400" /> Forensic Correlations
                   </h3>
                   
                   {(!intelligence || intelligence.correlations.length === 0) && !isAnalyzing && (
                       <div className="p-16 border border-dashed border-white/10 rounded-[32px] text-center text-slate-600 font-bold uppercase text-xs tracking-[0.3em] bg-black/20">
                           Waiting for Node Activation...
                       </div>
                   )}

                   {(intelligence?.correlations || []).map((corr, i) => (
                     <div key={i} className="bg-black/60 rounded-[32px] p-8 border border-white/5 border-l-8 border-l-emerald-500 shadow-2xl group hover:bg-black/70 transition-all hover:-translate-y-1">
                        <div className="flex justify-between items-start mb-8">
                           <div>
                              <h4 className="font-black text-white text-xl tracking-tight mb-1">{corr.entity_name}</h4>
                              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{corr.correlation_type}</p>
                           </div>
                           <span className={`px-4 py-1.5 text-[10px] font-black rounded-full border uppercase tracking-widest ${
                             corr.risk_level === 'HIGH' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 
                             'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                           }`}>{corr.risk_level} IMPACT</span>
                        </div>
                        <div className="space-y-3">
                              {corr.related_cryptos.map((rc, j) => (
                                <div key={j} className="bg-white/5 rounded-2xl p-5 flex justify-between items-center text-white border border-white/5 group-hover:bg-white/10 transition-colors">
                                   <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center font-black text-xs text-emerald-400 border border-emerald-500/20">
                                         {rc.symbol[0]}
                                      </div>
                                      <span className="text-sm font-black">{rc.name}</span>
                                   </div>
                                   <div className="flex items-center gap-4">
                                       <div className="w-24 h-1.5 bg-black/40 rounded-full overflow-hidden">
                                           <div className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" style={{ width: `${rc.correlation_strength * 100}%` }}></div>
                                       </div>
                                       <span className="text-[11px] font-mono font-black text-emerald-400">{(rc.correlation_strength * 100).toFixed(0)}%</span>
                                   </div>
                                </div>
                              ))}
                        </div>
                     </div>
                   ))}
                </div>

                <div className="space-y-6">
                   <h3 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-tight mb-8">
                      <Lightbulb size={22} className="text-amber-400" /> Strategic Directives
                   </h3>
                   <div className="grid grid-cols-1 gap-6">
                    {(intelligence?.intelligence.recommendations || []).map((rec, i) => (
                      <div key={i} className="bg-black/40 rounded-[32px] p-8 border border-white/5 hover:border-amber-500/30 transition-all shadow-2xl relative group overflow-hidden">
                          <div className={`absolute top-0 right-0 w-1 h-full transition-colors ${
                             rec.priority === 'HIGH' ? 'bg-rose-500' : 'bg-amber-500/50'
                          }`}></div>
                          
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-black text-slate-100 uppercase text-xs tracking-[0.2em]">{rec.action}</h4>
                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${
                                rec.priority === 'HIGH' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-white/5 text-slate-400 border-white/10'
                            }`}>{rec.priority} PRIORITY</span>
                          </div>
                          
                          <p className="text-slate-400 text-sm leading-relaxed font-medium mb-6">{rec.description}</p>
                          
                          <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <MapPin size={12} className="text-slate-600" />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Target: {rec.assigned_to}</span>
                              </div>
                              <ArrowRight size={16} className="text-slate-700 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
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
