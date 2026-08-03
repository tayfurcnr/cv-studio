# CV Studio

Modüler, ATS uyumlu CV oluşturucu. İçeriğin uygulamanın içinde değil, **senin JSON dosyanda**
yaşar — dışarıda toplu düzenlersin, yüklersin, CV'lerini kurarsın, hepsini geri indirirsin.

```bash
npm install
npm run dev      # http://localhost:5180
```

## GitHub Pages'e yayınlama

`main` dalına gönderilen her değişiklik GitHub Actions ile otomatik olarak derlenip
GitHub Pages'e yayınlanır. Depoda bir kez **Settings → Pages → Build and deployment →
Source** alanından **GitHub Actions** seçilmelidir.

Yayın adresi: `https://tayfurcnr.github.io/cv-studio/`

Uygulama **boş açılır**. İki yol var:

- **Sıfırdan yaz** — *Kütüphanem*'de kişisel bilgilerinden başlayıp içeriğini tek tek
  gir. Hiçbir dosyaya gerek yok.
- **Dosyadan yükle** — elinde bir veri dosyası varsa *Kütüphanem → Dosya yükle ve
  yedekle*'den içeri al.

Biçimi görmek için `veri/` klasöründeki iki örnek dosyayı yükleyebilirsin:

```
veri/ornek-veri.yaml     profil + kütüphane (örnek içerik)
veri/ornek-cvler.yaml    aynı havuzdan türetilmiş 2 CV
```

Fotoğraf veri dosyasında tutulmaz — base64 tek satırda binlerce karakter kapladığı için
ayrı iner. **Kütüphanem → Kişisel bilgiler → Yükle**'den eklersin.

---

## Neden bu gerekliydi

Grafik araçlarla (Canva, Figma, InDesign) hazırlanıp görsel olarak dışa aktarılan CV'lerde
çoğu zaman **metin katmanı yoktur** — dosya tek bir büyük görselden ibarettir. Kendi CV'nde
kontrol etmek tek satır:

```bash
pdftotext cv.pdf -      # çıktı boşsa ATS de aynı boşluğu görüyor
``` İki sütun düzeni, beceri barları ve ikonlar da ayrıca
sorunlu; ama esas mesele bu: sistem CV'yi boş bir sayfa olarak görür.

Bu uygulamanın ürettiği PDF'te metin gerçek, seçilebilir ve tek akış hâlinde.

---

## İki dosya

Her şey iki JSON dosyasına dayanır. Ayrı tutulmaları kasıtlı: içerik bir kere yazılır,
kompozisyonlar defalarca üretilir.

### Veri dosyası — profil + kütüphane

Profilin + tüm içerik havuzun. **66 proje kaydı (22 proje + 44 rol varyantı), 14 deneyim
kaydı, 2 eğitim, 8 beceri grubu, 6 profil özeti, 2 dil, 3 referans.**

```yaml
profile:
  fullName: Ada Yılmaz
  headline:
    tr: Haberleşme ve Aviyonik Mühendisi
    en: Communications & Avionics Engineer
summaries:   [ … ]
experience:  [ … ]
education:   [ … ]
projects:    [ … ]
skillGroups: [ … ]
languages:   [ … ]
certifications: [ … ]
references:  [ … ]
```

JSON da çalışır — yükleyici ikisini de tanır. YAML'ı tercih etme sebebi elle düzenlemenin
kolaylığı: tırnak ve süslü parantez yok, en uzun satır 102 karakter.

Bunu istediğin editörde açıp toplu düzenlersin — yeni proje eklemek, 10 tanesinin
açıklamasını birden değiştirmek, İngilizceleri tamamlamak burada çok daha hızlı.

### CV dosyası — kompozisyonlar

CV kompozisyonları: hangi öğeler seçili, hangi sırayla, hangi tema, hangi dil.

```json
{
  "documents": [
    {
      "name": "Gömülü Yazılım Mühendisi",
      "lang": "tr", "theme": "signal", "accent": "#1d5c7a",
      "targetRole": { "tr": "Gömülü Sistem Mühendisi", "en": "Embedded Systems Engineer" },
      "summaryId": "sum-embedded",
      "sections": [
        { "id": "experience", "enabled": true, "itemIds": ["exp-ornek", "exp-onceki"] },
        { "id": "projects",   "enabled": true, "itemIds": ["prj-telemetri", "prj-arayuz"] }
      ]
    }
  ]
}
```

