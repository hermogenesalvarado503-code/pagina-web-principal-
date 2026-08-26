import { Page } from './PageLayout'
import { servicesContent } from './content'

export default function Servicios({ t, lang, goTo }) {
  const services = servicesContent[lang] || servicesContent.es
  return (
    <Page title={t.pages.servicesTitle} intro={t.pages.servicesIntro}>
      <div className="card-grid">
        {(servicesContent[t?.lang] || servicesContent.es).map(([title, text]) => (
          <article className="card" key={title}>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div><br></br>
      <button className="btn primary" type="button" onClick={() => goTo('contacto')}>
        {t.nav.contacto}
      </button>
    </Page>
  )
}
