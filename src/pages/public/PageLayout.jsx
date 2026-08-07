export function Page({ title, intro, children }) {
  return (
    <section className="page" data-reveal>
      <div className="banner" data-reveal>
        <h1>{title}</h1>
        <p>{intro}</p>
      </div>
      <div className="section" data-reveal>{children}</div>
    </section>
  )
}

export function MapFrame({ iframe, title }) {
  const src = extractIframeSrc(iframe)
  if (!src) return null

  return (
    <iframe
      className="map-frame"
      src={src}
      title={`Mapa ${title}`}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
    />
  )
}

export function extractIframeSrc(iframe = '') {
  const match = String(iframe).match(/src=["']([^"']+)["']/i)
  if (match?.[1]) return match[1]
  if (String(iframe).startsWith('https://')) return iframe
  return ''
}

export function formatEventDate(event) {
  const date = event.event_date ? new Date(event.event_date).toLocaleDateString() : 'Sin fecha'
  const time = event.event_time ? String(event.event_time).slice(0, 5) : ''
  return time ? `${date} - ${time}` : date
}

export function dateInputValue(value) {
  if (!value) return ''
  return String(value).slice(0, 10)
}

export function timeInputValue(value) {
  if (!value) return ''
  return String(value).slice(0, 5)
}
