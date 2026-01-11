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
  MapPin
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
    const over2 = entries.filter(([_, count]) => count > 2);
    const over1 = entries.filter(([_, count]) => count > 1);
    
    let selectedEntry: [string, number] | null = null;
    
    // Logic: If there are more than 2 countries with more than 2 occurrences, show max.
    // Otherwise show max of those with more than 1.
    if (over2.length > 2) {
      selectedEntry = over2.sort((a, b) => b[1] - a[1])[0];
    } else if (over1.length > 0) {
      selectedEntry = over1.sort((a, b) => b[1] - a[1])[0];
    }

    return { 
      topCountry: selectedEntry ? { code: selectedEntry[0], count: selectedEntry[1] } : null 
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
                Nodes: Sanctions | Stable | Alts
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
          {/* Sanctions Card */}
          <div className="relative rounded-[32px] overflow-hidden p-1 bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 shadow-[0_0_40px_rgba(168,85,247,0.15)] group">
             <div className="absolute inset-0 bg-black/40 backdrop-blur-xl"></div>
             <div className="relative z-10 p-8 h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                       <div className="p-3 rounded-2xl bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/30">
                          <Database size={24} />
                       </div>
                       <h2 className="text-2xl font-bold text-white">Sanctions Changes</h2>
                    </div>
                    <span className="px-3 py-1 bg-purple-500 text-white text-xs font-bold rounded-full shadow-lg shadow-purple-500/20">ALERT</span>
                  </div>
                  
                  <div className="text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-purple-200 tracking-tighter mb-2">
                    {isLoading ? "..." : sanctions.length}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-purple-300/80 font-medium">Total operational changes detected in</p>
                    {topCountry && (
                        <div className="flex items-center gap-2 px-2 py-0.5 rounded-lg bg-white/10 border border-white/10 shadow-sm animate-in fade-in slide-in-from-left-2 duration-500">
                          <img 
                            src={`https://flagcdn.com/w20/${topCountry.code.toLowerCase()}.png`} 
                            alt={topCountry.code} 
                            className="w-4 h-auto rounded-sm"
                          />
                          <span className="text-[10px] font-bold text-white uppercase tracking-wider">{getCountryName(topCountry.code)}</span>
                        </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-white/10">
                   <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/5">
                      <div className="text-2xl font-bold text-white">{isLoading ? "-" : sanctions.length}</div>
                      <div className="text-xs text-slate-400 uppercase tracking-wider mt-1">Verified Additions</div>
                   </div>
                   <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/5">
                      <div className="text-2xl font-bold text-slate-500">0</div>
                      <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Entity Deletions</div>
                   </div>
                </div>
             </div>
          </div>

          {/* Crypto Card */}
          <div className="relative rounded-[32px] overflow-hidden p-1 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 shadow-[0_0_40px_rgba(6,182,212,0.15)] group">
             <div className="absolute inset-0 bg-black/40 backdrop-blur-xl"></div>
             <div className="relative z-10 p-8 h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                       <div className="p-3 rounded-2xl bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/30">
                          <Activity size={24} />
                       </div>
                       <h2 className="text-2xl font-bold text-white">Market Volatility</h2>
                    </div>
                    <span className="px-3 py-1 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold rounded-full">ACTIVE</span>
                  </div>
                  
                  <div className="text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-cyan-200 tracking-tighter mb-2">
                    {isLoading ? "..." : highVolatilityCount}
                  </div>
                  <p className="text-cyan-300/80 font-medium">Critical volatility assets ({'>'}5%)</p>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-white/10">
                   <div className={`bg-white/5 rounded-2xl p-4 text-center border border-white/5`}>
                      <div className={`text-2xl font-bold ${stableAvgChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isLoading ? "-" : `${stableAvgChange.toFixed(1)}%`}
                      </div>
                      <div className="text-xs text-slate-400 uppercase tracking-wider mt-1">Stability Index</div>
                   </div>
                   <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/5">
                      <div className={`text-2xl font-bold ${altAvgChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isLoading ? "-" : `${altAvgChange.toFixed(1)}%`}
                      </div>
                      <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Alt Asset Avg</div>
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
            <div className="bg-black/30 backdrop-blur-xl border-l-4 border-emerald-500 rounded-r-3xl rounded-l-md p-6 h-[624px] flex flex-col relative overflow-hidden">
               <div className="flex justify-between items-center mb-4">
                  <div className="flex flex-col">
                    <h3 className="font-bold text-lg text-emerald-100 flex items-center gap-2">
                      <ShieldAlert size={20} className="text-emerald-500" />
                      Latest Sanction Entities
                    </h3>
                    {topCountry && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <MapPin size={10} className="text-emerald-400" />
                        <span className="text-[10px] uppercase font-black tracking-widest text-emerald-400/80">
                          Risk Focus: {getCountryName(topCountry.code)} ({topCountry.count} Occurrences)
                        </span>
                      </div>
                    )}
                  </div>
                  <span className="bg-emerald-500 text-white px-2 py-1 rounded-lg text-xs font-bold shrink-0">{sanctions.length}</span>
               </div>
               
               <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-500">
                      <Loader2 className="animate-spin" size={24} />
                      <span className="text-xs font-mono uppercase tracking-widest">Scanning Network...</span>
                    </div>
                  ) : error ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center px-4">
                      <Database size={32} className="mb-2 opacity-20" />
                      <span className="text-xs font-mono uppercase tracking-widest text-rose-400">{error}</span>
                      <p className="text-[10px] mt-2 opacity-50">Link initializing. Check source CSV status.</p>
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
             <div className="bg-black/30 backdrop-blur-xl border-l-4 border-amber-500 rounded-r-3xl rounded-l-md p-6 h-[300px] flex flex-col">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg text-amber-100 flex items-center gap-2">
                    <Bitcoin size={20} className="text-amber-500" />
                    Bitcoin & Stablecoins
                  </h3>
                  <span className="bg-amber-500/20 text-amber-400 px-2 py-1 rounded-lg text-xs font-bold">{cryptoStable.length}</span>
               </div>
               <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
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
            <div className="bg-black/30 backdrop-blur-xl border-l-4 border-indigo-500 rounded-r-3xl rounded-l-md p-6 h-[300px] flex flex-col">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg text-indigo-100 flex items-center gap-2">
                    <Globe size={20} className="text-indigo-500" />
                    Altcoins
                  </h3>
                  <span className="bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded-lg text-xs font-bold">{cryptoAlt.length}</span>
               </div>
               <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
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

        <div className="bg-gradient-to-br from-emerald-900/40 to-teal-900/40 backdrop-blur-2xl border border-emerald-500/20 rounded-[32px] p-8">
            <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="text-center p-4 bg-black/20 rounded-2xl border border-white/5">
                   <div className="text-3xl font-bold text-emerald-400">{tier3Data.intelligence.total_correlations}</div>
                   <div className="text-xs text-slate-400 uppercase mt-1">Correlations</div>
                </div>
                <div className="text-center p-4 bg-black/20 rounded-2xl border border-white/5">
                   <div className="text-3xl font-bold text-rose-500">{tier3Data.intelligence.high_risk}</div>
                   <div className="text-xs text-slate-400 uppercase mt-1">High Risk</div>
                </div>
                <div className="text-center p-4 bg-black/20 rounded-2xl border border-white/5">
                   <div className="text-3xl font-bold text-amber-400">{tier3Data.intelligence.medium_risk}</div>
                   <div className="text-xs text-slate-400 uppercase mt-1">Med Risk</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                   <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <LinkIcon size={20} className="text-emerald-400" />
                      Cross-Sector Patterns
                   </h3>
                   <div className="space-y-4">
                      {tier3Data.correlations.map((corr, i) => (
                        <div key={i} className="bg-black/40 rounded-2xl p-5 border-l-4 border-emerald-500 shadow-lg">
                           <div className="flex justify-between items-start mb-2">
                              <h4 className="font-bold text-white text-lg">{corr.entity_name}</h4>
                              <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs font-bold rounded">{corr.risk_level} RISK</span>
                           </div>
                           <div className="text-sm text-slate-400 mb-3">
                              Type: <span className="text-emerald-300">{corr.correlation_type}</span> • Confidence: {corr.confidence}
                           </div>
                           <div className="bg-white/5 rounded-xl p-3">
                              <div className="text-xs font-bold text-slate-500 uppercase mb-2">Related Crypto Assets</div>
                              {corr.related_cryptos.map((rc, j) => (
                                <div key={j} className="flex justify-between text-sm">
                                   <span className="text-white">{rc.symbol} - {rc.name}</span>
                                   <span className="text-emerald-400 font-bold">{(rc.correlation_strength * 100).toFixed(0)}% Corr</span>
                                </div>
                              ))}
                           </div>
                        </div>
                      ))}
                   </div>
                </div>

                <div>
                   <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <Lightbulb size={20} className="text-yellow-400" />
                      Actionable Intelligence
                   </h3>
                   <div className="space-y-4">
                      {tier3Data.intelligence.recommendations.map((rec, i) => (
                        <div key={i} className="bg-black/40 rounded-2xl p-5 border border-white/10 hover:border-white/20 transition-colors">
                           <div className="flex items-center gap-2 mb-2">
                              <span className="px-2 py-0.5 bg-white/10 text-white text-[10px] font-bold rounded uppercase">{rec.priority}</span>
                              <h4 className="font-bold text-slate-200">{rec.action}</h4>
                           </div>
                           <p className="text-slate-400 text-sm mb-4 leading-relaxed">{rec.description}</p>
                           <div className="flex items-center justify-between pt-3 border-t border-white/5">
                              <span className="text-xs text-slate-500 flex items-center gap-1">
                                 <BrainCircuit size={12} /> {rec.assigned_to}
                              </span>
                              <button className="text-xs font-bold text-emerald-400 flex items-center gap-1 hover:text-emerald-300">
                                 EXECUTE <ArrowRight size={12} />
                              </button>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
            </div>
        </div>
      </section>

      <div className="text-center pb-8 pt-4">
         <div className="inline-block px-4 py-2 rounded-full bg-black/40 backdrop-blur-md border border-white/5 text-xs text-slate-500 font-mono">
            Generated: {new Date().toUTCString()} | Multi-Agent AI System v1.2
         </div>
      </div>
    </div>
  );
};