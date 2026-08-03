import { COLLECTIONS } from '../data/schemas.js'
import { CATEGORIES } from '../data/seed.js'
import { uid } from './text.js'
import { load as yamlLoad, dump as yamlDumpRaw } from 'js-yaml'

/* ============================================================
   JSON İÇE AKTARMA
   Amaç: elinde bir yerde duran proje/deneyim listesini tek
   seferde kütüphaneye almak. Bunun için biçim konusunda
   olabildiğince hoşgörülü davranıyoruz:

   - Metin alanlarına düz string yazabilirsin  → {tr, en}'e çevrilir
   - İki dilli yazmak istersen {"tr": "...", "en": "..."} da geçer
   - Alan adları için yaygın eş anlamlılar kabul edilir
     (title→name, company→org, highlights→bullets, …)
   - Teknoloji listesi dizi ya da virgüllü tek string olabilir
   ============================================================ */

/* Yaygın alan adı eş anlamlıları → şemadaki gerçek anahtar */
const ALIASES = {
  projects: {
    title: 'name', proje: 'name', ad: 'name',
    description: 'tagline', summary: 'tagline', desc: 'tagline', aciklama: 'tagline', açıklama: 'tagline',
    technologies: 'tech', stack: 'tech', tags: 'tech', teknolojiler: 'tech',
    highlights: 'bullets', points: 'bullets', details: 'bullets', maddeler: 'bullets',
    date: 'year', yil: 'year', yıl: 'year',
    url: 'link', repo: 'link', github: 'link', depo: 'link', baglanti: 'link', bağlantı: 'link',
    kategori: 'category',
  },
  experience: {
    company: 'org', employer: 'org', kurum: 'org', sirket: 'org', şirket: 'org',
    position: 'role', title: 'role', jobTitle: 'role', pozisyon: 'role',
    startDate: 'start', from: 'start', baslangic: 'start', başlangıç: 'start',
    endDate: 'end', to: 'end', bitis: 'end', bitiş: 'end',
    highlights: 'bullets', description: 'bullets', achievements: 'bullets', maddeler: 'bullets',
    city: 'location', konum: 'location',
    type: 'employment',
  },
  education: {
    institution: 'org', school: 'org', university: 'org', okul: 'org', kurum: 'org',
    studyType: 'degree', area: 'degree', field: 'degree', bolum: 'degree', bölüm: 'degree',
    startDate: 'start', endDate: 'end',
    highlights: 'bullets', courses: 'bullets',
  },
  skillGroups: {
    name: 'label', category: 'label', grup: 'label',
    keywords: 'items', skills: 'items', beceriler: 'items',
  },
  languages: { language: 'name', fluency: 'level', seviye: 'level', dil: 'name' },
  certifications: { title: 'name', issuer: 'issuer', organization: 'issuer', date: 'year' },
  references: { reference: 'title', position: 'title', mail: 'email', tel: 'phone' },
  summaries: { name: 'label', content: 'text', summary: 'text', ozet: 'text', özet: 'text' },
}

/* Bir koleksiyona hangi üst düzey anahtarlar işaret ediyor olabilir */
const COLLECTION_KEYS = {
  projects: ['projects', 'projeler', 'project'],
  experience: ['experience', 'work', 'deneyim', 'isDeneyimi', 'jobs'],
  education: ['education', 'egitim', 'eğitim'],
  skillGroups: ['skillGroups', 'skills', 'beceriler', 'yetenekler'],
  summaries: ['summaries', 'ozetler', 'özetler'],
  languages: ['languages', 'diller'],
  certifications: ['certifications', 'certificates', 'sertifikalar'],
  references: ['references', 'referanslar'],
}

const isPlainObject = (v) => v != null && typeof v === 'object' && !Array.isArray(v)

