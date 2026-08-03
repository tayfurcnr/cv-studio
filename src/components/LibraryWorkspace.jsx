import { useMemo, useState } from 'react'
import { useStore } from '../state/store.jsx'
import { CATEGORIES } from '../data/seed.js'
import { COLLECTIONS } from '../data/schemas.js'
import { tx, txList } from '../lib/text.js'
import { useDragList } from '../lib/dnd.js'
import ItemEditor from './ItemEditor.jsx'
import ImportModal from './ImportModal.jsx'
import ProfileForm from './ProfileForm.jsx'
import DataPanel from './DataPanel.jsx'

/* ============================================================
   KÜTÜPHANE ÇALIŞMA ALANI
   İçeriğin yazıldığı yer. Burada CV kavramı hiç yok — dolayısıyla
   "bu değişiklik hangi CV'ye gidiyor" sorusu da yok: buradaki her
   şey global, hepsi tüm CV'leri besliyor.
   ============================================================ */

const EMPTY_COPY = {
  summaries:      ['Henüz özet yok', 'Özet, CV\'nin en üstündeki 3-4 cümle. Hedeflediğin role göre birkaç farklı özet yazıp CV başına birini seçebilirsin.'],
  experience:     ['Henüz deneyim yok', 'Çalıştığın yerler. Her madde ne yaptığını değil, ne değiştiğini anlatsın.'],
  education:      ['Henüz eğitim yok', 'Okul, bölüm, yıl. Not ortalaman güçlüyse ekle, değilse boş bırak.'],
  projects:       ['Henüz proje yok', 'Teknik CV\'de en çok konuşan bölüm. Yarışma, okul, iş, kişisel — hepsi buraya.'],
  skillGroups:    ['Henüz beceri grubu yok', 'Gruplar hâlinde yaz: "Diller", "Gömülü", "Araçlar". ATS düz virgüllü listeyi rahat okur.'],
  languages:      ['Henüz dil yok', 'Yabancı diller ve seviyeleri.'],
  certifications: ['Henüz sertifika yok', 'Sertifika, kurs, eğitim programları.'],
  references:     ['Henüz referans yok', 'Bilgilerini paylaşmak yerine CV\'de "istek üzerine paylaşılır" yazdırman önerilir.'],
}

/* Tek giriş noktası. Erken dönüşler burada, hook'lardan önce —
   koleksiyon bileşeni her seferinde baştan kurulur. */
export default function LibraryWorkspace({ collection }) {
  if (collection === 'profile') return <div className="pad"><ProfileForm /></div>
  if (collection === 'data') return <DataPanel />
  return <CollectionView key={collection} collection={collection} />
}

