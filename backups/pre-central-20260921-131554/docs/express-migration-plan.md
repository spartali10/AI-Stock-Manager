# Express dönüşüm planı ve geri dönüş

## Mevcut durum
- 15 bağımsız HTML, 16 JS, 5 CSS dosyası; mevcut Node sunucusu/package.json yok.
- index.html ve anasayfa.html farklı içerikler: ikisi de korunacak.
- İş verileri, kullanıcılar ve oturum localStorage üzerinde; veri modeli değiştirilmeyecek.
- Sayfalarda yoğun inline CSS/JS ve farklı sidebar/header biçimleri var.

## Uygulama sırası
1. Orijinal HTML, css, js, tests ve docs dosyalarını `backups/pre-express` içine byte düzeyinde kopyala; SHA-256 manifesti oluştur.
2. HTML dosyalarını `views`, css/js dosyalarını `public` altına taşı. Dosya silme yok.
3. Inline stilleri ve klasik inline scriptleri aynı yükleme sırasını koruyarak public/css/pages ve public/js/pages altına çıkar.
4. Sayfa bağlantıları ve JavaScript yönlendirmelerini route adreslerine dönüştür; giriş/yetki denetimlerini yeni URL biçimine uyarla.
5. Görünümü aynı olan sidebar bloklarını ortak HTML partial olarak sunucuda işle; farklı blokları koru.
6. Express sunucusu, ayrı route modülü, npm komutları ve eski adresler için yönlendirmeler ekle.
7. Mevcut testleri yeni konumlara uyarla; HTTP, kaynak yolları, yetki ve içerik eşdeğerliği kontrollerini çalıştır.

## Route eşlemesi
| Dosya | Route |
|---|---|
| anasayfa.html | /Home |
| stok.html | /Stok |
| stokyonetimi.html | /StokYonetimi |
| raporlar.html | /Raporlar |
| magazalar.html | /Magazalar |
| ayarlar.html | /Ayarlar |
| kullanicilar.html | /Kullanicilar |
| transferler.html | /Transfer |
| satis-analizi.html | /SatisAnalizi |
| ai-onerileri.html | /AiOnerileri |
| bildirimler.html | /Bildirimler |
| entegrasyon.html | /Entegrasyon |
| login.html | /Login |
| erisim-yok.html | /ErisimYok |
| index.html | /Index |

`/` → `/Home`. Eski .html URL'leri sorgu parametreleri korunarak yeni yollara yönlendirilir.

## Geri dönüş
Sunucuyu durdurun. `backups/pre-express` içindeki manifestte kayıtlı dosyaları proje köküne aynı göreli yollarla kopyalayın. Yeni views/public/routes/server.js/package dosyalarını silmeniz gerekmez; eski statik çalıştırma düzeninde kullanılmazlar. Yedek dosyalar Express tarafından sunulmaz ve aktif kaynak değildir.

## Veri sürekliliği
localStorage tarayıcı origin'ine (protokol/host/port) bağlıdır. Eski adresten farklı porta geçilirse eski veriler yeni adreste otomatik görünmez; eski origin'in localStorage verileri korunmalı ve gerekiyorsa taşınmalıdır. Bu dönüşüm sunucu tabanlı kimlik doğrulama veya veri tabanı eklemez.
