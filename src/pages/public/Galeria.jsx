import { Page } from './PageLayout'

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
