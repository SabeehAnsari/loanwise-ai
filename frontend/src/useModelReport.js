import { useEffect, useState } from "react"

export const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"

// Public model card from GET /model: CV metrics, baseline and fairness audit.
// Returns null while loading or if the API is unreachable; callers render without numbers.
export function useModelReport() {
  const [report, setReport] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const ctrl = new AbortController()
    fetch(`${API_URL}/model`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(setReport)
      .catch((e) => { if (e.name !== "AbortError") setFailed(true) })
    return () => ctrl.abort()
  }, [])

  return { report, failed }
}
