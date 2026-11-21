import { vi } from "vitest"
import { render } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import App from "../App"
import { AuthProvider } from "../lib/auth"
import { setSession } from "./supabaseMock"
import { PUBLISHED_REPORT } from "../useModelReport"

const json = (body, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }))

// Render the whole app at a route, signed in or not, with the API mocked.
export function renderApp(route, { user = null, predict, applications = [] } = {}) {
  setSession(user)
  const fetchMock = vi.fn((url, opts) => {
    const u = String(url)
    if (u.endsWith("/model")) return json(PUBLISHED_REPORT)
    if (u.includes("/applications/")) {
      return typeof applications === "function" ? applications() : json({ applications })
    }
    if (u.endsWith("/predict")) return predict ? predict(JSON.parse(opts.body)) : json({}, 500)
    return json({}, 404)
  })
  vi.stubGlobal("fetch", fetchMock)
  const utils = render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider><App /></AuthProvider>
    </MemoryRouter>
  )
  return { ...utils, fetchMock }
}

export { json }