function CollectionView({ collection }) {
  const { library, documents, dispatch, lang } = useStore()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [editing, setEditing] = useState(null)
  const [importing, setImporting] = useState(false)

  const meta = COLLECTIONS[collection]
  const items = library[collection] || []

  /* Bir öğe kaç CV'de kullanılıyor — düzenlemenin kapsamını göstermek
     için gerekiyor: burada yapılan değişiklik hepsine yansır. */
  const usage = (id) =>
    documents.filter(
      (d) => d.summaryId === id || d.sections.some((s) => s.itemIds.includes(id))
    ).length

  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr')
    return items.filter((it) => {
      if (collection === 'projects' && category !== 'all' && it.category !== category) return false
      if (!q) return true
      return [meta.title(it, lang), meta.subtitle(it, lang), txList(it.tech, lang).join(' '), txList(it.items, lang).join(' ')]
        .join(' ').toLocaleLowerCase('tr').includes(q)
    })
  }, [items, query, category, collection, lang, meta])

  const dragProps = useDragList((from, to) => dispatch({ type: 'lib/reorder', collection, from, to }))

  const save = (draft) => {
    if (editing.isNew) dispatch({ type: 'lib/add', collection, item: draft })
    else dispatch({ type: 'lib/update', collection, id: draft.id, patch: draft })
    setEditing(null)
  }

  const [emptyTitle, emptyText] = EMPTY_COPY[collection] || ['Henüz kayıt yok', '']

  return (
    <div className="pad">
      <div className="lib-head">
        <div>
          <h2>{meta.label}</h2>
          <p>{items.length} kayıt · tüm CV'lerin bu havuzdan besleniyor</p>
        </div>
        <button className="btn primary" onClick={() => setEditing({ item: meta.blank(), isNew: true })}>
          + Yeni {meta.singular.toLocaleLowerCase('tr')}
        </button>
        <button className="btn" onClick={() => setImporting(true)} title="Dosyadan toplu ekle (JSON / YAML)">
          Dosyadan ekle
        </button>
      </div>

      {items.length > 0 && (
        <div className="lib-tools">
          <input type="text" placeholder="Ara…" value={query} onChange={(e) => setQuery(e.target.value)} />
          {collection === 'projects' && (
            <div className="filters">
              <button className="chip" aria-pressed={category === 'all'} onClick={() => setCategory('all')}>
                Tümü
              </button>
              {CATEGORIES.map((c) => (
                <button key={c.id} className="chip" aria-pressed={category === c.id} onClick={() => setCategory(c.id)}>
                  {tx(c.label, lang)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {!items.length ? (
        <div className="lib-empty">
          <b>{emptyTitle}</b>
          <span>{emptyText}</span>
          <div className="row" style={{ justifyContent: 'center', marginTop: 12 }}>
            <button className="btn primary" onClick={() => setEditing({ item: meta.blank(), isNew: true })}>
              + İlkini yaz
            </button>
            <button className="btn ghost" onClick={() => setImporting(true)}>Dosyadan yükle</button>
          </div>
        </div>
      ) : !visible.length ? (
        <p className="hint" style={{ padding: '18px 4px' }}>Aramaya uyan kayıt yok.</p>
      ) : (
        <div className="lib-list">
          {visible.map((it) => {
            const used = usage(it.id)
            return (
              <div key={it.id} className="lib-row" {...dragProps(items.indexOf(it))}>
                <span className="grip">⣿</span>
                <button
                  className="lib-row-main"
                  onClick={() => setEditing({ item: structuredClone(it), isNew: false })}
                >
                  <strong>{meta.title(it, lang)}</strong>
                  <em>{meta.subtitle(it, lang)}</em>
                  {txList(it.tech, lang).length ? (
                    <em className="tags">{txList(it.tech, lang).join(' · ')}</em>
                  ) : null}
                </button>
                <span className={`use${used ? '' : ' none'}`} title={used ? `${used} CV'de kullanılıyor` : 'Hiçbir CV\'de kullanılmıyor'}>
                  {used ? `${used} CV` : '—'}
                </span>
                <div className="lib-row-actions">
                  <button
                    className="btn sm ghost"
                    title="Kopyasını çıkar — aynı işin başka bir role göre yazılmış sürümü için"
                    onClick={() =>
                      dispatch({
                        type: 'lib/add',
                        collection,
                        item: { ...structuredClone(it), id: `${it.id}-c${items.length}` },
                      })
                    }
                  >
                    ⧉
                  </button>
                  <button
                    className="btn sm ghost danger"
                    title="Kütüphaneden tamamen sil"
                    onClick={() => {
                      const w = used ? `\n\n${used} CV'nden de çıkacak.` : ''
                      if (confirm(`"${meta.title(it, lang)}" kütüphaneden silinsin mi?${w}`))
                        dispatch({ type: 'lib/delete', collection, id: it.id })
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {items.length > 1 && (
        <p className="hint" style={{ marginTop: 12 }}>
          Satıra tıkla → düzenle. Satırı sürükle → seçim listelerindeki sıra değişir.
          Sağdaki rozet o kaydın kaç CV'de kullanıldığını gösterir.
        </p>
      )}

      {editing && (
        <ItemEditor
          collection={collection}
          item={editing.item}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      )}
      {importing && <ImportModal onClose={() => setImporting(false)} defaultTarget={collection} />}
    </div>
  )
}
