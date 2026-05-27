import React from 'react';
import { Zap, X } from 'lucide-react';

export default function AISmartFilterBanner({ suggestion, onApply, onDismiss }) {
  const [dismissed, setDismissed] = React.useState(false);

  if (dismissed || !suggestion) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#635bff]/40 bg-gradient-to-r from-[#635bff]/15 via-[#8d87ff]/10 to-[#635bff]/15 p-4 shadow-[0_8px_32px_rgba(99,91,255,0.12)]">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#635bff]/5 to-transparent opacity-40 animate-pulse" />
      
      <div className="relative flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="flex-shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#635bff] to-[#8d87ff] shadow-[0_4px_16px_rgba(99,91,255,0.3)]">
              <Zap className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-[#f1efff]">AI Smart Filter suggested for you</p>
            <p className="mt-0.5 text-xs font-semibold text-[#bdb8ff] truncate">{suggestion}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => {
              onApply?.();
            }}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#635bff] to-[#8d87ff] text-sm font-black text-white shadow-[0_4px_12px_rgba(99,91,255,0.3)] hover:shadow-[0_6px_20px_rgba(99,91,255,0.4)] transition active:scale-95"
          >
            Apply Smart Filter
          </button>
          <button
            onClick={() => {
              setDismissed(true);
              onDismiss?.();
            }}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-[#aaa6ba] hover:bg-white/5 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
