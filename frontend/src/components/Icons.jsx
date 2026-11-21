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
export const Check = (p) => <Svg {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></Svg>
export const Alert = (p) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5" /><path d="M12 16.5h.01" /></Svg>
export const Copy = (p) => <Svg {...p}><rect x="9" y="9" width="11" height="11" rx="1.5" /><path d="M5 15V5.5A1.5 1.5 0 0 1 6.5 4H15" /></Svg>
export const SignOut = (p) => <Svg {...p}><path d="M15 4h3.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H15" /><path d="M10 16l-4-4 4-4" /><path d="M6 12h10" /></Svg>
export const Retry = (p) => <Svg {...p}><path d="M4 12a8 8 0 1 0 2.4-5.7" /><path d="M4 4v4h4" /></Svg>
export const Clock = (p) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>
export const Mail = (p) => <Svg {...p}><rect x="3" y="5" width="18" height="14" rx="1.5" /><path d="m4 7 8 6 8-6" /></Svg>
export const Product = (p) => <Svg {...p}><path d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5z" /><path d="M4 8.5 12 13l8-4.5" /><path d="M12 13v7" /></Svg>

export function BrandMark({ className }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="4" fill="#F4F4F2" />
      <path d="M16 5v22" stroke="#2A1F4D" strokeWidth="1.5" />
      <rect x="16" y="8" width="10" height="4" fill="#1F7A4D" />
      <rect x="16" y="14" width="6" height="4" fill="#1F7A4D" />
      <rect x="10" y="20" width="6" height="4" fill="#C8321E" />
    </svg>
  )
}