İçerik kopyalamaz — kütüphaneye **id ile** bağlanır. Bir projenin metnini veri dosyasında
düzeltirsen onu kullanan bütün CV'ler aynı anda güncellenir.

> Bu iki dosya birlikte anlamlıdır. CV dosyasını tek başına yüklersen id'ler karşılıksız kalır.

### Akış

```
veri.yaml  ──yükle──▶  [ CV Studio ]  ──indir──▶  veri.yaml   (güncellenmiş içerik)
cvler.yaml ──yükle──▶                 ──indir──▶  cvler.yaml  (kompozisyonlar)
                             │
                             └──yazdır──▶  cv.pdf
```

İndirdiğin JSON'lar kalıcı olan şey. Tarayıcı verisi (localStorage) sadece çalışma alanı.

---

## Nasıl çalışıyor

**Kütüphane** ve **belgeler** ayrı yaşar:

- **Kütüphane** — tüm projelerin, deneyimlerin, beceri grupların, özetlerin. Tek doğruluk kaynağı.
- **Belge (CV)** — kütüphaneden bir *seçim* + sıralama + tema.

### İki mod

Arayüz sekmelere değil **iki moda** bölünür, çünkü uygulamanın iki ismi var. Mod sınırı
aynı zamanda **kapsam sınırı** — bir düzenlemenin nereye gittiği moddan okunur.

| Mod | Kapsam | Ne yaparsın |
|---|---|---|
| **Kütüphanem** | Global — tüm CV'ler | İçeriği yazarsın: kişisel bilgiler, özetler, deneyim, eğitim, projeler, beceriler, sertifikalar. Soldaki listeden koleksiyon seçersin, sağda yazarsın. Önizleme yoktur; burada hangi CV'ye baktığın diye bir şey yok. |
| **CV'lerim** | Yerel — yalnızca seçili CV | Kompozisyon: hangi bölüm açık, hangi öğeler seçili, hangi sırada. Sağda canlı önizleme, üstünde **Görünüm** şeridi (tema, renk, doku, dil, hedef pozisyon). |

`CV'lerim` kütüphane tamamen boşken kilitlidir — kompozisyon yapacak içerik yoktur.

**Kurgu ekranında metin yazılmaz.** Bir kaydı düzeltmek istersen `Kütüphanede düzenle`
seni doğru koleksiyona götürür. Bu ayrım bilerek katı: kart içinde yazı yazılabilseydi, bir
projeyi düzeltirken onu kullanan öbür CV'leri de değiştirdiğin görünmez kalırdı. Seçici
penceresindeki `Düzenle` bir istisna — orada da kutunun başında kaç CV'yi etkilediğini
söyleyen bir uyarı çıkar.

Kütüphane listesindeki sağ rozet (`3 CV` / `—`) o kaydın kaç CV'de kullanıldığını gösterir;
boşta duran kayıtları böyle görürsün.

Sol raydaki liste kayıtlı CV'lerin. `+ Yeni CV` ile sıfırdan, `Kopyala` ile mevcut birinden
türetirsin — "Baykar başvurusu", "yurt dışı EN", "web ağırlıklı" gibi.

---

## JSON / YAML yükleme

**Kütüphanem → Dosya yükle ve yedekle**, ya da boş bir koleksiyondaki
`Dosyadan yükle` düğmesi. Dosyanın içinde ne varsa onu alır — `profile`, koleksiyonlar, `documents`;
hepsi aynı dosyada olabilir.

**JSON ve YAML ikisi de kabul edilir**, uzantıya bakılmaz: önce JSON denenir, olmazsa YAML.
Dışa aktarırken **Dosya yükle ve yedekle → "YAML olarak indir"** ile biçim seçilir. YAML elle
düzenlemek için belirgin şekilde rahat — tırnak ve süslü parantez yok, ~%20 daha küçük.

**Fotoğraf ayrı indiriliyor.** Base64 blob veri dosyasında 27.000 karakterlik tek satır
oluşturuyordu; artık veri dosyası fotoğrafsız (en uzun satır 102 karakter). Fotoğrafı ayrı
`*-foto.txt` olarak ya da "Tam yedek" içinde alırsın. Fotoğrafsız bir veri dosyası
yüklediğinde mevcut fotoğrafın **silinmez**.

