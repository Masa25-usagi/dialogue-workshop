import type { SVGProps } from 'react'

export type IconName = 'brand' | 'users' | 'clock' | 'check' | 'chevron' | 'arrow-left' | 'arrow-right' | 'lock' | 'mic-off' | 'camera-off' | 'leave' | 'spark' | 'eye' | 'send' | 'heart' | 'shield' | 'menu' | 'close'

export function Icon({ name, size = 20, ...props }: { name: IconName; size?: number } & Omit<SVGProps<SVGSVGElement>, 'name'>) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true as const, ...props }
  switch (name) {
    case 'brand':
      return <svg {...common}><path d="M12 20V9.5M12 9.5C8.8 9.5 6.6 7.7 6.6 5c3.2 0 5.4 1.8 5.4 4.5ZM12 12.5C15.2 12.5 17.4 10.7 17.4 8c-3.2 0-5.4 1.8-5.4 4.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><path d="M5 20c1.5-2.5 3.8-3.8 7-3.8s5.5 1.3 7 3.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
    case 'users':
      return <svg {...common}><circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" /><path d="M3.5 19c.3-3.2 2.1-5 5.5-5s5.2 1.8 5.5 5M16 5.5a2.8 2.8 0 1 1 0 5.5M17 14c2 .4 3.2 2 3.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
    case 'clock':
      return <svg {...common}><circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" /><path d="M12 7v5l3.2 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
    case 'check':
      return <svg {...common}><path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    case 'chevron':
      return <svg {...common}><path d="m5 9 7 7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    case 'arrow-left':
      return <svg {...common}><path d="M19 12H5m6-6-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
    case 'arrow-right':
      return <svg {...common}><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
    case 'lock':
      return <svg {...common}><rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M8 10V7.5a4 4 0 0 1 8 0V10M12 14v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
    case 'mic-off':
      return <svg {...common}><path d="M9 9V6a3 3 0 0 1 5.9-.7M15 11v1a3 3 0 0 1-5.2 2M5 11v1a7 7 0 0 0 11.3 5.5M19 12a7 7 0 0 1-.5 2.6M12 19v2M8 21h8M4 4l16 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
    case 'camera-off':
      return <svg {...common}><path d="m15 10 4-2v8l-4-2M4 7h7a3 3 0 0 1 3 3v4M4 7v10h8M4 4l16 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
    case 'leave':
      return <svg {...common}><path d="M9 5H6.5A2.5 2.5 0 0 0 4 7.5v9A2.5 2.5 0 0 0 6.5 19H9M14 8l4 4-4 4M18 12H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
    case 'spark':
      return <svg {...common}><path d="m12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3ZM19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
    case 'eye':
      return <svg {...common}><path d="M3 12s3.2-5 9-5 9 5 9 5-3.2 5-9 5-9-5-9-5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="1.8" /></svg>
    case 'send':
      return <svg {...common}><path d="m4 4 16 8-16 8 3-8-3-8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M7 12h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
    case 'heart':
      return <svg {...common}><path d="M20.8 8.7c0 4.4-8.8 10-8.8 10s-8.8-5.6-8.8-10A4.6 4.6 0 0 1 12 6a4.6 4.6 0 0 1 8.8 2.7Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>
    case 'shield':
      return <svg {...common}><path d="M12 3.7 19 6v5.4c0 4.2-2.7 7.6-7 9-4.3-1.4-7-4.8-7-9V6l7-2.3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
    case 'menu':
      return <svg {...common}><path d="M5 7h14M5 12h14M5 17h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
    case 'close':
      return <svg {...common}><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
  }
}

