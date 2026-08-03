import { useRef, useState } from 'react'
import { useStore } from '../state/store.jsx'
import { tx } from '../lib/text.js'

/* ============================================================
   KİŞİSEL BİLGİLER
   Kütüphanenin bir koleksiyonu gibi davranır: tek kayıtlıdır ve
   tüm CV'lerde ortaktır. Bu yüzden projelerle aynı yerde, aynı
   statüde duruyor — ayarlarda değil.

   Tek kayıt olduğu için liste görünümü yok; bunun yerine iki kart
   (kimlik / iletişim) ve bunların CV başlığında nasıl basılacağını
   gösteren canlı bir kart var.
   ============================================================ */

/** Fotoğrafı 460px'e küçültüp JPEG'e çevirir — localStorage kotasını korur. */
function readPhoto(file, cb) {
  const reader = new FileReader()
  reader.onload = () => {
    const img = new Image()
    img.onload = () => {
      const SIZE = 460
      const scale = Math.min(1, SIZE / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * scale)
      c.height = Math.round(img.height * scale)
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      cb(c.toDataURL('image/jpeg', 0.86))
    }
    img.src = reader.result
  }
  reader.readAsDataURL(file)
}

export default function ProfileForm() {
  const { library, doc, dispatch } = useStore()
  const p = library.profile
  const fileRef = useRef(null)
  const [lang, setLang] = useState(doc?.lang || 'tr')

  const set = (patch) => dispatch({ type: 'lib/patchProfile', patch })
  const setBi = (key, value) => set({ [key]: { ...p[key], [lang]: value } })

  const iletisim = [tx(p.location, lang), p.phone, p.email, p.linkedin, p.github, p.website]
    .filter(Boolean)

  return (
    <div className="lib-single">
      <div className="lib-head">
        <div>
          <h2>Kişisel Bilgiler</h2>
          <p>Her CV'nin başlığında basılır — bir kez yazarsın, hepsinde görünür.</p>
        </div>
        <div className="lang-tabs">
          {['tr', 'en'].map((l) => (
            <button key={l} aria-pressed={lang === l} onClick={() => setLang(l)}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {!p.fullName && (
        <p className="hint" style={{ margin: '0 0 14px' }}>
          Elinde hazır bir veri dosyası varsa (JSON ya da YAML) tek tek yazmak yerine soldaki{' '}
          <b>Dosya yükle ve yedekle</b>'den içeri alabilirsin.
        </p>
      )}

      <div className="profile-cards">
        <section className="lib-card">
          <h3>Kimlik</h3>
          <div className="row" style={{ gap: 16, alignItems: 'flex-start' }}>
            <div style={{ flexShrink: 0, textAlign: 'center' }}>
              {p.photo ? (
                <img src={p.photo} alt="" className="profile-photo" />
              ) : (
                <div className="profile-photo empty">fotoğraf</div>
              )}
              <button className="btn sm ghost" onClick={() => fileRef.current.click()}>Yükle</button>
              {p.photo && (
                <button className="btn sm ghost danger" onClick={() => set({ photo: null })}>Sil</button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) readPhoto(f, (data) => set({ photo: data }))
                  e.target.value = ''
                }}
              />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <label className="field">
                <span>Ad Soyad</span>
                <input type="text" value={p.fullName} onChange={(e) => set({ fullName: e.target.value })} />
              </label>
              <label className="field" style={{ marginBottom: 0 }}>
                <span>Varsayılan ünvan ({lang.toUpperCase()})</span>
                <input
                  type="text"
                  placeholder={lang === 'tr' ? 'Elektrik-Elektronik Mühendisi' : 'Electrical & Electronics Engineer'}
                  value={p.headline?.[lang] || ''}
                  onChange={(e) => setBi('headline', e.target.value)}
                />
                <em className="field-hint">
                  Yalnızca bir CV'nin <b>Hedef pozisyon</b> alanı boşsa görünür — o alan bunu ezer.
                </em>
              </label>
            </div>
          </div>
        </section>

        <section className="lib-card">
          <h3>İletişim</h3>
          <div className="pair">
            <label className="field">
              <span>E-posta</span>
              <input type="email" value={p.email} onChange={(e) => set({ email: e.target.value })} />
            </label>
            <label className="field">
              <span>Telefon</span>
              <input type="tel" value={p.phone} onChange={(e) => set({ phone: e.target.value })} />
            </label>
            <label className="field">
              <span>Konum ({lang.toUpperCase()})</span>
              <input
                type="text"
                value={p.location?.[lang] || ''}
                onChange={(e) => setBi('location', e.target.value)}
              />
            </label>
            <label className="field">
              <span>LinkedIn</span>
              <input
                type="text"
                placeholder="linkedin.com/in/kullanici"
                value={p.linkedin}
                onChange={(e) => set({ linkedin: e.target.value })}
              />
            </label>
            <label className="field">
              <span>GitHub</span>
              <input
                type="text"
                placeholder="github.com/kullanici"
                value={p.github}
                onChange={(e) => set({ github: e.target.value })}
              />
            </label>
            <label className="field" style={{ marginBottom: 0 }}>
              <span>Web sitesi (opsiyonel)</span>
              <input type="text" value={p.website} onChange={(e) => set({ website: e.target.value })} />
            </label>
          </div>
          <em className="field-hint" style={{ marginTop: 10 }}>
            Adresleri <code>https://</code> olmadan yaz — CV'de kısa görünür, tıklanınca tam
            adrese gider.
          </em>
        </section>
      </div>

      {/* Boş alanı doldurmak için değil: yazdığın şeyin CV'nin en
          üstünde nasıl basılacağını burada görüyorsun. */}
      <section className="lib-card head-preview">
        <h3>CV başlığında böyle görünecek</h3>
        <div className="hp-body">
          {p.photo && <img src={p.photo} alt="" />}
          <div>
            <strong>{p.fullName || 'Ad Soyad'}</strong>
            <span>{tx(p.headline, lang) || 'Ünvan yazılmadı'}</span>
            <em>{iletisim.length ? iletisim.join('  ·  ') : 'İletişim bilgisi girilmedi'}</em>
          </div>
        </div>
        <em className="field-hint">
          Her CV bunu kendi <b>Görünüm</b> şeridinden değiştirebilir: fotoğrafı kapatabilir,
          ünvan yerine hedef pozisyonu yazdırabilir. Yurt dışı başvurularında fotoğrafı
          kapatmak standarda daha uygun.
        </em>
      </section>
    </div>
  )
}