Biçim konusunda hoşgörülü:

- **Düz string** yazarsan `{tr, en}`'e çevrilir. İki dilli istersen
  `{"name": {"tr": "…", "en": "…"}}` da geçer.
- **Eş anlamlı alan adları** çözülür: `title`→`name`, `company`→`org`, `position`→`role`,
  `highlights`→`bullets`, `technologies`/`stack`→`tech`, `startDate`→`start`, `keywords`→`items`…
  Türkçe karşılıklar da tanınır (`açıklama`, `şirket`, `başlangıç`, `maddeler`, `yıl`).
- **Teknoloji listesi** dizi ya da virgüllü tek string olabilir.
- **JSON Resume** tarzı veri doğrudan çalışır:

```json
{
  "work":      [{ "company": "…", "position": "…", "startDate": "…", "highlights": ["…"] }],
  "education": [{ "institution": "…", "studyType": "…", "startDate": "…" }],
  "skills":    [{ "name": "Grup", "keywords": ["Rust", "Zig"] }]
}
```

Üç mod:

| Mod | Davranış |
|---|---|
| **Birleştir** | Aynı `id` ya da aynı başlık varsa üzerine yazar, yenileri ekler. **Mevcut id korunur** → CV'lerindeki seçimler kopmaz. Varsayılan. |
| **Sonuna ekle** | Hepsini yeni kayıt olarak ekler. Kopya oluşabilir. |
| **Değiştir** | Dosyada geçen koleksiyonları ve CV'leri tamamen değiştirir. Dosyada olmayanlara dokunmaz. |

Yüklemeden önce dosyada ne bulduğunu ve kayıt başlıklarını gösterir — körlemesine yazmaz.

Sıfırdan başlıyorsan **Boş veri şablonunu indir** ile doldurulacak iskeleti alırsın.

---

## PDF alma

Sağ üstteki **PDF olarak indir** → önce ayar hatırlatıcısı, sonra tarayıcının yazdırma ekranı.

| Ayar | Değer | Neden |
|---|---|---|
| Üstbilgiler ve altbilgiler | **KAPALI** | Açıksa sayfa köşelerine tarih, `localhost:5180`, sayfa numarası ve başlık basılır |
| Hedef | PDF olarak kaydet | |
| Kağıt boyutu | A4 | |
| Kenar boşlukları | **Varsayılan** | Boşluklar `@page`'den geliyor, değiştirme |
| Arka plan grafikleri | **AÇIK** | Renkler, çizgiler, koyu başlık bandı |

Chrome bu tercihleri hatırlar. Hatırlatıcıyı "Bunu bir daha gösterme" ile kapatabilirsin.

Üstbilgi/altbilgiyi CSS ile kapatmak mümkün değil — tarayıcı sayfaya bu yetkiyi vermiyor.
Yaptığımız şey, yazdırma anında sayfa `<title>`'ını CV dosya adına çevirmek: üstbilgi açık
unutulsa bile "CV Studio — ATS Uyumlu…" değil `Ada_Yilmaz_Gomulu_Sistem_Muhendisi_CV`
yazar, ve Chrome'un önerdiği kayıt adı da doğrudan bu olur.

Chrome/Chromium öneririm; Firefox'un yazdırma motoru sayfa kırılımlarını farklı yorumluyor.

### Doğrulama

```bash
pdftotext ~/İndirilenler/cv.pdf - | head -40
```

Metin düzgün ve sırayla geliyorsa ATS de aynısını görüyor.

---

## İki dillilik

Her metin alanı `{tr, en}` çifti tutar. Düzenleyicideki **TR / EN** sekmesi hangi dili
yazdığını seçer. Bir dil boşsa CV render sırasında diğerine düşer — önce Türkçeyi doldurup
İngilizceyi sonra tamamlayabilirsin, arada bozuk bir CV oluşmaz.

Belgenin dili **Görünüm şeridi → dil**'den seçilir.

---

## Temalar

| Tema | Başlık fontu | Karakter |
|---|---|---|
| **Signal** | Manrope ExtraBold | Aksan çizgili başlık, sıkı tipografi. Teknik roller. |
| **Slate** | Manrope Light | Sayfa kenarına taşan koyu bant. Kurumsal, cesur. |
| **Serif** | Fraunces | Editöryel serif, ferah satır aralığı. Ar-Ge ve akademi. |

