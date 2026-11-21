import { afterEach, describe, expect, it, vi } from "vitest"
import { ApiError, errorMessage, listApplications, runDecision } from "./api"
import { setSession } from "../test/supabaseMock"
import { USER } from "../test/fixtures"

const ok = (body) => Promise.resolve(new Response(JSON.stringify(body), { status: 200 }))

afterEach(() => vi.unstubAllGlobals())

describe("errorMessage", () => {
  it.each([[401, /session has expired/], [422, /out of range/], [429, /10 applications/], [503, /server hit an error/], [418, /HTTP 418/]])(
    "explains HTTP %i", (status, text) => expect(errorMessage(status)).toMatch(text))
})

describe("runDecision", () => {
  it("posts the form with the session's bearer token", async () => {
    setSession(USER)
    const fetchMock = vi.fn(() => ok({ status: "SUCCESS" }))
    vi.stubGlobal("fetch", fetchMock)
    await expect(runDecision({ name: "Jane" })).resolves.toEqual({ status: "SUCCESS" })
    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toBe("http://api.test/predict")
    expect(opts.method).toBe("POST")
    expect(opts.headers.Authorization).toBe("Bearer test-token")
    expect(JSON.parse(opts.body)).toEqual({ name: "Jane" })
  })

  it("turns an HTTP error into a readable ApiError", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response("", { status: 429 }))))
    const err = await runDecision({}).catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(429)
    expect(err.message).toMatch(/10 applications/)
  })

  it("reports an unreachable API", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new TypeError("Failed to fetch"))))
    await expect(runDecision({})).rejects.toThrow(/Couldn't reach the API/)
  })
})

describe("listApplications", () => {
  it("returns the rows", async () => {
    vi.stubGlobal("fetch", vi.fn(() => ok({ applications: [{ id: "a" }] })))
    await expect(listApplications("u 1")).resolves.toEqual([{ id: "a" }])
    expect(fetch.mock.calls[0][0]).toBe("http://api.test/applications/u%201")
  })

  it("treats the API's soft database error as a failure", async () => {
    vi.stubGlobal("fetch", vi.fn(() => ok({ applications: [], error: "Failed to load applications" })))
    await expect(listApplications("u1")).rejects.toThrow(/couldn't load your applications/)
  })
})
