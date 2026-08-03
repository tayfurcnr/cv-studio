import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../state/store.jsx'
import { CATEGORIES } from '../data/seed.js'
import { COLLECTIONS } from '../data/schemas.js'
import { tx, txList } from '../lib/text.js'
import ItemEditor from './ItemEditor.jsx'

/* ============================================================
   ÖĞE SEÇİCİ
   Kütüphaneden bu CV'ye ne gireceğini seçersin. Kütüphaneyi
   yönetmek (yeni yazmak, kopyalamak, silmek, sıralamak) burada
   değil — o Kütüphanem modunun işi.

   Tek istisna hızlı düzenleme: akışı bozmamak için burada da
   açılıyor, ama kutunun başında kapsam uyarısı var.

   Değişiklikler anında uygulanır; "Tamam/İptal" yok.
   ============================================================ */

export default function PickerModal({ collection, sectionId, onEditLibrary, onClose }) {
  const { library, doc, documents, dispatch, lang } = useStore()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [onlyChosen, setOnlyChosen] = useState(false)
  const [editing, setEditing] = useState(null)

  const meta = COLLECTIONS[collection]
  const items = library[collection] || []
  const section = doc.sections.find((s) => s.id === sectionId)
  const chosen = new Set(section?.itemIds || [])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !editing && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, editing])

  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr')
    return items.filter((it) => {
      if (onlyChosen && !chosen.has(it.id)) return false
      if (collection === 'projects' && category !== 'all' && it.category !== category) return false
      if (!q) return true
      return [meta.title(it, lang), meta.subtitle(it, lang), txList(it.tech, lang).join(' '), txList(it.items, lang).join(' ')]
        .join(' ').toLocaleLowerCase('tr').includes(q)
    })
  }, [items, query, category, onlyChosen, collection, lang, meta, chosen])

  const toggle = (id) =>
    dispatch({
      type: chosen.has(id) ? 'section/removeItem' : 'section/addItem',
      sectionId,
      itemId: id,
    })

  /* Kaç CV bu kaydı kullanıyor — düzenleme uyarısındaki sayı. */
  const usage = (id) =>
    documents.filter((d) => d.summaryId === id || d.sections.some((s) => s.itemIds.includes(id))).length

  return (
    <>
      <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <div className="modal picker">
          <div className="modal-head">
            <h3>{meta.label} seç</h3>
            <span className="count">{chosen.size} seçili · {items.length} kayıt</span>
            <span className="spacer" />
            <button className="btn ghost icon" onClick={onClose}>✕</button>
          </div>

          <div className="picker-tools">
            <input
              type="text"
              autoFocus
              placeholder="Ara…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              className="btn"
              onClick={() => { onClose(); onEditLibrary(collection) }}
              title="Kütüphaneye git — yeni kayıt yaz, kopyala, sil, sırala"
            >
              Kütüphaneyi aç
            </button>
          </div>

          <div className="picker-filters">
            <button className="chip" aria-pressed={onlyChosen} onClick={() => setOnlyChosen((v) => !v)}>
              Sadece seçililer
            </button>
            {collection === 'projects' && (
              <>
                <span className="sep" />
                <button className="chip" aria-pressed={category === 'all'} onClick={() => setCategory('all')}>
                  Tümü
                </button>
                {CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    className="chip"
                    aria-pressed={category === c.id}
                    onClick={() => setCategory(c.id)}
                  >
                    {tx(c.label, lang)}
                  </button>
                ))}
              </>
            )}
          </div>

          <div className="picker-list">
            {!visible.length && (
              <p className="hint" style={{ padding: '18px 4px' }}>
                {items.length ? 'Aramaya uyan kayıt yok.' : 'Kütüphanende bu türden kayıt yok.'}
              </p>
            )}

            {visible.map((it) => {
              const inCv = chosen.has(it.id)
              return (
                <div key={it.id} className={`pick${inCv ? ' on' : ''}`}>
                  <button
                    className="pick-main"
                    onClick={() => toggle(it.id)}
                    title={inCv ? "Bu CV'den çıkar" : "Bu CV'ye ekle"}
                  >
                    <span className="tick" aria-hidden="true">{inCv ? '✓' : ''}</span>
                    <span className="pick-text">
                      <strong>{meta.title(it, lang)}</strong>
                      <em>{meta.subtitle(it, lang)}</em>
                      {txList(it.tech, lang).length ? <em className="tags">{txList(it.tech, lang).join(' · ')}</em> : null}
                    </span>
                  </button>

                  <div className="pick-actions">
                    <button
                      className="btn sm ghost"
                      title="İçeriğini düzelt (kütüphanedeki asıl kaydı değiştirir)"
                      onClick={() => setEditing({ item: structuredClone(it), used: usage(it.id) })}
                    >
                      Düzenle
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="modal-foot">
            <span className="hint" style={{ margin: 0, flex: 1 }}>
              Satıra tıkla → bu CV'ye ekle/çıkar. Kütüphanedeki kaydın kendisine dokunmaz.
            </span>
            <button className="btn primary" onClick={onClose}>Bitti</button>
          </div>
        </div>
      </div>

      {editing && (
        <ItemEditor
          collection={collection}
          item={editing.item}
          scopeNote={
            editing.used > 1
              ? `Bu, kütüphanedeki asıl kaydı değiştirir — onu kullanan ${editing.used} CV'nin hepsi güncellenir.`
              : "Bu, kütüphanedeki asıl kaydı değiştirir. Yalnızca bu CV'ye özel bir sürüm istiyorsan önce Kütüphanem'den kopyasını çıkar."
          }
          onSave={(draft) => {
            dispatch({ type: 'lib/update', collection, id: draft.id, patch: draft })
            setEditing(null)
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  )
}
