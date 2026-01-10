import React, { useEffect, useState } from 'react';
import { 
  AlertTriangle, 
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
  Loader2
} from 'lucide-react';

// --- MOCK CONSTANTS (Kept for Crypto as requested to focus on Sanction CSV) ---
const tier1Data = {
  "overall_risk": "HIGH", 
  "sanctions": { "additions": 62, "deletions": 0, "modifications": 0, "total_changes": 62, "alert_level": "HIGH", "timestamp": "2025-10-12T00:01:04.459002" }, 
  "crypto": { "high_volatility_count": 1, "high_volatility_coins": [{ "symbol": "SOL", "name": "Solana", "change": -6.51223793 }], "stable_avg_change": -0.08075965, "major_avg_change": -2.65817828, "alt_avg_change": -0.47547790636363646, "alert_level": "NORMAL" }, 
  "requires_tier2_review": true 
};

const cryptoData = {
  "bitcoin_stablecoins": [
    { "rank": 1, "symbol": "BTC", "name": "Bitcoin", "price": 111165.24, "change_24h": -2.46 },
    { "rank": 2, "symbol": "ETH", "name": "Ethereum", "price": 3748.25, "change_24h": -2.85 },
    { "rank": 3, "symbol": "USDT", "name": "Tether USDt", "price": 1.00, "change_24h": -0.16 },
    { "rank": 7, "symbol": "USDC", "name": "USDC", "price": 1.00, "change_24h": 0.01 }
  ],
  "altcoins": [
    { "rank": 4, "symbol": "BNB", "name": "BNB", "price": 1146.82, "change_24h": 2.77 },
    { "rank": 5, "symbol": "XRP", "name": "XRP", "price": 2.39, "change_24h": 2.56 },
    { "rank": 6, "symbol": "SOL", "name": "Solana", "price": 177.59, "change_24h": -6.51 },
    { "rank": 9, "symbol": "DOGE", "name": "Dogecoin", "price": 0.18, "change_24h": -3.88 },
    { "rank": 12, "symbol": "HYPE", "name": "Hyperliquid", "price": 37.34, "change_24h": -4.54 }
  ]
};

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
       <span className="font-semibold text-sm text-slate-200 line-clamp-1 group-hover:text-white transition-colors">{item.name}</span>
       <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSanctions = async () => {
      try {
        setIsLoading(true);
        // During local dev, this might fail if the script hasn't run.
        // On GitHub Pages, it will be at /data/sanctions.json
        const response = await fetch('./data/sanctions.json');
        if (!response.ok) throw new Error('Sanctions data not yet generated or found');
        const data = await response.json();
        setSanctions(data);
      } catch (err: any) {
        console.warn("Failed to fetch sanctions JSON:", err.message);
        setError("Source data pending build process.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSanctions();
  }, []);

  return (
    <div className="max-w-[1800px] mx-auto space-y-8 animate-in fade-in zoom-in duration-500">
      
      {/* Header */}
      <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[32px] p-8 text-center shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
         <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-200 via-white to-purple-200 mb-2 tracking-tight">
           Multi-Agent AI Risk Dashboard
         </h1>
         <p className="text-slate-400 font-medium">Three-Tier Agentic Intelligence System | Dynamic Sanctions & Crypto Monitoring</p>
         
         <div className="mt-4 flex items-center justify-center gap-4">
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 uppercase tracking-widest">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                Live Data Active
            </span>
            <span className="text-[10px] font-bold text-slate-500 bg-white/5 px-3 py-1 rounded-full border border-white/5 uppercase tracking-widest">
                Source: sanctions.csv
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
                    {isLoading ? "..." : sanctions.length || tier1Data.sanctions.total_changes}
                  </div>
                  <p className="text-purple-300/80 font-medium">Total detected changes (Latest CSV)</p>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-white/10">
                   <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/5">
                      <div className="text-2xl font-bold text-white">{isLoading ? "-" : sanctions.length}</div>
                      <div className="text-xs text-slate-400 uppercase tracking-wider mt-1">CSV Additions</div>
                   </div>
                   <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/5">
                      <div className="text-2xl font-bold text-slate-400">{tier1Data.sanctions.deletions}</div>
                      <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Deletions</div>
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
                       <h2 className="text-2xl font-bold text-white">Crypto Volatility</h2>
                    </div>
                    <span className="px-3 py-1 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold rounded-full">MONITORING</span>
                  </div>
                  
                  <div className="text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-cyan-200 tracking-tighter mb-2">
                    {tier1Data.crypto.high_volatility_count}
                  </div>
                  <p className="text-cyan-300/80 font-medium">High volatility assets ({'>'}5%)</p>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-white/10">
                   <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/5">
                      <div className="text-2xl font-bold text-rose-400">{tier1Data.crypto.major_avg_change.toFixed(1)}%</div>
                      <div className="text-xs text-slate-400 uppercase tracking-wider mt-1">Stable Avg</div>
                   </div>
                   <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/5">
                      <div className="text-2xl font-bold text-slate-200">{tier1Data.crypto.alt_avg_change.toFixed(1)}%</div>
                      <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Altcoin Avg</div>
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
            {/* Added */}
            <div className="bg-black/30 backdrop-blur-xl border-l-4 border-emerald-500 rounded-r-3xl rounded-l-md p-6 h-[400px] flex flex-col relative overflow-hidden">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg text-emerald-100 flex items-center gap-2">
                    <ShieldAlert size={20} className="text-emerald-500" />
                    Entities Added (CSV Driven)
                  </h3>
                  <span className="bg-emerald-500 text-white px-2 py-1 rounded-lg text-xs font-bold">{sanctions.length}</span>
               </div>
               
               <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-500">
                      <Loader2 className="animate-spin" size={24} />
                      <span className="text-xs font-mono uppercase tracking-widest">Parsing CSV...</span>
                    </div>
                  ) : error ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center px-4">
                      <Database size={32} className="mb-2 opacity-20" />
                      <span className="text-xs font-mono uppercase tracking-widest text-rose-400">{error}</span>
                      <p className="text-[10px] mt-2 opacity-50">GitHub Action converts sanctions.csv to JSON upon push.</p>
                    </div>
                  ) : (
                    sanctions.map((item, i) => (
                      <EntityRow key={i} item={item} type="add" />
                    ))
                  )}
               </div>
            </div>

            {/* Deleted */}
            <div className="bg-black/30 backdrop-blur-xl border-l-4 border-rose-500 rounded-r-3xl rounded-l-md p-6 h-[200px] flex flex-col">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg text-rose-100 flex items-center gap-2">
                    <ShieldAlert size={20} className="text-rose-500" />
                    Entities Deleted
                  </h3>
                  <span className="bg-rose-500 text-white px-2 py-1 rounded-lg text-xs font-bold">{tier1Data.sanctions.deletions}</span>
               </div>
               <div className="flex-1 flex items-center justify-center text-slate-500 italic text-sm border border-dashed border-white/5 rounded-xl">
                    No deletions detected in current epoch
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
                  <span className="bg-amber-500/20 text-amber-400 px-2 py-1 rounded-lg text-xs font-bold">{cryptoData.bitcoin_stablecoins.length}</span>
               </div>
               <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {cryptoData.bitcoin_stablecoins.map((item, i) => (
                    <CryptoRow key={i} item={item} />
                  ))}
               </div>
            </div>

            {/* Altcoins */}
            <div className="bg-black/30 backdrop-blur-xl border-l-4 border-indigo-500 rounded-r-3xl rounded-l-md p-6 h-[300px] flex flex-col">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg text-indigo-100 flex items-center gap-2">
                    <Globe size={20} className="text-indigo-500" />
                    Altcoins
                  </h3>
                  <span className="bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded-lg text-xs font-bold">{cryptoData.altcoins.length}</span>
               </div>
               <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {cryptoData.altcoins.map((item, i) => (
                    <CryptoRow key={i} item={item} />
                  ))}
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
                      Detected Correlations
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
            Generated: {new Date().toUTCString()} | Multi-Agent AI System v1.1-Dynamic
         </div>
      </div>
    </div>
  );
};