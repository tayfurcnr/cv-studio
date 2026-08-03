import { bi, uid } from '../lib/text.js'
import { tx, txList } from '../lib/text.js'

/* ============================================================
   KOLEKSİYON ŞEMALARI
   Her kütüphane koleksiyonunun alanları burada tanımlı.
   ItemEditor bu şemadan formu kendisi kurar — yeni bir alan
   eklemek için sadece buraya bir satır yazman yeterli.

   Alan tipleri:
     text    → düz metin (dile bağlı değil: e-posta, yıl, id)
     bi      → iki dilli tek satır
     bitext  → iki dilli çok satır
     bilist  → iki dilli madde listesi
     taglist → virgülle ayrılan etiket dizisi (teknolojiler, beceriler)
     select  → sabit seçenek listesi
   ============================================================ */

export const SECTION_TO_COLLECTION = {
  summary: 'summaries',
  experience: 'experience',
  education: 'education',
  projects: 'projects',
  skills: 'skillGroups',
  languages: 'languages',
  certifications: 'certifications',
  references: 'references',
}

export const COLLECTIONS = {
  summaries: {
    label: 'Profil Özetleri',
    singular: 'Özet',
    fields: [
      { key: 'label', label: 'Etiket (hangi hedef için)', type: 'bi' },
      { key: 'text', label: 'Özet metni', type: 'bitext', rows: 6 },
    ],
    blank: () => ({ id: uid('sum'), label: bi(), text: bi() }),
    title: (it, l) => tx(it.label, l) || 'Adsız özet',
    subtitle: (it, l) => tx(it.text, l).slice(0, 110),
  },

  experience: {
    label: 'İş Deneyimi',
    singular: 'Deneyim',
    fields: [
      { key: 'role', label: 'Pozisyon', type: 'bi' },
      { key: 'org', label: 'Kurum', type: 'bi' },
      { key: 'variant', label: 'Sürüm adı', type: 'text',
        placeholder: 'örn. Gömülü odaklı',
        hint: 'Aynı işi farklı CV\'lere farklı anlatmak istersen, kopyasını çıkarıp buraya ' +
              'kısa bir ayırt edici ad yaz (örn. "Gömülü odaklı", "Sistem odaklı"). ' +
              'Yalnızca seçim listesinde görünür, CV\'ye basılmaz. Tek sürümün varsa boş bırak.' },
      { key: 'location', label: 'Konum', type: 'bi' },
      { key: 'employment', label: 'Çalışma şekli', type: 'bi' },
      { key: 'start', label: 'Başlangıç', type: 'bi', half: true },
      { key: 'end', label: 'Bitiş', type: 'bi', half: true },
      { key: 'bullets', label: 'Maddeler', type: 'bilist' },
    ],
    blank: () => ({
      id: uid('exp'), role: bi(), org: bi(), variant: '', location: bi(),
      employment: bi(), start: bi(), end: bi(), bullets: [],
    }),
    title: (it, l) => tx(it.role, l) || 'Adsız pozisyon',
    subtitle: (it, l) => [it.variant, tx(it.org, l), `${tx(it.start, l)} – ${tx(it.end, l)}`].filter(Boolean).join(' · '),
  },

  education: {
    label: 'Eğitim',
    singular: 'Eğitim',
    fields: [
      { key: 'degree', label: 'Derece / Bölüm', type: 'bi' },
      { key: 'org', label: 'Kurum', type: 'bi' },
      { key: 'location', label: 'Konum', type: 'bi' },
      { key: 'start', label: 'Başlangıç', type: 'bi', half: true },
      { key: 'end', label: 'Bitiş', type: 'bi', half: true },
      { key: 'bullets', label: 'Maddeler', type: 'bilist' },
    ],
    blank: () => ({
      id: uid('edu'), degree: bi(), org: bi(), location: bi(),
      start: bi(), end: bi(), bullets: [],
    }),
    title: (it, l) => tx(it.degree, l) || 'Adsız eğitim',
    subtitle: (it, l) => [tx(it.org, l), `${tx(it.start, l)} – ${tx(it.end, l)}`].filter(Boolean).join(' · '),
  },

  projects: {
    label: 'Projeler',
    singular: 'Proje',
    fields: [
      { key: 'name', label: 'Proje adı', type: 'bi' },
      { key: 'tagline', label: 'Tek satır tanım', type: 'bi' },
      { key: 'variant', label: 'Sürüm adı', type: 'text',
        placeholder: 'örn. Gömülü odaklı',
        hint: 'Aynı projeyi farklı CV\'lere farklı anlatmak istersen, kopyasını çıkarıp buraya ' +
              'kısa bir ayırt edici ad yaz (örn. "Gömülü odaklı", "Sistem odaklı"). ' +
              'Yalnızca seçim listesinde görünür, CV\'ye basılmaz. Tek sürümün varsa boş bırak.' },
      { key: 'link', label: 'Depo / demo bağlantısı', type: 'text' },
      { key: 'category', label: 'Kategori', type: 'select', half: true },
      { key: 'year', label: 'Yıl', type: 'text', half: true },
      { key: 'tech', label: 'Teknolojiler (virgülle ayır)', type: 'bitaglist' },
      { key: 'bullets', label: 'Maddeler', type: 'bilist' },
    ],
    blank: () => ({
      id: uid('prj'), name: bi(), tagline: bi(), variant: '', link: '',
      category: 'other', year: '', tech: { tr: [], en: [] }, bullets: [],
    }),
    title: (it, l) => tx(it.name, l) || 'Adsız proje',
    subtitle: (it, l) => [it.variant, tx(it.tagline, l)].filter(Boolean).join(' · '),
  },

  skillGroups: {
    label: 'Beceri Grupları',
    singular: 'Beceri grubu',
    fields: [
      { key: 'label', label: 'Grup adı', type: 'bi' },
      { key: 'items', label: 'Beceriler (virgülle ayır)', type: 'bitaglist' },
    ],
    blank: () => ({ id: uid('sk'), label: bi(), items: { tr: [], en: [] } }),
    title: (it, l) => tx(it.label, l) || 'Adsız grup',
    subtitle: (it, l) => txList(it.items, l).join(', '),
  },

  languages: {
    label: 'Diller',
    singular: 'Dil',
    fields: [
      { key: 'name', label: 'Dil', type: 'bi', half: true },
      { key: 'level', label: 'Seviye', type: 'bi', half: true },
    ],
    blank: () => ({ id: uid('lng'), name: bi(), level: bi() }),
    title: (it, l) => tx(it.name, l) || 'Adsız',
    subtitle: (it, l) => tx(it.level, l),
  },

  certifications: {
    label: 'Sertifikalar',
    singular: 'Sertifika',
    fields: [
      { key: 'name', label: 'Sertifika adı', type: 'bi' },
      { key: 'issuer', label: 'Veren kurum', type: 'bi' },
      { key: 'year', label: 'Yıl', type: 'text', half: true },
    ],
    blank: () => ({ id: uid('crt'), name: bi(), issuer: bi(), year: '' }),
    title: (it, l) => tx(it.name, l) || 'Adsız sertifika',
    subtitle: (it, l) => [tx(it.issuer, l), it.year].filter(Boolean).join(' · '),
  },

  references: {
    label: 'Referanslar',
    singular: 'Referans',
    fields: [
      { key: 'name', label: 'Ad soyad', type: 'text' },
      { key: 'title', label: 'Ünvan / Kurum', type: 'bi' },
      { key: 'email', label: 'E-posta', type: 'text', half: true },
      { key: 'phone', label: 'Telefon', type: 'text', half: true },
    ],
    blank: () => ({ id: uid('ref'), name: '', title: bi(), email: '', phone: '' }),
    title: (it) => it.name || 'Adsız referans',
    subtitle: (it, l) => tx(it.title, l),
  },
}
