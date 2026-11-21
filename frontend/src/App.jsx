import { Navigate, Route, Routes, useLocation } from "react-router"
import { useAuth } from "./lib/auth"
import AppShell from "./components/AppShell"
import Landing from "./pages/Landing"
import AuthPage from "./pages/AuthPage"
import NewDecision from "./pages/NewDecision"
import History from "./pages/History"
import DecisionDetail from "./pages/DecisionDetail"
import ModelPage from "./pages/ModelPage"
import NotFound from "./pages/NotFound"

function Boot() {
  return <div className="boot" aria-label="Loading"><div className="boot-bar" /></div>
}

function RequireAuth({ children }) {
  const { user, ready } = useAuth()
  const location = useLocation()
  if (!ready) return <Boot />
  if (!user) return <Navigate to="/signin" replace state={{ from: location.pathname + location.search }} />
  return children
}

function GuestOnly({ children }) {
  const { user, ready } = useAuth()
  if (!ready) return <Boot />
  if (user) return <Navigate to="/app/new" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/signin" element={<GuestOnly><AuthPage mode="signin" /></GuestOnly>} />
      <Route path="/signup" element={<GuestOnly><AuthPage mode="signup" /></GuestOnly>} />
      <Route path="/app" element={<RequireAuth><AppShell /></RequireAuth>}>
        <Route index element={<Navigate to="new" replace />} />
        <Route path="new" element={<NewDecision />} />
        <Route path="history" element={<History />} />
        <Route path="decisions/:id" element={<DecisionDetail />} />
        <Route path="model" element={<ModelPage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
