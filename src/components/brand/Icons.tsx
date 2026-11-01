import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };
const base = (size = 22): SVGProps<SVGSVGElement> => ({
  width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
});

export const IconHome = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M3.5 11 12 4l8.5 7" /><path d="M5.5 10v9.5h13V10" /><path d="M10 19.5v-5h4v5" /></svg>);
export const IconCases = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M4 9.5h16V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5Z" /><path d="M4 9.5 5.2 5a1 1 0 0 1 1-.7h11.6a1 1 0 0 1 1 .7L20 9.5" /><path d="M12 9.5V20" /><rect x="10" y="12.5" width="4" height="3" rx=".8" /></svg>);
export const IconUpgrade = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M12 20V6" /><path d="m6 11 6-6 6 6" /><path d="M7 20h10" /></svg>);
export const IconGames = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="3" /><path d="M12 3.5v5.5M12 15v5.5M3.5 12H9M15 12h5.5" /></svg>);
export const IconProfile = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><circle cx="12" cy="8.5" r="3.7" /><path d="M4.8 20c.6-3.6 3.5-5.7 7.2-5.7s6.6 2.1 7.2 5.7" /></svg>);
export const IconInventory = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M5 8h14l-1 12H6L5 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>);
export const IconHistory = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M4 12a8 8 0 1 0 2.5-5.8" /><path d="M4 4v4h4" /><path d="M12 8v4.2l2.8 1.8" /></svg>);
export const IconSupport = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 3.5V17h-.0A2.5 2.5 0 0 1 4 14.5v-8Z" /><path d="M8.5 9.5h7M8.5 12.5h4" /></svg>);
export const IconShield = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M12 3 4.5 6v5.5c0 4.4 3 8 7.5 9.5 4.5-1.5 7.5-5.1 7.5-9.5V6L12 3Z" /><path d="m9 12 2.2 2.2L15.5 10" /></svg>);
export const IconPlus = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M12 5v14M5 12h14" /></svg>);
export const IconCheck = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>);
export const IconClose = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>);
export const IconChevron = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="m9 6 6 6-6 6" /></svg>);
export const IconBack = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="m15 6-6 6 6 6" /></svg>);
export const IconSend = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M20.5 3.5 10 14" /><path d="M20.5 3.5 14 20.5l-4-6.5-6.5-4 17-6.5Z" /></svg>);
export const IconDice = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><rect x="4" y="4" width="16" height="16" rx="3.5" /><circle cx="9" cy="9" r=".9" fill="currentColor" /><circle cx="15" cy="9" r=".9" fill="currentColor" /><circle cx="12" cy="12" r=".9" fill="currentColor" /><circle cx="9" cy="15" r=".9" fill="currentColor" /><circle cx="15" cy="15" r=".9" fill="currentColor" /></svg>);
export const IconCards = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><rect x="3.5" y="6" width="11" height="14" rx="2" transform="rotate(-10 9 13)" /><rect x="9.5" y="4" width="11" height="14" rx="2" transform="rotate(8 15 11)" /></svg>);
export const IconLock = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><rect x="5" y="10.5" width="14" height="9.5" rx="2" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></svg>);
export const IconUsers = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><circle cx="9" cy="9" r="3.2" /><path d="M3.5 19c.5-3 2.7-4.8 5.5-4.8s5 1.8 5.5 4.8" /><path d="M15.5 6.2a3 3 0 0 1 0 5.6M17 14.5c1.9.5 3.2 2 3.5 4.5" /></svg>);
export const IconSettings = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><circle cx="12" cy="12" r="3" /><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8" /></svg>);
export const IconStats = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M4 20V10M10 20V4M16 20v-7M21 20H3" /></svg>);
export const IconSparkle = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" /><path d="M19 16l.7 1.8L21.5 18.5l-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7L19 16Z" /></svg>);
export const IconTrash = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13" /></svg>);
export const IconEdit = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17l-1 3Z" /></svg>);
export const IconLogout = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M14 4h4.5a1.5 1.5 0 0 1 1.5 1.5v13a1.5 1.5 0 0 1-1.5 1.5H14" /><path d="M10 16.5 14.5 12 10 7.5M14.5 12H4" /></svg>);

export function Coin({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
      <defs>
        <linearGradient id="coin-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f8e8a6" /><stop offset=".55" stopColor="#d4af37" /><stop offset="1" stopColor="#8f6f1f" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="10.5" fill="url(#coin-g)" />
      <circle cx="12" cy="12" r="7.6" fill="none" stroke="rgba(60,40,0,.45)" strokeWidth="1" />
      <path d="M12 6.6v10.8M9 11.2l3-3.3 3 3.3" fill="none" stroke="#5a3f08" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
