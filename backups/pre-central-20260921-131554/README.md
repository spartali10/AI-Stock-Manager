# AI Stock Manager

Mevcut uygulamanın Node.js + Express sürümü. HTML uzantıları korunur; EJS yalnızca sunucuda ortak HTML partial'larını birleştirir.

## Çalıştırma
cd "C:\Users\Muzaffer\OneDrive\Desktop\AI-Stock-Manager"
$env:Path = "C:\Program Files\nodejs;" + $env:Path
npm.cmd start

Node.js 20 veya üzeri gerekir.

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

Giriş, yetkiler ve iş verileri önceki uygulamadaki gibi localStorage kullanır; sunucuda yeni bir veri tabanı veya kimlik doğrulama sistemi kurulmamıştır. Eski uygulama başka protokol/host/port üzerinde çalışıyorsa localStorage yeni origin'e otomatik geçmez. Eski tarayıcı verilerini silmeyin; aynı origin'i kullanın veya verileri ayrıca taşıyın.

`npm test`: 6 kontrol geçti. Tüm 15 route, eski URL yönlendirmeleri, yerel CSS/JS bağlantıları ve JS sözdizimi kontrol edildi. Sunucunun ürettiği içerikler, çıkarılan CSS/JS tekrar yerleştirilerek yedeklerle karşılaştırıldı; route dönüşümü, gradyan adresi, eski kullanılmayan menü karşılaştırması ve BOM/satır sonu farkları dışında HTML/CSS/JS eşdeğerliği doğrulandı. Giriş, kullanıcı yetkileri, çıkış, dağıtım ve depo transferi testleri geçti. Tarayıcıda görsel etkileşim ve dış entegrasyon servisleri için uçtan uca doğrulama yapılmadı.

Statik dosya sunumu Express'in [resmi kullanımına](https://expressjs.com/en/5x/starter/static-files/) göre yalnızca `public` klasörüyle sınırlandırılmıştır.
