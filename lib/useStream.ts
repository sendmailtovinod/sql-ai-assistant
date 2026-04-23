'use client'

import { useState } from 'react'

export function useStream() {
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function stream(url: string, body: object): Promise<string> {
    setOutput('')
    setError(null)
    setLoading(true)
    let full = ''
    try {
      const res = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `HTTP ${res.status}`)
      }
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        full += chunk
        setOutput((prev) => prev + chunk)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      setError(msg)
    } finally {
      setLoading(false)
    }
    return full
  }

  function reset() {
    setOutput('')
    setError(null)
  }

  return { output, loading, error, stream, reset }
}