/** String / {tr,en} / eksik → daima {tr, en} */
function toBi(v) {
  if (v == null) return { tr: '', en: '' }
  if (typeof v === 'string') return { tr: v.trim(), en: '' }
  if (typeof v === 'number') return { tr: String(v), en: '' }
  if (isPlainObject(v)) return { tr: (v.tr || '').trim(), en: (v.en || '').trim() }
  return { tr: '', en: '' }
}

/** Dizi / virgüllü string / tek değer → string dizisi */
function toTags(v) {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean)
  if (typeof v === 'string') return v.split(',').map((s) => s.trim()).filter(Boolean)
  return []
}

/** Madde listesi: string dizisi, {tr,en} dizisi ya da tek paragraf */
function toBiList(v) {
  if (Array.isArray(v)) return v.map(toBi).filter((b) => b.tr || b.en)
  if (typeof v === 'string') {
    return v
      .split(/\r?\n|(?<=\.)\s{2,}/)
      .map((s) => s.replace(/^[-•*·]\s*/, '').trim())
      .filter(Boolean)
      .map((s) => toBi(s))
  }
  return []
}

/** Ham nesneyi şemaya uygun kütüphane öğesine dönüştürür. */
export function normalizeItem(collection, raw) {
  const meta = COLLECTIONS[collection]
  if (!meta || !isPlainObject(raw)) return null

  // Eş anlamlı alan adlarını gerçek anahtarlara çevir
  const aliases = ALIASES[collection] || {}
  const src = {}
  for (const [k, v] of Object.entries(raw)) {
    src[aliases[k] || k] = v
  }

  const item = meta.blank()
  const hasSourceId = typeof src.id === 'string' && !!src.id.trim()
  item.id = hasSourceId ? src.id.trim() : uid(collection.slice(0, 3))
  // Id'yi biz ürettiysek işaretle: birleştirmede başlık eşleşmesi
  // yalnızca bu kayıtlar için kullanılır.
  if (!hasSourceId) item.__generatedId = true

  for (const f of meta.fields) {
    if (!(f.key in src)) continue
    const v = src[f.key]
    switch (f.type) {
      case 'bi':
      case 'bitext':
        item[f.key] = toBi(v)
        break
      case 'bilist':
        item[f.key] = toBiList(v)
        break
      case 'taglist':
        item[f.key] = toTags(v)
        break
      case 'bitaglist':
        item[f.key] = Array.isArray(v) || typeof v === 'string'
          ? { tr: toTags(v), en: [] }                       // eski düz dizi biçimi
          : { tr: toTags(v?.tr), en: toTags(v?.en) }
        break
      case 'select': {
        const val = String(v || '').trim()
        item[f.key] = CATEGORIES.some((c) => c.id === val) ? val : 'other'
        break
      }
      default:
        item[f.key] = v == null ? '' : String(v).trim()
    }
  }

  // Boş kabuk üretme
  const label = meta.title(item, 'tr')
  if (!label || label.startsWith('Adsız')) return null
  return item
}

/** Profil nesnesini normalize eder (iki dilli alanlar dahil). */
function normalizeProfile(raw) {
  if (!isPlainObject(raw)) return null
  const str = (v) => (v == null ? '' : String(v).trim())
  return {
    fullName: str(raw.fullName ?? raw.name ?? raw.adSoyad),
    headline: toBi(raw.headline ?? raw.title ?? raw.unvan ?? raw.ünvan),
    email: str(raw.email ?? raw.mail),
    phone: str(raw.phone ?? raw.tel ?? raw.telefon),
    location: toBi(raw.location ?? raw.konum ?? raw.city),
    linkedin: str(raw.linkedin),
    github: str(raw.github),
    website: str(raw.website ?? raw.web ?? raw.site),
    ...(typeof raw.photo === 'string' && raw.photo.startsWith('data:') ? { photo: raw.photo } : {}),
  }
}