Gövde metni üçünde de **Inter**. Üçü de tek sütun ve gerçek metin; vurgu rengi temadan
bağımsız seçilir.

Başlık fontu yalnızca **isim ve bölüm başlıklarında** kullanılıyor. Pozisyon satırları ve
beceri etiketleri gövde fontunda kalıyor — aksi hâlde sayfa sürekli font değiştirdiği için
gürültülü görünüyor.

### Arka plan dokusu

**Görünüm şeridi → Arka plan dokusu.** Beş seçenek:

| Doku | Nedir |
|---|---|
| **Kağıt** *(varsayılan)* | SVG gürültü filtresi — basılı kağıt hissi. En doğal duranı. |
| **Nokta** | 14px aralıklı seyrek nokta ızgarası. Hafif teknik. |
| **Izgara** | 24px kılcal kareli çizgi — teknik çizim hissi. |
| **Geçiş** | Sağ üst köşeden vurgu renginde yumuşak geçiş. |
| **Yok** | Düz beyaz. |

Hepsi saf CSS (gradient / SVG filtre) — metin katmanına hiçbir şey eklemezler. Beş dokuyla da
PDF bastırıp doğruladım: **361 kelime, 0 bozuk karakter**, hepsinde birebir aynı. ATS
açısından yoklar.

Doku `.resume` elemanının `background`'ı olarak veriliyor; sayfaya bölünen bir kutunun arka
planı her parçada yeniden boyandığı için 2. ve 3. sayfada da devam ediyor.

Kontrast bilinçli olarak çok düşük tutuldu — metin okunurluğunu ve yazıcıda toner tüketimini
bozmasın diye. Yazdırırken **"Arka plan grafikleri"** açık olmalı; kapalıysa doku basılmaz
ama CV yine düzgün çıkar.

### Fontlar neden statik sürüm?

Fontlar `@fontsource` ile projeye gömülü — CDN yok, internet gerekmiyor. **Değişken (variable)
değil statik ağırlıklar** kullanılıyor: Chrome yazdırırken değişken fontları PDF'e `Type 3`
olarak gömüyor, statik ağırlıkları ise gerçek `CID TrueType` olarak. İkincisi hem daha
sağlam hem parser'lar için daha güvenli.

Üçünde de `latin-ext` alt kümesi var, yani ğ ş İ Ğ Ş ı sorunsuz.

Yazdırmadan önce uygulama tüm yüzleri `document.fonts.load()` ile açıkça yüklüyor. Bu şart:
yazdırma kopyası ekranda `display:none` ve dar pencerede önizleme paneli hiç render
edilmiyor — Chrome görünmeyen içerik için font indirmediğinden aksi hâlde PDF yedek fontla
çıkıyordu.

---

## ATS kararları — neyi neden böyle yaptım

**Beceri barları yok.** Parser görsel gösterge okumaz; "Python ▰▰▰▰▱" ifadesinden ona ulaşan
şey sadece "Python" kelimesidir. Bar yer kaplayıp sinyal taşımıyor. Yerine kategori başlığı +
virgülle ayrılmış düz metin — parser tam listeyi alıyor, insan gözü kategorilerden tarıyor.

**Fotoğraf ATS'i bozmuyor.** Parser görselleri atlar, metni okur. Türkiye'de İK sık sık
fotoğraf beklediği için destekli; yurt dışı başvurularında **Görünüm → Fotoğrafı göster**'i
kapatmanı öneririm.

**İletişim ikonları satır içi SVG.** İkonun kendisi değil, nasıl eklendiği önemli:

| Yöntem | ATS'e etkisi |
|---|---|
| Satır içi SVG *(burada kullanılan)* | Güvenli — metin katmanına hiçbir şey eklemez |
| CSS `background-image` | Güvenli |
| PNG/JPG `<img>` | Güvenli, parser görseli atlar |
| **İkon fontu** (Font Awesome vb.) | **Riskli** — glif metin katmanına özel-kullanım karakteri olarak girer, çıkarımda ``  görürsün |
| Emoji (📧 ☎) | Riskli — gerçek karakter olarak çıkar, gürültü yapar |

Doğrulandı: ikonlu PDF'ten metin çıkarımında **0 özel-kullanım karakteri** var ve e-posta,
telefon, LinkedIn, GitHub dördü de regex ile bulunuyor — ATS bu alanları böyle arar.
İstemezsen **Görünüm → İletişim ikonlarını göster**'i kapat.

