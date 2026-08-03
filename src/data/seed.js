import { uid } from '../lib/text.js'

/* ============================================================
   BAŞLANGIÇ DURUMU
   Uygulama boş açılır: içerik ya arayüzden yazılır ya da bir
   dosyadan yüklenir (JSON / YAML). Biçim örneği için veri/
   klasöründeki ornek-veri.yaml ve ornek-cvler.yaml.

   Böylece verin uygulamadan bağımsız yaşar: dışarıda düzenler,
   yükler, CV'lerini kurar, onları da indirip saklarsın.
   ============================================================ */

const L = (tr, en) => ({ tr, en: en ?? tr })

export const CATEGORIES = [
  { id: 'defense',  label: L('Savunma & İHA',    'Defense & UAV') },
  { id: 'robotics', label: L('Robotik & Otonom', 'Robotics & Autonomy') },
  { id: 'embedded', label: L('Gömülü & Donanım', 'Embedded & Hardware') },
  { id: 'software', label: L('Yazılım & Web',    'Software & Web') },
  { id: 'other',    label: L('Diğer',            'Other') },
]

/* --- Bölüm tanımları: sıralama ve etiketler ------------------ */
export const SECTION_DEFS = [
  { id: 'summary',        label: L('Özet',         'Summary'),        source: null,        single: true },
  { id: 'experience',     label: L('Deneyim',      'Experience'),     source: 'experience' },
  { id: 'education',      label: L('Eğitim',       'Education'),      source: 'education' },
  { id: 'projects',       label: L('Projeler',     'Projects'),       source: 'projects' },
  { id: 'skills',         label: L('Beceriler',    'Skills'),         source: 'skillGroups' },
  { id: 'languages',      label: L('Diller',       'Languages'),      source: 'languages' },
  { id: 'certifications', label: L('Sertifikalar', 'Certifications'), source: 'certifications' },
  { id: 'references',     label: L('Referanslar',  'References'),     source: 'references' },
]

/* Varsayılan olarak açık gelen bölümler — ATS'in standart olarak
   aradığı dört bölüm artı diller. */
const DEFAULT_ON = new Set(['summary', 'experience', 'education', 'projects', 'skills', 'languages'])

export const emptyProfile = () => ({
  fullName: '',
  headline: { tr: '', en: '' },
  email: '',
  phone: '',
  location: { tr: '', en: '' },
  linkedin: '',
  github: '',
  website: '',
  photo: null,
})

export const emptyLibrary = () => ({
  profile: emptyProfile(),
  summaries: [],
  experience: [],
  education: [],
  projects: [],
  skillGroups: [],
  languages: [],
  certifications: [],
  references: [],
})

export const emptyDocument = (name = 'CV 1') => ({
  id: uid('doc'),
  name,
  lang: 'tr',
  theme: 'signal',
  accent: '#1d5c7a',
  showPhoto: true,
  showIcons: true,
  texture: 'grain',
  targetRole: { tr: '', en: '' },
  summaryId: null,
  referencesOnRequest: true,
  sections: SECTION_DEFS.map((d) => ({
    id: d.id,
    enabled: DEFAULT_ON.has(d.id),
    itemIds: [],
  })),
})
