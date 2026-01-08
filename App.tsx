import React, { useEffect, useState } from 'react';
import { dbService } from './services/mockDb';
import { ConnectionStatus, DbRecord, RecordType, SystemStats } from './types';
import { DbStatus } from './components/DbStatus';
import { ActionWidget } from './components/ActionWidget';
import { Feed } from './components/Feed';
import { Dashboard } from './components/Dashboard';
import { LayoutDashboard, History, Menu, X, Shield, Activity, Home, PenTool } from 'lucide-react';

const App: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [stats, setStats] = useState<SystemStats>({ totalNews: 0, totalSanctions: 0, lastSync: null });
  const [records, setRecords] = useState<DbRecord[]>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Updated routing state to include 'dashboard' (analytics) and 'portal' (actions)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'portal' | 'history'>('dashboard');

  useEffect(() => {
    const unsubscribe = dbService.subscribeToStatus((status) => {
      setConnectionStatus(status);
      if (status === ConnectionStatus.CONNECTED) {
        refreshData();
      }
    });

    return () => unsubscribe();
  }, []);

  const refreshData = async () => {
    setIsLoadingFeed(true);
    try {
      const data = await dbService.fetchRecords();
      setRecords(data);
      setStats(dbService.getStats());
    } finally {
      setIsLoadingFeed(false);
    }
  };

  const handleAddRecord = async (type: RecordType, content: string) => {
    await dbService.addRecord(type, content);
    await refreshData();
    if (window.innerWidth < 768) {
        setActiveTab('history');
    }
  };

  const LogoImage = () => (
    <img 
      src="https://assets.zyrosite.com/cdn-cgi/image/format=auto,w=375,h=146,fit=crop/mP4MZ3DvE9fbN33K/dwa-logo---original-size-AGBbqzN3p1TJKPJO.png"
      alt="DWA"
      className="h-10 w-auto object-contain"
    />
  );

  return (
    <div className="min-h-screen text-slate-100 font-sans flex flex-col md:flex-row relative z-10">
      
      {/* Mobile Header - Glassy */}
      <div className="md:hidden flex items-center justify-between p-4 bg-black/40 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
        <div className="flex items-center gap-2">
            <LogoImage />
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-slate-300 hover:text-white transition-colors">
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar - Frosted Glass Dock */}
      <nav className={`
        fixed md:relative inset-0 z-40 
        md:w-72 md:bg-black/10 md:backdrop-blur-xl md:border-r md:border-white/5
        bg-black/80 backdrop-blur-xl
        transform transition-transform duration-500 cubic-bezier(0.32, 0.72, 0, 1) flex flex-col
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-8 hidden md:flex items-center gap-4 mb-4">
             <div className="flex items-center justify-center">
                <img 
                  src="https://assets.zyrosite.com/cdn-cgi/image/format=auto,w=375,h=146,fit=crop/mP4MZ3DvE9fbN33K/dwa-logo---original-size-AGBbqzN3p1TJKPJO.png"
                  alt="DWA"
                  className="h-12 w-auto object-contain"
                />
             </div>
        </div>

        <div className="flex-1 px-6 space-y-3 mt-20 md:mt-4">
          <button 
            onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group ${
              activeTab === 'dashboard' 
              ? 'bg-white/10 text-white shadow-lg backdrop-blur-md ring-1 ring-white/10' 
              : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Home size={22} className={activeTab === 'dashboard' ? 'text-teal-400' : 'group-hover:text-teal-300'} />
            <span className="font-medium text-lg">Dashboard</span>
          </button>

          <button 
            onClick={() => { setActiveTab('portal'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group ${
              activeTab === 'portal' 
              ? 'bg-white/10 text-white shadow-lg backdrop-blur-md ring-1 ring-white/10' 
              : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <LayoutDashboard size={22} className={activeTab === 'portal' ? 'text-blue-400' : 'group-hover:text-blue-300'} />
            <span className="font-medium text-lg">Admin Portal</span>
          </button>
          
          <button 
            onClick={() => { setActiveTab('history'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group ${
              activeTab === 'history' 
              ? 'bg-white/10 text-white shadow-lg backdrop-blur-md ring-1 ring-white/10' 
              : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <History size={22} className={activeTab === 'history' ? 'text-purple-400' : 'group-hover:text-purple-300'} />
            <span className="font-medium text-lg">Audit Log</span>
            <span className="ml-auto bg-black/40 border border-white/5 text-xs px-2.5 py-1 rounded-full text-slate-400 font-mono shadow-inner">{records.length}</span>
          </button>
        </div>

        <div className="p-6">
             <div className="bg-gradient-to-r from-slate-900/40 to-slate-800/40 backdrop-blur-md rounded-2xl p-4 border border-white/5 shadow-xl">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-600 to-slate-500 flex items-center justify-center text-sm font-bold shadow-md ring-2 ring-black/50">AD</div>
                    <div>
                        <p className="text-sm font-semibold text-white">Admin User</p>
                        <p className="text-xs text-slate-400">Super Admin</p>
                    </div>
                </div>
             </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full md:h-screen overflow-hidden">
        
        {/* Header */}
        <header className="hidden md:flex items-center justify-between px-10 py-6">
           <div>
             <h2 className="text-3xl font-bold text-white tracking-tight">
               {activeTab === 'dashboard' && 'Dashboard'}
               {activeTab === 'portal' && 'Admin Portal'}
               {activeTab === 'history' && 'Recent Activity'}
             </h2>
             <p className="text-slate-400 text-sm mt-1">
                {activeTab === 'dashboard' && 'System analytics and operational overview'}
                {activeTab === 'portal' && 'Content management and data entry'}
                {activeTab === 'history' && 'Review latest database entries'}
             </p>
           </div>
           <DbStatus status={connectionStatus} lastSync={stats.lastSync} />
        </header>

        {/* Mobile Status */}
        <div className="md:hidden p-4 pb-0 flex justify-center">
             <DbStatus status={connectionStatus} lastSync={stats.lastSync} />
        </div>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-10 scroll-smooth">
          
          {activeTab === 'dashboard' && (
             <Dashboard />
          )}

          {activeTab === 'portal' && (
            <div className="max-w-7xl mx-auto space-y-10">
              
              {/* Glass Stats Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                 <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-xl hover:bg-white/10 transition-colors duration-300">
                    <p className="text-slate-400 text-sm font-medium mb-2 uppercase tracking-wide">Total News</p>
                    <p className="text-4xl font-bold text-white tracking-tighter">{stats.totalNews}</p>
                 </div>
                 <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-xl hover:bg-white/10 transition-colors duration-300">
                    <p className="text-slate-400 text-sm font-medium mb-2 uppercase tracking-wide">Active Sanctions</p>
                    <p className="text-4xl font-bold text-white tracking-tighter">{stats.totalSanctions}</p>
                 </div>
                 <div className="bg-gradient-to-r from-emerald-900/40 to-teal-900/40 backdrop-blur-xl p-6 rounded-3xl border border-emerald-500/20 shadow-xl col-span-2 lg:col-span-2 flex items-center justify-between relative overflow-hidden group">
                    <div className="absolute inset-0 bg-emerald-500/5 group-hover:bg-emerald-500/10 transition-colors"></div>
                    <div className="relative z-10">
                        <p className="text-emerald-200/70 text-sm font-medium mb-1 uppercase tracking-wide">System Health</p>
                        <p className="text-2xl font-bold text-emerald-100 flex items-center gap-2">
                           Operational 
                           <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]"></span>
                        </p>
                    </div>
                    <div className="h-14 w-14 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 relative z-10 ring-1 ring-emerald-500/30">
                        <Shield size={28} />
                    </div>
                 </div>
              </div>

              {/* Action Widgets */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <ActionWidget 
                  type={RecordType.NEWS}
                  title="Crypto News"
                  description="Publish verified market updates."
                  onSubmit={(content) => handleAddRecord(RecordType.NEWS, content)}
                />
                
                <ActionWidget 
                  type={RecordType.SANCTION}
                  title="Sanction Entry"
                  description="Log blacklist entities."
                  onSubmit={(content) => handleAddRecord(RecordType.SANCTION, content)}
                />
              </div>

              {/* Feed Preview */}
              <div>
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Activity size={20} className="text-slate-400" />
                        <h3 className="text-xl font-bold text-white">Live Feed</h3>
                    </div>
                    <button 
                        onClick={() => setActiveTab('history')}
                        className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors bg-blue-500/10 px-4 py-2 rounded-full"
                    >
                        View All
                    </button>
                </div>
                <div className="bg-black/20 backdrop-blur-md rounded-[32px] border border-white/5 p-2">
                    <Feed items={records.slice(0, 3)} loading={isLoadingFeed} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="max-w-5xl mx-auto">
               <div className="mb-8 flex items-center justify-between">
                    <h3 className="text-2xl font-bold text-white">Audit Log</h3>
                    <button onClick={refreshData} className="text-sm px-5 py-2.5 bg-white/5 backdrop-blur-md rounded-full border border-white/10 hover:bg-white/10 transition-colors font-medium">
                        Refresh Data
                    </button>
               </div>
               <div className="space-y-4">
                  <Feed items={records} loading={isLoadingFeed} />
               </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default App;