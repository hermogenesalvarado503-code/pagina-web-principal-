import { useEffect, useState } from 'react'
import AdminLayout from './AdminLayout'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

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

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState('overview')
  const [gallery, setGallery] = useState([])
  const [events, setEvents] = useState([])
  const [reviews, setReviews] = useState([])
  const [reviewNeedsReload, setReviewNeedsReload] = useState(false)
  const [editingGallery, setEditingGallery] = useState(null)
  const [editingEvent, setEditingEvent] = useState(null)
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [galleryRes, eventsRes, reviewsRes] = await Promise.all([
          fetch(`${API_URL}/api/gallery`, { credentials: 'include' }),
          fetch(`${API_URL}/api/events`, { credentials: 'include' }),
          fetch(`${API_URL}/api/reviews`, { credentials: 'include' }),
        ])
        const [galleryData, eventsData, reviewsData] = await Promise.all([
          jsonResponse(galleryRes),
          jsonResponse(eventsRes),
          jsonResponse(reviewsRes),
        ])
        setGallery(galleryData || [])
        setEvents(eventsData || [])
        setReviews(reviewsData || [])
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
            <p>{activeSection === 'overview' ? 'Resumen de administración de contenidos.' : activeSection === 'users' ? 'Gestión de usuarios en desarrollo.' : activeSection === 'gallery' ? 'Gestiona la galería visible en el sitio.' : activeSection === 'events' ? 'Gestiona noticias y eventos.' : 'Gestiona reseñas aprobadas.'}</p>
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
              <div style={{ display: 'grid', gap: 24 }}>
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
