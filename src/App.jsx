import { useEffect, useRef, useState } from 'react'
import { useStore } from './state/store.jsx'
import { ensureResumeFonts } from './lib/text.js'
import { COLLECTIONS } from './data/schemas.js'
import SectionBoard from './components/SectionBoard.jsx'
import LibraryWorkspace from './components/LibraryWorkspace.jsx'
import AtsPanel from './components/AtsPanel.jsx'
import Preview from './components/Preview.jsx'
import Resume from './components/Resume.jsx'

/* ============================================================
   İki mod, dört sekme değil.

   Uygulamanın iki ismi var: bir kütüphane (içerik havuzu, global)
   ve n tane CV (kompozisyon, yerel). Eski sekmeler bu ikisinin
   ortasından geçtiği için "bu düzenleme nereye gidiyor" belirsizdi.
   Artık mod sınırı = kapsam sınırı:

     Kütüphanem → yazdığın her şey global
     CV'lerim   → seçtiğin/sıraladığın her şey yalnızca o CV'ye ait
   ============================================================ */

const LIB_NAV = [
  { key: 'profile', label: 'Kişisel bilgiler' },
  'summaries', 'experience', 'education', 'projects',
  'skillGroups', 'languages', 'certifications', 'references',
].map((e) => (typeof e === 'string' ? { key: e, label: COLLECTIONS[e].label } : e))

const MODE_KEY = 'cv-studio:mode'
const COLL_KEY = 'cv-studio:collection'

export default function App() {
  const { library, documents, activeDocId, dispatch } = useStore()
  const [mode, setMode] = useState(() => localStorage.getItem(MODE_KEY) || 'library')
  const [collection, setCollection] = useState(() => localStorage.getItem(COLL_KEY) || 'profile')
  const [cvView, setCvView] = useState('layout')   // layout | ats
  const resumeRef = useRef(null)

  /* Belge fontlarını açılışta yükle. Yazdırma kopyası ekranda gizli
     olduğu ve dar ekranda önizleme paneli hiç render edilmediği için
     aksi hâlde PDF yedek fontla basılabiliyor. */
  useEffect(() => { ensureResumeFonts() }, [])
  useEffect(() => { localStorage.setItem(MODE_KEY, mode) }, [mode])
  useEffect(() => { localStorage.setItem(COLL_KEY, collection) }, [collection])

  const count = (key) =>
    key === 'profile' ? (library.profile.fullName ? 1 : 0) : (library[key] || []).length

  const libraryEmpty = LIB_NAV.every((n) => !count(n.key))
  const view = libraryEmpty ? 'library' : mode

  return (
    <>
      <div className={`app${view === 'library' ? ' solo' : ''}`}>
        <aside className="rail">
          <div className="brand">
            <h1 className="logo">CV Studio</h1>
          </div>

          {/* Mod anahtarı — aynı zamanda sıranın kendisi:
              önce kütüphane, sonra CV. */}
          <div className="mode-switch">
            <button aria-pressed={view === 'library'} onClick={() => setMode('library')}>
              <b>Kütüphanem</b>
              <em>içeriği yaz</em>
            </button>
            <button
              aria-pressed={view === 'cv'}
              disabled={libraryEmpty}
              title={libraryEmpty ? 'Önce kütüphanene biraz içerik yaz' : undefined}
              onClick={() => setMode('cv')}
            >
              <b>CV'lerim</b>
              <em>seç ve sırala</em>
            </button>
          </div>

          {view === 'library' ? (
            <div className="pad">
              <p className="eyebrow">İçerik</p>
              <nav className="lib-nav">
                {LIB_NAV.map((n) => (
                  <button
                    key={n.key}
                    aria-current={collection === n.key}
                    onClick={() => setCollection(n.key)}
                  >
                    <span>{n.label}</span>
                    <small className={count(n.key) ? '' : 'zero'}>{count(n.key) || '—'}</small>
                  </button>
                ))}
              </nav>

              <p className="eyebrow" style={{ marginTop: 18 }}>Dosyalar</p>
              <nav className="lib-nav">
                <button aria-current={collection === 'data'} onClick={() => setCollection('data')}>
                  <span>Dosya yükle ve yedekle</span>
                </button>
              </nav>

              <p className="hint" style={{ marginTop: 16 }}>
                Buradaki her kayıt <b>tüm CV'lerinde ortak</b>. Bir projeyi bir kez düzeltirsin,
                onu kullanan bütün CV'ler güncellenir.
              </p>
            </div>
          ) : (
            <div className="pad">
              <p className="eyebrow">Kayıtlı CV'lerim</p>
              {documents.map((d) => (
                <button
                  key={d.id}
                  className="doc-item"
                  aria-current={d.id === activeDocId}
                  onClick={() => dispatch({ type: 'doc/select', id: d.id })}
                >
                  <strong>{d.name}</strong>
                  <small>
                    {d.lang.toUpperCase()} · {d.theme} ·{' '}
                    {d.sections.filter((s) => s.enabled).length} bölüm
                  </small>
                </button>
              ))}

              <div className="row wrap" style={{ marginTop: 12 }}>
                <button
                  className="btn sm"
                  onClick={() => dispatch({ type: 'doc/create', name: `CV ${documents.length + 1}` })}
                >
                  + Yeni CV
                </button>
                <button
                  className="btn sm ghost"
                  onClick={() => dispatch({ type: 'doc/duplicate', id: activeDocId })}
                >
                  Kopyala
                </button>
                <button
                  className="btn sm ghost danger"
                  disabled={documents.length <= 1}
                  onClick={() => {
                    const d = documents.find((x) => x.id === activeDocId)
                    if (confirm(`"${d.name}" silinsin mi? Kütüphaneye dokunulmaz.`))
                      dispatch({ type: 'doc/delete', id: activeDocId })
                  }}
                >
                  Sil
                </button>
              </div>

              <p className="hint" style={{ marginTop: 16 }}>
                Her CV kütüphaneden <b>seçim</b> yapar. Aynı projeyi beş farklı CV'de
                kullanabilirsin; hiçbiri içeriğin kopyasını tutmaz.
              </p>
            </div>
          )}
        </aside>

        <main className="work">
          {view === 'library' ? (
            <LibraryWorkspace collection={collection} />
          ) : (
            <>
              <div className="tabs" role="tablist">
                <button
                  role="tab" className="tab" aria-selected={cvView === 'layout'}
                  onClick={() => setCvView('layout')}
                >
                  Kurgu
                </button>
                <button
                  role="tab" className="tab" aria-selected={cvView === 'ats'}
                  onClick={() => setCvView('ats')}
                >
                  ATS kontrolü
                </button>
              </div>
              {cvView === 'layout'
                ? <SectionBoard onEditLibrary={(c) => { setCollection(c); setMode('library') }} />
                : <AtsPanel resumeRef={resumeRef} />}
            </>
          )}
        </main>

        {/* Önizleme yalnızca CV modunda: kütüphanede yazarken hangi CV'ye
            baktığın belirsiz, dolayısıyla önizleme de anlamsız. */}
        {view === 'cv' && <Preview resumeRef={resumeRef} />}
      </div>

      {/* Yazdırma kopyası: ekranda gizli, PDF'e basılan bu.
          Arayüzün transform/scroll bağlamından tamamen bağımsız
          olduğu için sayfa kırılımları temiz çıkar. */}
      <div className="print-mount">
        <Resume />
      </div>
    </>
  )
}
