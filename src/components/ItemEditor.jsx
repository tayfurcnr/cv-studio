import { useEffect, useState } from 'react'
import { COLLECTIONS } from '../data/schemas.js'
import { CATEGORIES } from '../data/seed.js'
import { bi, tx } from '../lib/text.js'

/* ============================================================
   ÖĞE DÜZENLEYİCİ
   Şemadan formu kendisi kurar. TR/EN sekmesi tüm iki dilli
   alanlar için ortak — bir kez seçersin, hepsi o dile geçer.
   ============================================================ */

export default function ItemEditor({ collection, item, onSave, onClose, scopeNote }) {
  const meta = COLLECTIONS[collection]
  const [draft, setDraft] = useState(item)
  const [lang, setLang] = useState('tr')

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const set = (key, value) => setDraft((d) => ({ ...d, [key]: value }))
  const setBi = (key, value) =>
    setDraft((d) => ({ ...d, [key]: { ...(d[key] || bi()), [lang]: value } }))

  const hasBilingual = meta.fields.some((f) => ['bi', 'bitext', 'bilist', 'bitaglist'].includes(f.type))

  const renderField = (f) => {
    const v = draft[f.key]

    switch (f.type) {
      case 'text':
        return (
          <input
            type="text"
            value={v || ''}
            placeholder={f.placeholder || ''}
            onChange={(e) => set(f.key, e.target.value)}
          />
        )

      case 'bi':
        return (
          <input
            type="text"
            value={(v || {})[lang] || ''}
            onChange={(e) => setBi(f.key, e.target.value)}
          />
        )

      case 'bitext':
        return (
          <textarea
            rows={f.rows || 5}
            value={(v || {})[lang] || ''}
            onChange={(e) => setBi(f.key, e.target.value)}
          />
        )

      case 'taglist':
        return (
          <input
            type="text"
            value={(v || []).join(', ')}
            onChange={(e) =>
              set(f.key, e.target.value.split(',').map((s) => s.trim()).filter(Boolean))
            }
          />
        )

      /* Etiket listesinin iki dilli hâli — üstteki TR/EN sekmesine bağlı.
         Bir dil boşsa CV render sırasında diğerine düşer. */
      case 'bitaglist': {
        const cur = Array.isArray(v) ? { tr: v, en: [] } : (v || { tr: [], en: [] })
        return (
          <input
            type="text"
            value={(cur[lang] || []).join(', ')}
            placeholder={
              !(cur[lang] || []).length && (cur[lang === 'tr' ? 'en' : 'tr'] || []).length
                ? `(${lang === 'tr' ? 'EN' : 'TR'} dolu, bu dil boş → o kullanılır)`
                : ''
            }
            onChange={(e) =>
              set(f.key, {
                ...cur,
                [lang]: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
              })
            }
          />
        )
      }

      case 'select':
        return (
          <select value={v || 'other'} onChange={(e) => set(f.key, e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{tx(c.label, 'tr')}</option>
            ))}
          </select>
        )

      case 'bilist': {
        const list = v || []
        const patch = (i, text) =>
          set(f.key, list.map((b, j) => (j === i ? { ...b, [lang]: text } : b)))
        return (
          <div className="list-field">
            {list.map((b, i) => (
              <div className="li" key={i}>
                <textarea
                  rows={2}
                  value={b[lang] || ''}
                  placeholder={
                    b[lang === 'tr' ? 'en' : 'tr']
                      ? `(${lang === 'tr' ? 'EN' : 'TR'} dolu, bu dil boş)`
                      : ''
                  }
                  onChange={(e) => patch(i, e.target.value)}
                />
                <button
                  className="btn ghost icon"
                  title="Maddeyi sil"
                  onClick={() => set(f.key, list.filter((_, j) => j !== i))}
                >
                  ✕
                </button>
              </div>
            ))}
            <button className="btn sm ghost" onClick={() => set(f.key, [...list, bi()])}>
              + Madde ekle
            </button>
          </div>
        )
      }

      default:
        return null
    }
  }

  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <h3>{meta.singular}</h3>
          {hasBilingual && (
            <div className="lang-tabs">
              {['tr', 'en'].map((l) => (
                <button key={l} aria-pressed={lang === l} onClick={() => setLang(l)}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          )}
          <button className="btn ghost icon" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {scopeNote && <p className="scope-note">{scopeNote}</p>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 14px' }}>
            {meta.fields.map((f) => (
              <label
                className="field"
                key={f.key}
                style={{ flex: f.half ? '1 1 calc(50% - 7px)' : '1 1 100%' }}
              >
                <span>{f.label}</span>
                {renderField(f)}
                {f.hint && <em className="field-hint">{f.hint}</em>}
              </label>
            ))}
          </div>
          {hasBilingual && (
            <p className="hint">
              Şu an <b>{lang.toUpperCase()}</b> düzenliyorsun. Bir dili boş bırakırsan CV o alanda
              otomatik olarak diğer dile düşer — yani önce Türkçeyi doldurup İngilizceyi sonra
              tamamlayabilirsin.
            </p>
          )}
        </div>

        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>Vazgeç</button>
          <button className="btn primary" onClick={() => onSave(draft)}>Kaydet</button>
        </div>
      </div>
    </div>
  )
}
