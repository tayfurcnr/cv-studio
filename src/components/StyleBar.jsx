import { useState } from 'react'
import { useStore } from '../state/store.jsx'

/* ============================================================
   GÖRÜNÜM ŞERİDİ
   Tema, renk, doku, dil — hepsi önizlemenin hemen üstünde,
   çünkü hiçbiri bakmadan seçilemez. Ayrı bir sekmede dururken
   etkiyi görmek için sekme değiştirmek gerekiyordu.
   ============================================================ */

const THEMES = [
  { id: 'signal', label: 'Signal', desc: 'Aksan çizgili başlık, temiz ızgara. Teknik roller.' },
  { id: 'slate',  label: 'Slate',  desc: 'Kenara taşan koyu başlık bandı. Kurumsal, cesur.' },
  { id: 'serif',  label: 'Serif',  desc: 'Serif başlıklar, bol beyaz alan. Ar-Ge ve akademi.' },
]

const ACCENTS = ['#1d5c7a', '#1f3a5f', '#0f5c4a', '#6b2737', '#3f3a63', '#1f2937']

const TEXTURES = [
  { id: 'none',  label: 'Yok',    desc: 'Düz beyaz.' },
  { id: 'grain', label: 'Kağıt',  desc: 'İnce gürültü — basılı kağıt hissi. En doğal duranı.' },
  { id: 'dots',  label: 'Nokta',  desc: 'Seyrek nokta ızgarası. Hafif teknik.' },
  { id: 'grid',  label: 'Izgara', desc: 'Kılcal kareli çizgi — teknik çizim hissi.' },
  { id: 'wash',  label: 'Geçiş',  desc: 'Sağ üst köşeden vurgu renginde yumuşak geçiş.' },
]

export default function StyleBar() {
  const { doc, dispatch } = useStore()
  const [open, setOpen] = useState(false)
  const setDoc = (patch) => dispatch({ type: 'doc/patch', patch })

  return (
    <div className={`stylebar${open ? ' open' : ''}`}>
      <div className="stylebar-row">
        <button className="stylebar-toggle" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          <span className="caret">{open ? '▾' : '▸'}</span> Görünüm
        </button>

        <div className="filters compact">
          {THEMES.map((t) => (
            <button
              key={t.id}
              className="chip"
              aria-pressed={doc.theme === t.id}
              onClick={() => setDoc({ theme: t.id })}
              title={t.desc}
            >
              {t.label}
            </button>
          ))}
        </div>

        <span className="sep" />

        <div className="swatches">
          {ACCENTS.map((c) => (
            <button
              key={c}
              onClick={() => setDoc({ accent: c })}
              aria-label={c}
              aria-pressed={doc.accent === c}
              style={{ background: c }}
            />
          ))}
        </div>

        <span className="spacer" />

        <select
          className="mini"
          value={doc.lang}
          onChange={(e) => setDoc({ lang: e.target.value })}
          title="Belgenin dili"
        >
          <option value="tr">TR</option>
          <option value="en">EN</option>
        </select>
      </div>

      {open && (
        <div className="stylebar-more">
          <label className="field">
            <span>CV adı (sadece senin görürsün)</span>
            <input type="text" value={doc.name} onChange={(e) => setDoc({ name: e.target.value })} />
          </label>

          <label className="field">
            <span>Hedef pozisyon — başlıkta ünvanın yerine geçer</span>
            <input
              type="text"
              placeholder={doc.lang === 'tr' ? 'Gömülü Sistem Mühendisi' : 'Embedded Systems Engineer'}
              value={doc.targetRole?.[doc.lang] || ''}
              onChange={(e) => setDoc({ targetRole: { ...doc.targetRole, [doc.lang]: e.target.value } })}
            />
          </label>

          <label className="field">
            <span>Arka plan dokusu</span>
            <div className="filters">
              {TEXTURES.map((t) => (
                <button
                  key={t.id}
                  className="chip"
                  aria-pressed={doc.texture === t.id}
                  onClick={() => setDoc({ texture: t.id })}
                  title={t.desc}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <em className="field-hint">
              {TEXTURES.find((t) => t.id === doc.texture)?.desc} Doku tamamen CSS — metin katmanına
              hiçbir şey eklemez, ATS açısından yok hükmünde. Yazdırırken "Arka plan grafikleri"
              kapalıysa basılmaz, CV yine düzgün çıkar.
            </em>
          </label>

          <div className="row wrap" style={{ gap: 18 }}>
            <label className="row inline-check">
              <input
                type="checkbox"
                checked={doc.showPhoto}
                onChange={(e) => setDoc({ showPhoto: e.target.checked })}
              />
              <span>Fotoğrafı göster</span>
            </label>
            <label className="row inline-check">
              <input
                type="checkbox"
                checked={doc.showIcons}
                onChange={(e) => setDoc({ showIcons: e.target.checked })}
              />
              <span>İletişim ikonlarını göster</span>
            </label>
            <label className="row inline-check">
              <input
                type="color"
                value={doc.accent}
                onChange={(e) => setDoc({ accent: e.target.value })}
                style={{ width: 38, height: 26, padding: 2, background: 'transparent', border: '1px solid var(--line)' }}
              />
              <span>Özel renk</span>
            </label>
          </div>

          <p className="hint" style={{ margin: '4px 0 0' }}>
            İkonlar satır içi SVG — ikon fontu değil, metin katmanına hiçbir şey eklemezler.
            Font Awesome gibi ikon fontları ise PDF'e çöp karakter yazar.
          </p>
        </div>
      )}
    </div>
  )
}
