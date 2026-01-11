import React, { useEffect, useState, useMemo } from 'react';
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
  AlertTriangle
} from 'lucide-react';

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

// --- TIER 3 MOCK DATA (High-level insights) ---
const tier3Data = {
  "correlations": [
    { 
      "entity_name": "62 Recent Sanction Changes", 
      "correlation_type": "Temporal Pattern", 
      "confidence": "Low", 
      "related_cryptos": [
        { "symbol": "SOL", "name": "Solana", "correlation_strength": 0.4 }
      ], 
      "risk_level": "Medium" 
    }
  ],
  "intelligence": { 
    "total_correlations": 1, 
    "high_risk": 0, 
    "medium_risk": 1, 
    "recommendations": [
      { "priority": "LOW", "action": "Routine Monitoring", "description": "Continue standard monitoring protocols", "assigned_to": "Monitoring Agent" }
    ] 
  }
};

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
  const [error, setError] = useState<string | null>(null);

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
      } catch (err: any) {
        console.warn("Failed to fetch JSON data:", err.message);
        setError("Initializing data intelligence nodes...");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate dynamic stats from the data
  const allCrypto = useMemo(() => [...cryptoStable, ...cryptoAlt], [cryptoStable, cryptoAlt]);
  const highVolatilityCount = useMemo(() => allCrypto.filter(c => Math.abs(c.change_24h) > 5).length, [allCrypto]);
  const stableAvgChange = useMemo(() => cryptoStable.reduce((acc, c) => acc + c.change_24h, 0) / (cryptoStable.length || 1), [cryptoStable]);
  const altAvgChange = useMemo(() => cryptoAlt.reduce((acc, c) => acc + c.change_24h, 0) / (cryptoAlt.length || 1), [cryptoAlt]);

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
          {/* Sanctions Card - REDESIGNED HEATMAP */}
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
                    <p className="text-purple-300/60 font-bold uppercase text-[10px] tracking-[0.2em]">System-wide entity updates verified</p>
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

                {/* Right: High Impact Risk Heatmap */}
                <div className="lg:w-1/2 flex-1 relative">
                  <div className="h-full rounded-[32px] bg-gradient-to-br from-rose-500/10 to-transparent border border-rose-500/20 p-6 flex flex-col justify-center items-center text-center overflow-hidden group/heatmap">
                    <div className="absolute top-4 right-4 animate-pulse">
                      <AlertTriangle size={24} className="text-rose-500" />
                    </div>
                    
                    {topCountry ? (
                      <div className="animate-in fade-in zoom-in-95 duration-700">
                        <div className="text-[10px] font-black text-rose-400 uppercase tracking-[0.3em] mb-4">Territory Risk Hotspot</div>
                        
                        <div className="relative mb-6">
                           {/* Glow effect */}
                           <div className="absolute inset-0 bg-rose-500/20 blur-2xl rounded-full scale-150"></div>
                           <img 
                              src={`https://flagcdn.com/w160/${topCountry.code.toLowerCase()}.png`} 
                              alt={topCountry.code} 
                              className="w-24 h-auto relative z-10 rounded-xl shadow-2xl border-4 border-white/10 ring-8 ring-rose-500/10"
                            />
                        </div>

                        <h3 className="text-3xl font-black text-white tracking-tight mb-1">{getCountryName(topCountry.code)}</h3>
                        <div className="inline-flex items-center gap-2 bg-rose-500/20 px-3 py-1 rounded-full border border-rose-500/30 mb-6">
                           <span className="text-rose-300 text-[10px] font-black uppercase">{topCountry.count} Targeted Actions</span>
                        </div>

                        <div className="bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-rose-500/10 w-full">
                           <p className="text-[11px] font-bold text-rose-200/90 flex items-center justify-center gap-1.5 leading-tight">
                              CRITICAL: INVESTMENT REVIEW REQUIRED
                           </p>
                           <p className="text-[9px] text-rose-400/60 font-black uppercase tracking-widest mt-2">
                              High Exposure Zone Detected
                           </p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-slate-500 font-black uppercase text-xs">No Concentrated Risks</div>
                    )}
                  </div>
                </div>
             </div>
          </div>

          {/* Crypto Card */}
          <div className="relative rounded-[40px] overflow-hidden p-1 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 shadow-[0_0_40px_rgba(6,182,212,0.15)] group">
             <div className="absolute inset-0 bg-black/40 backdrop-blur-3xl"></div>
             <div className="relative z-10 p-10 h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                       <div className="p-3 rounded-2xl bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/30 shadow-lg">
                          <Activity size={24} />
                       </div>
                       <div className="flex flex-col">
                          <h2 className="text-xl font-black text-white leading-none uppercase tracking-tight">Market Momentum</h2>
                          <span className="text-[10px] font-black text-cyan-400/80 uppercase tracking-widest mt-1">Asset Volatility Scan</span>
                       </div>
                    </div>
                    <span className="px-3 py-1 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-black rounded-full uppercase tracking-widest">Active</span>
                  </div>
                  
                  <div className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-cyan-200 tracking-tighter mb-2">
                    {isLoading ? "..." : highVolatilityCount}
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

        <div className="bg-gradient-to-br from-emerald-900/40 to-teal-900/40 backdrop-blur-3xl border border-emerald-500/20 rounded-[40px] p-10 shadow-2xl">
            <div className="grid grid-cols-3 gap-6 mb-10">
                <div className="text-center p-6 bg-black/30 rounded-3xl border border-white/5 shadow-inner">
                   <div className="text-4xl font-black text-emerald-400">{tier3Data.intelligence.total_correlations}</div>
                   <div className="text-[10px] text-slate-500 font-black uppercase mt-1 tracking-widest">Detected Patterns</div>
                </div>
                <div className="text-center p-6 bg-black/30 rounded-3xl border border-white/5 shadow-inner">
                   <div className="text-4xl font-black text-rose-500">{tier3Data.intelligence.high_risk}</div>
                   <div className="text-[10px] text-slate-500 font-black uppercase mt-1 tracking-widest">Actionable Risks</div>
                </div>
                <div className="text-center p-6 bg-black/30 rounded-3xl border border-white/5 shadow-inner">
                   <div className="text-4xl font-black text-amber-400">{tier3Data.intelligence.medium_risk}</div>
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
                      {tier3Data.correlations.map((corr, i) => (
                        <div key={i} className="bg-black/40 rounded-[32px] p-8 border-l-8 border-emerald-500 shadow-2xl">
                           <div className="flex justify-between items-start mb-4">
                              <h4 className="font-black text-white text-xl tracking-tight">{corr.entity_name}</h4>
                              <span className="px-3 py-1 bg-amber-500/20 text-amber-400 text-[10px] font-black rounded-full border border-amber-500/30 uppercase tracking-widest">{corr.risk_level} RISK</span>
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
                   </div>
                </div>

                <div>
                   <h3 className="text-2xl font-black text-white mb-6 flex items-center gap-3 tracking-tight uppercase">
                      <Lightbulb size={24} className="text-yellow-400" />
                      Strategic Insights
                   </h3>
                   <div className="space-y-6">
                      {tier3Data.intelligence.recommendations.map((rec, i) => (
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