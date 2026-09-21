# Kullanıcı ve yetki düzeni

## Yönetici ve Admin ayrımı

Kullanıcı ekleme/düzenleme formunda `Admin` (`admin`) ve `Yönetici` (`supervisor`) ayrı rollerdir. `Müdür` (`manager`) korunur. Yeni Yönetici yalnızca stok görüntüleme ve mağazalar izinleriyle başlar; Admin bölüm izinlerini ayrıca atayabilir. Yöneticiye `admin` izni atanamaz. Ayarlar, kullanıcı yönetimi ve entegrasyon yalnızca Admin rolüne açıktır; menü görünürlüğü ve doğrudan sayfa erişimi aynı rol kontrolünü kullanır.

Eski kayıtlarda rolü metin olarak `Yönetici` olan hesaplar sınırlı Yönetici rolüne dönüştürülür. Önceki formun `admin` olarak kaydettiği hesaplarda gerçek Admin ile yanlış atanmış Yönetici ayırt edilemediğinden otomatik yetki düşürülmez. Ana Admin hesabından ilgili kullanıcıyı düzenleyip rolünü `Yönetici` seçin. Ana Admin hesabı korunur.

Giriş ve kullanıcı yönetiminin ortak kaynağı `aiStockUsers` kaydıdır. `Admin` kullanıcı adı tam yetkili ana hesaptır. Mevcut hesap ve şifresi korunur; ilk başarılı girişte eski açık metin şifre PBKDF2-SHA256 (150.000 yineleme, rastgele tuz) ile değiştirilir. Kayıt yoksa giriş ekranında Admin hesabı için en az 8 karakterli şifre belirlenir; sabit varsayılan şifre oluşturulmaz.

Yalnızca Admin rolü kullanıcı oluşturabilir, silebilir, rol ve bölüm yetkisi atayabilir. Ana Admin silinemez, pasifleştirilemez ve rolü düşürülemez. Yönetici kendi aktif hesabının yetkisini düşüremez. Kullanıcılar, ayarlar ve entegrasyon sayfaları Admin'e özeldir. Diğer bölümler kullanıcıya atanmış izinlerle açılır; yeni standart kullanıcı yalnızca stok görüntüleme yetkisiyle başlar. Stok değiştirme ayrı izindir. Hiçbir bölüm yetkisi olmayan kullanıcı `erisim-yok.html` ekranına gider.

`js/auth.js` sayfa adresi, menü görünürlüğü ve güncel oturumu kontrol eder. `NebimAdapter` değişiklik metotlarında da izin kontrolü uygulanır. Kullanıcı silinmesi/pasifleştirilmesi veya yetki değişikliği açık sekmelere storage olayıyla yansır.

## Üretim sınırı

Bu proje statik HTML ve localStorage kullanır. Kullanıcı kendi tarayıcı verisini veya JavaScript kodunu değiştirebilir; istemci kontrolleri gerçek bir güvenlik sınırı değildir. Hassas veriler henüz sunucuda izole edilmez. Üretime geçerken kimlik doğrulama, parola saklama, oturum iptali ve her veri isteğinin yetki kontrolü sunucuda yapılmalı; istemciye yalnızca izin verilen veriler gönderilmelidir. Yeni entegrasyon bu kontrolü atlamamalıdır.
