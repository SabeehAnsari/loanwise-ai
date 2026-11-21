import "@testing-library/jest-dom/vitest"
import { afterEach, vi } from "vitest"
import { cleanup } from "@testing-library/react"
import { setSession } from "./supabaseMock"

vi.mock("../supabaseClient", () => import("./supabaseMock"))

// jsdom lacks these browser APIs used by the app.
window.matchMedia ??= () => ({ matches: false, addEventListener() {}, removeEventListener() {} })
Element.prototype.scrollIntoView ??= function () {}

afterEach(() => {
  cleanup()
  setSession(null)
  localStorage.clear()
})
