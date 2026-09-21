# AI Stock Manager

Node.js + Express ve merkezi veritabanı kullanan AI Stock Manager. HTML uzantıları korunur; EJS yalnızca sunucuda ortak HTML partial'larını birleştirir.

## Merkezi veri kurulumu

Ürün, mağaza, stok, transfer ve giriş hesapları artık backend tarafından yönetilir. Render için PostgreSQL; yerel geliştirme için sunucuda SQLite kullanılır. Tarayıcıdaki eski veriler otomatik aktarılmaz veya silinmez.

**Önce [kurulum, yedek ve migration rehberini](docs/central-data.md) izleyin.** `.env.example` dosyasını `.env` olarak kopyalayın, kendi `ADMIN_PASSWORD` değerinizi belirleyin ve `npm run start:env` çalıştırın. Ortam değişkenleri zaten tanımlıysa aşağıdaki mevcut başlatma komutu kullanılabilir.

**İlk PostgreSQL Admin girişi:** Sunucuda `DATABASE_URL` ve `ADMIN_PASSWORD` tanımlı olmalıdır. `npm start` artık proje kökündeki `.env` dosyasını da okur; Render'da tanımlanmış ortam değişkenleri önceliklidir. Merkezi veritabanında hiç giriş hesabı yoksa ilk başlatmada **`admin`** oluşturulur. Şifre `ADMIN_PASSWORD` değeridir (8–1024 karakter); kaynak kodda varsayılan şifre bulunmaz. Herhangi bir hesap varsa mevcut hesaplar ve şifreler aynen korunur. `ADMIN_PASSWORD` değiştirmek mevcut Admin şifresini sıfırlamaz. Eski Local Storage hesabı giriş için kullanılmaz.

**Girişte “Sayfa bulunamadı / not valid JSON” hatası:** Eski `npm start` süreci yeni JavaScript dosyalarını sunarken eski backend koduyla çalışmaya devam edebilir. Açık terminalde `Ctrl+C` ile eski sunucuyu durdurup `npm start` ile yeniden başlatın, ardından giriş sayfasını yenileyin. `/api/session` adresi güncel sunucuda JSON döndürmelidir. Bu adres 404 dönüyorsa sorun şifreden önce sunucu sürümü/adresidir; kullanıcıları veya veritabanını silmeyin.

## Çalıştırma
cd "C:\Users\Muzaffer\OneDrive\Desktop\AI-Stock-Manager"
$env:Path = "C:\Program Files\nodejs;" + $env:Path
npm.cmd start

Node.js 22.13 veya üzeri gerekir.

```sh
npm install
npm start
```

Adres: http://localhost:3000/Home. Giriş: http://localhost:3000/Login.
`npm run dev` sunucuyu izleme modunda, `npm test` kontrolleri çalıştırır. Port `PORT` ortam değişkeniyle değiştirilebilir.

Bu bilgisayarda Node `C:\Program Files\nodejs` altında bulundu ancak araç oturumunun PATH'inde yoktu. Aynı sorun yaşanırsa PowerShell'de:

```powershell
$env:Path = 'C:\Program Files\nodejs;' + $env:Path
npm.cmd start
```

## Yapı

- `server.js`: Express, view engine, statik dosyalar ve hata yanıtları.
- `routes/pages.js`, `routes/page-map.json`: 15 sayfa route'u ve eski `.html` adreslerinden yönlendirmeler.
- `views/*.html`: özgün sayfalar.
- `views/partials`: dokuz sayfanın kullandığı iki ortak sidebar; aktif menü parametresi görünümü korur.
- `public/css`, `public/js`: ortak dosyalar; `pages` alt klasörleri sayfalardan çıkarılan stilleri/scriptleri içerir. Yükleme sırası korunmuştur.
- `tests`: mevcut işlev testleri ile HTTP, kaynak erişimi, içerik eşdeğerliği ve yeni URL yetki testleri.

Bağımsız yerel resim/font dosyası bulunmadı. Mevcut SVG, metin ikonları ve sistem fontları korundu. Stok sayfasının dış CDN üzerinden yüklediği XLSX kütüphanesi aynı adreste bırakıldı. Satış grafiğindeki SVG gradyan referansı CSS taşındığı için `/SatisAnalizi#chartGradient` olarak düzenlendi.

Tüm route'lar ve geri dönüş adımları: [dönüşüm planı](docs/express-migration-plan.md).
`index.html` farklı bir sayfa olduğundan `/Index` altında korunur; `/` adresi `/Home` yoluna gider. Farklı header/sidebar biçimleri kendi sayfalarında korunmuştur.

## Yedek ve kullanılmayan dosyalar

Hiçbir özgün dosya silinmedi. `backups/pre-express` 43 özgün dosyanın birebir yedeğini ve SHA-256 manifestini içerir; sunucu bu klasörü yayınlamaz. Kökteki boş `css` ve `js` klasörleri artık kullanılmaz. `scripts/migrate-to-express.cjs` ve `scripts/extract-partials.cjs` tek seferlik dönüşüm araçlarıdır; normal çalıştırmada kullanılmaz. İlk araç mevcut yedek varsa yeniden çalışmayı reddeder.

## Veriler ve doğrulama

- Veri katmanı: `backend/repository.js`; iş kuralları: `backend/inventory-service.js`; API/yetkiler: `backend/api.js`, `backend/auth-service.js`.
- Render kurulumu: `render.yaml`; gizli bilgiler yalnızca environment variables.
- Eski kayıtları koruyan taşıma ekranı: `/Migration` (Admin). Önizleme veri yazmaz; import yalnızca boş merkezi iş verisine yapılır.
- Kod değişikliği öncesi 97 dosyalık SHA-256 yedeği: `backups/pre-central-20260921-131554`.
- `npm test`: mevcut işlevler, iki ayrı oturumda ortak veri, eşzamanlı transfer, yetkiler, migration, yedek/rollback, PostgreSQL sorguları ve sayfaların API ile DOM kontrolleri.

Gerçek Render dağıtımı ve kullanıcı verisinin import'u otomatik yapılmaz. Bütün cihazlar aynı merkezi sunucu adresine bağlanmalıdır. Nebim'e gerçek bağlantı veya yazma işlemi yoktur. Ayrıntılar: [merkezi veri rehberi](docs/central-data.md).
