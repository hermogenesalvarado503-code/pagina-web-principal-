import { Page } from './PageLayout'

export default function Contacto({ t, onSubmit }) {
  return (
    <Page title={t.pages.contactTitle} intro={t.pages.contactIntro}>
      <div className="contact-layout">
        <form className="panel-form" data-reveal onSubmit={onSubmit}>
         <h4>Si tienes preguntas, deseas información o quieres comunicarte con nosotros, completa el formulario y con gusto te responderemos.</h4>
          <input name="name" placeholder={t.forms.name} required />
          <input name="email" type="email" placeholder={t.forms.email} required />
          <input name="phone" placeholder={t.forms.phone} maxLength="8" />
          <input name="subject" placeholder={t.forms.subject} required />
          <select name="category" defaultValue="consulta-general">
            <option value="admisiones">Admisiones</option>
            <option value="consulta-general">Consulta general</option>
            <option value="queja">Queja</option>
            <option value="otro">Otro</option>
          </select>
          <textarea name="message" placeholder={t.forms.message} required />
          <button className="btn primary" type="submit">{t.forms.send}</button>
        </form>
        <aside className="contact-card" data-reveal>
          <h3>Información de contacto</h3>
         
          <p><strong>Ubicación:</strong> Avenida El Progreso No. 2, Barrio San Juan, Santiago Nonualco.</p>
          <p><strong>Teléfono:</strong> +503 2330-4037</p>
          <p><strong>Correo:</strong> escuela.342@clases.edu.sv</p>
          <p><strong>Horario:</strong> Lunes a viernes: 7:00 AM - 4:00 PM</p>
          <div className="map-frame-wrapper">
            <strong>Estamos ubicados en:</strong>
            <iframe
              title="Ubicación del Centro Escolar Dr. Hermogenes Alvarado"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3879.448792073009!2d-88.93974039999999!3d13.508027300000002!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8f7cad62edce2e5d%3A0x6fc63c87d53b188!2zQ2VudHJvIEVzY29sYXIg4oCcRHIuIEhlcm3Ds2dlbmVzIEFsdmFyYWRv4oCd!5e0!3m2!1ses-419!2ssv!4v1785266083826!5m2!1ses-419!2ssv"
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        </aside>
      </div>
    </Page>
  )
}
