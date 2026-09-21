# Merkezi veri geçişi

## İnceleme sonucu

Önceki Express sunucusu yalnızca HTML/EJS ve statik dosya sunuyordu; veri API'si, kalıcı veritabanı veya sunucu kimlik doğrulaması yoktu. Asıl iş verisi `public/js/nebim-adapter.js` içinden `aiStockNebimData` anahtarına yazılıyordu. Eksik/bozuk kayıt demo başlangıç verisiyle değiştirilebiliyordu. Stok sayfası HTML örneklerini `seedProductsIfMissing()` ile içeri alıyordu. Her tarayıcı ve origin farklı veri tuttuğu için cihazlar ayrışıyordu.

İncelenen diğer bağımlılıklar:

| Bölüm | Önceki kaynak | Yeni kaynak |
| --- | --- | --- |
| Ürün, beden/renk, mağaza, depo, stok | `aiStockNebimData` | Backend → ortak veritabanı |
| Transfer, görev, envanter anlık kaydı | Aynı tarayıcı kaydı | Sunucu transaction'ı |
| Excel içeri alma | Tarayıcıda parse → Local Storage | Aynı parser → API doğrulaması → veritabanı |
| Giriş/yetkiler | `aiStockUsers`, `aiStockUser` | Sunucuda hesap ve HttpOnly oturum |
| Transfer şablonları | `aiStockQuickTransferTemplates` | Merkezi `templates` |
| Emir notları | `transfer-order-note:*` | Merkezi `notes` |
| Yedek indirme | Kısmi yerel stok yedeği | Merkezi iş verisinin tamamı |
| Dashboard | Yerel/demo içerik | Merkezi stok, mağaza, transfer ve kayıtlı satışlar |
| Tema, görünüm/oturum süresi sayaçları | Local/Session Storage | Cihaz tercihi olarak yerelde kalır |
| Entegrasyon form tercihleri | `aiStockIntegrationSettings` | Gizli bilgi içermeyen cihaz tercihleri olarak kalır |

`/StokYonetimi`, mağaza kartları ve bildirimler de HTML örneklerine bağlıydı; biçimleri korunarak merkezi içerik yüklemeye geçirildi. `/Index` içindeki yerel dashboard verisi artık iş verisi kaynağı değildir. API hata verdiğinde demo veya eski yerel veriyle devam edilmez.

Mevcut bazı rapor/AI, fiş gönderme-silme ve dış entegrasyon düğmeleri zaten taslak/örnek işlevlerdi. Bu geçiş gerçek Nebim, e-posta, AI modeli veya fiş gönderme entegrasyonu eklemez. Bekleyen transfer kaydı oluşturma stok hareketi değildir; uygulanan hızlı transfer ve dağıtım işlemleri stokları değiştirir. Mevcut beden bazlı normal/özel görünüm ve Excel biçimleri korunur.

## Mimari

```text
Excel (mevcut format, tarayıcıda parse)
  → yetkili Node.js API
  → sunucuda doğrulama / stok ve transfer kuralları
  → PostgreSQL (Render)
  → aynı uygulama adresini kullanan PC ve telefonlar

İleride: Nebim salt-okunur source → backend → aynı repository
```

`backend/inventory-service.js` mevcut iş kurallarının sunucuya taşınmış halidir. `backend/repository.js` bunlardan bağımsız kalıcılık/transaction katmanıdır. `public/js/nebim-adapter.js` yalnızca uyumluluk sağlayan API istemcisidir; adı korunmuştur, Nebim bağlantısı değildir.

PostgreSQL `app_state` içinde sürümlü JSONB kullanılır. Bu seçim `hierarchy`, `attributes`, `sales`, `movements`, `meta`, transfer snapshot'ları ve henüz tanımlanmamış eski alanların korunmasını sağlar. `app_backups` değişiklik öncesi iş verisi/hesap snapshot'larını saklar. SQL parametrelidir; dinamik tablo veya sorgu isimleri istemciden alınmaz.

