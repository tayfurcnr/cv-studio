import { useLayoutEffect, useRef, useState } from 'react'
import Resume from './Resume.jsx'
import PrintDialog, { shouldSkipHint } from './PrintDialog.jsx'
import StyleBar from './StyleBar.jsx'
import { useStore } from '../state/store.jsx'
import { slugify, tx, printDocument } from '../lib/text.js'

/* ============================================================
   ÖNİZLEME
   Belge gerçek A4 genişliğinde (210mm) render edilir, yalnızca
   görsel olarak ölçeklenir. Ekranda gördüğün taşma/kırpma
   PDF'te göreceğinin birebir aynısıdır.
   ============================================================ */

const A4_W = 793.7   // 210mm @ 96dpi
const A4_H = 1122.5  // 297mm @ 96dpi

/* Sayfa sayısı ekran yüksekliğinden değil YAZDIRMA geometrisinden
   hesaplanır. Ekranda belge tek bir uzun blok: üstte 13mm, altta
   15mm padding var ve bunlar yalnızca bir kez uygulanır. Baskıda
   ise @page her sayfaya 13mm üst + 13mm alt boşluk koyar, yani
   sayfa başına 271mm içerik alanı kalır.

   Eski hesap ekran yüksekliğini 297mm'ye bölüp %2 tolerans
   ekliyordu; bu tolerans gerçek taşmaları gizliyordu — önizleme
   "2 sayfa" derken PDF 3 sayfa çıkıyordu. */
const MM = 96 / 25.4
const PAD_UST = 13 * MM
const PAD_ALT = 15 * MM
const SAYFA_ICERIK = 271 * MM   // 297mm − 13mm üst − 13mm alt

export default function Preview({ resumeRef }) {
  const { doc, library } = useStore()
  const stage = useRef(null)
  const [scale, setScale] = useState(1)
  const [docHeight, setDocHeight] = useState(A4_H)
  const [hinting, setHinting] = useState(false)

  /* Yazdırma sırasında <title> bu olur → hem üstbilgide uygulama adı
     görünmez hem Chrome'un önerdiği kayıt adı doğru gelir. */
  const filename = [
    slugify(library.profile.fullName) || 'CV',
    slugify(tx(doc.targetRole, doc.lang) || tx(library.profile.headline, doc.lang)),
    'CV',
  ]
    .filter(Boolean)
    .join('_')

  const startPrint = () => {
    if (shouldSkipHint()) printDocument(filename)
    else setHinting(true)
  }

  /* Sahne genişliğine göre ölçek */
  useLayoutEffect(() => {
    const el = stage.current
    if (!el) return
    const fit = () => setScale(Math.min(1, (el.clientWidth - 44) / A4_W))
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  /* Belge yüksekliği — transform layout'u etkilemediği için
     sarmalayıcının yüksekliğini elle vermemiz gerekiyor. */
  useLayoutEffect(() => {
    const el = resumeRef?.current
    if (!el) return
    const measure = () => setDocHeight(el.offsetHeight)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [resumeRef])

  const icerik = Math.max(0, docHeight - PAD_UST - PAD_ALT)
  const pages = Math.max(1, Math.ceil((icerik - 1) / SAYFA_ICERIK))
  const doluluk = icerik / (pages * SAYFA_ICERIK)

  return (
    <div className="preview">
      <div className="preview-bar">
        <strong style={{ fontSize: 13 }}>{doc.name}</strong>
        <span style={{ fontSize: 11, color: 'var(--faint)' }}>
          {doc.lang.toUpperCase()} · {pages} sayfa · %{Math.round(scale * 100)}
        </span>
        <span className="spacer" />
        <button className="btn primary" onClick={startPrint}>
          PDF olarak indir
        </button>
      </div>

      <StyleBar />

      {hinting && <PrintDialog filename={filename} onClose={() => setHinting(false)} />}

      <div className="preview-stage" ref={stage}>
        <div style={{ width: A4_W * scale, height: docHeight * scale }}>
          <div className="paper" style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
            <Resume ref={resumeRef} />
          </div>
        </div>
      </div>
    </div>
  )
}
