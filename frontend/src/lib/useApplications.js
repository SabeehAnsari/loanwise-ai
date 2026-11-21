import { useCallback, useEffect, useState } from "react"
import { listApplications } from "./api"
import { useAuth } from "./auth"

// The signed-in user's saved applications, newest first.
export function useApplications() {
  const { user } = useAuth()
  const [state, setState] = useState({ rows: null, error: null, loading: true })
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    if (!user) return
    let alive = true
    listApplications(user.id)
      .then((rows) => { if (alive) setState({ rows, error: null, loading: false }) })
      .catch((e) => { if (alive) setState({ rows: null, error: e.message, loading: false }) })
    return () => { alive = false }
  }, [user, nonce])

  const reload = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }))
    setNonce((n) => n + 1)
  }, [])

  return { ...state, reload }
}
