# Filtreye göre eksik beden transferi

Transferler ekranındaki hızlı transfer bölümünde kaynak mağazaları, Kumaş Cinsi alanındaki ürün adlarını, hedef mağazaları ve satış tarih aralığını seçin. Kumaş Cinsi ve diğer filtrelerle eşleşen tüm ürünler otomatik değerlendirilir; ayrıca ürün kodu veya adet seçilmez. Değer seçilmeyen filtre tüm ürünleri kapsar.

Her kaynak ürün/beden için seçili dönemde kaynak satışı sıfır olmalıdır. Seçili hedeflerden aynı varyantın stoğu sıfır ve dönem satışı pozitif olanlar değerlendirilir. En çok satış yapan hedefe kaynak kaydındaki tüm stok aktarılır. Eşit satışta hedeflerin seçim sırası kullanılır. Başlangıçta stok bulunan hedefler atlanır; seçim dışındaki mağazalar değerlendirilmez. Tarih aralığının ilk ve son günü dahildir.

Satış geçmişinin eksiksiz olduğu `meta.salesCoverage` ile tüm kaynak ve hedef mağazalar için doğrulanmalıdır. Eksik kapsam veya geçersiz satış verisi varsa işlem kayıtları değiştirmeden durur. Aynı ürün/renk/bedenin farklı kumaşları mevcutsa satışlarda kumaş bilgisi de gerekir.

Transfer kayıtları ve tamamlanan emir yerel tarayıcı verisine kaydedilir. Kayıtlarda satış aralığı, kaynak ve hedef satış adetleri ile transfer öncesi stok bulunur. İşlem Nebim'e gönderilmez.
