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
        className="fixed bottom-8 right-8 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-stone-950 text-white shadow-[0_20px_46px_rgba(28,25,23,0.20)] transition hover:scale-105 hover:bg-emerald-800"
        title="AI Controls"
      >
        <Bot className="h-7 w-7" />
      </button>

      {/* Modal Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-stone-950/35 backdrop-blur-sm transition"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Control Panel */}
      <div
        className={`fixed bottom-28 right-8 z-50 w-80 rounded-3xl border border-stone-200 bg-white p-6 shadow-[0_25px_60px_rgba(28,25,23,0.16)] transition-all duration-300 pointer-events-auto ${
          open ? 'opacity-100 scale-100' : 'pointer-events-none opacity-0 scale-95'
        }`}
      >
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">AI POWERED</p>
            <h3 className="text-lg font-black text-stone-950">Smart Controls</h3>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="grid h-8 w-8 place-items-center rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50"
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
            className="group pointer-events-auto relative w-full rounded-2xl border border-stone-200 bg-stone-50 p-4 text-left transition-all hover:border-emerald-200 hover:bg-emerald-50"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="mt-1 rounded-lg bg-white p-2 text-stone-600">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-black text-stone-950">Chat</p>
                  <p className="mt-1 text-xs font-semibold text-stone-500">Open full AI assistant</p>
                </div>
              </div>
              <ChevronRight className="mt-1 h-5 w-5 text-stone-400" />
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
                ? 'border-emerald-300 bg-emerald-50'
                : 'border-stone-200 bg-stone-50 hover:border-emerald-200 hover:bg-emerald-50'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className={`mt-1 rounded-lg p-2 ${aiActive ? 'bg-emerald-100 text-emerald-800' : 'bg-white text-stone-600'}`}>
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className={`font-black ${aiActive ? 'text-emerald-900' : 'text-stone-950'}`}>AI Insights</p>
                  <p className="mt-1 text-xs font-semibold text-stone-500">See live catalog analysis</p>
                </div>
              </div>
              <ChevronRight className={`mt-1 h-5 w-5 transition ${aiActive ? 'text-emerald-800' : 'text-stone-400'}`} />
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
                ? 'border-emerald-300 bg-emerald-50'
                : 'border-stone-200 bg-stone-50 hover:border-emerald-200 hover:bg-emerald-50'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className={`mt-1 rounded-lg p-2 ${filterActive ? 'bg-emerald-100 text-emerald-800' : 'bg-white text-stone-600'}`}>
                  <Filter className="h-5 w-5" />
                </div>
                <div>
                  <p className={`font-black ${filterActive ? 'text-emerald-900' : 'text-stone-950'}`}>Browse Filters</p>
                  <p className="mt-1 text-xs font-semibold text-stone-500">Category, price & more</p>
                </div>
              </div>
              <ChevronRight className={`mt-1 h-5 w-5 transition ${filterActive ? 'text-emerald-800' : 'text-stone-400'}`} />
            </div>
          </button>
        </div>

        {/* Footer Info */}
        <div className="mt-6 rounded-xl border border-stone-200 bg-[#f5ead2] px-4 py-3">
          <p className="text-xs font-semibold leading-5 text-stone-700">
            AI controls real-time catalog insights and smart filtering for better shopping
          </p>
        </div>
      </div>
      {/* Fullscreen AI Assistant modal opened from control center */}
      <AIAssistant isOpen={openChat} onClose={() => setOpenChat(false)} clickX={clickPos.x} clickY={clickPos.y} />
    </>
  );
}
