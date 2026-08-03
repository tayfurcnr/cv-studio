import { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import { emptyLibrary, emptyDocument, SECTION_DEFS } from '../data/seed.js'
import { uid, move } from '../lib/text.js'

/* Depolama anahtarı sürümlüdür. Uygulama artık hazır veriyle
   gelmiyor; v1 döneminde yazılmış kayıtlar o eski başlangıç
   verisini içerdiği için okunmaz ve temizlenir. */
const KEY = 'cv-studio:v2'
const LEGACY_KEYS = ['cv-studio:v1']

/* ============================================================
   Depolama
   Kütüphane (tüm içerik havuzu) ve belgeler (hangi içeriğin
   hangi CV'de, hangi sırada olduğu) ayrı tutulur. Bir projeyi
   bir kez yazarsın, istediğin kadar CV'de kullanırsın.
   ============================================================ */

function freshState() {
  const doc = emptyDocument()
  return { library: emptyLibrary(), documents: [doc], activeDocId: doc.id }
}

function loadState() {
  // Eski sürümlerin kayıtlarını at — içlerinde gömülü başlangıç verisi var
  for (const old of LEGACY_KEYS) {
    try { localStorage.removeItem(old) } catch { /* özel mod / kota */ }
  }

  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.library && parsed?.documents?.length) return parsed
    }
  } catch (err) {
    console.warn('Kayıtlı veri okunamadı, boş başlanıyor.', err)
  }
  return freshState()
}

/* Belgede eksik bölüm veya sonradan eklenmiş ayar varsa tamamla.

   Belgenin KENDİ bölüm sırası korunur — SECTION_DEFS yalnızca
   hangi bölümlerin var olduğunu söyler, sırayı değil. (Önceden
   burada SECTION_DEFS.map kullanılıyordu ve sürükleyerek yapılan
   sıralama her yeniden yüklemede sıfırlanıyordu.) */
function normalizeDoc(doc) {
  const known = new Set(SECTION_DEFS.map((d) => d.id))
  const kept = (doc.sections || []).filter((s) => known.has(s.id))
  const have = new Set(kept.map((s) => s.id))
  const missing = SECTION_DEFS
    .filter((d) => !have.has(d.id))
    .map((d) => ({ id: d.id, enabled: false, itemIds: [] }))

  return {
    showIcons: true, // eski belgelerde yoktu
    texture: 'grain',
    ...doc,
    sections: [...kept, ...missing],
  }
}

