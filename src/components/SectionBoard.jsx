import { useState } from 'react'
import { useStore } from '../state/store.jsx'
import { SECTION_DEFS } from '../data/seed.js'
import { SECTION_TO_COLLECTION, COLLECTIONS } from '../data/schemas.js'
import { useDragList } from '../lib/dnd.js'
import { tx } from '../lib/text.js'
import PickerModal from './PickerModal.jsx'

/* ============================================================
   KURGU
   Yalnızca kompozisyon: hangi bölüm açık, hangi öğeler seçili,
   hangi sırada. Burada metin yazılmaz — bir kaydı düzeltmek
   istersen "Kütüphanede düzenle" seni doğru yere götürür.

   Bu ayrım bilerek katı: kart içinde yazı yazılabilseydi, bir
   projeyi düzeltirken onu kullanan öbür CV'leri de değiştirdiğin
   görünmez kalırdı.
   ============================================================ */

function ChosenList({ section, collection }) {
  const { library, dispatch, lang } = useStore()
  const meta = COLLECTIONS[collection]
  const byId = new Map((library[collection] || []).map((it) => [it.id, it]))

  const dragProps = useDragList((from, to) =>
    dispatch({ type: 'section/moveItem', sectionId: section.id, from, to })
  )

  if (!section.itemIds.length) return null

  return (
    <ul className="chosen">
      {section.itemIds.map((id, i) => {
        const item = byId.get(id)
        if (!item) return null
        return (
          <li key={id} {...dragProps(i)}>
            <span className="grip">⣿</span>
            <span className="t">{meta.title(item, lang)}</span>
            <button
              className="btn ghost icon sm"
              title="Bu CV'den çıkar (kütüphaneden silinmez)"
              onClick={() => dispatch({ type: 'section/removeItem', sectionId: section.id, itemId: id })}
            >
              ✕
            </button>
          </li>
        )
      })}
    </ul>
  )
}

/* Özet bölümü liste değil, tek seçim — kendi kontrolü var. */
function SummaryControls({ onEditLibrary }) {
  const { library, doc, dispatch, lang } = useStore()
  const current = library.summaries.find((s) => s.id === doc.summaryId)

  return (
    <div className="card-body">
      <div className="row">
        <select
          value={doc.summaryId || ''}
          onChange={(e) => dispatch({ type: 'doc/patch', patch: { summaryId: e.target.value } })}
        >
          <option value="">— Özet seçilmedi —</option>
          {library.summaries.map((s) => (
            <option key={s.id} value={s.id}>{tx(s.label, lang)}</option>
          ))}
        </select>
        <button className="btn sm ghost" onClick={() => onEditLibrary('summaries')}>
          Kütüphanede düzenle
        </button>
      </div>
      {current
        ? <p className="preview-text">{tx(current.text, lang)}</p>
        : <p className="empty-slot">Kütüphanendeki özetlerden birini seç.</p>}
    </div>
  )
}

export default function SectionBoard({ onEditLibrary }) {
  const { doc, library, dispatch, lang } = useStore()
  const [picking, setPicking] = useState(null) // {collection, sectionId}

  const dragProps = useDragList((from, to) => dispatch({ type: 'section/reorder', from, to }))
  const p = library.profile

  return (
    <div className="pad">
      <p className="hint" style={{ margin: '0 0 14px' }}>
        Kartları sürükle → bölüm sırası. Kart içindeki satırları sürükle → öğe sırası.
        Buradaki hiçbir işlem kütüphanene dokunmaz; yalnızca <b>{doc.name}</b> değişir.
      </p>

      {/* Başlık bloğu: her CV'nin en üstünde basılır, sürüklenmez,
          kapatılamaz — çünkü kütüphaneye ait, CV'ye değil. */}
      <div className="section-card fixed">
        <div className="section-head static">
          <span className="grip locked" title="Başlık her zaman en üsttedir">◆</span>
          <h3>Kişisel Bilgiler</h3>
          <span className="count">kütüphaneden</span>
        </div>
        <div className="card-body">
          {p.fullName ? (
            <>
              <p className="profile-line">
                <b>{p.fullName}</b>
                {tx(p.headline, lang) ? ` — ${tx(p.headline, lang)}` : ''}
              </p>
              <p className="profile-sub">
                {[tx(p.location, lang), p.email, p.phone, p.linkedin, p.github]
                  .filter(Boolean).join(' · ') || 'İletişim bilgisi girilmedi'}
              </p>
            </>
          ) : (
            <p className="empty-slot" style={{ padding: 0 }}>Adın ve iletişim bilgilerin henüz girilmedi.</p>
          )}
          <div style={{ marginTop: 9 }}>
            <button className="btn sm ghost" onClick={() => onEditLibrary('profile')}>
              Kütüphanede düzenle
            </button>
          </div>
        </div>
      </div>

      {doc.sections.map((section, i) => {
        const def = SECTION_DEFS.find((d) => d.id === section.id)
        const collection = SECTION_TO_COLLECTION[section.id]
        const isSummary = section.id === 'summary'
        const isRefs = section.id === 'references'
        const showList = !isSummary && !(isRefs && doc.referencesOnRequest)
        const pool = (library[collection] || []).length

        return (
          <div
            className={`section-card${section.enabled ? '' : ' off'}`}
            key={section.id}
            {...dragProps(i)}
          >
            <div className="section-head">
              <span className="grip">⣿</span>
              <h3>{tx(def.label, lang)}</h3>
              {showList && section.enabled && <span className="count">{section.itemIds.length}</span>}
              <button
                className="switch"
                role="switch"
                aria-checked={section.enabled}
                aria-label={`${tx(def.label, lang)} bölümünü aç/kapat`}
                onClick={() => dispatch({ type: 'section/toggle', sectionId: section.id })}
              />
            </div>

            {section.enabled && (
              <>
                {isSummary && <SummaryControls onEditLibrary={onEditLibrary} />}

                {isRefs && (
                  <div className="card-body">
                    <label className="row inline-check">
                      <input
                        type="checkbox"
                        checked={doc.referencesOnRequest}
                        onChange={(e) =>
                          dispatch({ type: 'doc/patch', patch: { referencesOnRequest: e.target.checked } })
                        }
                      />
                      <span>"İstek üzerine paylaşılır" yaz</span>
                    </label>
                    <p className="hint">
                      Önerilen bu — referanslarının telefon ve e-postasını her başvuruya dağıtmak,
                      onların rızası olmadan kişisel veri paylaşmak demek.
                    </p>
                  </div>
                )}

                {showList && (
                  <>
                    <ChosenList section={section} collection={collection} />
                    <div className="card-foot">
                      {pool ? (
                        <button
                          className={`btn sm${section.itemIds.length ? '' : ' seed'}`}
                          onClick={() => setPicking({ collection, sectionId: section.id })}
                        >
                          {section.itemIds.length ? 'Seçimi değiştir' : `+ Seç (${pool} kayıt)`}
                        </button>
                      ) : (
                        <button className="btn sm ghost" onClick={() => onEditLibrary(collection)}>
                          Kütüphane boş — önce içerik yaz
                        </button>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )
      })}

      {picking && (
        <PickerModal
          collection={picking.collection}
          sectionId={picking.sectionId}
          onEditLibrary={onEditLibrary}
          onClose={() => setPicking(null)}
        />
      )}
    </div>
  )
}
