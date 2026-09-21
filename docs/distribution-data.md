> Merkezi veri güncellemesi: Bu belgedeki Local Storage/yerel veri açıklamaları önceki sürüme aittir. Güncel kaynak, kurulum, yetkiler ve yedekleme için [merkezi veri rehberine](central-data.md) bakın. İş kuralları ve mevcut arayüzler korunmuştur.

# Akıllı dağıtım veri gereksinimleri

Modlar `NebimAdapter` içindeki yerel veri tabanını kullanır. Örnek ürünlere satış veya sevkiyat geçmişi uydurulmaz.

- Her stok kaydı tek bir `code`, `color`, `size`, `store`, `stock` varyantını temsil eder. `attributes.Renk` ve `attributes.Beden` tek değerli ise kullanılabilir. Bir stok kaydına birden çok beden yazılması adetlerin bedenlere dağılımını belirtmez; bu kayıtlar atlanır.
- Sezon ve grup filtreleri mevcut `hierarchy` / `attributes` alanlarıyla uygulanır.
- `sales`: `{ code, color, size, store, date: "2026-09-05", quantity: 3 }` kayıtları. Tarihler YYYY-MM-DD, miktarlar negatif olmayan tam sayıdır. Satış adedi sıralaması aynı varyant bazındadır.
- `meta.salesCoverage`: `{ start: "2026-09-01", end: "2026-09-07", stores: ["Mağaza A", "Mağaza B"] }`. Yalnızca bu dönem ve mağazaların **eksiksiz** satış verisi yüklenmişse tanımlanmalıdır. Aksi halde kayıt yokluğu sıfır satış olarak yorumlanmaz.
- `movements`: `{ code, color, size, to, quantity }` biçiminde geçmiş sevkiyatlar. İade edilmiş ürünler de geçmişte gönderilmiş sayılır; geçmiş sevkiyat silinmez.
- `meta.movementHistoryComplete: true` yalnızca tüm tarihsel sevkiyatlar yüklendiğinde kullanılmalıdır. Şans Verelim bu doğrulama olmadan sonuç üretmez.

Sil Süpür hedef seçim sırasını, Çalışan Kazanır satış adedi azalan sırasını kullanır. Eşit satışta seçim sırası korunur. Her sıfır stoklu hedefe bir adet verilir. Birden çok kaynaktan aynı hedef-varyantın tekrar tamamlanması önlenir. Kalan depo yalnızca Sil Süpür için uygulanır; stoklu hedefleri atlama kuralının açıkça seçilen istisnasıdır.

Şans Verelim ekranı artık Mamül Depo'nun **tüm mevcut stoğunu** gösteren elle düzenlenebilir dağıtım tablosudur; tarihsel "hiç gönderilmemiş" filtresi bu tabloda uygulanmaz. Eski aday-listesi motoru kullanılırsa yukarıdaki geçmiş doğrulama kuralları geçerlidir. Sil Süpür ve Çalışan Kazanır önizleme sonrası güncel veriyi tekrar kontrol eder ve tüm hareketleri tek yerel kayıt işleminde uygular.

## Mamül Depo tablosunun entegrasyonu

- `NebimAdapter.getWarehouseMatrixData()` güncel `{ stores, products, token, fetchedAt, sourceLabel? }` döndürür. Şimdilik her çağrıda tarayıcıdaki veriyi yeniden okur. Nebim API bağlantısı daha sonra bu metotta kurulabilir. `sourceLabel` canlı bağlantı gerçekten kurulmadan canlı veri olarak etiketlenmemelidir.
- Mamül Depo kaydı `type: "finished_goods"` veya `isFinishedGoodsWarehouse: true` taşımalıdır. `Mamül Depo` / `Mamul Depo` ile başlayan mevcut isimler de tanınır. Normal mağazalar depo seçicisinde gösterilmez.
- Kumaş için `fabric`, `fabricType`, `attributes["Kumaş Cinsi"]` veya `attributes.Kumaş` kullanılabilir. Kod/renk/beden stok kayıtları yukarıdaki tekil varyant kuralına uyar.
- Her mağaza `stores` listesinde bulunmalıdır. Tablo, Mamül Depo dışındaki mağazaları yan yana gösterir ve beden başlıklarını stoklardan oluşturur. Aynı varyanta ait birden fazla kaynak kayıt toplanır.
- `applyWarehouseMatrix(warehouse, entries, token)` tüm hücre girişlerini yeniden doğrular. Entegrasyonda bu işlemin sunucuda stok sürümü kontrolü ve tek veritabanı işlemiyle uygulanması gerekir. Yerel sürüm, değişmiş snapshot'ı reddeder ve tek localStorage yazımı kullanır.
- Filtreler mevcut girişleri silmez. Genel ve satır toplamları tüm bedenleri, filtre dışında kalan girişleri de kapsar. CSV yalnızca görünür filtreye uyan satır/bedenleri içerir.
- Tablodaki adetler gönderilecek ek miktarlardır; negatif adet kabul edilmez. Negatif **kalan** depo stoğunun aşıldığını gösterir ve uygulamayı durdurur.
