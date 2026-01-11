
import React from 'react';
import { DbRecord, RecordType } from '../types';
import { FileText, ShieldAlert, Clock, CheckCircle2 } from 'lucide-react';

interface FeedProps {
  items: DbRecord[];
  loading: boolean;
}

export const Feed: React.FC<FeedProps> = ({ items, loading }) => {
  if (loading && items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-4">
         <div className="w-10 h-10 border-4 border-white/10 border-t-blue-500 rounded-full animate-spin"></div>
         <p className="text-sm font-medium animate-pulse">Syncing with secure node...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-slate-500 border border-dashed border-white/10 rounded-3xl bg-white/5 backdrop-blur-sm">
        <p className="font-medium">No records found in current session.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-2">
      {items.map((item) => (
        <div 
          key={item.id} 
          className="group bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-all duration-300 relative overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-0.5"
        >
          {/* Subtle colored glow based on type */}
          <div className={`absolute top-0 right-0 w-24 h-24 rounded-full filter blur-3xl opacity-10 ${
            item.type === RecordType.NEWS ? 'bg-blue-500' : 'bg-rose-500'}`} 
          />
          
          <div className="flex justify-between items-start gap-5 relative z-10">
            <div className={`mt-1 p-2 rounded-xl shrink-0 ${
                item.type === RecordType.NEWS ? 'bg-blue-500/10 text-blue-400' : 'bg-rose-500/10 text-rose-400'
            }`}>
                 {item.type === RecordType.NEWS && <FileText size={20} />}
                 {item.type === RecordType.SANCTION && <ShieldAlert size={20} />}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className={`
                  text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border
                  ${item.type === RecordType.NEWS 
                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/20' 
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/20'}
                `}>
                  {item.type}
                </span>
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Clock size={12} />
                  {new Date(item.timestamp).toLocaleString()}
                </span>
              </div>
              <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap font-light tracking-wide">
                {item.content}
              </p>
            </div>
            
            <div className="text-emerald-500/50 group-hover:text-emerald-400 transition-colors" title="Synced to DB">
               <CheckCircle2 size={18} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
