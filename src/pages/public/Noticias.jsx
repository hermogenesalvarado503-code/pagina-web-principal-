import { Page, formatEventDate } from './PageLayout'

export default function Noticias({ t, events, goTo }) {
  return (
    <Page title={t.pages.newsTitle} intro={t.pages.newsIntro}>
      <div className="card-grid">
        {events.map((event) => (
          <article className="card news-card" data-reveal key={event.id}>
            {event.image_url && <img className="card-thumb" src={event.image_url} alt={event.title} />}
            <small>{formatEventDate(event)}</small>
            <h3>{event.title}</h3>
            <strong>{event.news}</strong>
            <p>{event.description}</p>
            {event.location && <small>{event.location}</small>}
          </article>
        ))}
      </div><br></br>
      <button className="btn primary" type="button" data-reveal onClick={() => goTo('contacto')}>
        {t.nav.contacto}
      </button>
    </Page>
  )
}