function reducer(state, action) {
  const patchDoc = (fn) => ({
    ...state,
    documents: state.documents.map((d) => (d.id === state.activeDocId ? fn(d) : d)),
  })

  const patchSection = (sectionId, fn) =>
    patchDoc((d) => ({
      ...d,
      sections: d.sections.map((s) => (s.id === sectionId ? fn(s) : s)),
    }))

  switch (action.type) {
    /* --- Belgeler ------------------------------------------- */
    case 'doc/select':
      return { ...state, activeDocId: action.id }

    case 'doc/create': {
      const doc = emptyDocument(action.name || 'Yeni CV')
      doc.summaryId = state.library.summaries[0]?.id || null
      return { ...state, documents: [...state.documents, doc], activeDocId: doc.id }
    }

    case 'doc/duplicate': {
      const src = state.documents.find((d) => d.id === action.id)
      if (!src) return state
      const copy = { ...structuredClone(src), id: uid('doc'), name: `${src.name} (kopya)` }
      return { ...state, documents: [...state.documents, copy], activeDocId: copy.id }
    }

    case 'doc/delete': {
      if (state.documents.length <= 1) return state
      const documents = state.documents.filter((d) => d.id !== action.id)
      return {
        ...state,
        documents,
        activeDocId: state.activeDocId === action.id ? documents[0].id : state.activeDocId,
      }
    }

    case 'doc/patch':
      return patchDoc((d) => ({ ...d, ...action.patch }))

    /* --- Bölümler ------------------------------------------- */
    case 'section/toggle':
      return patchSection(action.sectionId, (s) => ({ ...s, enabled: !s.enabled }))

    case 'section/reorder':
      return patchDoc((d) => ({ ...d, sections: move(d.sections, action.from, action.to) }))

    /* Kütüphaneden CV'ye ekle / çıkar */
    case 'section/addItem':
      return patchSection(action.sectionId, (s) =>
        s.itemIds.includes(action.itemId) ? s : { ...s, itemIds: [...s.itemIds, action.itemId] }
      )

    case 'section/removeItem':
      return patchSection(action.sectionId, (s) => ({
        ...s,
        itemIds: s.itemIds.filter((id) => id !== action.itemId),
      }))

    case 'section/moveItem':
      return patchSection(action.sectionId, (s) => ({
        ...s,
        itemIds: move(s.itemIds, action.from, action.to),
      }))

    /* --- Kütüphane ------------------------------------------ */
    case 'lib/patchProfile':
      return { ...state, library: { ...state.library, profile: { ...state.library.profile, ...action.patch } } }

    case 'lib/add': {
      const list = [...(state.library[action.collection] || []), action.item]
      return { ...state, library: { ...state.library, [action.collection]: list } }
    }

    case 'lib/update': {
      const list = (state.library[action.collection] || []).map((it) =>
        it.id === action.id ? { ...it, ...action.patch } : it
      )
      return { ...state, library: { ...state.library, [action.collection]: list } }
    }

    case 'lib/delete': {
      const list = (state.library[action.collection] || []).filter((it) => it.id !== action.id)
      // Silinen öğeyi tüm belgelerden de düş
      const documents = state.documents.map((d) => ({
        ...d,
        sections: d.sections.map((s) => ({ ...s, itemIds: s.itemIds.filter((id) => id !== action.id) })),
      }))
      return { ...state, documents, library: { ...state.library, [action.collection]: list } }
    }

    case 'lib/reorder': {
      const list = move(state.library[action.collection] || [], action.from, action.to)
      return { ...state, library: { ...state.library, [action.collection]: list } }
    }

    /* --- İçe aktarma ---------------------------------------- */

    /* Veri dosyası: profil ve/veya koleksiyonlar.
       Yalnızca dosyada bulunan alanlara dokunur. */
    case 'lib/importLibrary': {
      const { profile, collections } = action.payload
      return {
        ...state,
        library: {
          ...state.library,
          ...(profile ? { profile: { ...state.library.profile, ...profile } } : {}),
          ...collections,
        },
      }
    }

    /* CV dosyası: belgeler. mode 'replace' mevcutları siler. */
    case 'docs/import': {
      const incoming = action.documents.map(normalizeDoc)
      if (action.mode === 'replace') {
        return { ...state, documents: incoming, activeDocId: incoming[0].id }
      }
      const existing = new Map(state.documents.map((d) => [d.id, d]))
      const documents = [...state.documents]
      for (const d of incoming) {
        if (existing.has(d.id)) documents[documents.findIndex((x) => x.id === d.id)] = d
        else documents.push(d)
      }
      return { ...state, documents, activeDocId: incoming[0].id }
    }

    case 'app/reset': {
      const doc = emptyDocument()
      return { library: emptyLibrary(), documents: [doc], activeDocId: doc.id }
    }

    default:
      return state
  }
}

const StoreCtx = createContext(null)

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    const s = loadState()
    return { ...s, documents: s.documents.map(normalizeDoc) }
  })

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch (err) {
      // Kota aşımı genelde büyük fotoğraftan olur
      console.error('Kaydedilemedi (fotoğraf çok büyük olabilir):', err)
    }
  }, [state])

  const value = useMemo(() => {
    const doc = state.documents.find((d) => d.id === state.activeDocId) || state.documents[0]
    return { ...state, doc, lang: doc?.lang || 'tr', dispatch }
  }, [state])

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>
}

export function useStore() {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useStore, StoreProvider içinde kullanılmalı')
  return ctx
}
