
import React, { useState } from 'react';
import { Send, Sparkles, Loader2, FileText, ShieldAlert } from 'lucide-react';
import { generateDraft } from '../services/gemini';
import { RecordType } from '../types';

interface ActionWidgetProps {
  type: RecordType;
  onSubmit: (content: string) => Promise<void>;
  title: string;
  description: string;
}

export const ActionWidget: React.FC<ActionWidgetProps> = ({ type, onSubmit, title, description }) => {
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(input);
      setInput('');
    } catch (error) {
      console.error(error);
      alert('Action failed. Check database connection state.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAiDraft = async () => {
    if (!input.trim()) {
      alert("Provide a topic for the AI to analyze.");
      return;
    }
    setIsGenerating(true);
    try {
      const draft = await generateDraft(input, type);
      setInput(draft);
    } catch (e) {
      console.error(e);
      alert("AI drafting failed. Check API configuration.");
    } finally {
      setIsGenerating(false);
    }
  };

  const isNews = type === RecordType.NEWS;
  const gradientClass = isNews 
    ? 'from-blue-500 to-indigo-600 shadow-blue-500/20' 
    : 'from-rose-500 to-orange-600 shadow-rose-500/20';
  
  const Icon = isNews ? FileText : ShieldAlert;
  const accentColor = isNews ? 'bg-blue-500' : 'bg-rose-500';

  return (
    <div className="relative group overflow-hidden bg-white/5 backdrop-blur-3xl rounded-[40px] border border-white/10 p-8 shadow-2xl transition-all duration-500 hover:border-white/20 hover:bg-white/10 flex flex-col h-full">
      
      {/* Dynamic Glow Background */}
      <div className={`absolute -top-32 -right-32 w-64 h-64 ${accentColor} opacity-[0.08] blur-[100px] transition-all duration-700 group-hover:opacity-[0.12] rounded-full`}></div>

      <div className="flex items-center gap-5 mb-8 relative z-10">
        <div className={`p-4 rounded-2xl ${isNews ? 'bg-blue-500/10 text-blue-400' : 'bg-rose-500/10 text-rose-400'} ring-1 ring-white/10 shadow-inner`}>
          <Icon size={32} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight leading-tight">{title}</h2>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1 opacity-70">{description}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-6 relative z-10">
        <div className="relative flex-1">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full h-full min-h-[180px] bg-black/40 border border-white/5 rounded-[30px] p-7 text-white focus:outline-none focus:ring-2 focus:ring-white/10 focus:bg-black/60 resize-none transition-all placeholder:text-slate-600 text-lg leading-relaxed shadow-2xl"
            placeholder={isNews ? "Enter a topic for market news..." : "Enter entity details for sanctions..."}
          />
          <button
            type="button"
            onClick={handleAiDraft}
            disabled={isGenerating || !input.trim()}
            className="absolute bottom-5 right-5 flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-xl text-white rounded-2xl transition-all border border-white/10 disabled:opacity-30 disabled:grayscale shadow-lg active:scale-95"
          >
            {isGenerating ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                <Sparkles size={16} className="text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-wider">Draft with AI</span>
              </>
            )}
          </button>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !input.trim()}
          className={`
            w-full py-5 rounded-3xl font-black text-lg tracking-widest uppercase flex items-center justify-center gap-3 transition-all duration-300
            bg-gradient-to-r ${gradientClass} text-white shadow-xl hover:scale-[1.01] active:scale-[0.99]
            disabled:opacity-20 disabled:grayscale disabled:scale-100
          `}
        >
          {isSubmitting ? (
            <Loader2 size={24} className="animate-spin" />
          ) : (
            <>
              <Send size={20} />
              Publish to Mainnet
            </>
          )}
        </button>
      </form>
    </div>
  );
};
