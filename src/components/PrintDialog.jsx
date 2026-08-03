import { useEffect, useState } from 'react'
import { printDocument } from '../lib/text.js'

/* ============================================================
   YAZDIRMA HATIRLATICISI

   Tarayıcı, yazdırma penceresinde "üstbilgi ve altbilgi" seçeneği
   açıksa sayfanın dört köşesine başlık, tarih, URL ve sayfa
   numarası basar. Bunu CSS ile kapatmanın yolu yok — tarayıcı
   sayfaya bu yetkiyi vermiyor.

   Yapabildiğimiz iki şey:
   1) Yazdırma anında <title>'ı CV dosya adına çeviriyoruz, böylece
      üstbilgi açık kalsa bile uygulama adı değil CV adı çıkıyor
      (ve Chrome'un önerdiği kayıt adı doğru oluyor).
   2) Ayarı kapatmayı burada hatırlatıyoruz. Chrome bu tercihi
      hatırlar, yani bir kez kapatınca bir daha uğraşmazsın.
   ============================================================ */

const SKIP_KEY = 'cv-studio:print-hint-skip'

export const shouldSkipHint = () => localStorage.getItem(SKIP_KEY) === '1'

export default function PrintDialog({ filename, onClose }) {
  const [skip, setSkip] = useState(false)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const go = () => {
    if (skip) localStorage.setItem(SKIP_KEY, '1')
    onClose()
    // Modal kapansın, sonra yazdırma penceresi açılsın
    setTimeout(() => printDocument(filename), 60)
  }

  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 'min(520px, 100%)' }}>
        <div className="modal-head">
          <h3>Yazdırma ayarları</h3>
          <span className="spacer" />
          <button className="btn ghost icon" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <p className="hint" style={{ margin: '0 0 14px' }}>
            Açılacak pencerede şunları ayarla. Chrome bu tercihleri hatırlar — bir kez
            yaptıktan sonra bir daha uğraşmazsın.
          </p>

          <ul className="print-steps">
            <li>
              <b>Üstbilgiler ve altbilgiler → KAPALI</b>
              <span>
                Açık kalırsa sayfanın köşelerine tarih, <code>localhost:5180</code>, sayfa
                numarası ve başlık basılır. CV'de bunların hiçbiri olmamalı.
              </span>
            </li>
            <li>
              <b>Hedef → PDF olarak kaydet</b>
              <span>Yazıcıya değil dosyaya bas.</span>
            </li>
            <li>
              <b>Kağıt boyutu → A4</b>
            </li>
            <li>
              <b>Kenar boşlukları → Varsayılan</b>
              <span>Boşluklar CV'nin kendi içinden geliyor, burayı değiştirme.</span>
            </li>
            <li>
              <b>Arka plan grafikleri → AÇIK</b>
              <span>Renkler, çizgiler ve koyu başlık bandı için gerekli.</span>
            </li>
          </ul>

          <label className="row inline-check" style={{ marginTop: 16 }}>
            <input type="checkbox" checked={skip} onChange={(e) => setSkip(e.target.checked)} />
            <span>Bunu bir daha gösterme</span>
          </label>
        </div>

        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>Vazgeç</button>
          <button className="btn primary" onClick={go}>Yazdırma penceresini aç</button>
        </div>
      </div>
    </div>
  )
}
