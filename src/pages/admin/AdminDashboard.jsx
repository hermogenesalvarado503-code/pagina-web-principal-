import { useEffect, useState } from 'react'
import AdminLayout from './AdminLayout'

const API_URL = import.meta.env.VITE_API_URL || ''

const defaultAnalytics = {
  summary: {
    totalVisits: 0,
    activeDays: 0,
    topPage: 'Sin datos',
    topPageVisits: 0,
    mobileShare: 0,
  },
  monthlyTrend: [
    { month: 'Ene', visits: 0, trend: 0 },
    { month: 'Feb', visits: 0, trend: 0 },
    { month: 'Mar', visits: 0, trend: 0 },
    { month: 'Abr', visits: 0, trend: 0 },
    { month: 'May', visits: 0, trend: 0 },
    { month: 'Jun', visits: 0, trend: 0 },
  ],
  hourlyTraffic: [
    { hour: '08:00', value: 0 },
    { hour: '10:00', value: 0 },
    { hour: '12:00', value: 0 },
    { hour: '14:00', value: 0 },
    { hour: '16:00', value: 0 },
    { hour: '18:00', value: 0 },
    { hour: '20:00', value: 0 },
    { hour: '22:00', value: 0 },
  ],
  deviceStats: [
    { label: 'Mobile', value: 0, color: '#10b981' },
    { label: 'Desktop', value: 0, color: '#3b82f6' },
    { label: 'Tablet', value: 0, color: '#f59e0b' },
  ],
  dailyTraffic: [
    { label: 'Lun', value: 0 },
    { label: 'Mar', value: 0 },
    { label: 'Mié', value: 0 },
    { label: 'Jue', value: 0 },
    { label: 'Vie', value: 0 },
    { label: 'Sáb', value: 0 },
    { label: 'Dom', value: 0 },
  ],
  trafficSources: [
    { name: 'Directo', share: 0 },
    { name: 'Google', share: 0 },
    { name: 'Facebook', share: 0 },
    { name: 'WhatsApp', share: 0 },
  ],
  topPages: [
    { label: 'Inicio', value: 0 },
    { label: 'Nosotros', value: 0 },
    { label: 'Servicios', value: 0 },
    { label: 'Noticias', value: 0 },
    { label: 'Contacto', value: 0 },
  ],
}

function jsonResponse(res) {
  return res.text().then((text) => {
    try {
      return text ? JSON.parse(text) : {}
    } catch {
      return { error: text }
    }
  })
}

function formatEventDate(value) {
  if (!value) return 'Sin fecha'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('es-SV')
}

function dateInputValue(value) {
  return value ? String(value).slice(0, 10) : ''
}

function timeInputValue(value) {
  return value ? String(value).slice(0, 5) : ''
}

function replyEmailLink(message) {
  const subject = `Respuesta: ${message.subject || 'Consulta recibida'}`
  const body = `Hola ${message.name || ''},\n\nGracias por comunicarse con el Centro Escolar Dr. Hermógenes Alvarado.\n\n`
  return `mailto:${message.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

function whatsappLink(phone) {
  const digits = String(phone || '').replace(/\D/g, '')
  if (!digits) return ''
  const number = digits.length === 8 ? `503${digits}` : digits
  return `https://wa.me/${number}`
}

