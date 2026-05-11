"use client"

import { useState, useEffect } from "react"

export function useAiStatus() {
  const [aiAvailable, setAiAvailable] = useState(true)

  useEffect(() => {
    fetch("/api/ai/status")
      .then((r) => r.json())
      .then((d) => setAiAvailable(d.available ?? false))
      .catch(() => setAiAvailable(false))
  }, [])

  return { aiAvailable }
}
