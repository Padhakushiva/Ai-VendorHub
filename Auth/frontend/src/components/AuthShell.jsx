import React from 'react';
import { Bot, Boxes, BrainCircuit, ShieldCheck, ShoppingBag, Sparkles } from 'lucide-react';
import heroImage from '../assets/auth-marketplace-hero.png';
import GlowBackground from './GlowBackground';

const AuthShell = ({ children, eyebrow = 'AI Commerce OS', title, subtitle }) => {
  return (
    <div className="min-h-screen relative overflow-hidden px-4 py-8 sm:px-6 lg:px-10">
      <GlowBackground />

      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="auth-hero-card hidden min-h-[680px] overflow-hidden rounded-[2.25rem] lg:block">
          <img src={heroImage} alt="Ai-VendorHub AI marketplace" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/70" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_48%_42%,transparent_0%,rgba(0,0,0,0.12)_48%,rgba(0,0,0,0.72)_100%)]" />

          <div className="absolute left-7 top-7 flex items-center gap-2 rounded-2xl border border-white/18 bg-black/28 px-4 py-2 text-white backdrop-blur-2xl">
            <Sparkles className="h-4 w-4" />
            <span className="text-lg font-black tracking-tight">Ai-VendorHub</span>
            <span className="rounded-lg border border-white/20 px-1.5 py-0.5 text-[10px] font-black">AI</span>
          </div>

          <div className="absolute right-7 top-7 grid gap-3">
            <div className="symbol-orb"><BrainCircuit className="h-5 w-5" /></div>
            <div className="symbol-orb translate-x-4"><ShoppingBag className="h-5 w-5" /></div>
            <div className="symbol-orb"><ShieldCheck className="h-5 w-5" /></div>
          </div>

          <div className="absolute bottom-7 left-7 right-7">
            <div className="rounded-[1.75rem] border border-white/18 bg-black/30 p-5 text-white shadow-2xl backdrop-blur-2xl">
              <p className="mb-2 text-[11px] font-black uppercase tracking-[0.28em] text-cyan-100/80">{eyebrow}</p>
              <h2 className="max-w-md text-4xl font-black leading-none tracking-tight">{title}</h2>
              <p className="mt-3 max-w-lg text-sm leading-6 text-white/70">{subtitle}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {['Discover AI products', 'Sell smarter', 'Manage everything'].map((item) => (
                  <span key={item} className="rounded-full border border-white/14 bg-white/10 px-3.5 py-2 text-xs font-bold text-white/82 backdrop-blur-xl">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <main className="mx-auto w-full max-w-[470px] self-center lg:-mt-8 xl:-mt-12">
          <div className="mb-7 lg:hidden">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-white/8 px-4 py-2 text-white backdrop-blur-xl">
              <Bot className="h-4 w-4" />
              <span className="font-black">Ai-VendorHub</span>
            </div>
          </div>
          {children}
        </main>
      </div>

      <div className="pointer-events-none absolute left-[8%] top-[18%] hidden rounded-full border border-white/10 bg-white/10 p-4 text-white/70 backdrop-blur-xl lg:block">
        <Boxes className="h-6 w-6" />
      </div>
    </div>
  );
};

export default AuthShell;