/** Belge (CV kompozisyonu) doğrulaması — yapısı bozuksa atlanır. */
function normalizeDocument(raw) {
  if (!isPlainObject(raw) || !Array.isArray(raw.sections)) return null
  return {
    ...raw,
    id: typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : uid('doc'),
    name: String(raw.name || 'CV').trim(),
    lang: raw.lang === 'en' ? 'en' : 'tr',
    theme: ['signal', 'slate', 'serif'].includes(raw.theme) ? raw.theme : 'signal',
    accent: typeof raw.accent === 'string' ? raw.accent : '#1d5c7a',
    showPhoto: raw.showPhoto !== false,
    showIcons: raw.showIcons !== false,
    texture: ['none', 'dots', 'grid', 'grain', 'wash'].includes(raw.texture) ? raw.texture : 'grain',
    targetRole: toBi(raw.targetRole),
    referencesOnRequest: raw.referencesOnRequest !== false,
    sections: raw.sections
      .filter((s) => isPlainObject(s) && typeof s.id === 'string')
      .map((s) => ({
        id: s.id,
        enabled: !!s.enabled,
        itemIds: Array.isArray(s.itemIds) ? s.itemIds.filter((x) => typeof x === 'string') : [],
      })),
  }
}

/**
 * Yapıştırılan/yüklenen JSON'u çözümler.
 *
 * Kabul edilen biçimler:
 *   1. [ {...}, {...} ]                            → hedef koleksiyon çağıran tarafından verilir
 *   2. { "projects": [...], "work": [...] }        → koleksiyonlar anahtarlardan bulunur
 *   3. { "profile": {...}, "projects": [...] }     → veri dosyası
 *   4. { "documents": [...] }                      → CV dosyası
 *   5. { "library": {...}, "documents": [...] }    → tam yedek
 *
 * @returns {{ groups, profile, documents, errors, total }}
 */
export function parseImport(text, fallbackCollection = null) {
  const errors = []
  let data

  /* Önce JSON, olmazsa YAML dene. Böylece kullanıcı iki biçimi de
     yükleyebilir ve dosya uzantısına bakmak gerekmez. */
  try {
    data = JSON.parse(text)
  } catch (jsonErr) {
    try {
      data = yamlLoad(text)
      if (data == null || typeof data !== 'object') throw new Error('boş ya da nesne değil')
    } catch (yamlErr) {
      return {
        groups: {}, profile: null, documents: [], total: 0,
        errors: [`Ne JSON ne YAML olarak okunabildi. JSON hatası: ${jsonErr.message} · YAML hatası: ${yamlErr.message}`],
      }
    }
  }

  // Tam yedek biçimi: library alt nesnesini yukarı taşı
  if (isPlainObject(data) && isPlainObject(data.library)) {
    data = { ...data.library, ...data, ...(data.library.profile ? { profile: data.library.profile } : {}) }
  }

  /** Ham diziyi normalize edip gruba yazar. */
  const collect = (groups, collection, arr) => {
    if (!Array.isArray(arr)) {
      errors.push(`"${collection}" bir dizi değil, atlandı.`)
      return
    }
    const ok = []
    arr.forEach((raw, i) => {
      const item = normalizeItem(collection, raw)
      if (item) ok.push(item)
      else errors.push(`${collection}[${i}]: boş ya da tanınmayan kayıt, atlandı.`)
    })
    if (ok.length) groups[collection] = [...(groups[collection] || []), ...ok]
  }

  const groups = {}
  let profile = null
  let documents = []

  if (Array.isArray(data)) {
    if (!fallbackCollection) {
      return {
        groups: {}, profile: null, documents: [],
        errors: ['Düz bir dizi verdin — hangi koleksiyona gideceğini seç.'], total: 0,
      }
    }
    collect(groups, fallbackCollection, data)
  } else if (isPlainObject(data)) {
    let matched = false

    if (isPlainObject(data.profile)) {
      profile = normalizeProfile(data.profile)
      matched = true
    }

    if (Array.isArray(data.documents)) {
      documents = data.documents.map(normalizeDocument).filter(Boolean)
      const skipped = data.documents.length - documents.length
      if (skipped) errors.push(`${skipped} CV kaydı geçersiz yapıda olduğu için atlandı.`)
      matched = true
    }

    for (const [collection, keys] of Object.entries(COLLECTION_KEYS)) {
      for (const key of keys) {
        if (Array.isArray(data[key])) {
          collect(groups, collection, data[key])
          matched = true
        }
      }
    }

    if (!matched) {
      // Tek bir nesne verilmiş olabilir
      if (fallbackCollection) collect(groups, fallbackCollection, [data])
      else errors.push('Tanınan bir anahtar bulunamadı (profile, projects, work, education, skills, documents …).')
    }
  } else {
    errors.push('Beklenen biçim: dizi ya da nesne.')
  }

  const total =
    Object.values(groups).reduce((n, arr) => n + arr.length, 0) +
    (profile ? 1 : 0) +
    documents.length

  return { groups, profile, documents, errors, total }
}

