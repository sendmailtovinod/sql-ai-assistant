'use client'

import { useReportWebVitals } from 'next/web-vitals'

export function WebVitals() {
  useReportWebVitals((metric) => {
    console.log(
      JSON.stringify({
        ts: new Date().toISOString(),
        event: 'web_vital',
        name: metric.name,
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        rating: metric.rating,
        id: metric.id,
      })
    )
  })

  return null
}
