# Akıllı Dağıtım Excel ve fiş akışı

Excel güncellemesi: Tanımsız beden sütunları dışa aktarılmaz ve toplam formüllerine dahil edilmez; kaynak kayıtlar silinmez. Koleksiyon bilgisi olmayan grubun ara toplam etiketi `ARA TOPLAM` olarak gösterilir; `Tanımsız TOTAL` etiketi kaldırılmıştır. Normal sarı TOTAL sütunları korunur. ONE / ONE SIZE için tek sütun, `ONE SIZE` başlığıyla çıkar; kaynakta iki ayrı kod birlikte mevcutsa yanlış birleştirme yerine açıklayıcı hata verilir. Önceki sütun düzenine sahip dosyalar için güncel şablonu yeniden indirin. İçe aktarımda her bedenin tüm mağazalara gönderilecek toplamı güncel kaynak stoğuna karşı kontrol edilir.

Transferler → Akıllı Dağıtım bölümünde Mamül Depo seçilip güncel veri çekilir. `Excel Dışa Aktar (.xlsx)` tüm ürünleri ve tüm girişleri, ekrandaki filtrelerden bağımsız olarak indirir. Aynı düğme henüz adet girilmemişken boş dağıtım şablonu üretir.

Şablon referans görseldeki düzendedir: COLLECTION / ItemDesc / Color, başlangıç KALAN, her mağaza için 0 / 1 / 2 / 3 / ONE / TOTAL, son KALAN. Kaynakta başka bedenler varsa onlar da eklenir; kayıtlı mağazalar kullanılır. Mağaza adları referans görselden sabitlenmez. Koleksiyon alanı yoksa kumaş bilgisi kullanılır. Koleksiyon ara toplamları ve genel toplam formüllüdür. Sayısal görünümlü ürün kodları metin olarak korunur.

Sarı sütunlar toplam, kırmızı hücreler kaynakta stoğu veya geçerli varyantı olmayan bedenlerdir. Referanstaki kırmızı rengin iş kuralı belirtilmediği için mağaza bazında yasak anlamı yüklenmemiştir.

Excel'de yalnızca mağazalara gönderilecek adetleri değiştirin. `Excel Girişlerini Yükle` ile aynı formatı geri alın. Başlık değişikliği, tekrarlı/bilinmeyen ürün, negatif/kesirli miktar, adet hücresinde formül ve toplam kaynak stok aşımı reddedilir. Hatalı dosya mevcut girişleri değiştirmez. Eksik satırlar ve boş adetler sıfır dağıtım kabul edilir; mevcut girişler varsa değiştirmeden önce onay istenir. İçe aktarma stokları değiştirmez.

`Dağıtımı Uygula` mevcut yerel stok işlemini sürdürür. `Fiş Olarak Gönder` ise henüz uygulanmamış girişleri kaynak-hedef mağazaya göre gruplandırıp önizleme ve JSON taslağı oluşturur. Bu iki işlem aynı dağıtımı iki kez uygulamak için kullanılmamalıdır.

## Nebim bağlantısı için beklenen bilgi

Projede canlı Nebim fiş gönderme servisi yoktur. Servis türü/API sözleşmesi, fiş türü, şirket/ofis/depo kodları ve ürün-renk-beden kod eşlemeleri sağlanmadan üretim fişi gönderilemez. Bu yüzden son gönderme düğmesi bağlantı bekliyor durumundadır. Taslak JSON, Nebim'in kabul ettiği payload olduğu iddiasını taşımaz. Nebim başarı fiş numarası dönene kadar gönderildi/tamamlandı durumu verilmez; bu değişiklik gerçek Nebim isteği göndermez.

İleride bağlantı tamamlanırken sunucuda kimlik doğrulama/yetki, kalıcı fiş kaydı, aynı fişin iki kez gönderilmesini engelleyen anahtar ve belirsiz zaman aşımı durumlarında fiş sorgulama uygulanmalıdır. Servis parolaları tarayıcıya veya kaynak koda yazılmamalıdır.

ExcelJS tarayıcı paketi lisansıyla `public/vendor` altında tutulur; Excel için dış CDN gerekmez. Testler XLSX yazma/okuma, birleşik başlıklar, stil renkleri, formül sonuçları ve geçersiz giriş reddini kapsar. Referans görselle piksel düzeyinde karşılaştırma veya gerçek Nebim üzerinde uçtan uca gönderim yapılmamıştır.
