import React from 'react';
import { Bot, Boxes, BrainCircuit, ShieldCheck, ShoppingBag, Sparkles } from 'lucide-react';
import heroImage from '../assets/auth-marketplace-hero.png';
import GlowBackground from './GlowBackground';

const AuthShell = ({ children, eyebrow = 'AI Commerce OS', title, subtitle }) => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_12%_12%,rgba(120,113,108,0.18),transparent_28%),radial-gradient(circle_at_88%_18%,rgba(16,185,129,0.12),transparent_30%),linear-gradient(135deg,#f7f4ee_0%,#e8e5df_46%,#f6f1e8_100%)] px-4 py-8 sm:px-6 lg:px-10">
      <div className="pointer-events-none absolute left-[-8%] top-[12%] h-72 w-72 rounded-full bg-stone-400/18 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[12%] right-[-6%] h-80 w-80 rounded-full bg-emerald-300/16 blur-3xl" />

      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="auth-hero-card hidden min-h-[680px] overflow-hidden rounded-[2rem] lg:block">
          <img src={heroImage} alt="Ai-VendorHub AI marketplace" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-stone-950/5 via-stone-950/10 to-stone-950/70" />

          <div className="absolute left-7 top-7 flex items-center gap-2 rounded-2xl border border-white/45 bg-white/85 px-4 py-2 text-stone-950 shadow-sm backdrop-blur-xl">
            <Sparkles className="h-4 w-4" />
            <span className="text-lg font-black tracking-tight">Ai-VendorHub</span>
            <span className="rounded-lg border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-black text-amber-800">AI</span>
          </div>

          <div className="absolute right-7 top-7 grid gap-3">
            <div className="symbol-orb"><BrainCircuit className="h-5 w-5" /></div>
            <div className="symbol-orb translate-x-4"><ShoppingBag className="h-5 w-5" /></div>
            <div className="symbol-orb"><ShieldCheck className="h-5 w-5" /></div>
          </div>

          <div className="absolute bottom-7 left-7 right-7">
            <div className="rounded-[1.5rem] border border-white/35 bg-white/88 p-5 text-stone-950 shadow-2xl backdrop-blur-xl">
              <p className="mb-2 text-[11px] font-black uppercase tracking-[0.22em] text-emerald-700">{eyebrow}</p>
              <h2 className="max-w-md text-4xl font-black leading-none tracking-tight">{title}</h2>
              <p className="mt-3 max-w-lg text-sm leading-6 text-stone-600">{subtitle}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {['Discover AI products', 'Sell smarter', 'Manage everything'].map((item) => (
                  <span key={item} className="rounded-full border border-stone-200 bg-white px-3.5 py-2 text-xs font-bold text-stone-700">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <main className="mx-auto w-full max-w-[470px] self-center lg:-mt-8 xl:-mt-12">
          <div className="mb-7 lg:hidden">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 py-2 text-stone-950 shadow-sm">
              <Bot className="h-4 w-4" />
              <span className="font-black">Ai-VendorHub</span>
            </div>
          </div>
          {children}
        </main>
      </div>

      <div className="pointer-events-none absolute left-[8%] top-[18%] hidden rounded-full border border-stone-200 bg-white/80 p-4 text-stone-500 shadow-sm lg:block">
        <Boxes className="h-6 w-6" />
      </div>
    </div>
  );
};

export default AuthShell;