**Referanslar varsayılan olarak "istek üzerine paylaşılır".** Referanslarının telefon ve
e-postasını her başvuruya dağıtmak, onların rızası olmadan kişisel veri paylaşmak demek.
Açık liste istersen Kurgu ekranından açabilirsin.

**Tarihler ve kurum adları gerçek metin**, görsel hizalama değil. Sağa yaslama CSS ile
yapılıyor ama DOM sırası korunuyor.

---

## Aynı içerikten farklı roller

Bir CV içerik tutmaz, kütüphaneden **seçim** yapar. Bu yüzden bir başvuru için beş ayrı CV
üretmek beş ayrı içerik yazmak anlamına gelmez: aynı havuzdan farklı projeleri seçer, sırayı
değiştirir, temayı değiştirirsin.

Sol raydaki `Kopyala` mevcut bir CV'yi çoğaltır — sonra yalnızca farklılıkları düzeltirsin.

### Varyantlar

Bir işi ya da projeyi farklı rollere farklı anlatmak istersen kaydın **kopyasını** çıkarıp
`Sürüm adı` alanına kısa bir ayırt edici ad yazarsın (`Gömülü odaklı`, `Sistem odaklı`…).
Etiket yalnızca seçim listesinde görünür, CV'ye basılmaz.

Teknik gerçekler her sürümde aynı kalmalı; değişen yalnızca vurgu ve sıralama olmalı. Bir
gömülü ilanı için "kartın sürücüsünü yazdım" öne çıkar, sistem ilanı için "arayüzleri
tanımladım" — ikisi de doğruysa sorun yok, biri uyduruluyorsa CV'yi teknik mülakat çürütür.

### Kütüphane boş kayıtları gösterir

`Kütüphanem`'de her satırın sağındaki rozet o kaydın **kaç CV'de kullanıldığını** söyler.
Hiçbirinde kullanılmayanlar `—` ile işaretlenir; havuzun ne kadarının boşta durduğunu böyle
görürsün.

---

## Yapı

```
veri/
  ornek-veri.yaml     örnek profil + kütüphane
  ornek-cvler.yaml    örnek CV kompozisyonları
src/
  data/seed.js        boş başlangıç durumu + bölüm tanımları
  data/schemas.js     koleksiyon alan tanımları — yeni alan eklemek için tek yer
  state/store.jsx     reducer + localStorage
  lib/importer.js     JSON normalize, birleştirme, dışa aktarma
  components/
    Resume.jsx        CV belgesi (render)
    SectionBoard.jsx  Kurgu: bölüm sırası + öğe seçimi
    LibraryWorkspace.jsx  Kütüphanem: içeriğin yazıldığı yer
    ProfileForm.jsx   kişisel bilgiler (kütüphanenin tek kayıtlı koleksiyonu)
    DataPanel.jsx     dosya yükleme + yedek indirme
    StyleBar.jsx      önizleme üstündeki görünüm şeridi
    PickerModal.jsx   bağlam içinde açılan kütüphane seçicisi
    ItemEditor.jsx    şemadan form üreten modal
    ImportModal.jsx   JSON / YAML yükleme
    PrintDialog.jsx   yazdırma ayarı hatırlatıcısı
    AtsPanel.jsx      denetim + ilan eşleştirme
    Preview.jsx       ölçekli A4 önizleme
  styles/
    fonts.css         @fontsource içe aktarmaları + font değişkenleri
    app.css           builder arayüzü
    resume.css        CV belgesi + temalar + yazdırma kuralları
```

### Sayfa boşlukları neden `@page`'de?

`padding` çok sayfalı bir blokta yalnızca akışın başında ve sonunda uygulanır, her sayfada
tekrarlanmaz. Boşluk `.resume`'a verildiğinde 2. sayfa kağıdın tam köşesinden başlıyordu.
`@page { margin }` ise her sayfaya ayrı ayrı uygulanır — bu yüzden baskıda `.resume`'un
padding'i sıfırlanır. `theme-slate`'in taşan bandı negatif margin ile o boşluğa genişler.

Yeni bir bölüm tipi eklemek: `seed.js` içindeki `SECTION_DEFS`'e bir satır, `schemas.js`
içine alan tanımı, `Resume.jsx` içindeki `switch`'e bir `case`.
