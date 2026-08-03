import { forwardRef } from 'react'
import { useStore } from '../state/store.jsx'
import { SECTION_DEFS } from '../data/seed.js'
import { tx, txList } from '../lib/text.js'
import ContactIcon from './Icons.jsx'

/* ============================================================
   CV BELGESİ
   Tek sütun, gerçek metin. Görsel zenginlik tamamen CSS'ten
   gelir — hiçbir metin görsele, tabloya veya kutuya gömülmez.
   DOM sırası = ATS'in okuyacağı sıra.
   ============================================================ */

const label = (id, lang) => tx(SECTION_DEFS.find((s) => s.id === id)?.label, lang)

/* Kütüphane listesinden, belgedeki id sırasına göre öğeleri çeker. */
function pick(list = [], ids = []) {
  const map = new Map(list.map((it) => [it.id, it]))
  return ids.map((id) => map.get(id)).filter(Boolean)
}

function Bullets({ items, lang }) {
  const filled = items?.filter((b) => tx(b, lang))
  if (!filled?.length) return null
  return (
    <ul className="r-bullets">
      {filled.map((b, i) => (
        <li key={i}>{tx(b, lang)}</li>
      ))}
    </ul>
  )
}

/* Etiketler ayraçla render edilir: PDF metin katmanında
   birbirine yapışmadan, okunabilir biçimde çıkar. */
function TechLine({ tech, lang }) {
  const list = txList(tech, lang)
  if (!list.length) return null
  return (
    <p className="r-tech">
      {list.map((t, i) => (
        <span key={t}>
          {t}
          {i < list.length - 1 ? ' · ' : ''}
        </span>
      ))}
    </p>
  )
}

function EntryHead({ title, org, meta, sub }) {
  return (
    <>
      <div className="r-entry-head">
        <h3 className="r-role">
          {title}
          {org ? <span className="r-org"> — {org}</span> : null}
        </h3>
        {meta ? <span className="r-meta">{meta}</span> : null}
      </div>
      {sub ? <p className="r-sub">{sub}</p> : null}
    </>
  )
}

