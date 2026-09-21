# Stok Excel aktarımı

Stok ekranındaki Excel dışa aktarma, aynı dosyada iki çalışma sayfası oluşturur:

- **Stok Listesi:** Mevcut yan yana beden sütunları.
- **Beden Detayı:** Kumaş Cinsi, Ürün Adı, Renk, Beden, Mağaza, Stok, Ürün Kodu ve Durum. Her beden ayrı satırdır. Sıfır stoklar korunur; üretilmeyen bedenler için satır oluşturulmaz.

Excel'den yüklerken dosyada **Beden Detayı** varsa bu sayfa esas alınır. Düzenlemeleri bu sayfada yapın. Diğer sayfa ayrıca okunmaz. Bu sayfa bulunmuyorsa ilk sayfanın eski sütun düzeni veya aynı dikey düzen okunabilir. CSV de iki düzeni destekler.

Ürün kodunu, kumaş cinsini, rengi, mağazayı ve bedeni her satırda koruyun. Stok negatif, sıfır veya pozitif tam sayı olabilir. Negatif stoklar olduğu gibi alınır ve stok tablosunda kırmızı, ünlemli gösterilir. Aynı varyantın tekrar eden satırları reddedilir. Yükleme mevcut stok listesini dosyadaki ürünlerle değiştirir; dışa aktarma ekrandaki filtrelere uyan ürünleri kapsar.


Merkezi sürümde yükleme Node API üzerinden ortak veritabanına kaydedilir. İşlem öncesi sunucu yedeği alınır ve veri sürümü kontrol edilir. Dosya biçimi aynıdır. [Kurulum ve taşıma](central-data.md).
