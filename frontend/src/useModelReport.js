import { useEffect, useState } from "react"
import { API_URL } from "./lib/api"
import modelCard from "./lib/modelCard.json"

// The v2 model card, exactly as exported by `python -m ml.run` (src/models/hmda_v2_card.json).
// Used when the API is unreachable so the public pages still show the real, published figures.
export const PUBLISHED_REPORT = modelCard

let cache = null

function load() {
  if (!cache) {
    cache = fetch(`${API_URL}/model`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((report) => (report?.policy ? { report, live: true } : { report: PUBLISHED_REPORT, live: false }))
      .catch(() => { cache = null; return { report: PUBLISHED_REPORT, live: false } })
  }
  return cache
}

// GET /model, shared across pages. Falls back to the published card when offline (or when an
// older API answers with a v1 report).
export function useModelReport() {
  const [state, setState] = useState({ report: null, live: false })
  useEffect(() => {
    let alive = true
    load().then((s) => { if (alive) setState(s) })
    return () => { alive = false }
  }, [])
  return state
}
