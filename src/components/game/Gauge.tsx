'use client';
import { motion, useAnimationControls } from 'framer-motion';
import { forwardRef, useImperativeHandle, useRef, type ReactNode } from 'react';

export type GaugeHandle = { spinTo: (roll: number) => Promise<void> };

/**
 * Круговая шкала вероятности. Золотая дуга — зона успеха [0, chance) по часовой стрелке от верхней точки.
 * Стрелка останавливается на значении roll, которое вернул сервер: попадание в дугу = успех.
 */
export const Gauge = forwardRef<GaugeHandle, { chance: number; color?: string; children?: ReactNode; size?: number }>(function Gauge(
  { chance, color = '#c6f432', children, size = 260 }, ref,
) {
  const R = 108;
  const C = 2 * Math.PI * R;
  const controls = useAnimationControls();
  const angle = useRef(0);

  useImperativeHandle(ref, () => ({
    async spinTo(roll: number) {
      const target = Math.ceil(angle.current / 360) * 360 + 360 * 5 + roll * 360;
      angle.current = target;
      await controls.start({ rotate: target, transition: { duration: 5, ease: [0.12, 0.7, 0.1, 1] } });
    },
  }));

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg viewBox="0 0 260 260" width={size} height={size} className="absolute inset-0">
        <defs>
          <filter id="gaugeGlow"><feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        <circle cx="130" cy="130" r={R} fill="none" stroke="#17171b" strokeWidth="16" />
        <circle cx="130" cy="130" r={R + 14} fill="none" stroke="rgba(198,244,50,.12)" strokeWidth="1" />
        <circle cx="130" cy="130" r={R - 14} fill="none" stroke="rgba(198,244,50,.08)" strokeWidth="1" />
        <circle
          cx="130" cy="130" r={R} fill="none" stroke={color} strokeWidth="16" strokeLinecap="butt"
          strokeDasharray={`${Math.max(0.0001, chance) * C} ${C}`} transform="rotate(-90 130 130)" filter="url(#gaugeGlow)"
          style={{ transition: 'stroke-dasharray .5s ease, stroke .3s' }}
        />
        {[0, 90, 180, 270].map((a) => (
          <line key={a} x1="130" y1="14" x2="130" y2="24" stroke="rgba(255,255,255,.18)" strokeWidth="2" transform={`rotate(${a} 130 130)`} />
        ))}
      </svg>
      <motion.div className="absolute inset-0" animate={controls} initial={{ rotate: 0 }}>
        <svg viewBox="0 0 260 260" width={size} height={size}>
          <path d="M130 8 118 34h24Z" fill="#fff" stroke="#c6f432" strokeWidth="1.5" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 6px rgba(255,255,255,.8))' }} />
          <line x1="130" y1="34" x2="130" y2="64" stroke="#fff" strokeOpacity=".7" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </motion.div>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
});
