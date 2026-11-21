import { Link } from "react-router"

export default function NotFound() {
  return (
    <main className="notfound">
      <div>
        <h1>404</h1>
        <p>This page isn&rsquo;t part of the pipeline.</p>
        <Link to="/" className="btn btn-primary">Back to LoanWise AI</Link>
      </div>
    </main>
  )
}
