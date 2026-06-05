import React from 'react';
import { Zap, X } from 'lucide-react';

export default function AISmartFilterBanner({ suggestion, onApply, onDismiss }) {
  const [dismissed, setDismissed] = React.useState(false);

  if (dismissed || !suggestion) return null;

  return (
    <div className="relative overflow-hidden rounded-[24px] border border-stone-200 bg-white p-4 shadow-[0_16px_40px_rgba(28,25,23,0.07)]">
      <div className="relative flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="flex-shrink-0">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-200 bg-amber-50">
              <Zap className="h-5 w-5 text-amber-700" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-stone-950">AI Smart Filter suggested for you</p>
            <p className="mt-0.5 truncate text-xs font-black uppercase tracking-[0.04em] text-stone-500">{suggestion}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => {
              onApply?.();
            }}
            className="rounded-xl bg-stone-950 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-800 active:scale-95"
          >
            Apply Smart Filter
          </button>
          <button
            onClick={() => {
              setDismissed(true);
              onDismiss?.();
            }}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-700 transition hover:bg-stone-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