/**
 * Mevcut listeyle gelen listeyi birleştirir.
 * mode: 'append'  → hepsini ekle (id çakışırsa yeni id ver)
 *       'merge'   → aynı id ya da aynı başlık varsa üzerine yaz, yoksa ekle
 *       'replace' → mevcut listeyi tamamen değiştir
 */
export function mergeInto(collection, existing = [], incoming = [], mode = 'merge') {
  const meta = COLLECTIONS[collection]

  /* Id'si dosyadan gelen kayıtları, bizim ürettiklerimizden ayır.
     Başlık eşleşmesi yalnızca id'siz gelenlere uygulanır — aksi hâlde
     aynı adı taşıyan rol varyantları birbirinin üzerine yazar. */
  const generated = new Set(incoming.filter((it) => it.__generatedId).map((it) => it.id))
  const clean = incoming.map(({ __generatedId, ...rest }) => rest)

  if (mode === 'replace') return { list: clean, added: clean.length, updated: 0 }

  const list = [...existing]
  const byId = new Map(list.map((it, i) => [it.id, i]))
  const byTitle = new Map(list.map((it, i) => [meta.title(it, 'tr').toLocaleLowerCase('tr'), i]))

  let added = 0
  let updated = 0

  for (const item of clean) {
    const titleKey = meta.title(item, 'tr').toLocaleLowerCase('tr')
    const at = mode === 'merge'
      ? (byId.get(item.id) ?? (generated.has(item.id) ? byTitle.get(titleKey) : undefined))
      : undefined

    if (at != null) {
      list[at] = { ...item, id: list[at].id } // mevcut id korunur → CV'lerdeki bağlar kopmaz
      updated++
    } else {
      const item2 = byId.has(item.id) ? { ...item, id: uid(collection.slice(0, 3)) } : item
      list.push(item2)
      byId.set(item2.id, list.length - 1)
      byTitle.set(titleKey, list.length - 1)
      added++
    }
  }

  return { list, added, updated }
}

/** Bir koleksiyonu dışa aktarılabilir JSON'a çevirir (id dahil → geri yüklenince eşleşir). */
export function exportCollection(collection, items) {
  return JSON.stringify({ [collection]: items }, null, 2)
}

/** Veri dosyası: profil + tüm kütüphane. Kişiye özel içerik havuzu. */
export function exportLibrary(library, { withPhoto = true } = {}) {
  const { profile, ...collections } = library
  const p = withPhoto ? profile : { ...profile, photo: null }
  return JSON.stringify({ profile: p, ...collections }, null, 2)
}

/** CV dosyası: yalnızca belgeler. Kütüphaneye id ile bağlanır. */
export function exportDocuments(documents) {
  return JSON.stringify({ documents }, null, 2)
}

/** Tam yedek: ikisi birden. */
export function exportAll(library, documents) {
  return JSON.stringify({ library, documents }, null, 2)
}

/* --- YAML karşılıkları --------------------------------------
   Sayıya benzeyen string'ler (yıl gibi) tırnaklanır; aksi hâlde
   YAML onları int'e çevirir ve geri yüklerken tip kayar. */
