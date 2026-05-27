import React, { useState, useRef } from 'react';
import { Bot, Filter, X, ChevronRight, Sparkles, MessageCircle } from 'lucide-react';
import AIAssistant from './AIAssistant';

export default function AIControlCenter({ onAIInsights, onFilters, aiActive, filterActive }) {
  const [open, setOpen] = useState(false);
  const [openChat, setOpenChat] = useState(false);
  const [clickPos, setClickPos] = useState({ x: 0, y: 0 });
  const floatBtnRef = useRef(null);

  return (
    <>
      {/* Floating AI Control Button */}
      <button
        ref={floatBtnRef}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="fixed bottom-8 right-8 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-[#635bff] to-[#8d87ff] text-white shadow-[0_20px_50px_rgba(99,91,255,0.4)] transition hover:shadow-[0_25px_60px_rgba(99,91,255,0.5)] hover:scale-110"
        title="AI Controls"
      >
        <Bot className="h-7 w-7" />
      </button>

      {/* Modal Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Control Panel */}
      <div
        className={`fixed bottom-28 right-8 z-50 w-80 rounded-3xl border border-[#635bff]/40 bg-gradient-to-br from-[#1a1a2e] via-[#16171f] to-[#0f1119] p-6 shadow-[0_25px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all duration-300 pointer-events-auto ${
          open ? 'opacity-100 scale-100' : 'pointer-events-none opacity-0 scale-95'
        }`}
      >
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8d87d8]">AI POWERED</p>
            <h3 className="text-lg font-black text-[#f1efff]">Smart Controls</h3>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-[#aaa6ba] hover:bg-white/5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Control Options */}
        <div className="space-y-3 relative z-50">
          {/* Chat Quick Action */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              // capture click coords from the floating button center to feed ripple origin
              const rect = (e.currentTarget && e.currentTarget.getBoundingClientRect()) || floatBtnRef.current?.getBoundingClientRect();
              const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
              const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
              setClickPos({ x, y });
              // prevent page from jumping
              window.scrollTo(window.scrollX, window.scrollY);
              setOpen(false);
              setOpenChat(true);
            }}
            className={`relative w-full rounded-2xl border-2 p-4 text-left transition-all group pointer-events-auto bg-white/5 hover:border-[#635bff]/50`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className={`mt-1 rounded-lg p-2 bg-white/10`}>
                  <MessageCircle className={`h-5 w-5 text-[#aaa6ba]`} />
                </div>
                <div>
                  <p className={`font-black text-[#f1efff]`}>Chat</p>
                  <p className="mt-1 text-xs font-semibold text-[#817d94]">Open full AI assistant</p>
                </div>
              </div>
              <ChevronRight className={`mt-1 h-5 w-5 text-[#5d5b68]`} />
            </div>
          </button>

          {/* AI Insights Button */}
          <button
            onClick={() => {
              onAIInsights();
              setOpen(false);
            }}
            className={`relative w-full rounded-2xl border-2 p-4 text-left transition-all group pointer-events-auto ${
              aiActive
                ? 'border-[#635bff] bg-[#635bff]/10 shadow-[inset_0_0_20px_rgba(99,91,255,0.1)]'
                : 'border-white/10 bg-white/5 hover:border-[#635bff]/50 hover:bg-white/8'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className={`mt-1 rounded-lg p-2 ${aiActive ? 'bg-[#635bff]/20' : 'bg-white/10'}`}>
                  <Sparkles className={`h-5 w-5 ${aiActive ? 'text-[#d8d4ff]' : 'text-[#aaa6ba]'}`} />
                </div>
                <div>
                  <p className={`font-black ${aiActive ? 'text-[#d8d4ff]' : 'text-[#f1efff]'}`}>AI Insights</p>
                  <p className="mt-1 text-xs font-semibold text-[#817d94]">See live catalog analysis</p>
                </div>
              </div>
              <ChevronRight className={`mt-1 h-5 w-5 transition ${aiActive ? 'text-[#d8d4ff]' : 'text-[#5d5b68]'}`} />
            </div>
          </button>

          {/* Filters Button */}
          <button
            onClick={() => {
              onFilters();
              setOpen(false);
            }}
            className={`relative w-full rounded-2xl border-2 p-4 text-left transition-all group pointer-events-auto ${
              filterActive
                ? 'border-[#635bff] bg-[#635bff]/10 shadow-[inset_0_0_20px_rgba(99,91,255,0.1)]'
                : 'border-white/10 bg-white/5 hover:border-[#635bff]/50 hover:bg-white/8'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className={`mt-1 rounded-lg p-2 ${filterActive ? 'bg-[#635bff]/20' : 'bg-white/10'}`}>
                  <Filter className={`h-5 w-5 ${filterActive ? 'text-[#d8d4ff]' : 'text-[#aaa6ba]'}`} />
                </div>
                <div>
                  <p className={`font-black ${filterActive ? 'text-[#d8d4ff]' : 'text-[#f1efff]'}`}>Browse Filters</p>
                  <p className="mt-1 text-xs font-semibold text-[#817d94]">Category, price & more</p>
                </div>
              </div>
              <ChevronRight className={`mt-1 h-5 w-5 transition ${filterActive ? 'text-[#d8d4ff]' : 'text-[#5d5b68]'}`} />
            </div>
          </button>
        </div>

        {/* Footer Info */}
        <div className="mt-6 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-xs font-semibold leading-5 text-[#aaa6ba]">
            🤖 AI controls real-time catalog insights & smart filtering for better shopping
          </p>
        </div>
      </div>
      {/* Fullscreen AI Assistant modal opened from control center */}
      <AIAssistant isOpen={openChat} onClose={() => setOpenChat(false)} clickX={clickPos.x} clickY={clickPos.y} />
    </>
  );
}