Her yazma `SELECT ... FOR UPDATE` ile kilitlenen transaction içinde güncel veriyle hesaplanır. Stok değişiklikleri ve transfer kayıtları birlikte commit edilir. Hata halinde rollback yapılır. Aynı istek kimliğinin tekrar gönderilmesi stok hareketini tekrar uygulamaz (son 24 saat / en fazla 1000 kayıt). Dağıtım önizlemeleri veri hashini, Excel değiştirme işlemi beklenen veri sürümünü kontrol eder.

Açık sayfalarda 10 saniyelik sürüm kontrolü ve pencereye dönüşte yenileme vardır; yeni açılan sayfa doğrudan merkezi veriyi alır. Bu sistem çevrimdışı yazma kuyruğu kullanmaz. Ağ olmadan işlem başarıyla kaydedilmiş sayılmaz.

Bu ilk model bütün iş verisini tek JSONB kaydında tutar ve yazmaları sıraya alır. Büyük veri/yüksek işlem hacminde ayrı ürün, stok, hareket tablolarına ve sayfalı API'lere geçiş gerekir. Snapshot'lar otomatik silinmez; büyümeyi izleyin ve ayrıca veritabanı sağlayıcısı yedeği planlayın. Veritabanı içi snapshot, veritabanının tamamının kaybına karşı bağımsız yedek değildir.

## Yerel çalıştırma

Node.js **22.13+** gerekir; bu bilgisayarda 24.20.0 ile test edildi. PostgreSQL adresi verilmezse yalnızca yerel geliştirmede `data/stock-manager.sqlite` kullanılır. SQLite tarayıcıda değil Node sunucusundadır. Render/production ortamında `DATABASE_URL` eksikse uygulama durur; geçici diske sessiz geçiş yapmaz.

1. `npm ci` çalıştırın.
2. `.env.example` dosyasını `.env` olarak kopyalayın.
3. `.env` içinde `ADMIN_PASSWORD` için kendiniz güçlü, benzersiz bir şifre belirleyin. Kaynak kodda varsayılan şifre yoktur. İlk merkezi kullanıcı `admin` olur. Sonraki başlatmalarda mevcut hesap/şifre değiştirilmez.
4. `npm run start:env` çalıştırın. Ortam değişkenlerini PowerShell veya barındırma panelinde tanımladıysanız mevcut `npm start` komutu çalışır.
5. `http://localhost:3000/Login` üzerinden merkezi hesaba giriş yapın. Eski tarayıcı hesabı merkezi hesaba otomatik dönüşmez.

`.env`, `data/` ve `private-backups/` Git dışında tutulur. Local Storage'daki eski veriler otomatik temizlenmez; yeni sürümün merkezi ekranları boş olsa bile eski veriler eski tarayıcı/origin üzerinde durur.

## Render kurulumu

`render.yaml` bir Node web servisi ve kalıcı Render Postgres tanımlar. Gerçek Render hesabında bu çalışma sırasında servis/veritabanı oluşturulmadı veya dağıtım yapılmadı.

1. Repoyu Render Blueprint ile bağlayın veya web servisi + PostgreSQL'i aynı bölgede kurun.
2. Web servisinde `DATABASE_URL` değerini PostgreSQL **Internal Database URL** ile bağlayın. Blueprint bunu `fromDatabase` ile yapar.
3. `NODE_ENV=production`, `ADMIN_PASSWORD` ve `APP_ORIGIN=https://uygulamanizin-adresi` tanımlayın. `APP_ORIGIN` sonunda `/` olmamalı.
4. Build: `npm ci --omit=dev`; start: `npm start`; sağlık kontrolü: `/health`.
5. Veritabanı hazırsa şema idempotent oluşturulur. Boş veritabanına demo stok veya mağaza eklenmez.
6. Giriş ve migration sonrası bütün cihazlar **aynı HTTPS uygulama adresini** kullanmalı. Her PC'de ayrı `npm start` + ayrı yerel SQLite çalıştırmak onları ortak yapmaz.

Blueprint'teki `basic-256mb` ücretli kalıcı veritabanı planıdır; oluşturma maliyetini Render panelinde kontrol edin. Deneme/geçici veritabanı gerçek işletme verisi için seçilmemelidir. Render dahili bağlantısı için örnekte `DATABASE_SSL=false`; harici TLS bağlantısında `DATABASE_SSL=true` ve gerekirse `DATABASE_CA` kullanılır. Sertifika doğrulaması kapatılmaz. TLS ayarları bağlantı adresinin parametreleriyle çelişmemelidir.

