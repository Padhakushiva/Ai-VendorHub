import React from 'react';

const GlowBackground = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#090b0f] pointer-events-none">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(34,211,238,0.24)_0%,transparent_26%),radial-gradient(circle_at_80%_18%,rgba(245,158,11,0.22)_0%,transparent_24%),radial-gradient(circle_at_72%_78%,rgba(16,185,129,0.18)_0%,transparent_28%),linear-gradient(135deg,#08090d_0%,#15171c_48%,#070708_100%)]" />
      <div
        className="absolute inset-0 opacity-28"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.055) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '82px 82px',
          animation: 'driftLines 24s linear infinite',
        }}
      />
      <div className="absolute left-1/2 top-10 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-white/8 blur-3xl" />
      <div className="absolute -left-28 top-24 h-96 w-96 rounded-full bg-cyan-400/14 blur-3xl" />
      <div className="absolute -right-24 bottom-10 h-[460px] w-[460px] rounded-full bg-amber-400/13 blur-3xl" />
      <div className="absolute left-20 bottom-8 h-72 w-72 rounded-full bg-emerald-400/12 blur-3xl" />
      <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-white/10 via-white/3 to-transparent" />
      <div className="absolute left-0 right-0 top-1/3 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />
      <div className="absolute inset-0 bg-[linear-gradient(112deg,transparent_0%,rgba(255,255,255,0.10)_36%,transparent_55%)]" style={{ animation: 'softPulse 6s ease-in-out infinite' }} />
    </div>
  );
};

export default GlowBackground;
