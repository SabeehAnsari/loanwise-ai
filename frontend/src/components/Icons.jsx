// One stroke icon set (24px grid, 1.75 stroke), drawn for LoanWise AI.
function Svg({ size = 16, children, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      {children}
    </svg>
  )
}

export const ArrowRight = (p) => <Svg {...p}><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></Svg>
export const ArrowLeft = (p) => <Svg {...p}><path d="M19 12H5" /><path d="m11 6-6 6 6 6" /></Svg>
export const Chevron = (p) => <Svg {...p}><path d="m9 6 6 6-6 6" /></Svg>
export const Check = (p) => <Svg {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></Svg>
export const Alert = (p) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5" /><path d="M12 16.5h.01" /></Svg>
export const Copy = (p) => <Svg {...p}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h8" /></Svg>
export const LinkIcon = (p) => <Svg {...p}><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></Svg>
export const SignOut = (p) => <Svg {...p}><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 16l-4-4 4-4" /><path d="M6 12h10" /></Svg>
export const Retry = (p) => <Svg {...p}><path d="M4 12a8 8 0 1 0 2.4-5.7" /><path d="M4 4v4h4" /></Svg>
export const Clock = (p) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>
export const Mail = (p) => <Svg {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></Svg>
export const Product = (p) => <Svg {...p}><path d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5z" /><path d="M4 8.5 12 13l8-4.5" /><path d="M12 13v7" /></Svg>
export const Plus = (p) => <Svg {...p}><path d="M12 5v14" /><path d="M5 12h14" /></Svg>
export const History = (p) => <Svg {...p}><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h10" /></Svg>
export const Chart = (p) => <Svg {...p}><path d="M4 20V4" /><path d="M4 20h16" /><path d="M8 16v-5" /><path d="M12 16V8" /><path d="M16 16v-3" /></Svg>
export const Search = (p) => <Svg {...p}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></Svg>
export const Github = (p) => <Svg {...p}><path d="M9 19c-4 1.5-4-2-6-2.5m12 5V18a3.4 3.4 0 0 0-1-2.6c3.2-.4 6.5-1.6 6.5-7a5.4 5.4 0 0 0-1.5-3.8 5 5 0 0 0-.1-3.7s-1.2-.4-3.9 1.4a13.3 13.3 0 0 0-7 0C6.3.5 5.1.9 5.1.9A5 5 0 0 0 5 4.6a5.4 5.4 0 0 0-1.5 3.8c0 5.4 3.3 6.6 6.5 7a3.4 3.4 0 0 0-1 2.6V22" /></Svg>

export function BrandMark({ className }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#0E1116" />
      <rect x="15" y="7" width="2" height="18" rx="1" fill="#F3F5F8" />
      <rect x="17" y="10" width="7" height="4" rx="2" fill="#5FCB93" />
      <rect x="17" y="16" width="4" height="4" rx="2" fill="#5FCB93" />
      <rect x="10" y="19" width="5" height="4" rx="2" fill="#F08672" />
    </svg>
  )
}

export function Brand({ to = "/", as: Comp = "a", ...rest }) {
  return (
    <Comp className="brand" href={Comp === "a" ? to : undefined} to={Comp === "a" ? undefined : to} {...rest}>
      <BrandMark className="brand-mark" />
      LoanWise AI
    </Comp>
  )
}
