import { useState } from 'react'
import { useStore } from '../state/store.jsx'
import ImportModal from './ImportModal.jsx'
import {
  exportLibrary, exportDocuments, exportAll,
  exportLibraryYaml, exportDocumentsYaml, exportAllYaml,
} from '../lib/importer.js'

/* ============================================================
   VERİ
   Yükleme, yedekleme, sıfırlama. Uygulamanın tamamı tarayıcıda
   çalıştığı için kalıcı olan tek şey buradan indirilen dosyalar.
   ============================================================ */

export default function DataPanel() {
  const store = useStore()
  const { library, dispatch } = store
  const p = library.profile
  const [importing, setImporting] = useState(false)
  const [fmt, setFmt] = useState('json')

  const slug = (p.fullName || 'cv').toLocaleLowerCase('tr')
    .replace(/[ıİ]/g, 'i').replace(/[şŞ]/g, 's').replace(/[ğĞ]/g, 'g')
    .replace(/[üÜ]/g, 'u').replace(/[öÖ]/g, 'o').replace(/[çÇ]/g, 'c')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cv'

  const download = (name, content) => {
    const blob = new Blob([content], { type: 'application/octet-stream' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = name
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="pad">
      <div className="lib-head">
        <div>
          <h2>Dosya yükle ve yedekle</h2>
          <p>Uygulama tamamen tarayıcıda çalışır — kalıcı olan tek şey buradan indirdiklerin.</p>
        </div>
      </div>
      <p className="hint" style={{ margin: '0 0 12px' }}>
        Sunucuya hiçbir şey gitmiyor. Tarayıcı verisini temizlersen çalışman kaybolur.
      </p>

      <button className="btn primary" style={{ marginBottom: 14 }} onClick={() => setImporting(true)}>
        Dosya yükle (JSON / YAML)
      </button>

      <label className="row" style={{ marginBottom: 10, cursor: 'pointer', fontSize: 13 }}>
        <input
          type="checkbox"
          style={{ width: 'auto' }}
          checked={fmt === 'yaml'}
          onChange={(e) => setFmt(e.target.checked ? 'yaml' : 'json')}
        />
        <span>YAML olarak indir</span>
      </label>
      <p className="hint" style={{ margin: '0 0 12px' }}>
        YAML elle düzenlemek için belirgin şekilde daha rahat: tırnak ve süslü parantez yok,
        yaklaşık %25 daha az satır. Yükleyici iki biçimi de tanıyor, uzantıya bakmıyor.
      </p>

      <div className="data-card">
        <div>
          <strong>Veri dosyası</strong>
          <em>
            Profilin + kütüphanenin tamamı ({store.library.projects.length} proje,{' '}
            {store.library.experience.length} deneyim). Fotoğraf dahil <b>değil</b> — dosyayı
            okunabilir tutmak için ayrı indiriliyor.
          </em>
        </div>
        <button
          className="btn sm"
          onClick={() =>
            download(
              `${slug}-veri.${fmt}`,
              fmt === 'yaml'
                ? exportLibraryYaml(store.library, { withPhoto: false })
                : exportLibrary(store.library, { withPhoto: false })
            )
          }
        >
          İndir
        </button>
      </div>

      <div className="data-card">
        <div>
          <strong>CV dosyası</strong>
          <em>
            {store.documents.length} CV'nin kompozisyonu: hangi öğeler seçili, sırası, teması.
            Kütüphaneye id ile bağlanır — tek başına değil, veri dosyasıyla birlikte anlamlı.
          </em>
        </div>
        <button
          className="btn sm"
          onClick={() =>
            download(
              `${slug}-cvler.${fmt}`,
              fmt === 'yaml' ? exportDocumentsYaml(store.documents) : exportDocuments(store.documents)
            )
          }
        >
          İndir
        </button>
      </div>

      <div className="data-card">
        <div>
          <strong>Fotoğraf</strong>
          <em>
            {p.photo
              ? `Ayrı dosya olarak ${(p.photo.length / 1024).toFixed(0)} KB. Veri dosyasının içinde tek satırda 27.000 karakter yer kaplıyordu.`
              : 'Henüz fotoğraf yüklenmedi.'}
          </em>
        </div>
        <button
          className="btn sm"
          disabled={!p.photo}
          onClick={() => download(`${slug}-foto.txt`, p.photo || '')}
        >
          İndir
        </button>
      </div>

      <div className="data-card">
        <div>
          <strong>Tam yedek</strong>
          <em>Üçü tek dosyada, fotoğraf dahil. Yeni bir bilgisayara geçerken bunu al.</em>
        </div>
        <button
          className="btn sm"
          onClick={() =>
            download(
              `${slug}-yedek-${new Date().toISOString().slice(0, 10)}.${fmt}`,
              fmt === 'yaml'
                ? exportAllYaml(store.library, store.documents)
                : exportAll(store.library, store.documents)
            )
          }
        >
          İndir
        </button>
      </div>

      <div className="row wrap" style={{ marginTop: 14 }}>
        <button
          className="btn ghost danger"
          onClick={() => {
            if (confirm('Her şey silinip boş bir çalışma alanına dönülecek. İndirdiğin dosyalar etkilenmez. Emin misin?'))
              dispatch({ type: 'app/reset' })
          }}
        >
          Her şeyi sıfırla
        </button>
      </div>

      {importing && <ImportModal onClose={() => setImporting(false)} />}
    </div>
  )
}
