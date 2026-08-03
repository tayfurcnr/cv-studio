import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../state/store.jsx'
import { tx } from '../lib/text.js'

/* ============================================================
   ATS DENETİMİ
   İki iş yapar:
   1) Yapısal kontroller — CV'nin parser tarafında sorun çıkarıp
      çıkarmayacağı, uzunluğu, eksik alanları.
   2) İlan eşleştirme — ilan metnini yapıştır, hangi anahtar
      kelimelerin CV'nde geçtiğini/geçmediğini gösterir.
   ============================================================ */

const STOP = new Set([
  // Türkçe — genel
  've', 'ile', 'için', 'bir', 'bu', 'şu', 'da', 'de', 'ki', 'mi', 'mu', 'olarak', 'olan', 'olup',
  'gibi', 'veya', 'ya', 'en', 'çok', 'daha', 'ise', 'her', 'kadar', 'sonra', 'üzere', 'tüm',
  'ancak', 'ayrıca', 'göre', 'ilgili', 'konusunda', 'alanında', 'üzerinde', 'içinde', 'arasında',
  'yapmak', 'etmek', 'olmak', 'var', 'yok', 'çok', 'az', 'yeni', 'genel', 'aynı', 'diğer',
  // Türkçe — ilan kalıpları (sinyal taşımaz)
  'deneyim', 'deneyimli', 'tecrübe', 'tecrübeli', 'aday', 'adaylar', 'adayların', 'firma',
  'firmamız', 'şirket', 'şirketimiz', 'pozisyon', 'pozisyonu', 'görev', 'görevler', 'sorumluluk',
  'sorumluluklar', 'aranıyor', 'aranan', 'tercihen', 'nitelikler', 'bilgi', 'bilgisi', 'sahip',
  'çalışma', 'çalışacak', 'çalışan', 'ekip', 'ekibi', 'ekibimize', 'yapabilecek', 'yıl', 'yıllık',
  'mezun', 'mezunu', 'üniversite', 'üniversitelerin', 'bölüm', 'bölümlerinden', 'askerlik',
  'engeli', 'seyahat', 'esnek', 'takım', 'iletişim', 'yetkinlik', 'yetkinlikler', 'katkı',
  'süreç', 'süreçlerinde', 'faaliyet', 'birlikte', 'kişi', 'arkadaşlar', 'iş', 'işi',
  // English
  'the', 'and', 'for', 'with', 'you', 'we', 'our', 'your', 'will', 'are', 'is', 'to', 'of', 'in',
  'on', 'at', 'as', 'be', 'have', 'has', 'or', 'from', 'that', 'this', 'they', 'their', 'must',
  'should', 'able', 'work', 'working', 'team', 'teams', 'experience', 'years', 'year', 'strong',
  'good', 'knowledge', 'skills', 'skill', 'ability', 'role', 'candidate', 'candidates', 'job',
  'position', 'company', 'we\'re', 'plus', 'etc', 'a', 'an', 'it', 'by', 'not', 'who', 'what',
])

const norm = (s) => s.toLocaleLowerCase('tr').replace(/[İI]/g, 'i')