Resmî belgeler: [Render Postgres bağlantısı](https://render.com/docs/postgresql-creating-connecting), [Blueprint alanları](https://render.com/docs/blueprint-spec), [yedekleme](https://render.com/docs/postgresql-backups), [node-postgres TLS](https://node-postgres.com/features/ssl).

## Güvenli eski veri aktarımı

**İlk adım her zaman gerçek verinin bulunduğu tarayıcıdan dosya yedeği almaktır.** Kod yedeği tarayıcıdaki Excel verisinin yedeği değildir.

Kod yedeği: `backups/pre-central-20260921-131554/`, 97 dosya ve `manifest.json` SHA-256 listesi. Mevcut dosyalar değişmeden önce alındı; önceki `backups/pre-express` de korunur.

1. Gerçek verinin bulunduğu bilgisayar/tarayıcıyı, eski protokol/host/port ile açın. Aynı origin üzerinde yeni sürüm çalışıyorsa Admin olarak `/Migration` sayfasını açıp **Eski tarayıcı yedeğini indir** düğmesini kullanın.
2. Eski uygulama başka origin'deyse `scripts/export-browser-backup.js` içeriğini **o eski sayfanın geliştirici konsolunda** çalıştırın. Kod yalnızca JSON dosyası indirir; sunucuya göndermez, tarayıcı kaydını silmez/değiştirmez. Local Storage dosyasını tarayıcı ayarlarından temizlemeyin.
3. Kullanıcı hesapları isteğe bağlıdır. Dahil edildiğinde dosya şifre hashleri veya eski açık metin şifreleri içerebilir; paylaşmayın, repoya koymayın. Import sırasında açık metinler sunucuda PBKDF2 hashine dönüştürülür. `aiStockNebimData.users` eski profil kayıtları olarak korunur; giriş hesapları ayrı `accounts` alanındadır.
4. Merkezi sistemde `/Migration` sayfasında JSON'u seçip **Yedeği kontrol et** deyin. Bu aşama hiçbir veri yazmaz. Ürün/beden, mağaza, transfer ve emir adetlerini, stok toplamını ve SHA-256 değerini kontrol edin. Eski yalın `aiStockNebimData` JSON nesnesi de kabul edilir.
5. Kaynak yedeğinizi sakladığınızı onayladıktan sonra aktarın. Merkezi iş verileri doluysa import reddedilir. Önizlemeden sonra içerik/sürüm değişmişse yeniden önizleme gerekir. İşlem transaction içindedir; önceki merkezi durum otomatik yedeklenir.
6. Aynı adlı merkezi hesaplar ve ilk merkezi Admin korunur; yalnızca eksik eski hesaplar eklenir. Ana Admin eski şifresini otomatik devralmaz; environment ile kurduğunuz şifre geçerlidir.
7. İkinci PC/telefonla aynı HTTPS adresine girin. Stokları, mağazaları ve transferleri karşılaştırın. Eski yerel yedeği bu doğrulama tamamlanmadan kaldırmayın.

Aktarım başarıyla tamamlandıktan sonra aynı dosyanın yeniden aktarımı reddedilir. Dolu veritabanına otomatik birleştirme/üzerine yazma yapılmaz. İş verisini içeri alma sayfası tasarım değişikliği gerektirmeyen ayrı bakım sayfasıdır; mevcut menülere eklenmedi.

## Excel yükleme ve yedekler

Stok ekranındaki mevcut `StockExcel` parser, `Beden Detayı` ve sütun biçimleri aynıdır; baştaki sıfırlar ve renk/kumaş/beden ayrımları korunur. Negatif tam sayı stoklar desteklenir. Excel yükleme, önceki davranış gibi **ürün/stok listesini değiştirir**; transfer geçmişi, şablonlar, notlar ve meta içindeki satış kapsamı korunur. Değiştirme öncesi snapshot alınır. Dosyadaki mağazalar merkezi mağaza listesine eklenir, mevcut mağazalar silinmez.

`/Migration` veya mevcut entegrasyon yedek düğmesi merkezi iş verisi JSON'unu indirir. Tam sunucu yedeği ve önceki snapshot'lar için, ortam değişkenlerinin tanımlı olduğu sunucuda:

```powershell
# .env kullanıyorsanız aşağıdaki node çağrılarına --env-file=.env ekleyin.
node scripts/central-db.cjs check
node scripts/central-db.cjs backup private-backups/full-backup.json
node scripts/central-db.cjs list-backups
# Yalnızca bilinçli geri dönüş: önce check ile güncel revision değerini okuyun.
node scripts/central-db.cjs restore YEDEK_ID BEKLENEN_REVIZYON
```

`private-backups` klasörünü önceden oluşturun. Dosya yedeği mevcut dosyanın üzerine yazmaz. Tam sunucu yedeği giriş hashlerini içerir. Restore seçilen snapshot'ın **iş verisini** geri getirir, mevcut hesapları/yetki iptallerini geri almaz; restore öncesindeki iş verisi de tekrar yedeklenir. Uygulama koduna dönmek eski tarayıcı verisini geri getirmez; merkezi kullanıma geçildikten sonra eski kodla paralel stok işlemi yapmayın.

## API ve oturumlar

| Endpoint | İşlev |
| --- | --- |
| `POST /api/login`, `POST /api/logout` | Merkezi giriş/çıkış |
| `GET /api/session`, `/api/session.js` | Güvenli oturum bilgisi; hashler gönderilmez |
| `GET /api/products`, `/stores`, `/stocks`, `/transfers` | Yetkili veri okuma |
| `POST /api/data/:method` | Mevcut adapter metodunu sunucuda çalıştırır; izinli metot listesi vardır |
| `POST /api/imports/excel` | `{ products, fileName }`; mevcut parser çıktısı |
| `GET /api/revision` | İş verisi değişiklik sürümü |
| `GET /api/backup`, `/api/backups` | Admin yedeği/snapshot listesi |
| `POST /api/migration/preview`, `/import` | Admin kontrolü ve tek seferlik aktarım |
| `POST /api/users/save`, `/remove`, `/permissions` | Sunucuda kullanıcı yönetimi |

Yazmalarda `X-Stock-Request: 1`, oturum CSRF token'ı ve veri değişikliklerinde `Idempotency-Key` zorunludur. Excel değiştirmede `If-Match` sürümü zorunludur. Tarayıcı istemcisi bunları ekler. HttpOnly/SameSite oturum çerezi production'da Secure'dur. İzinler her API isteğinde ve yazma transaction'ında tekrar kontrol edilir. Kullanıcı silme/pasifleştirme, rol veya şifre değişikliği eski oturumları iptal eder. Kimlik doğrulama Local Storage'a güvenmez.

`backend/nebim-source.js` yalnızca salt-okunur gelecek arayüzüdür; URL, parola, sürücü, ağ isteği veya Nebim'e yazma metodu içermez. İleride entegrasyon servis hesabı da Nebim tarafında sadece okuma yetkisiyle açılmalıdır. Merkezi uygulamadaki stok değişiklikleri Nebim'e otomatik gönderilmez.

## Doğrulama

`npm test`: mevcut stok/beden, Excel, depo, dağıtım, transfer, yetki testleri; iki bağımsız HTTP oturumu; eşzamanlı stok tüketimi; tekrar istek; migration önizleme/tek aktarım; yedek/rollback; SQLite yeniden açılış; PostgreSQL SQL/JSONB işlemleri (PGlite PostgreSQL motoru); mevcut sayfaların gerçek API ile DOM açılışları.

DOM testleri eski Local Storage'a ayırt edici veri bırakıp merkezi verinin gösterildiğini ve eski kaydın silinmediğini kontrol eder. Görsel piksel/tarayıcı ve gerçek Render/PostgreSQL ağ bağlantısı bu yerel testlerin kapsamı dışındadır; üretimde ilk kurulum sonrası iki cihaz doğrulaması yapılmalıdır.