const yamlDump = (obj) =>
  yamlDumpRaw(obj, { lineWidth: 100, noRefs: true, quotingType: '"', forceQuotes: false })

export const exportLibraryYaml = (library, opts) =>
  yamlDump(JSON.parse(exportLibrary(library, opts)))

export const exportDocumentsYaml = (documents) =>
  yamlDump(JSON.parse(exportDocuments(documents)))

export const exportAllYaml = (library, documents) =>
  yamlDump(JSON.parse(exportAll(library, documents)))

/** Sıfırdan başlayanlar için boş veri dosyası iskeleti. */
export function blankDataTemplate() {
  return JSON.stringify(
    {
      profile: {
        fullName: 'Ad Soyad',
        headline: { tr: 'Ünvanın', en: 'Your title' },
        email: 'ad@ornek.com',
        phone: '+90 5XX XXX XX XX',
        location: { tr: 'İstanbul, Türkiye', en: 'Istanbul, Türkiye' },
        linkedin: 'linkedin.com/in/kullanici',
        github: 'github.com/kullanici',
        website: '',
      },
      summaries: [{ label: 'Hangi hedef için', text: 'Profil özeti metni.' }],
      experience: [
        {
          role: 'Pozisyon',
          org: 'Şirket',
          location: 'İstanbul, Türkiye',
          employment: 'Tam Zamanlı',
          start: 'Oca 2025',
          end: 'Günümüz',
          bullets: ['Sonuç odaklı madde.'],
        },
      ],
      education: [{ degree: 'Bölüm, Lisans', org: 'Üniversite', start: '2017', end: '2021', bullets: [] }],
      projects: [
        {
          name: 'Proje Adı',
          tagline: 'Tek satır tanım',
          category: 'embedded',
          year: '2025',
          tech: ['C++'],
          bullets: ['Ne yaptığın ve sonucu.'],
        },
      ],
      skillGroups: [{ label: 'Programlama Dilleri', items: ['C', 'C++', 'Python'] }],
      languages: [{ name: 'Türkçe', level: 'Ana dil' }],
      certifications: [],
      references: [],
    },
    null,
    2
  )
}

/** İçe aktarma ekranında gösterilen örnek şablon. */
export function templateFor(collection) {
  const samples = {
    projects: [
      {
        name: 'Proje Adı',
        tagline: 'Tek satırlık tanım',
        category: 'embedded',
        year: '2025',
        tech: ['C++', 'ROS 2'],
        bullets: ['Ne yaptığın ve sonucu.', 'İkinci madde.'],
      },
      {
        name: { tr: 'İki Dilli Proje', en: 'Bilingual Project' },
        tagline: { tr: 'Türkçe tanım', en: 'English description' },
        category: 'software',
        tech: 'React, Node.js',
        bullets: [{ tr: 'Türkçe madde.', en: 'English bullet.' }],
      },
    ],
    experience: [
      {
        role: 'Pozisyon',
        org: 'Şirket',
        location: 'İstanbul, Türkiye',
        employment: 'Tam Zamanlı',
        start: 'Oca 2025',
        end: 'Günümüz',
        bullets: ['Sonuç odaklı madde.'],
      },
    ],
    education: [
      { degree: 'Bölüm, Lisans', org: 'Üniversite', start: '2017', end: '2024', bullets: [] },
    ],
    skillGroups: [{ label: 'Grup Adı', items: ['Beceri 1', 'Beceri 2'] }],
    summaries: [{ label: 'Hangi hedef için', text: 'Profil özeti metni.' }],
    languages: [{ name: 'Almanca', level: 'B1' }],
    certifications: [{ name: 'Sertifika', issuer: 'Veren kurum', year: '2025' }],
    references: [{ name: 'Ad Soyad', title: 'Ünvan, Kurum', email: 'x@y.com', phone: '' }],
  }
  return JSON.stringify(samples[collection] || [], null, 2)
}
