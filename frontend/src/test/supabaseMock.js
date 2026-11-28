import { vi } from "vitest"

let session = null
const listeners = new Set()

export function setSession(user) {
  session = user ? { access_token: "test-token", user } : null
}

// Fire an auth event to every AuthProvider listening, as Supabase would.
export function emitAuth(event, user = session?.user ?? null) {
  setSession(user)
  listeners.forEach((fn) => fn(event, session))
}

export const supabase = {
  auth: {
    getSession: vi.fn(async () => ({ data: { session } })),
    onAuthStateChange: vi.fn((fn) => {
      listeners.add(fn)
      return { data: { subscription: { unsubscribe() { listeners.delete(fn) } } } }
    }),
    signOut: vi.fn(async () => { session = null; return { error: null } }),
    signInWithPassword: vi.fn(async () => ({ data: {}, error: null })),
    signUp: vi.fn(async () => ({ data: { session: null }, error: null })),
    resetPasswordForEmail: vi.fn(async () => ({ data: {}, error: null })),
    updateUser: vi.fn(async () => ({ data: {}, error: null })),
  },
}
