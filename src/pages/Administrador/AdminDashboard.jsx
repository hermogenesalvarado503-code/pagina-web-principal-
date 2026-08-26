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

// Validar contraseña: mínimo 8 caracteres, mayúscula, minúscula, número y carácter especial
function validatePassword(password) {
  const errors = []
  if (password.length < 8) errors.push('Mínimo 8 caracteres')
  if (!/[A-Z]/.test(password)) errors.push('Al menos una letra mayúscula')
  if (!/[a-z]/.test(password)) errors.push('Al menos una letra minúscula')
  if (!/\d/.test(password)) errors.push('Al menos un número')
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) errors.push('Al menos un carácter especial (!@#$%^&* etc.)')
  return errors
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
  const [changePasswordForm, setChangePasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [passwordErrors, setPasswordErrors] = useState([])
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false })
  const [passwordChangeStep, setPasswordChangeStep] = useState('form') // 'form' | 'otp' | 'success'
  const [passwordChangeToken, setPasswordChangeToken] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpTimeLeft, setOtpTimeLeft] = useState(300) // 5 minutos
  const [passwordHistory, setPasswordHistory] = useState([])
  const [accessLogs, setAccessLogs] = useState([])

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

  async function handleChangePassword(e) {
    e.preventDefault()
    const { currentPassword, newPassword, confirmPassword } = changePasswordForm
    
    // Validar que las contraseñas coincidan
    if (newPassword !== confirmPassword) {
      setPasswordErrors(['Las contraseñas no coinciden.'])
      return
    }

    // Validar fortaleza de la nueva contraseña
    const errors = validatePassword(newPassword)
    if (errors.length > 0) {
      setPasswordErrors(errors)
      return
    }

    try {
      const result = await request('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      setPasswordChangeToken(result.token)
      setPasswordChangeStep('otp')
      setOtpTimeLeft(300)
      setPasswordErrors([])
      setNotice('Se envió un código a tu email. Válido por 5 minutos.')
    } catch (error) {
      setPasswordErrors([error.message])
    }
  }

  async function handleValidateOTP(e) {
    e.preventDefault()
    if (!otpCode) {
      setPasswordErrors(['Ingresa el código OTP'])
      return
    }

    try {
      await request('/api/auth/validate-password-change', {
        method: 'POST',
        body: JSON.stringify({ token: passwordChangeToken, otpCode }),
      })
      setPasswordChangeStep('success')
      setPasswordErrors([])
      setNotice('Contraseña cambiada correctamente.')
      
      // Resetear después de 3 segundos
      setTimeout(() => {
        setPasswordChangeForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
        setOtpCode('')
        setPasswordChangeToken('')
        setPasswordChangeStep('form')
        loadPasswordHistory()
      }, 3000)
    } catch (error) {
      setPasswordErrors([error.message])
    }
  }

  async function loadPasswordHistory() {
    try {
      const history = await request('/api/auth/password-history')
      setPasswordHistory(history)
    } catch (error) {
      console.error('Error cargando historial:', error)
    }
  }

  async function loadAccessLogs() {
    try {
      const logs = await request('/api/auth/access-logs')
      setAccessLogs(logs)
    } catch (error) {
      console.error('Error cargando accesos:', error)
    }
  }

  // Temporizador para OTP
  useEffect(() => {
    if (passwordChangeStep !== 'otp' || otpTimeLeft <= 0) return
    
    const timer = setInterval(() => {
      setOtpTimeLeft((prev) => {
        if (prev <= 1) {
          setPasswordChangeStep('form')
          setPasswordErrors(['El código de validación ha expirado'])
          setOtpCode('')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [passwordChangeStep, otpTimeLeft])

  return (
    <AdminLayout activeSection={activeSection} onNavigate={setActiveSection}>
      <section style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h2>Panel de Administración</h2>
            <p>{activeSection === 'overview' ? 'Resumen de administración de contenidos.' : activeSection === 'users' ? 'Gestión de usuarios en desarrollo.' : activeSection === 'gallery' ? 'Gestiona la galería visible en el sitio.' : activeSection === 'events' ? 'Gestiona noticias y eventos.' : activeSection === 'messages' ? 'Consulta y responde los mensajes recibidos desde Contáctanos.' : activeSection === 'reviews' ? 'Gestiona reseñas aprobadas.' : 'Administra tu perfil y seguridad.'}</p>
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

            {activeSection === 'profile' && (
              <section style={{ maxWidth: '900px' }}>
                <div style={{ display: 'grid', gap: 24 }}>
                  {/* Formulario de cambio de contraseña */}
                  <div style={{ padding: 20, background: 'white', borderRadius: 12, boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                    <div className="section-heading">
                      <p className="eyebrow">Seguridad</p>
                      <h3>{passwordChangeStep === 'form' ? 'Cambiar contraseña' : passwordChangeStep === 'otp' ? 'Validar código OTP' : 'Éxito'}</h3>
                    </div>

                    {passwordChangeStep === 'form' && (
                      <form onSubmit={handleChangePassword} style={{ display: 'grid', gap: 16 }}>
                        <div style={{ display: 'grid', gap: 12 }}>
                          {/* Contraseña actual */}
                          <div style={{ position: 'relative' }}>
                            <label htmlFor="currentPassword" style={{ display: 'block', marginBottom: 6, fontSize: '0.9rem', fontWeight: 600 }}>
                              Contraseña actual
                            </label>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                              <input
                                id="currentPassword"
                                type={showPasswords.current ? 'text' : 'password'}
                                value={changePasswordForm.currentPassword}
                                onChange={(e) => setChangePasswordForm({ ...changePasswordForm, currentPassword: e.target.value })}
                                placeholder="Ingresa tu contraseña actual"
                                required
                                style={{ flex: 1, paddingRight: 40 }}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                                style={{ position: 'absolute', right: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                              >
                                {showPasswords.current ? '🙈' : '👁️'}
                              </button>
                            </div>
                          </div>

                          {/* Nueva contraseña */}
                          <div style={{ position: 'relative' }}>
                            <label htmlFor="newPassword" style={{ display: 'block', marginBottom: 6, fontSize: '0.9rem', fontWeight: 600 }}>
                              Nueva contraseña
                            </label>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                              <input
                                id="newPassword"
                                type={showPasswords.new ? 'text' : 'password'}
                                value={changePasswordForm.newPassword}
                                onChange={(e) => setChangePasswordForm({ ...changePasswordForm, newPassword: e.target.value })}
                                placeholder="Mínimo 8 caracteres con mayúscula, minúscula, número y símbolo"
                                required
                                style={{ flex: 1, paddingRight: 40 }}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                                style={{ position: 'absolute', right: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                              >
                                {showPasswords.new ? '🙈' : '👁️'}
                              </button>
                            </div>
                          </div>

                          {/* Confirmar contraseña */}
                          <div style={{ position: 'relative' }}>
                            <label htmlFor="confirmPassword" style={{ display: 'block', marginBottom: 6, fontSize: '0.9rem', fontWeight: 600 }}>
                              Confirmar contraseña
                            </label>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                              <input
                                id="confirmPassword"
                                type={showPasswords.confirm ? 'text' : 'password'}
                                value={changePasswordForm.confirmPassword}
                                onChange={(e) => setChangePasswordForm({ ...changePasswordForm, confirmPassword: e.target.value })}
                                placeholder="Repite tu nueva contraseña"
                                required
                                style={{ flex: 1, paddingRight: 40 }}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                                style={{ position: 'absolute', right: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                              >
                                {showPasswords.confirm ? '🙈' : '👁️'}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Requisitos de contraseña */}
                        {changePasswordForm.newPassword && (
                          <div style={{ padding: 12, background: '#f3f4f6', borderRadius: 8, fontSize: '0.9rem' }}>
                            <strong style={{ display: 'block', marginBottom: 8 }}>Requisitos de contraseña:</strong>
                            <div style={{ display: 'grid', gap: 4 }}>
                              <div style={{ color: changePasswordForm.newPassword.length >= 8 ? '#10b981' : '#ef4444' }}>
                                ✓ Mínimo 8 caracteres
                              </div>
                              <div style={{ color: /[A-Z]/.test(changePasswordForm.newPassword) ? '#10b981' : '#ef4444' }}>
                                ✓ Al menos una letra mayúscula
                              </div>
                              <div style={{ color: /[a-z]/.test(changePasswordForm.newPassword) ? '#10b981' : '#ef4444' }}>
                                ✓ Al menos una letra minúscula
                              </div>
                              <div style={{ color: /\d/.test(changePasswordForm.newPassword) ? '#10b981' : '#ef4444' }}>
                                ✓ Al menos un número
                              </div>
                              <div style={{ color: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(changePasswordForm.newPassword) ? '#10b981' : '#ef4444' }}>
                                ✓ Al menos un carácter especial (!@#$%^&* etc.)
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Errores */}
                        {passwordErrors.length > 0 && (
                          <div style={{ padding: 12, background: '#fee2e2', borderRadius: 8, borderLeft: '4px solid #ef4444', color: '#991b1b' }}>
                            <strong style={{ display: 'block', marginBottom: 8 }}>Errores:</strong>
                            <ul style={{ margin: 0, paddingLeft: 20 }}>
                              {passwordErrors.map((error, index) => (
                                <li key={index} style={{ marginBottom: 4 }}>{error}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Botones */}
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          <button className="btn primary" type="submit">
                            Enviar código de validación
                          </button>
                          <button
                            className="btn secondary"
                            type="button"
                            onClick={() => {
                              setChangePasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
                              setPasswordErrors([])
                            }}
                          >
                            Cancelar
                          </button>
                        </div>
                      </form>
                    )}

                    {passwordChangeStep === 'otp' && (
                      <form onSubmit={handleValidateOTP} style={{ display: 'grid', gap: 16 }}>
                        <div style={{ padding: 16, background: '#eff6ff', borderRadius: 8, borderLeft: '4px solid #3b82f6', color: '#1e40af' }}>
                          <strong>✓ Código enviado a tu email</strong>
                          <p style={{ margin: '8px 0 0 0', fontSize: '0.9rem' }}>Se envió un código de 6 dígitos válido por <strong>{Math.floor(otpTimeLeft / 60)}:{(otpTimeLeft % 60).toString().padStart(2, '0')}</strong></p>
                        </div>

                        <div>
                          <label htmlFor="otpCode" style={{ display: 'block', marginBottom: 6, fontSize: '0.9rem', fontWeight: 600 }}>
                            Código OTP (6 dígitos)
                          </label>
                          <input
                            id="otpCode"
                            type="text"
                            maxLength="6"
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="000000"
                            required
                            style={{ fontSize: '24px', letterSpacing: '8px', textAlign: 'center', fontFamily: 'monospace' }}
                          />
                        </div>

                        {otpTimeLeft <= 60 && (
                          <div style={{ padding: 12, background: '#fef2f2', borderRadius: 8, borderLeft: '4px solid #ef4444', color: '#991b1b', fontSize: '0.9rem' }}>
                            ⏱️ Quedan solo {otpTimeLeft} segundos para validar
                          </div>
                        )}

                        {passwordErrors.length > 0 && (
                          <div style={{ padding: 12, background: '#fee2e2', borderRadius: 8, borderLeft: '4px solid #ef4444', color: '#991b1b' }}>
                            <strong style={{ display: 'block', marginBottom: 8 }}>Errores:</strong>
                            <ul style={{ margin: 0, paddingLeft: 20 }}>
                              {passwordErrors.map((error, index) => (
                                <li key={index} style={{ marginBottom: 4 }}>{error}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          <button className="btn primary" type="submit">
                            Validar código
                          </button>
                          <button
                            className="btn secondary"
                            type="button"
                            onClick={() => {
                              setPasswordChangeStep('form')
                              setOtpCode('')
                              setPasswordErrors([])
                            }}
                          >
                            Atrás
                          </button>
                        </div>
                      </form>
                    )}

                    {passwordChangeStep === 'success' && (
                      <div style={{ padding: 20, textAlign: 'center' }}>
                        <div style={{ fontSize: '48px', marginBottom: 16 }}>✅</div>
                        <h4 style={{ margin: '0 0 8px 0' }}>Contraseña actualizada</h4>
                        <p style={{ color: '#666', marginBottom: 16 }}>Tu contraseña ha sido cambiada exitosamente. Se envió un email de confirmación.</p>
                      </div>
                    )}
                  </div>

                  {/* Historial de cambios */}
                  <div style={{ padding: 20, background: 'white', borderRadius: 12, boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <h3 style={{ margin: 0 }}>Historial de cambios de contraseña</h3>
                      <button className="btn secondary" type="button" onClick={loadPasswordHistory} style={{ fontSize: '0.9rem' }}>
                        Recargar
                      </button>
                    </div>
                    {passwordHistory.length === 0 ? (
                      <p style={{ color: '#999' }}>No hay cambios registrados.</p>
                    ) : (
                      <div style={{ display: 'grid', gap: 12 }}>
                        {passwordHistory.map((entry) => (
                          <div key={entry.id} style={{ padding: 12, background: '#f9fafb', borderRadius: 8, borderLeft: '4px solid #10b981' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                              <strong>{entry.browser} en {entry.device}</strong>
                              <small style={{ color: '#999' }}>{new Date(entry.changed_at).toLocaleString('es-SV')}</small>
                            </div>
                            <div style={{ fontSize: '0.9rem', color: '#666' }}>
                              <div>🌐 IP: <code style={{ background: '#fff', padding: '2px 6px', borderRadius: 4 }}>{entry.ip_address || 'Desconocida'}</code></div>
                              <div>💻 SO: {entry.os}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Historial de accesos */}
                  <div style={{ padding: 20, background: 'white', borderRadius: 12, boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <h3 style={{ margin: 0 }}>Accesos a administración</h3>
                      <button className="btn secondary" type="button" onClick={loadAccessLogs} style={{ fontSize: '0.9rem' }}>
                        Recargar
                      </button>
                    </div>
                    {accessLogs.length === 0 ? (
                      <p style={{ color: '#999' }}>No hay accesos registrados.</p>
                    ) : (
                      <div style={{ display: 'grid', gap: 12 }}>
                        {accessLogs.slice(0, 10).map((log) => (
                          <div key={log.id} style={{ padding: 12, background: '#f9fafb', borderRadius: 8, borderLeft: '4px solid #3b82f6' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                              <strong>{log.browser} en {log.device}</strong>
                              <small style={{ color: '#999' }}>{new Date(log.accessed_at).toLocaleString('es-SV')}</small>
                            </div>
                            <div style={{ fontSize: '0.9rem', color: '#666' }}>
                              <div>🌐 IP: <code style={{ background: '#fff', padding: '2px 6px', borderRadius: 4 }}>{log.ip_address || 'Desconocida'}</code></div>
                              <div>💻 {log.os} • {log.action || 'Acceso'}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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