function tokenize(text) {
  return norm(text)
    .split(/[^\p{L}\p{N}+#.]+/u)
    .map((w) => w.replace(/^[.]+|[.]+$/g, ''))
    .filter((w) => w.length >= 3 && !STOP.has(w) && !/^\d+$/.test(w))
}

export default function AtsPanel({ resumeRef }) {
  const { library, doc } = useStore()
  const [posting, setPosting] = useState('')

  /* Belgenin gerçek metni — render sonrası DOM'dan okunur, yani
     ölçtüğümüz şey ATS'in göreceğiyle birebir aynı metin. */
  const [snap, setSnap] = useState({ text: '', height: 0 })
  useEffect(() => {
    const el = resumeRef?.current
    if (el) setSnap({ text: el.innerText, height: el.scrollHeight })
  }, [resumeRef, doc, library])

  const resumeText = snap.text
  const A4_PX = 1122.5 // 297mm @ 96dpi
  const pages = snap.height ? snap.height / A4_PX : 0

  const enabled = new Set(doc.sections.filter((s) => s.enabled).map((s) => s.id))
  const p = library.profile

  /* --- Yapısal kontroller ---------------------------------- */
  const checks = useMemo(() => {
    const out = []
    const words = resumeText.trim().split(/\s+/).filter(Boolean).length

    out.push({
      level: 'ok',
      title: 'Metin katmanı gerçek',
      note: `PDF'e bastığında ${words} kelime seçilebilir metin olarak gömülecek. Eski CV'n görsel PDF'ti; ATS ondan sıfır kelime okuyabiliyordu.`,
    })

    out.push({
      level: 'ok',
      title: 'Tek sütun düzen',
      note: 'Parser yukarıdan aşağı tek akış okuyor. Sütun karışması riski yok.',
    })

    if (pages) {
      const p1 = pages.toFixed(2)
      if (pages <= 1.02) out.push({ level: 'ok', title: `Uzunluk: ~1 sayfa (${p1})`, note: 'İdeal.' })
      else if (pages <= 1.25)
        out.push({ level: 'warn', title: `Uzunluk: ${p1} sayfa`, note: 'Biraz taşıyor. 2–3 madde kısaltırsan tek sayfaya iner.' })
      else if (pages <= 2.05)
        out.push({ level: 'ok', title: `Uzunluk: ~2 sayfa (${p1})`, note: 'Deneyim + proje sayın için makul.' })
      else
        out.push({ level: 'warn', title: `Uzunluk: ${p1} sayfa`, note: '2 sayfayı geçme. Projeler bölümünden en zayıf olanları çıkar.' })
    }

    const missingContact = [
      !p.email && 'e-posta',
      !p.phone && 'telefon',
      !p.linkedin && 'LinkedIn',
    ].filter(Boolean)
    out.push(
      missingContact.length
        ? { level: 'bad', title: 'Eksik iletişim bilgisi', note: `${missingContact.join(', ')} yok. Parser bu alanları ayrı ayrı arar.` }
        : { level: 'ok', title: 'İletişim bilgisi tam', note: 'E-posta, telefon ve LinkedIn okunabilir durumda.' }
    )

    for (const [id, name] of [['summary', 'Profil'], ['experience', 'Deneyim'], ['education', 'Eğitim'], ['skills', 'Beceriler']]) {
      if (!enabled.has(id)) out.push({ level: 'bad', title: `${name} bölümü kapalı`, note: 'ATS bu dört bölümü standart olarak arar; kapalı olması eşleşme puanını düşürür.' })
    }

    if (!tx(doc.targetRole, doc.lang))
      out.push({ level: 'warn', title: 'Hedef pozisyon boş', note: 'Başlığa ilandaki pozisyon adını birebir yazmak en güçlü tek eşleşme sinyalidir.' })

    /* Sayısal sonuç içeren madde oranı */
    const allBullets = [
      ...library.experience.flatMap((e) => e.bullets || []),
      ...library.projects.flatMap((e) => e.bullets || []),
    ].map((b) => tx(b, doc.lang))
    const withNumbers = allBullets.filter((b) => /\d/.test(b)).length
    const ratio = allBullets.length ? withNumbers / allBullets.length : 0
    out.push({
      level: ratio >= 0.3 ? 'ok' : 'warn',
      title: `Sayısal sonuç: ${withNumbers}/${allBullets.length} madde`,
      note:
        ratio >= 0.3
          ? 'İyi oran.'
          : 'Maddelerinin çoğu ne yaptığını söylüyor ama sonucu ölçmüyor. "GPS takip cihazı geliştirdim" yerine "…filodaki 40 aracı kapsayan takip sistemi" gibi sayı ekleyebildiğin yerlere ekle.',
    })

    return out
  }, [resumeText, pages, p, enabled, doc, library])

  /* --- İlan eşleştirme -------------------------------------- */
  const match = useMemo(() => {
    if (!posting.trim()) return null
    const resumeTokens = new Set(tokenize(resumeText))
    const resumeNorm = norm(resumeText)

    const freq = new Map()
    for (const w of tokenize(posting)) freq.set(w, (freq.get(w) || 0) + 1)

    const ranked = [...freq.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'tr'))
      .slice(0, 30)
      .map(([w]) => w)

    const hit = ranked.filter((w) => resumeTokens.has(w) || resumeNorm.includes(w))
    const miss = ranked.filter((w) => !hit.includes(w))

    /* Kütüphanedeki becerilerden hangileri ilanda geçiyor ama bu CV'de kapalı? */
    const postingNorm = norm(posting)
    const shelved = library.skillGroups
      .flatMap((g) => g.items)
      .filter((s) => postingNorm.includes(norm(s)) && !resumeNorm.includes(norm(s)))

    return { hit, miss, shelved: [...new Set(shelved)] }
  }, [posting, resumeText, library])

  return (
    <div className="pad">
      <p className="eyebrow">ATS Denetimi</p>
      {checks.map((c, i) => (
        <div className="check" key={i}>
          <span className={`dot ${c.level}`} />
          <div>
            <b>{c.title}</b>
            <em>{c.note}</em>
          </div>
        </div>
      ))}

      <p className="eyebrow" style={{ marginTop: 24 }}>İlan Eşleştirme</p>
      <p className="hint" style={{ margin: '0 0 8px' }}>
        Başvuracağın ilanın metnini yapıştır. En sık geçen anahtar kelimeleri çıkarıp CV'nde
        olup olmadığına bakar.
      </p>
      <textarea
        rows={5}
        placeholder="İlan metnini buraya yapıştır…"
        value={posting}
        onChange={(e) => setPosting(e.target.value)}
      />

      {match && (
        <div style={{ marginTop: 14 }}>
          <p className="eyebrow" style={{ margin: '0 0 6px' }}>
            CV'nde geçiyor ({match.hit.length})
          </p>
          <div>
            {match.hit.length
              ? match.hit.map((w) => <span className="kw hit" key={w}>{w}</span>)
              : <span className="hint">Hiçbiri eşleşmedi — bu ilan için CV'yi ciddi şekilde uyarlaman gerek.</span>}
          </div>

          <p className="eyebrow" style={{ margin: '14px 0 6px' }}>
            Geçmiyor ({match.miss.length})
          </p>
          <div>
            {match.miss.map((w) => <span className="kw miss" key={w}>{w}</span>)}
          </div>
          <p className="hint">
            Bunlardan <b>gerçekten yaptıklarını</b> profil özetine ve beceri gruplarına doğal
            cümleyle ekle. Yapmadığın bir şeyi anahtar kelime diye yazma — mülakatta sorulur.
          </p>

          {match.shelved.length > 0 && (
            <>
              <p className="eyebrow" style={{ margin: '16px 0 6px' }}>
                Kütüphanende var ama bu CV'de kapalı ({match.shelved.length})
              </p>
              <div>{match.shelved.map((w) => <span className="kw miss" key={w}>{w}</span>)}</div>
              <p className="hint">
                İlan bunları istiyor ve sende zaten var. İlgili beceri grubunu Bölümler sekmesinden aç.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
