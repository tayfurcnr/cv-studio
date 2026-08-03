import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../state/store.jsx'
import { COLLECTIONS } from '../data/schemas.js'
import { parseImport, mergeInto, templateFor, blankDataTemplate } from '../lib/importer.js'

/* ============================================================
   JSON YÜKLE
   Tek giriş noktası. Dosyanın içinde ne varsa onu alır:

     profile      → kişisel bilgiler
     projects…    → kütüphane koleksiyonları
     documents    → CV kompozisyonları

   Hepsi aynı dosyada olabilir, ayrı ayrı da olabilir.
   ============================================================ */

const TARGETS = ['projects', 'experience', 'education', 'skillGroups', 'summaries', 'languages', 'certifications', 'references']

const MODES = [
  { id: 'merge',   label: 'Birleştir',   desc: 'Aynı id ya da aynı başlık varsa üzerine yazar, yenileri ekler. Mevcut id korunur → CV\'lerindeki seçimler kopmaz.' },
  { id: 'append',  label: 'Sonuna ekle', desc: 'Hepsini yeni kayıt olarak ekler. Kopya oluşabilir.' },
  { id: 'replace', label: 'Değiştir',    desc: 'Dosyada geçen koleksiyonları ve CV\'leri tamamen değiştirir. Dosyada olmayanlara dokunmaz.' },
]

