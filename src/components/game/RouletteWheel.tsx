'use client';
import { motion } from 'framer-motion';
import { WHEEL_ORDER, colorOf } from '@/lib/game/roulette';

const STEP = 360 / WHEEL_ORDER.length;
const FILL = { red: '#9d1c2e', black: '#101012', green: '#16794a' } as const;

/** Угол вращения, при котором сектор числа n окажется под указателем (сверху). */
export const angleFor = (n: number) => -(WHEEL_ORDER.indexOf(n) * STEP + STEP / 2);

function sector(i: number, r1: number, r2: number) {
  const a0 = ((i * STEP - 90) * Math.PI) / 180;
  const a1 = (((i + 1) * STEP - 90) * Math.PI) / 180;
  const p = (r: number, a: number) => `${(130 + r * Math.cos(a)).toFixed(2)} ${(130 + r * Math.sin(a)).toFixed(2)}`;
  return `M${p(r2, a0)} L${p(r1, a0)} A${r1} ${r1} 0 0 1 ${p(r1, a1)} L${p(r2, a1)} A${r2} ${r2} 0 0 0 ${p(r2, a0)}Z`;
}

export function RouletteWheel({ angle, size = 280, spinning }: { angle: number; size?: number; spinning?: boolean }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 260 260" width={size} height={size} className="absolute inset-0 overflow-visible">
        <defs>
          <radialGradient id="rimGrad" cx=".5" cy=".5" r=".5"><stop offset=".9" stopColor="#8f6f1f" /><stop offset="1" stopColor="#f5e3a0" /></radialGradient>
        </defs>
        <circle cx="130" cy="130" r="128" fill="url(#rimGrad)" />
        <circle cx="130" cy="130" r="122" fill="#050505" />
      </svg>
      <motion.svg viewBox="0 0 260 260" width={size} height={size} className="absolute inset-0" animate={{ rotate: angle }} transition={spinning ? { duration: 6, ease: [0.12, 0.72, 0.1, 1] } : { duration: 0 }}>
        {WHEEL_ORDER.map((n, i) => (
          <g key={n}>
            <path d={sector(i, 96, 120)} fill={FILL[colorOf(n)]} stroke="#d4af37" strokeOpacity=".35" strokeWidth=".6" />
            <text x="130" y="30" fill="#f4ecd2" fontSize="9" fontWeight="700" textAnchor="middle" transform={`rotate(${i * STEP + STEP / 2} 130 130)`}>{n}</text>
          </g>
        ))}
        <circle cx="130" cy="130" r="94" fill="#0a0a0b" stroke="#d4af37" strokeOpacity=".4" />
        <circle cx="130" cy="130" r="58" fill="#121214" stroke="#d4af37" strokeOpacity=".25" />
        <circle cx="130" cy="130" r="12" fill="#d4af37" />
        {[0, 90, 180, 270].map((a) => <rect key={a} x="127" y="74" width="6" height="22" rx="3" fill="#d4af37" fillOpacity=".7" transform={`rotate(${a} 130 130)`} />)}
      </motion.svg>
      <svg viewBox="0 0 260 260" width={size} height={size} className="pointer-events-none absolute inset-0">
        <path d="M130 8 120 -4h20Z" transform="translate(0 6)" fill="#fff" stroke="#d4af37" strokeWidth="1.5" style={{ filter: 'drop-shadow(0 0 5px rgba(255,255,255,.9))' }} />
      </svg>
    </div>
  );
}