const Resume = forwardRef(function Resume(_props, ref) {
  const { library, doc } = useStore()
  const lang = doc.lang
  const p = library.profile

  /* Görünen metin kısa kalsın (linkedin.com/in/… gibi), köprü tam
     adrese gitsin. Bağlantılar PDF'e gerçek annotation olarak gömülür;
     metin katmanına dokunmadıkları için ATS açısından etkisizler. */
  const href = (type, text) => {
    const t = text.trim()
    switch (type) {
      case 'email': return `mailto:${t}`
      case 'phone': return `tel:${t.replace(/[^\d+]/g, '')}`
      case 'linkedin':
      case 'github':
      case 'website': return /^https?:\/\//i.test(t) ? t : `https://${t}`
      default: return null
    }
  }

  const contact = [
    { type: 'location', text: tx(p.location, lang) },
    { type: 'phone', text: p.phone },
    { type: 'email', text: p.email },
    { type: 'linkedin', text: p.linkedin },
    { type: 'github', text: p.github },
    { type: 'website', text: p.website },
  ]
    .filter((c) => c.text)
    .map((c) => ({ ...c, href: href(c.type, c.text) }))

  const renderSection = (sec) => {
    const heading = label(sec.id, lang)

    switch (sec.id) {
      case 'summary': {
        const s = library.summaries.find((x) => x.id === doc.summaryId)
        const text = tx(s?.text, lang)
        if (!text) return null
        return (
          <section key={sec.id} className="r-section">
            <h2>{heading}</h2>
            <p className="r-summary">{text}</p>
          </section>
        )
      }

      case 'experience': {
        const items = pick(library.experience, sec.itemIds)
        if (!items.length) return null
        return (
          <section key={sec.id} className="r-section">
            <h2>{heading}</h2>
            {items.map((e) => (
              <article key={e.id} className="r-entry">
                <EntryHead
                  title={tx(e.role, lang)}
                  org={tx(e.org, lang)}
                  meta={`${tx(e.start, lang)} – ${tx(e.end, lang)}`}
                  sub={[tx(e.location, lang), tx(e.employment, lang)].filter(Boolean).join(' · ')}
                />
                <Bullets items={e.bullets} lang={lang} />
              </article>
            ))}
          </section>
        )
      }

      case 'education': {
        const items = pick(library.education, sec.itemIds)
        if (!items.length) return null
        return (
          <section key={sec.id} className="r-section">
            <h2>{heading}</h2>
            {items.map((e) => (
              <article key={e.id} className="r-entry">
                <EntryHead
                  title={tx(e.degree, lang)}
                  org={tx(e.org, lang)}
                  meta={`${tx(e.start, lang)} – ${tx(e.end, lang)}`}
                  sub={tx(e.location, lang)}
                />
                <Bullets items={e.bullets} lang={lang} />
              </article>
            ))}
          </section>
        )
      }

      case 'projects': {
        const items = pick(library.projects, sec.itemIds)
        if (!items.length) return null
        return (
          <section key={sec.id} className="r-section">
            <h2>{heading}</h2>
            {items.map((e) => (
              <article key={e.id} className="r-entry">
                <EntryHead
                  title={tx(e.name, lang)}
                  meta={e.year}
                  sub={tx(e.tagline, lang)}
                />
                <Bullets items={e.bullets} lang={lang} />
                <TechLine tech={e.tech} lang={lang} />
                {/* Depo bağlantısı: kağıtta okunabilsin diye görünür metin,
                    ekranda/PDF'te gerçek köprü. Metin katmanını kirletmez. */}
                {e.link ? (
                  <p className="r-link">
                    <a href={/^https?:\/\//i.test(e.link) ? e.link : `https://${e.link}`} rel="noopener noreferrer">
                      {e.link.replace(/^https?:\/\//i, '')}
                    </a>
                  </p>
                ) : null}
              </article>
            ))}
          </section>
        )
      }

      case 'skills': {
        const items = pick(library.skillGroups, sec.itemIds)
        if (!items.length) return null
        return (
          <section key={sec.id} className="r-section">
            <h2>{heading}</h2>
            <div className="r-rows">
              {items.map((g) => (
                <div key={g.id} className="r-row">
                  <span className="r-row-label">{tx(g.label, lang)}</span>
                  <span className="r-row-value">{txList(g.items, lang).join(', ')}</span>
                </div>
              ))}
            </div>
          </section>
        )
      }

      case 'languages': {
        const items = pick(library.languages, sec.itemIds)
        if (!items.length) return null
        return (
          <section key={sec.id} className="r-section">
            <h2>{heading}</h2>
            <p className="r-inline">
              {items.map((l) => `${tx(l.name, lang)} (${tx(l.level, lang)})`).join(' · ')}
            </p>
          </section>
        )
      }

      case 'certifications': {
        const items = pick(library.certifications, sec.itemIds)
        if (!items.length) return null
        return (
          <section key={sec.id} className="r-section">
            <h2>{heading}</h2>
            <div className="r-rows">
              {items.map((c) => (
                <div key={c.id} className="r-row">
                  <span className="r-row-label">{c.year}</span>
                  <span className="r-row-value">
                    {tx(c.name, lang)}
                    {tx(c.issuer, lang) ? ` — ${tx(c.issuer, lang)}` : ''}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )
      }

      case 'references': {
        if (doc.referencesOnRequest) {
          return (
            <section key={sec.id} className="r-section">
              <h2>{heading}</h2>
              <p className="r-inline">
                {lang === 'tr' ? 'İstek üzerine paylaşılır.' : 'Available upon request.'}
              </p>
            </section>
          )
        }
        const items = pick(library.references, sec.itemIds)
        if (!items.length) return null
        return (
          <section key={sec.id} className="r-section">
            <h2>{heading}</h2>
            {items.map((r) => (
              <article key={r.id} className="r-entry r-ref">
                <h3 className="r-role">{r.name}</h3>
                <p className="r-sub">{tx(r.title, lang)}</p>
                <p className="r-sub">{[r.email, r.phone].filter(Boolean).join(' · ')}</p>
              </article>
            ))}
          </section>
        )
      }

      default:
        return null
    }
  }

  return (
    <article
      ref={ref}
      className={`resume theme-${doc.theme}${doc.texture && doc.texture !== 'none' ? ` texture-${doc.texture}` : ''}`}
      style={{ '--accent': doc.accent }}
      lang={lang}
    >
      <header className="r-header">
        {/* DOM'da metin önce gelir — ATS ismi ve ünvanı ilk okur.
            Fotoğraf CSS ile sağa yerleşir, akışı bozmaz. */}
        <div className="r-id">
          <h1 className="r-name">{p.fullName}</h1>
          <p className="r-headline">{tx(doc.targetRole, lang) || tx(p.headline, lang)}</p>
          {/* İkonlar satır içi SVG — metin katmanına hiçbir şey
              eklemezler, parser yalnızca yanlarındaki metni okur. */}
          <p className={`r-contact${doc.showIcons ? ' with-icons' : ''}`}>
            {contact.map((c, i) => (
              <span className="r-contact-item" key={c.type}>
                {doc.showIcons ? <ContactIcon type={c.type} /> : null}
                {c.href
                  ? <a href={c.href} rel="noopener noreferrer">{c.text}</a>
                  : c.text}
                {/* Ayraç span'ın DIŞINDA kalmalı — içeride olsaydı
                    nowrap yüzünden satır kırma fırsatı kalmazdı.
                    İkonlu modda ayrayı CSS gap veriyor. */}
                {!doc.showIcons && i < contact.length - 1 && (
                  <span className="r-sep"> · </span>
                )}
              </span>
            ))}
          </p>
        </div>
        {doc.showPhoto && p.photo ? (
          <img className="r-photo" src={p.photo} alt="" aria-hidden="true" />
        ) : null}
      </header>

      {doc.sections.filter((s) => s.enabled).map(renderSection)}
    </article>
  )
})

export default Resume