export default function ImportModal({ onClose, defaultTarget = 'projects' }) {
  const { library, dispatch } = useStore()
  const [target, setTarget] = useState(defaultTarget)
  const [mode, setMode] = useState('merge')
  const [text, setText] = useState('')
  const [dragging, setDragging] = useState(false)
  const [done, setDone] = useState(null)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const parsed = useMemo(() => (text.trim() ? parseImport(text, target) : null), [text, target])

  /* Düz dizi verildiyse hedef koleksiyon seçimi anlamlı; anahtarlı
     dosyada koleksiyonlar kendiliğinden bulunuyor. */
  const needsTarget = !text.trim() || (parsed && !parsed.profile && !parsed.documents.length && Object.keys(parsed.groups).length <= 1)

  const readFile = (file) => {
    const reader = new FileReader()
    reader.onload = () => setText(String(reader.result))
    reader.readAsText(file)
  }

  const apply = () => {
    if (!parsed?.total) return
    const report = []

    /* Profil + koleksiyonlar */
    const collections = {}
    for (const [collection, items] of Object.entries(parsed.groups)) {
      const { list, added, updated } = mergeInto(collection, library[collection] || [], items, mode)
      collections[collection] = list
      report.push(`${COLLECTIONS[collection].label}: ${added} yeni, ${updated} güncellendi`)
    }
    if (parsed.profile || Object.keys(collections).length) {
      dispatch({ type: 'lib/importLibrary', payload: { profile: parsed.profile, collections } })
      if (parsed.profile) report.unshift('Kişisel bilgiler güncellendi')
    }

    /* CV belgeleri */
    if (parsed.documents.length) {
      dispatch({ type: 'docs/import', documents: parsed.documents, mode })
      report.push(`CV: ${parsed.documents.length} kayıt yüklendi`)
    }

    setDone(report)
    setText('')
  }

  const download = (name, content) => {
    const blob = new Blob([content], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = name
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const detected = parsed
    ? [
        parsed.profile && 'Kişisel bilgiler',
        ...Object.entries(parsed.groups).map(([c, arr]) => `${COLLECTIONS[c].label}: ${arr.length}`),
        parsed.documents.length && `CV: ${parsed.documents.length}`,
      ].filter(Boolean)
    : []

  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 'min(760px, 100%)' }}>
        <div className="modal-head">
          <h3>Dosya yükle — JSON veya YAML</h3>
          <span className="spacer" />
          <button className="btn ghost icon" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {done ? (
            <>
              <p style={{ margin: '0 0 10px', fontSize: 13 }}>Yükleme tamamlandı:</p>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.7 }}>
                {done.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
              <div className="row" style={{ marginTop: 16 }}>
                <button className="btn" onClick={() => setDone(null)}>Bir dosya daha yükle</button>
                <button className="btn primary" onClick={onClose}>Kapat</button>
              </div>
            </>
          ) : (
            <>
              <p className="hint" style={{ margin: '0 0 12px' }}>
                <b>JSON ve YAML</b> ikisi de kabul edilir, uzantıya bakılmaz. Dosyanın içinde ne
                varsa onu alır: <code>profile</code>, koleksiyonlar (<code>projects</code>,
                <code>work</code>, <code>education</code>, <code>skills</code>…) ve
                <code>documents</code> (CV'lerin). Hepsi aynı dosyada olabilir.
              </p>

              <label className="field">
                <textarea
                  rows={10}
                  spellCheck={false}
                  style={{
                    fontFamily: 'ui-monospace, "Cascadia Code", Menlo, monospace',
                    fontSize: 12,
                    borderColor: dragging ? 'var(--brand)' : undefined,
                  }}
                  placeholder="JSON ya da YAML yapıştır, veya dosyayı sürükleyip bırak…"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setDragging(false)
                    const f = e.dataTransfer.files?.[0]
                    if (f) readFile(f)
                  }}
                />
              </label>

              <div className="row wrap" style={{ marginBottom: 14 }}>
                <label className="btn sm">
                  Dosya seç
                  <input
                    type="file"
                    accept=".json,.yaml,.yml,application/json,text/yaml"
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) readFile(f)
                      e.target.value = ''
                    }}
                  />
                </label>
                <button
                  className="btn sm ghost"
                  onClick={() => download('veri-sablonu.json', blankDataTemplate())}
                >
                  Boş veri şablonunu indir
                </button>
              </div>

              {needsTarget && (
                <label className="field">
                  <span>Düz dizi yüklersen hangi koleksiyona gitsin</span>
                  <select value={target} onChange={(e) => setTarget(e.target.value)}>
                    {TARGETS.map((c) => (
                      <option key={c} value={c}>
                        {COLLECTIONS[c].label} ({(library[c] || []).length})
                      </option>
                    ))}
                  </select>
                  <button className="btn sm ghost" style={{ marginTop: 6 }} onClick={() => setText(templateFor(target))}>
                    Bu koleksiyonun örneğini doldur
                  </button>
                </label>
              )}

              <label className="field">
                <span>Nasıl eklensin</span>
                <div className="filters">
                  {MODES.map((m) => (
                    <button key={m.id} className="chip" aria-pressed={mode === m.id} onClick={() => setMode(m.id)}>
                      {m.label}
                    </button>
                  ))}
                </div>
                <p className="hint">{MODES.find((m) => m.id === mode).desc}</p>
              </label>

              {parsed && (
                <div style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
                  {parsed.total > 0 ? (
                    <>
                      <div className="check">
                        <span className="dot ok" />
                        <div>
                          <b>Dosyada bulunanlar</b>
                          <em>{detected.join(' · ')}</em>
                        </div>
                      </div>
                      <div style={{ maxHeight: 130, overflowY: 'auto', marginTop: 6 }}>
                        {Object.entries(parsed.groups).flatMap(([c, arr]) =>
                          arr.map((it) => (
                            <div key={`${c}-${it.id}`} style={{ fontSize: 12, color: 'var(--dim)', padding: '2px 0' }}>
                              · {COLLECTIONS[c].title(it, 'tr')}
                            </div>
                          ))
                        )}
                        {parsed.documents.map((d) => (
                          <div key={d.id} style={{ fontSize: 12, color: 'var(--dim)', padding: '2px 0' }}>
                            · CV: {d.name}
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="check">
                      <span className="dot bad" />
                      <div><b>Okunabilir kayıt yok</b></div>
                    </div>
                  )}

                  {parsed.errors.length > 0 && (
                    <details style={{ marginTop: 8 }}>
                      <summary style={{ fontSize: 12, color: 'var(--warn)', cursor: 'pointer' }}>
                        {parsed.errors.length} uyarı
                      </summary>
                      <div style={{ fontSize: 11.5, color: 'var(--faint)', lineHeight: 1.6, marginTop: 5 }}>
                        {parsed.errors.map((e, i) => <div key={i}>{e}</div>)}
                      </div>
                    </details>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {!done && (
          <div className="modal-foot">
            <button className="btn ghost" onClick={onClose}>Vazgeç</button>
            <button className="btn primary" disabled={!parsed?.total} onClick={apply}>
              {parsed?.total ? `Yükle` : 'Yükle'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