function formatMessageCategory(category) {
  const value = String(category || '').trim().toLowerCase()

  if (!value || value === 'inquiry' || value === 'consulta-general' || value === 'consulta_general' || value === 'general') return 'Consulta general'
  if (value === 'admissions' || value === 'admisiones') return 'Admisiones'
  if (value === 'complaint' || value === 'queja') return 'Queja'
  if (value === 'other' || value === 'otro') return 'Otro'

  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function formatDeviceLabel(label) {
  const value = String(label || '').trim().toLowerCase()
  if (value === 'mobile' || value === 'móvil' || value === 'movil') return 'Móvil'
  if (value === 'desktop' || value === 'escritorio' || value === 'pc') return 'Escritorio'
  if (value === 'tablet' || value === 'tableta') return 'Tablet'
  return label || 'Desconocido'
}

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState('overview')
  const [gallery, setGallery] = useState([])
  const [events, setEvents] = useState([])
  const [reviews, setReviews] = useState([])
  const [messages, setMessages] = useState([])
  const [reviewNeedsReload, setReviewNeedsReload] = useState(false)
  const [editingGallery, setEditingGallery] = useState(null)
  const [editingEvent, setEditingEvent] = useState(null)
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [analyticsView, setAnalyticsView] = useState('resumen')
  const [analytics, setAnalytics] = useState(defaultAnalytics)

  const compactMonthlyTrend = (analytics?.monthlyTrend || []).slice(-5)

  useEffect(() => {
    async function loadData() {
      try {
        const [galleryRes, eventsRes, reviewsRes, messagesRes, analyticsRes] = await Promise.all([
          fetch(`${API_URL}/api/gallery`, { credentials: 'include' }),
          fetch(`${API_URL}/api/events`, { credentials: 'include' }),
          fetch(`${API_URL}/api/reviews`, { credentials: 'include' }),
          fetch(`${API_URL}/api/messages`, { credentials: 'include' }),
          fetch(`${API_URL}/api/analytics`, { credentials: 'include' }),
        ])
        const [galleryData, eventsData, reviewsData, messagesData, analyticsData] = await Promise.all([
          jsonResponse(galleryRes),
          jsonResponse(eventsRes),
          jsonResponse(reviewsRes),
          jsonResponse(messagesRes),
          analyticsRes.ok ? jsonResponse(analyticsRes) : null,
        ])
        setGallery(galleryData || [])
        setEvents(eventsData || [])
        setReviews(reviewsData || [])
        setMessages(messagesData || [])
        setAnalytics(
          analyticsData && typeof analyticsData === 'object' && Object.keys(analyticsData).length
            ? analyticsData
            : defaultAnalytics,
        )
      } catch (error) {
        setNotice('No se pudo cargar datos de administración.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  async function request(path, options = {}) {
    const res = await fetch(`${API_URL}${path}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
    if (!res.ok) {
      const body = await jsonResponse(res)
      throw new Error(body?.error || 'Error en la API')
    }
    return jsonResponse(res)
  }

  async function saveGalleryItem(payload) {
    try {
      const result = await request(editingGallery ? `/api/gallery/${editingGallery.id}` : '/api/gallery', {
        method: editingGallery ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      })
      setGallery((current) => {
        if (editingGallery) return current.map((item) => (item.id === result.id ? result : item))
        return [result, ...current]
      })
      setEditingGallery(null)
      setNotice('Galería guardada correctamente.')
    } catch (error) {
      setNotice(error.message)
    }
  }

  async function saveEventItem(payload) {
    try {
      const result = await request(editingEvent ? `/api/events/${editingEvent.id}` : '/api/events', {
        method: editingEvent ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      })
      setEvents((current) => {
        if (editingEvent) return current.map((item) => (item.id === result.id ? result : item))
        return [result, ...current]
      })
      setEditingEvent(null)
      setNotice('Noticia guardada correctamente.')
    } catch (error) {
      setNotice(error.message)
    }
  }

  async function deleteGalleryItem(id) {
    try {
      await request(`/api/gallery/${id}`, { method: 'DELETE' })
      setGallery((current) => current.filter((item) => item.id !== id))
      setNotice('Foto eliminada correctamente.')
    } catch (error) {
      setNotice(error.message)
    }
  }

  async function deleteEventItem(id) {
    try {
      await request(`/api/events/${id}`, { method: 'DELETE' })
      setEvents((current) => current.filter((item) => item.id !== id))
      setNotice('Noticia eliminada correctamente.')
    } catch (error) {
      setNotice(error.message)
    }
  }

  async function deleteReviewItem(id) {
    try {
      await request(`/api/reviews/${id}`, { method: 'DELETE' })
      setReviews((current) => current.filter((item) => item.id !== id))
      setReviewNeedsReload(true)
      setNotice('Reseña eliminada correctamente.')
    } catch (error) {
      setNotice(error.message)
    }
  }

  async function deleteMessageItem(id) {
    try {
      await request(`/api/messages/${id}`, { method: 'DELETE' })
      setMessages((current) => current.filter((message) => message.id !== id))
      setNotice('Mensaje eliminado correctamente.')
    } catch (error) {
      setNotice(error.message)
    }
  }

  async function refreshReviews() {
    try {
      const res = await fetch(`${API_URL}/api/reviews`, { credentials: 'include' })
      const reviewsData = await jsonResponse(res)
      setReviews(reviewsData || [])
      setReviewNeedsReload(false)
      setNotice('Reseñas recargadas correctamente.')
    } catch (error) {
      setNotice(error.message || 'No se pudo recargar reseñas.')
    }
  }

  return (
    <AdminLayout activeSection={activeSection} onNavigate={setActiveSection}>
      <section style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h2>Panel de Administración</h2>
            <p>{activeSection === 'overview' ? 'Resumen de administración de contenidos.' : activeSection === 'users' ? 'Gestión de usuarios en desarrollo.' : activeSection === 'gallery' ? 'Gestiona la galería visible en el sitio.' : activeSection === 'events' ? 'Gestiona noticias y eventos.' : activeSection === 'messages' ? 'Consulta y responde los mensajes recibidos desde Contáctanos.' : 'Gestiona reseñas aprobadas.'}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn primary" type="button" onClick={() => { setEditingGallery({ title: '', description: '', image_url: '', sort_order: 0 }); setEditingEvent(null) }}>
              Agregar foto nueva
            </button>
            <button className="btn secondary" type="button" onClick={() => { setEditingEvent({ title: '', news: '', description: '', event_date: '', event_time: '', image_url: '', location: '', map_iframe: '' }); setEditingGallery(null) }}>
              Agregar noticia nueva
            </button>
          </div>
        </div>

        {notice && (
          <div className="notice" style={{ marginTop: 16 }}>
            {notice}
          </div>
        )}

        {loading ? (
          <p>Cargando contenidos...</p>
        ) : (
          <div style={{ display: 'grid', gap: 24, marginTop: 24 }}>
            {activeSection === 'overview' && (
              <div className="admin-dashboard" style={{ display: 'grid', gap: 24 }}>
                <section className="dashboard-header-panel card">
                  <div>
                    <p className="eyebrow">Dashboard</p>
                    <h3>Accesos y métricas del sitio</h3>
                  </div>
                  <div className="dashboard-tab-group" role="tablist" aria-label="Vistas del dashboard">
                    <button type="button" className={analyticsView === 'resumen' ? 'is-active' : ''} onClick={() => setAnalyticsView('resumen')}>Resumen</button>
                    <button type="button" className={analyticsView === 'accesos' ? 'is-active' : ''} onClick={() => setAnalyticsView('accesos')}>Accesos</button>
                    <button type="button" className={analyticsView === 'dispositivos' ? 'is-active' : ''} onClick={() => setAnalyticsView('dispositivos')}>Dispositivos</button>
                  </div>
                </section>

                {analyticsView === 'resumen' && (
                  <>
                    <section className="dashboard-metrics-grid">
                      <article className="dashboard-stat card">
                        <span className="stat-label">Visitas totales</span>
                        <strong>{Number(analytics?.summary?.totalVisits || 0).toLocaleString()}</strong>
                        <small className="positive">{Number(analytics?.summary?.activeDays || 0)} días activos</small>
                      </article>
                      <article className="dashboard-stat card">
                        <span className="stat-label">Página más vista</span>
                        <strong>{analytics?.summary?.topPage || 'Sin datos'}</strong>
                        <small className="positive">{Number(analytics?.summary?.topPageVisits || 0).toLocaleString()} visitas</small>
                      </article>
                      <article className="dashboard-stat card">
                        <span className="stat-label">Dispositivos móviles</span>
                        <strong>{Number(analytics?.summary?.mobileShare || 0)}%</strong>
                        <small className="neutral">del total de accesos</small>
                      </article>
                      <article className="dashboard-stat card">
                        <span className="stat-label">Días activos</span>
                        <strong>{Number(analytics?.summary?.activeDays || 0)}</strong>
                        <small className="positive">actividad registrada</small>
                      </article>
                    </section>

                    <section className="dashboard-chart-grid">
                      <article className="card chart-panel">
                        <div className="panel-heading">
                          <div>
                            <p className="eyebrow">Tendencia</p>
                            <h4>Accesos por mes</h4>
                          </div>
                          <span className="trend-badge">+24.8%</span>
                        </div>
                        <div className="bars-chart" aria-label="Gráfico de accesos mensuales">
                          {compactMonthlyTrend.map((item) => (
                            <div className="bars-chart-item" key={item.month}>
                              <div className="bar-wrap">
                                <span className="bar" style={{ height: `${Math.max((item.visits / Math.max(...compactMonthlyTrend.map((entry) => entry.visits), 1)) * 100, 22)}%` }} />
                              </div>
                              <div className="bar-meta">
                                <strong>{item.month}</strong>
                                <small>{item.visits}</small>
                              </div>
                            </div>
                          ))}
                        </div>
                      </article>

                      <article className="card chart-panel">
                        <div className="panel-heading">
                          <div>
                            <p className="eyebrow">Fuentes</p>
                            <h4>Vistas por canal</h4>
                          </div>
                        </div>
                        <div className="source-list">
                          {analytics.trafficSources.map((source) => (
                            <div className="source-row" key={source.name}>
                              <div className="source-label">
                                <span>{source.name}</span>
                                <strong>{source.share}%</strong>
                              </div>
                              <div className="source-track">
                                <span style={{ width: `${source.share}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </article>
                    </section>
                  </>
                )}

                {analyticsView === 'accesos' && (
                  <section className="dashboard-analytics-grid">
                    <article className="card chart-panel">
                      <div className="panel-heading">
                        <div>
                          <p className="eyebrow">Accesos</p>
                          <h4>Por día</h4>
                        </div>
                        <span className="trend-badge">+12.4%</span>
                      </div>
                      <div className="line-chart" aria-label="Accesos por día de la semana">
                        {analytics.dailyTraffic.map((day) => (
                          <div className="line-chart-item" key={day.label}>
                            <span className="line-value" style={{ height: `${Math.max((day.value / Math.max(...analytics.dailyTraffic.map((entry) => entry.value), 1)) * 100, 12)}%` }} />
                            <small>{day.label}</small>
                          </div>
                        ))}
                      </div>
                    </article>

                    <article className="card chart-panel">
                      <div className="panel-heading">
                        <div>
                          <p className="eyebrow">Hora pico</p>
                          <h4>Accesos por hora</h4>
                        </div>
                      </div>
                      <div className="hour-list">
                        {analytics.hourlyTraffic.map((entry) => (
                          <div className="hour-row" key={entry.hour}>
                            <span>{entry.hour}</span>
                            <div className="hour-track">
                              <span style={{ width: `${Math.min(entry.value * 2, 100)}%` }} />
                            </div>
                            <strong>{entry.value}</strong>
                          </div>
                        ))}
                      </div>
                    </article>
                  </section>
                )}

                {analyticsView === 'dispositivos' && (
                  <section className="dashboard-device-grid">
                    <article className="card chart-panel">
                      <div className="panel-heading">
                        <div>
                          <p className="eyebrow">Dispositivos</p>
                          <h4>Accesos por tipo</h4>
                        </div>
                      </div>
                      <div className="device-list">
                        {analytics.deviceStats.map((device) => (
                          <div className="device-row" key={device.label}>
                            <div className="device-header">
                              <span>{formatDeviceLabel(device.label)}</span>
                              <strong>{device.value}%</strong>
                            </div>
                            <div className="device-track">
                              <span style={{ width: `${device.value}%`, background: device.color }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </article>

                    <article className="card chart-panel">
                      <div className="panel-heading">
                        <div>
                          <p className="eyebrow">Vistas</p>
                          <h4>Top páginas visitadas</h4>
                        </div>
                      </div>
                      <div className="page-list">
                        {analytics.topPages.map((page) => (
                          <div className="page-row" key={page.label}><span>{page.label}</span><strong>{page.value}</strong></div>
                        ))}
                      </div>
                    </article>
                  </section>
                )}

                <section>
                  <div className="section-heading">
                    <p className="eyebrow">Galería</p>
                    <h3>Fotos y recursos visuales</h3>
                  </div>
                  <div className="admin-list" style={{ display: 'grid', gap: 12 }}>
                    {gallery.length === 0 ? (
                      <p>No hay imágenes registradas.</p>
                    ) : gallery.slice(0, 3).map((item) => (
                      <article className="message-card admin-item" key={item.id} style={{ display: 'grid', gridTemplateColumns: '120px 1fr auto', gap: 12, alignItems: 'center' }}>
                        <img src={item.image_url} alt={item.title} style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 8 }} />
                        <div>
                          <h4>{item.title}</h4>
                          <p>{item.description}</p>
                          <small>Orden: {item.sort_order}</small>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>

                <section>
                  <div className="section-heading">
                    <p className="eyebrow">Reseñas</p>
                    <h3>Reseñas públicas aprobadas</h3>
                  </div>
                  <div className="admin-list" style={{ display: 'grid', gap: 12 }}>
                    {reviews.length === 0 ? (
                      <p>No hay reseñas registradas.</p>
                    ) : reviews.slice(0, 3).map((item) => (
                      <article className="message-card admin-item" key={item.id} style={{ display: 'grid', gap: 10 }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                          <div>
                            <strong>{item.name}</strong>
                            <small>{item.role}</small>
                            <div className="stars" style={{ margin: '0.5rem 0' }}>
                              {'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}
                            </div>
                            <p>{item.comment}</p>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>

                <section>
                  <div className="section-heading">
                    <p className="eyebrow">Noticias</p>
                    <h3>Administrar eventos y publicaciones</h3>
                  </div>
                  <div className="admin-list" style={{ display: 'grid', gap: 12 }}>
                    {events.length === 0 ? (
                      <p>No hay noticias registradas.</p>
                    ) : events.slice(0, 3).map((item) => (
                      <article className="message-card admin-item" key={item.id} style={{ display: 'grid', gap: 10 }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                          {item.image_url && <img src={item.image_url} alt={item.title} style={{ width: 100, height: 80, objectFit: 'cover', borderRadius: 8 }} />}
                          <div>
                            <h4>{item.title}</h4>
                            <p>{item.news}</p>
                            <small>{item.location || 'Sin ubicación'} • {item.event_date || 'Sin fecha'} {item.event_time || ''}</small>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {activeSection === 'users' && (
              <section>
                <div className="section-heading">
                  <p className="eyebrow">Usuarios</p>
                  <h3>Gestión de usuarios</h3>
                </div>
                <p>Esta sección está preparada para mostrar administración de usuarios más adelante.</p>
              </section>
            )}

            {activeSection === 'gallery' && (
              <section>
                <div className="section-heading">
                  <p className="eyebrow">Galería</p>
                  <h3>Fotos y recursos visuales</h3>
                </div>
                <div className="admin-list" style={{ display: 'grid', gap: 12 }}>
                  {gallery.length === 0 ? (
                    <p>No hay imágenes registradas.</p>
                  ) : gallery.map((item) => (
                    <article className="message-card admin-item" key={item.id} style={{ display: 'grid', gridTemplateColumns: '120px 1fr auto', gap: 12, alignItems: 'center' }}>
                      <img src={item.image_url} alt={item.title} style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 8 }} />
                      <div>
                        <h4>{item.title}</h4>
                        <p>{item.description}</p>
                        <small>Orden: {item.sort_order}</small>
                      </div>
                      <div style={{ display: 'grid', gap: 8 }}>
                        <button className="btn secondary" type="button" onClick={() => { setEditingGallery(item); setEditingEvent(null) }}>
                          Editar
                        </button>
                        <button className="danger" type="button" onClick={() => deleteGalleryItem(item.id)}>
                          Eliminar
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {activeSection === 'reviews' && (
              <section>
                <div className="section-heading">
                  <p className="eyebrow">Reseñas</p>
                  <h3>Reseñas públicas aprobadas</h3>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
                  <button className="btn secondary" type="button" onClick={refreshReviews}>
                    Recargar reseñas
                  </button>
                  {reviewNeedsReload && (
                    <button className="btn primary" type="button" onClick={refreshReviews}>
                      Actualizar lista
                    </button>
                  )}
                </div>
                <div className="admin-list" style={{ display: 'grid', gap: 12 }}>
                  {reviews.length === 0 ? (
                    <p>No hay reseñas registradas.</p>
                  ) : reviews.map((item) => (
                    <article className="message-card admin-item" key={item.id} style={{ display: 'grid', gap: 10 }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <div>
                          <strong>{item.name}</strong>
                          <small>{item.role}</small>
                          <div className="stars" style={{ margin: '0.5rem 0' }}>
                            {'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}
                          </div>
                          <p>{item.comment}</p>
                          <small>{new Date(item.created_at).toLocaleString()}</small>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button className="danger" type="button" onClick={() => deleteReviewItem(item.id)}>
                          Eliminar
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {activeSection === 'messages' && (
              <section>
                <div className="section-heading message-section-heading">
                  <div>
                    <p className="eyebrow">Bandeja de entrada</p>
                    <h3>Mensajes recibidos desde Contáctanos</h3>
                  </div>
                  <span className="wa-badge">WhatsApp</span>
                </div>
                <div className="admin-list" style={{ display: 'grid', gap: 12 }}>
                  {messages.length === 0 ? (
                    <p>No hay mensajes registrados.</p>
                  ) : messages.map((message) => {
                    const whatsapp = whatsappLink(message.phone)
                    const initials = (message.name || 'N')
                      .split(/\s+/)
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join('')
                      .toUpperCase() || 'N'
                    return (
                      <article className="message-card admin-item whatsapp-card message-thread" key={message.id} style={{ display: 'grid', gap: 10 }}>
                        <div className="message-header">
                          <div className="message-user-row">
                            <div className="message-avatar" aria-label={message.name}>{initials}</div>
                            <div className="message-user-meta">
                              <strong>{message.name}</strong>
                              <small>{message.email}{message.phone ? ` · ${message.phone}` : ''}</small>
                            </div>
                          </div>
                          <div className="message-meta-side">
                            <span className="message-status"><span className="status-dot" />Nuevo</span>
                            <small className="message-date">{message.created_at ? new Date(message.created_at).toLocaleString('es-SV') : 'Sin fecha'}</small>
                          </div>
                        </div>
                        <div className="message-content">
                          <div className="message-subject-row">
                            <h4>{message.subject}</h4>
                            <small className="message-category">{formatMessageCategory(message.category)}</small>
                          </div>
                          <p>{message.message}</p>
                        </div>
                        <div className="message-actions">
                          <a className="btn primary message-action-link" href={replyEmailLink(message)}>
                            <span className="message-action-icon" aria-hidden="true">
                              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6.75A2.75 2.75 0 0 1 5.75 4h12.5A2.75 2.75 0 0 1 21 6.75v10.5A2.75 2.75 0 0 1 18.25 20H5.75A2.75 2.75 0 0 1 3 17.25V6.75Zm2.2-.25 6.8 5.1 6.8-5.1H5.2Zm13.55 2.05-6.3 4.72a1 1 0 0 1-1.3 0L5.25 8.55v8.7c0 .41.34.75.75.75h12c.41 0 .75-.34.75-.75v-8.7Z"/></svg>
                            </span>
                            Responder por correo
                          </a>
                          {whatsapp && <a className="btn secondary message-action-link" href={whatsapp} target="_blank" rel="noreferrer">
                            <span className="message-action-icon whatsapp-icon" aria-hidden="true">
                              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.04 2C6.59 2 2.17 6.3 2.17 11.66c0 1.93.56 3.78 1.52 5.38L2 22l5.19-1.38a9.74 9.74 0 0 0 4.85 1.36h.01c5.45 0 9.87-4.3 9.87-9.66S17.49 2 12.04 2Zm5.48 13.59c-.24.68-1.4 1.28-1.92 1.35-.49.07-1.1.1-3.56-.75-3.01-1.08-4.95-3.74-5.1-3.91-.15-.17-1.24-1.65-1.24-3.15 0-1.5.78-2.24 1.06-2.54.28-.3.61-.38.82-.38h.59c.19 0 .45.01.73.56.31.61.98 2.1 1.06 2.25.08.15.13.34.02.55-.1.21-.16.34-.33.53-.17.19-.34.42-.48.57-.15.15-.31.32-.14.63.17.3.79 1.29 1.69 2.09 1.16 1.03 2.13 1.35 2.43 1.5.3.15.47.12.64-.08.18-.2.76-.88 1-.19.24-.3.51-.09.79Z"/></svg>
                            </span>
                            Responder por WhatsApp
                          </a>}
                          <button className="danger" type="button" onClick={() => deleteMessageItem(message.id)}>Eliminar</button>
                        </div>
                      </article>
                    )
                  })}
                </div>
              </section>
            )}

            {activeSection === 'events' && (
              <section>
                <div className="section-heading">
                  <p className="eyebrow">Noticias</p>
                  <h3>Administrar eventos y publicaciones</h3>
                </div>
                <div className="admin-list" style={{ display: 'grid', gap: 12 }}>
                  {events.length === 0 ? (
                    <p>No hay noticias registradas.</p>
                  ) : events.map((item) => (
                    <article className="message-card admin-item admin-event-item" key={item.id} style={{ display: 'grid', gap: 10 }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        {item.image_url && <img src={item.image_url} alt={item.title} style={{ width: 100, height: 80, objectFit: 'cover', borderRadius: 8 }} />}
                        <div>
                          <h4>{item.title}</h4>
                          <p>{item.news}</p>
                          <small>{item.location || 'Sin ubicación'} • {item.event_date || 'Sin fecha'} {item.event_time || ''}</small>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button className="btn secondary" type="button" onClick={() => { setEditingEvent(item); setEditingGallery(null) }}>
                          Editar
                        </button>
                        <button className="danger" type="button" onClick={() => deleteEventItem(item.id)}>
                          Eliminar
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {(editingGallery || editingEvent) && (
          <section className="panel-form" style={{ marginTop: 24, padding: 16, background: 'white', borderRadius: 12, boxShadow: '0 12px 24px rgba(0,0,0,0.05)' }}>
            <h3>{editingGallery ? (editingGallery.id ? 'Editar foto' : 'Agregar nueva foto') : 'Editar noticia'}</h3>
            <form
              onSubmit={async (event) => {
                event.preventDefault()
                const values = Object.fromEntries(new FormData(event.currentTarget).entries())
                if (editingGallery) {
                  await saveGalleryItem({
                    title: values.title,
                    description: values.description,
                    image_url: values.image_url,
                    sort_order: Number(values.sort_order || 0),
                  })
                } else {
                  await saveEventItem({
                    title: values.title,
                    news: values.news,
                    description: values.description,
                    event_date: values.event_date,
                    event_time: values.event_time,
                    image_url: values.image_url,
                    location: values.location,
                    map_iframe: values.map_iframe,
                  })
                }
                event.currentTarget.reset()
              }}
            >
              <div className="form-grid" style={{ display: 'grid', gap: 12 }}>
                <input name="title" defaultValue={editingGallery?.title || editingEvent?.title || ''} placeholder="Título" required />
                {editingEvent && <input name="news" defaultValue={editingEvent?.news || ''} placeholder="Noticia" required />}
                <textarea name="description" defaultValue={editingGallery?.description || editingEvent?.description || ''} placeholder="Descripción" required />
                <input name="image_url" defaultValue={editingGallery?.image_url || editingEvent?.image_url || ''} placeholder="URL de imagen" required />
                {editingGallery && <input name="sort_order" type="number" defaultValue={editingGallery?.sort_order ?? 0} placeholder="Orden" />}
                {editingEvent && (
                  <>
                    <input name="location" defaultValue={editingEvent?.location || ''} placeholder="Ubicación" />
                    <input name="event_date" type="date" defaultValue={dateInputValue(editingEvent?.event_date)} />
                    <input name="event_time" type="time" defaultValue={timeInputValue(editingEvent?.event_time)} />
                    <textarea name="map_iframe" defaultValue={editingEvent?.map_iframe || ''} placeholder="Iframe del mapa (opcional)" />
                  </>
                )}
              </div>
              <div className="form-actions" style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                <button className="btn primary" type="submit">Guardar</button>
                <button className="btn secondary" type="button" onClick={() => { setEditingGallery(null); setEditingEvent(null); setNotice('') }}>
                  Cancelar
                </button>
              </div>
            </form>
          </section>
        )}
      </section>
    </AdminLayout>
  )
}
