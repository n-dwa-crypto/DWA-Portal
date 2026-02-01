
import React, { useState } from 'react';
import { DbRecord, RecordType } from '../types';
import { FileText, ShieldAlert, Clock, CheckCircle2, BrainCircuit, Globe, ChevronDown, ChevronUp, Zap, Link as LinkIcon, Heart } from 'lucide-react';

interface FeedProps {
  items: DbRecord[];
  loading: boolean;
}

const IntelligencePreview: React.FC<{ intelligence: any }> = ({ intelligence }) => {
  if (!intelligence || !intelligence.correlations) return null;

  return (
    <div className="mt-6 p-6 rounded-[24px] bg-black/40 border border-emerald-500/20 animate-in slide-in-from-top-2 duration-300">
      <div className="flex items-center gap-2 mb-4">
        <BrainCircuit size={16} className="text-emerald-400" />
        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Neural Analysis Attached</span>
      </div>
      
      <div className="space-y-4">
        {intelligence.correlations.slice(0, 2).map((corr: any, i: number) => (
          <div key={i} className="flex flex-col gap-2 p-3 rounded-xl bg-white/5 border border-white/5">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <LinkIcon size={12} className="text-blue-400" />
                {corr.entity_name}
              </span>
              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${
                corr.risk_level === 'HIGH' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              }`}>
                {corr.risk_level}
              </span>
            </div>
            <div className="flex gap-2">
              {corr.related_cryptos?.map((crypto: any, j: number) => (
                <span key={j} className="text-[9px] font-mono text-slate-400 bg-black/20 px-2 py-0.5 rounded">
                  {crypto.symbol}
                </span>
              ))}
            </div>
          </div>
        ))}
        {intelligence.intelligence?.recommendations?.length > 0 && (
          <div className="pt-2 border-t border-white/5">
             <p className="text-[10px] font-medium text-slate-400 italic">
               "{intelligence.intelligence.recommendations[0].description}"
             </p>
          </div>
        )}
      </div>
    </div>
  );
};

const FeedItem: React.FC<{ item: DbRecord }> = ({ item }) => {
  const [showIntel, setShowIntel] = useState(false);
  const hasIntel = !!item.intelligence;
  const isCloud = item.id.length > 20;

  const getTypeStyles = () => {
    switch(item.type) {
      case RecordType.NEWS: 
        return { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', tagBg: 'bg-blue-500/20', tagText: 'text-blue-300', glow: 'bg-blue-500', Icon: FileText };
      case RecordType.SANCTION: 
        return { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20', tagBg: 'bg-rose-500/20', tagText: 'text-rose-300', glow: 'bg-rose-500', Icon: ShieldAlert };
      case RecordType.THANK_YOU: 
        return { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/20', tagBg: 'bg-pink-500/20', tagText: 'text-pink-300', glow: 'bg-pink-500', Icon: Heart };
      default:
        return { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20', tagBg: 'bg-slate-500/20', tagText: 'text-slate-300', glow: 'bg-slate-500', Icon: FileText };
    }
  };

  const styles = getTypeStyles();

  return (
    <div className="group bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 hover:bg-white/10 transition-all duration-300 relative overflow-hidden shadow-lg">
      <div className={`absolute top-0 right-0 w-32 h-32 rounded-full filter blur-3xl opacity-10 ${styles.glow}`} />
      
      <div className="flex items-start gap-6 relative z-10">
        <div className={`mt-1 p-3 rounded-2xl shrink-0 ${styles.bg} ${styles.text}`}>
             <styles.Icon size={24} />
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className={`
                text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider border
                ${styles.tagBg} ${styles.tagText} ${styles.border}
              `}>
                {item.type.replace('_', ' ')}
              </span>
              
              {isCloud && (
                 <span className="text-[10px] font-black px-2.5 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 rounded-full uppercase tracking-widest flex items-center gap-1.5">
                   <Globe size={10} /> Global Feed
                 </span>
              )}
            </div>
            
            <span className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1.5 tracking-widest">
              <Clock size={12} />
              {new Date(item.timestamp).toLocaleString()}
            </span>
          </div>
          
          <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap font-medium tracking-wide mb-4 line-clamp-3 group-hover:line-clamp-none transition-all duration-500">
            {item.content}
          </p>

          <div className="flex items-center justify-between mt-2">
            {hasIntel ? (
               <button 
                 onClick={() => setShowIntel(!showIntel)}
                 className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border transition-all ${
                   showIntel ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-emerald-500/5 text-emerald-400 border-emerald-500/10 hover:bg-emerald-500/10'
                 }`}
               >
                  <BrainCircuit size={14} />
                  {showIntel ? 'Hide Intelligence' : 'View Intelligence'}
                  {showIntel ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
               </button>
            ) : (
              <div />
            )}
            
            <div className="flex items-center gap-2">
               <span className="text-[10px] font-mono text-slate-600">ID: {item.id.slice(0, 8)}</span>
               <CheckCircle2 size={16} className="text-emerald-500/40" />
            </div>
          </div>

          {showIntel && <IntelligencePreview intelligence={item.intelligence} />}
        </div>
      </div>
    </div>
  );
};

export const Feed: React.FC<FeedProps> = ({ items, loading }) => {
  if (loading && items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-4">
         <div className="w-10 h-10 border-4 border-white/10 border-t-blue-500 rounded-full animate-spin"></div>
         <p className="text-sm font-medium animate-pulse uppercase tracking-widest">Decrypting global sync...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-slate-500 border border-dashed border-white/10 rounded-3xl bg-white/5 backdrop-blur-sm">
        <p className="font-medium uppercase text-xs tracking-widest">Zero signals detected.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-2 pb-20">
      {items.map((item) => (
        <FeedItem key={item.id} item={item} />
      ))}
    </div>
  );
};