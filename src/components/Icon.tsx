import type { SVGProps } from 'react'

const paths: Record<string, React.ReactNode> = {
  home: <><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/></>,
  plan: <><path d="M8 6h13M8 12h13M8 18h13"/><path d="m3 6 1 1 2-2M3 12h3M3 18h3"/></>,
  history: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  review: <><path d="M5 3h14v18H5z"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
  growth: <><path d="M4 19V9M10 19V5M16 19v-7M22 19V2"/><path d="M2 19h21"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></>,
  play: <path d="m8 5 11 7-11 7Z"/>,
  pause: <><path d="M8 5v14M16 5v14"/></>,
  stop: <rect x="6" y="6" width="12" height="12" rx="2"/>,
  plus: <><path d="M12 5v14M5 12h14"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  close: <><path d="m6 6 12 12M18 6 6 18"/></>,
  spark: <path d="m12 2 1.6 6.4L20 10l-6.4 1.6L12 18l-1.6-6.4L4 10l6.4-1.6Z"/>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/></>,
  flame: <path d="M12 22c4 0 7-3 7-7 0-3-2-6-5-9 0 3-1 4-2 5-1-3-3-5-5-7 0 5-2 7-2 11 0 4 3 7 7 7Z"/>,
  flag: <><path d="M5 21V4"/><path d="M5 5h12l-2 4 2 4H5"/></>,
  mountain: <><path d="m2 20 7-12 4 7 3-5 6 10Z"/><path d="m7 12 2 2 2-2"/></>,
  compass: <><circle cx="12" cy="12" r="9"/><path d="m15 9-2 4-4 2 2-4Z"/></>,
  book: <><path d="M4 5a3 3 0 0 1 3-2h5v17H7a3 3 0 0 0-3 2Z"/><path d="M20 5a3 3 0 0 0-3-2h-5v17h5a3 3 0 0 1 3 2Z"/></>,
  wave: <path d="M2 12c2.5-5 5.5-5 8 0s5.5 5 8 0 4-2 4-2"/>,
  arrow: <><path d="M5 12h14M14 7l5 5-5 5"/></>,
  folder: <path d="M3 6h7l2 2h9v11H3Z"/>,
  brain: <><path d="M9 5a3 3 0 0 0-5 2 3 3 0 0 0 0 5 4 4 0 0 0 5 6M15 5a3 3 0 0 1 5 2 3 3 0 0 1 0 5 4 4 0 0 1-5 6"/><path d="M9 4v16M15 4v16M9 9h3M12 15h3"/></>,
  coin: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 7v10M9 10h6"/></>,
  map: <><path d="M3 6h12l4-2v14l-4-2-6 2-6-2V6z"/><path d="M9 4v14M15 4v14"/></>,
  herb: <><path d="M12 22V12"/><path d="M12 12C12 6 7 4 5 8s2 8 7 7"/><path d="M12 12c0-6 5-8 7-4s-2 8-7 7"/></>,
  bread: <><path d="M4 14c0-4 4-7 8-7s8 3 8 7c0 3-2 5-5 5H9c-3 0-5-2-5-5z"/><path d="M7 14c0-2 2-3 5-3s5 1 5 3"/></>,
  gem: <><path d="m12 2 4 8-4 12-4-12z"/><path d="M8 10h8M6 14l3-4M18 14l-3-4M8 8l4 10M16 8l-4 10"/></>,
  star: <path d="m12 2 2.5 7.5L22 9l-5.5 4L19 20.5l-7-4.5-7 4.5 2.5-7.5L2 9l7.5.5z"/>,
  bell: <><path d="M6 8a6 6 0 0 1 12 0c0 6 2 8 2 8H4s2-2 2-8"/><path d="M9 20h6M12 20v2"/></>,
  scale: <><path d="M12 2 4 8l2 12h12l2-12z"/><path d="M12 8v12M8 12h8"/></>,
}

export function Icon({ name, size = 20, ...props }: { name: string; size?: number } & SVGProps<SVGSVGElement>) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name] ?? paths.spark}</svg>
}
