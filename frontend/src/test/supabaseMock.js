import { vi } from "vitest"

// Stand-in for the Supabase client: tests choose who is signed in.
let session = null

export function setSession(user) {
  session = user ? { access_token: "test-token", user } : null
}

export const supabase = {
  auth: {
    getSession: vi.fn(async () => ({ data: { session } })),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe() {} } } })),
    signOut: vi.fn(async () => { session = null; return { error: null } }),
    signInWithPassword: vi.fn(async () => ({ data: {}, error: null })),
    signUp: vi.fn(async () => ({ data: { session: null }, error: null })),
  },
}
