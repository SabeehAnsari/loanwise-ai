import { useCallback, useEffect, useState } from "react"
import { listApplications } from "./api"
import { useAuth } from "./auth"
import { isV2 } from "./records"

// The signed-in user's saved v2 applications, newest first. Runs made with the v1 model stay in
// the database but are not shown.
export function useApplications() {
  const { user } = useAuth()
  const [state, setState] = useState({ rows: null, error: null, loading: true })
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    if (!user) return
    let alive = true
    listApplications(user.id)
      .then((rows) => { if (alive) setState({ rows: rows.filter(isV2), error: null, loading: false }) })
      .catch((e) => { if (alive) setState({ rows: null, error: e.message, loading: false }) })
    return () => { alive = false }
  }, [user, nonce])

  const reload = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }))
    setNonce((n) => n + 1)
  }, [])

  return { ...state, reload }
}
