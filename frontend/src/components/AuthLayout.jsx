import { Link } from "react-router"
import { ArrowLeft, Brand } from "./Icons"

// The frame shared by sign-in, sign-up and password recovery pages.
export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="auth">
      <div className="auth-top">
        <Brand as={Link} to="/" />
        <Link to="/" className="btn btn-quiet"><ArrowLeft size={15} />Back to site</Link>
      </div>
      <div className="auth-body">
        <div className="sheet auth-card">
          <h1>{title}</h1>
          {subtitle && <p className="page-sub">{subtitle}</p>}
          {children}
        </div>
      </div>
      <p className="auth-foot">Educational project. Not for real lending decisions.</p>
    </div>
  )
}
