import { supabase } from "../supabaseClient"

export const API_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/+$/, "")
const LOCAL_API = /\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(API_URL)

// Free hosting puts the API to sleep when idle and takes up to a minute to wake it.
// Ping it as soon as the page loads so it is usually awake by the time someone submits.
export function wakeApi() {
  if (!LOCAL_API) fetch(`${API_URL}/health`).catch(() => {})
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

export function errorMessage(status) {
  if (status === 401) return "Your session has expired. Sign out, sign back in, and try again."
  if (status === 403) return "You don't have access to that."
  if (status === 422) return "The API rejected some fields as out of range. Check the values and try again."
  if (status === 429) return "That's more than 10 applications in a minute. Wait a moment, then try again."
  if (status >= 500) return "The server hit an error. Try again in a moment."
  return `The request failed (HTTP ${status}).`
}

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session?.access_token || ""}`,
  }
}

async function request(path, options = {}) {
  let response
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers: await authHeaders() })
  } catch {
    throw new ApiError(LOCAL_API
      ? `Couldn't reach the API. Make sure the backend is running on ${API_URL}.`
      : "Couldn't reach the API. It sleeps when idle and can take up to a minute to wake, so try again shortly.", 0)
  }
  if (!response.ok) throw new ApiError(errorMessage(response.status), response.status)
  return response.json()
}

export const runDecision = (form) => request("/predict", { method: "POST", body: JSON.stringify(form) })

export async function listApplications(userId) {
  const data = await request(`/applications/${encodeURIComponent(userId)}`)
  if (data.error) throw new ApiError("The API couldn't load your applications from the database.", 500)
  return data.applications || []
}
