/* İki dilli alan yardımcıları */

/** {tr, en} alanından aktif dildeki metni çeker; boşsa diğer dile düşer. */
export function tx(field, lang = 'tr') {
  if (field == null) return ''
  /* String'e zorluyoruz: YAML'da `start: 2017` gibi tırnaksız bir değer
     sayı olarak gelir ve .trim() çağrısı patlardı. */
  if (typeof field !== 'object') return String(field)
  const other = lang === 'tr' ? 'en' : 'tr'
  const pick = (k) => (field[k] == null ? '' : String(field[k])).trim()
  return pick(lang) || pick(other)
}

/** İki dilli etiket dizisinden aktif dildekini çeker; boşsa diğerine düşer. */
export function txList(field, lang = 'tr') {
  if (Array.isArray(field)) return field            // eski düz dizi biçimi
  if (!field) return []
  const other = lang === 'tr' ? 'en' : 'tr'
  const a = field[lang]
  return (Array.isArray(a) && a.length) ? a : (field[other] || [])
}

/** Yeni iki dilli alan. */
export const bi = (tr = '', en = '') => ({ tr, en })

/** Benzersiz id. */
export const uid = (prefix = 'id') =>
  `${prefix}-${(crypto.randomUUID?.() || Math.random().toString(36).slice(2)).slice(0, 8)}`

/** Türkçe karakterleri sadeleştirip dosya adına uygun hale getirir. */
export function slugify(s, { sep = '_' } = {}) {
  const map = { ı: 'i', İ: 'I', ş: 's', Ş: 'S', ğ: 'g', Ğ: 'G', ü: 'u', Ü: 'U', ö: 'o', Ö: 'O', ç: 'c', Ç: 'C' }
  return (s || '')
    .replace(/[ıİşŞğĞüÜöÖçÇ]/g, (c) => map[c])
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, sep)
    .replace(new RegExp(`^${sep}+|${sep}+$`, 'g'), '')
}

/**
 * Belgeyi yazdırır.
 *
 * Tarayıcının yazdırma üstbilgisi sayfa <title>'ını basar. Yazdırma
 * süresince başlığı CV dosya adıyla değiştiriyoruz: hem "CV Studio —
 * ATS Uyumlu…" ibaresi çıkmıyor, hem de Chrome'un önerdiği kayıt
 * dosya adı doğrudan doğru oluyor.
 */
/* Belgede kullanılabilecek tüm yüzler. Yazdırma kopyası ekranda
   display:none olduğu için Chrome bunları kendiliğinden indirmez;
   önizleme paneli dar ekranda gizlendiğinde ise hiç istenmezler.
   Basmadan önce elle yüklemezsek PDF yedek fontla çıkar. */
const RESUME_FACES = [
  '400 16px "Inter"', '500 16px "Inter"', '600 16px "Inter"', '700 16px "Inter"',
  '300 16px "Manrope"', '500 16px "Manrope"',
  '600 16px "Manrope"', '700 16px "Manrope"', '800 16px "Manrope"',
  '500 16px "Fraunces"', '600 16px "Fraunces"', 'italic 500 16px "Fraunces"',
]

/* Hem latin hem latin-ext alt kümesini tetikleyen örnek metin */
const SAMPLE = 'AaBb0123 ĞğŞşİıÜüÖöÇç'

export async function ensureResumeFonts() {
  if (!document.fonts?.load) return
  await Promise.all(
    RESUME_FACES.map((f) => document.fonts.load(f, SAMPLE).catch(() => {}))
  )
  await document.fonts.ready
}

export function printDocument(filename) {
  const run = () => {
    const previous = document.title
    document.title = filename || previous

    const restore = () => {
      document.title = previous
      window.removeEventListener('afterprint', restore)
    }
    window.addEventListener('afterprint', restore)

    window.print()
    // Bazı tarayıcılarda afterprint gecikir; emniyet için
    setTimeout(restore, 1500)
  }

  /* Fontlar yüklenmeden basarsak `font-display: swap` yedek fonta
     düşer ve PDF'e yanlış yüz gömülür. Önce hepsini yüklet. */
  ensureResumeFonts().then(run, run)
}

/** Diziyi from → to taşır (yeni dizi döner). */
export function move(arr, from, to) {
  const next = [...arr]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}
