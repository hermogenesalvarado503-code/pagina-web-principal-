import { Page } from './PageLayout'

function formatGalleryDate(item) {
  return item.event_date
    ? new Date(`${String(item.event_date).slice(0, 10)}T12:00:00`).toLocaleDateString('es-SV', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : ''
}

export default function Galeria({ t, gallery, goTo }) {
  return (
    <Page title={t.pages.galleryTitle} intro={t.pages.galleryIntro}>
      <div className="gallery-grid">
        {gallery.map((item) => (
          <figure className="gallery-card" data-reveal key={item.id}>
            <img src={item.image_url} alt={item.title} />
            <figcaption>
              <strong>{item.title}</strong>
              {item.description && <span>{item.description}</span>}
              <small>Fecha: {formatGalleryDate(item) || 'Pendiente de completar'}</small>
              <small>Hora: {item.event_time ? String(item.event_time).slice(0, 5) : 'Pendiente de completar'}</small>
              <small>Ubicación: {item.location || 'Pendiente de completar'}</small>
            </figcaption>
          </figure>
        ))}
      </div><br></br>
      <button className="btn primary" type="button" data-reveal onClick={() => goTo('contacto')}>
        {t.home.ctaInfo}
      </button>
    </Page>
  )
}
