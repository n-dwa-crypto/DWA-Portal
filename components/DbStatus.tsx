import React from 'react';
import { ConnectionStatus } from '../types';
import { Wifi, WifiOff, RefreshCw, Zap } from 'lucide-react';

interface DbStatusProps {
  status: ConnectionStatus;
  lastSync: number | null;
}

export const DbStatus: React.FC<DbStatusProps> = ({ status, lastSync }) => {
  const getStatusColor = () => {
    switch (status) {
      case ConnectionStatus.CONNECTED: return 'text-green-400';
      case ConnectionStatus.CONNECTING: return 'text-amber-400';
      case ConnectionStatus.ERROR: return 'text-rose-500';
      default: return 'text-slate-400';
    }
  };

  const getIcon = () => {
    switch (status) {
      case ConnectionStatus.CONNECTED: return <Wifi size={14} className="stroke-[3]" />;
      case ConnectionStatus.CONNECTING: return <RefreshCw size={14} className="animate-spin stroke-[3]" />;
      case ConnectionStatus.ERROR: return <WifiOff size={14} className="stroke-[3]" />;
      default: return <Zap size={14} className="stroke-[3]" />;
    }
  };

  return (
    <div className="flex items-center gap-3 bg-black/60 backdrop-blur-xl border border-white/10 pl-1 pr-4 py-1 rounded-full shadow-2xl ring-1 ring-black/50">
      {/* Icon Circle */}
      <div className={`
        w-8 h-8 rounded-full flex items-center justify-center shadow-inner
        ${status === ConnectionStatus.CONNECTED ? 'bg-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'bg-white/5'}
      `}>
         <div className={`${getStatusColor()}`}>
           {getIcon()}
         </div>
      </div>
      
      <div className="flex flex-col">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-none mb-0.5">Database</span>
        <span className={`text-xs font-bold leading-none ${getStatusColor()}`}>
            {status === ConnectionStatus.CONNECTED ? 'Online' : status}
        </span>
      </div>

      {lastSync && status === ConnectionStatus.CONNECTED && (
        <div className="hidden sm:flex items-center border-l border-white/10 pl-3 ml-1 gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-[10px] text-slate-400 font-mono tracking-wide opacity-80">
            {new Date(lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      )}
    </div>
  );
};