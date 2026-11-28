import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "../supabaseClient"

const AuthContext = createContext({
  user: null, ready: false, recovery: false, signOut: async () => {}, endRecovery: () => {},
})

// A password-reset link signs the user in and puts type=recovery in the URL hash.
// Supabase reads the hash on start-up, so check it before the client clears it.
const startedInRecovery = typeof window !== "undefined" && /(^#|&)type=recovery(&|$)/.test(window.location.hash)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)
  // While true, the app sends the user to /reset-password wherever the link landed them.
  const [recovery, setRecovery] = useState(startedInRecovery)

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => setUser(session?.user ?? null))
      .catch(() => setUser(null))
      .finally(() => setReady(true))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      if (event === "PASSWORD_RECOVERY") setRecovery(true)
      if (event === "SIGNED_OUT") setRecovery(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => { await supabase.auth.signOut() }
  const endRecovery = () => setRecovery(false)

  return (
    <AuthContext.Provider value={{ user, ready, recovery, signOut, endRecovery }}>{children}</AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)
