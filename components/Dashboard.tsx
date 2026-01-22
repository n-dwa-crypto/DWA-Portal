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
  AlertTriangle
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { DbRecord, RecordType } from '../types';

const INTEL_CACHE_KEY = 'dwa_intelligence_cache_v3';

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

const getCountryName = (code: string) => {
  if (!code) return '';
  try {
    return regionNames.of(code) || code;
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

export type AIStatus = 'connecting' | 'active' | 'fallback' | 'error';

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
  
  const [latestForecast, setLatestForecast] = useState<IntelligenceData | null>(null);
  const [isForecasting, setIsForecasting] = useState(false);
  const [forecastStatus, setForecastStatus] = useState<AIStatus>('connecting');
  const [analysisTime, setAnalysisTime] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const lastAnalyzedRef = useRef<{ id: string | null; content: string | null; apiKey: string | null }>({ id: null, content: null, apiKey: null });

  const sanitizeApiKey = (key: string | undefined): string => {
    if (!key) return '';
    const clean = String(key).trim();
    if (clean === 'undefined' || clean === 'null' || !clean) return '';
    return clean.replace(/[^\x20-\x7E]/g, '');
  };

  const getEffectiveApiKey = useCallback(() => {
    if (userApiKey && userApiKey.trim() !== '') return sanitizeApiKey(userApiKey);
    return sanitizeApiKey(process.env.API_KEY);
  }, [userApiKey]);

  const analyzeNewsImpact = useCallback(async (content: string, recordId: string, force = false) => {
    const apiKey = getEffectiveApiKey();

    if (!force && 
        lastAnalyzedRef.current.id === recordId && 
        lastAnalyzedRef.current.content === content && 
        lastAnalyzedRef.current.apiKey === apiKey) {
      return;
    }

    if (!force) {
      try {
        const cacheRaw = localStorage.getItem(INTEL_CACHE_KEY);
        const cache = cacheRaw ? JSON.parse(cacheRaw) : {};
        if (cache[recordId]) {
          setLatestForecast(cache[recordId]);
          setForecastStatus('active');
          lastAnalyzedRef.current = { id: recordId, content, apiKey };
          return;
        }
      } catch (e) {
        console.warn("Cache read error");
      }
    }

    if (!apiKey) {
      setForecastStatus('fallback');
      setErrorMessage("Neural Node Offline: No API credentials detected.");
      return;
    }

    setIsForecasting(true);
    setForecastStatus('connecting');
    setErrorMessage(null);
    const startTime = performance.now();
    
    try {
      const ai = new GoogleGenAI({ apiKey: apiKey });
      
      const prompt = `Act as a high-level DWA Market Intelligence Agent. 
      Analyze this news item for entity risks and crypto correlations: "${content}". 
      Focus on tokens like BTC, ETH, SOL, TRUMP, MELANIA, PEPE, LINK, HYPE.
      Include specific mentions of volatility risks for the Trump family coins if mentioned.
      Output STRICT JSON.
      
      Schema:
      {
        "correlations": [{"entity_name": string, "correlation_type": string, "confidence": "HIGH"|"MEDIUM"|"LOW", "related_cryptos": [{"symbol": string, "name": string, "correlation_strength": number}], "risk_level": "LOW"|"MEDIUM"|"HIGH"}],
        "intelligence": {"total_correlations": number, "high_risk": number, "medium_risk": number, "recommendations": [{"priority": "HIGH"|"MEDIUM"|"LOW", "action": string, "description": string, "assigned_to": string}]}
      }`;

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
      if (!responseText) {
        throw new Error("Neural response was empty");
      }
      const forecast: IntelligenceData = JSON.parse(responseText);
      const endTime = performance.now();
      
      setAnalysisTime(Math.round(endTime - startTime));
      setLatestForecast(forecast);
      setForecastStatus('active');
      lastAnalyzedRef.current = { id: recordId, content, apiKey };
      
      try {
        const cacheRaw = localStorage.getItem(INTEL_CACHE_KEY);
        const cache = cacheRaw ? JSON.parse(cacheRaw) : {};
        cache[recordId] = forecast;
        localStorage.setItem(INTEL_CACHE_KEY, JSON.stringify(cache));
      } catch (e) {}
      
    } catch (e: any) {
      setForecastStatus('error');
      setErrorMessage(e.message || "Intelligence Link Failure.");
    } finally {
      setIsForecasting(false);
    }
  }, [getEffectiveApiKey]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [sanctionsRes, stableRes, altRes] = await Promise.all([
          fetch('data/sanctions.json').catch(() => fetch('./data/sanctions.json')),
          fetch('data/crypto_stable.json').catch(() => fetch('./data/crypto_stable.json')),
          fetch('data/crypto_alt.json').catch(() => fetch('./data/crypto_alt.json'))
        ]);
        const [sanctionsData, stableData, altData] = await Promise.all([
          sanctionsRes.json(), stableRes.json(), altRes.json()
        ]);
        setSanctions(sanctionsData);
        setCryptoStable(stableData);
        setCryptoAlt(altData);
      } catch (err) {
        console.warn("Data sync skipped or partially failed (bootstrap mode active)");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // React to news OR key changes immediately
  useEffect(() => {
    const latestNews = userRecords?.find(r => r.type === RecordType.NEWS);
    if (latestNews) {
      analyzeNewsImpact(latestNews.content, latestNews.id);
    }
  }, [userRecords, analyzeNewsImpact, userApiKey]);

  const allCrypto = useMemo(() => [...cryptoStable, ...cryptoAlt], [cryptoStable, cryptoAlt]);
  const highVolatilityCount = useMemo(() => allCrypto.filter(c => Math.abs(c.change_24h) > 5).length, [allCrypto]);
  const mostVolatileAsset = useMemo(() => {
    if (allCrypto.length === 0) return null;
    return [...allCrypto].sort((a, b) => Math.abs(b.change_24h) - Math.abs(a.change_24h))[0];
  }, [allCrypto]);

  const topCountry = useMemo(() => {
    const freq: Record<string, number> = {};
    sanctions.forEach(s => { if (s.country_code) freq[s.country_code] = (freq[s.country_code] || 0) + 1; });
    const entries = Object.entries(freq).sort((a, b) => b[1] - a[1]);
    return entries.length > 0 ? { code: entries[0][0], count: entries[0][1] } : null;
  }, [sanctions]);

  return (
    <div className="max-w-[1800px] mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[32px] p-8 text-center shadow-2xl relative overflow-hidden group">
         <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-emerald-500 to-indigo-500"></div>
         <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-200 via-white to-emerald-200 mb-2 tracking-tight text-white group-hover:scale-[1.01] transition-transform duration-700">
           DWA Market Intelligence
         </h1>
         <p className="text-slate-400 font-medium opacity-80 uppercase tracking-widest text-[10px] font-black">AI Risk Node | News & Multi-Feed Integration</p>
      </div>

      <section className="space-y-4">
        <div className="flex items-center gap-3 px-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
            <span className="text-[10px] font-black tracking-[0.3em] text-slate-500 uppercase">Tier 1 • Operational Monitoring</span>
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
                          <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest mt-1">Registry Feed</span>
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
                          <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mt-1">Volatility Scan</span>
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
                    ) : <div className="text-slate-500 font-black uppercase text-xs">Scanning Node...</div>}
                  </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-3 px-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
            <span className="text-[10px] font-black tracking-[0.3em] text-slate-500 uppercase">Tier 2 • Deep Intelligence</span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          <div className="bg-black/40 backdrop-blur-xl border border-white/5 rounded-[40px] p-8 h-[600px] flex flex-col shadow-2xl">
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

        <div className="bg-gradient-to-br from-blue-900/40 to-indigo-900/40 backdrop-blur-3xl border border-blue-500/20 rounded-[40px] p-10 shadow-2xl relative overflow-hidden transition-all duration-700">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 relative z-10">
              <div className="flex items-center gap-4">
                  {forecastStatus === 'active' ? (
                    <div className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                       <ShieldCheck size={20} className="text-emerald-400" />
                       <span className="text-[11px] font-black text-emerald-200 uppercase tracking-[0.2em]">Agent Verified</span>
                    </div>
                  ) : forecastStatus === 'fallback' ? (
                    <div className="flex items-center gap-2 px-6 py-2.5 bg-amber-500/10 border border-amber-500/30 rounded-full">
                       <WifiOff size={20} className="text-amber-400" />
                       <span className="text-[11px] font-black text-amber-200 uppercase tracking-[0.2em]">Heuristic Mode</span>
                    </div>
                  ) : forecastStatus === 'connecting' ? (
                    <div className="flex items-center gap-2 px-6 py-2.5 bg-blue-500/10 border border-blue-500/30 rounded-full">
                       <Loader2 size={20} className="text-blue-400 animate-spin" />
                       <span className="text-[11px] font-black text-blue-200 uppercase tracking-[0.2em]">Neural Syncing...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-6 py-2.5 bg-rose-500/10 border border-rose-500/30 rounded-full shadow-[0_0_20px_rgba(244,63,94,0.1)]">
                       <AlertTriangle size={20} className="text-rose-400" />
                       <span className="text-[11px] font-black text-rose-200 uppercase tracking-[0.2em]">Agent Offline</span>
                    </div>
                  )}
              </div>

              <div className="flex items-center gap-3">
                  {analysisTime && !isForecasting && !errorMessage && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full">
                        <Clock size={12} className="text-slate-300" />
                        <span className="text-[10px] font-mono font-black text-slate-200 uppercase">{analysisTime}ms</span>
                    </div>
                  )}
                  <button 
                    onClick={() => {
                      const latestNews = userRecords?.find(r => r.type === RecordType.NEWS);
                      if (latestNews) {
                        analyzeNewsImpact(latestNews.content, latestNews.id, true);
                      }
                    }}
                    className="p-3 bg-white/5 border border-white/10 rounded-full text-white hover:bg-white/10 transition-all hover:scale-110 active:rotate-180 duration-500 shadow-xl"
                  >
                    <RefreshCw size={18} className={isForecasting ? 'animate-spin' : ''} />
                  </button>
              </div>
          </div>

          {isForecasting && (
            <div className="h-64 flex items-center justify-center bg-black/40 rounded-[32px] border border-white/5">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                    <span className="text-[11px] font-black text-blue-300 uppercase tracking-[0.3em] animate-pulse">Consulting Neural Compliance Node...</span>
                </div>
            </div>
          )}

          {errorMessage && !isForecasting && (
            <div className="h-64 flex flex-col items-center justify-center text-rose-500/50 border border-dashed border-rose-500/20 rounded-[32px] bg-rose-500/5 p-8 text-center">
                <AlertCircle size={48} className="opacity-40 mb-4" />
                <p className="font-black uppercase text-[10px] tracking-[0.2em] mb-2">Signal Connection Failure</p>
                <p className="text-xs text-rose-300/60 font-medium max-w-sm mb-6">{errorMessage}</p>
                <button onClick={() => {
                   const latestNews = userRecords?.find(r => r.type === RecordType.NEWS);
                   if (latestNews) analyzeNewsImpact(latestNews.content, latestNews.id, true);
                }} className="text-[10px] font-black uppercase tracking-widest text-white px-6 py-2.5 bg-rose-500 rounded-full hover:bg-rose-600 transition-colors">Retry Handshake</button>
            </div>
          )}

          {latestForecast && !isForecasting && !errorMessage && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-in fade-in slide-in-from-bottom-8 relative z-10">
                <div className="space-y-6">
                    <h3 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-tight mb-8">
                       <LinkIcon size={22} className="text-emerald-400" /> Entity Proximity Matrix
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      {latestForecast.correlations.map((corr, i) => (
                          <div key={i} className="bg-black/60 rounded-[32px] p-8 border border-white/5 border-l-8 border-l-emerald-500 shadow-2xl group hover:bg-black/70 transition-all hover:-translate-y-1">
                              <div className="flex justify-between items-start mb-6">
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
                                      <div key={j} className="bg-white/5 rounded-2xl p-5 flex justify-between items-center text-white border border-white/5">
                                         <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center font-black text-xs text-emerald-400 border border-emerald-500/20">
                                               {rc.symbol[0]}
                                            </div>
                                            <span className="text-sm font-black">{rc.name}</span>
                                         </div>
                                         <div className="flex items-center gap-4">
                                             <div className="w-24 h-1.5 bg-black/40 rounded-full overflow-hidden">
                                                 <div className="h-full bg-emerald-400" style={{ width: `${rc.correlation_strength * 100}%` }}></div>
                                             </div>
                                             <span className="text-[11px] font-mono font-black text-emerald-400">{(rc.correlation_strength * 100).toFixed(0)}%</span>
                                         </div>
                                      </div>
                                    ))}
                              </div>
                          </div>
                      ))}
                    </div>
                </div>

                <div className="space-y-6">
                    <h3 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-tight mb-8">
                       <Lightbulb size={22} className="text-amber-400" /> Strategic Directives
                    </h3>
                    <div className="grid grid-cols-1 gap-6">
                      {latestForecast.intelligence.recommendations.map((rec, i) => (
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
                                    <Zap size={12} className="text-slate-600" />
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Assignee: {rec.assigned_to}</span>
                                  </div>
                                  <ArrowRight size={16} className="text-slate-700 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
                              </div>
                          </div>
                      ))}
                    </div>
                </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};