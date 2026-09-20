# Ayarlar entegrasyonları

`js/integration-settings.js`, dört entegrasyon kartının ayar pencerelerini yönetir. Gizli olmayan tercihler `aiStockIntegrationSettings` anahtarında bu tarayıcıda saklanır. Kartlar bağlantı kurulmuş gibi gösterilmez. Yerel JSON yedeği ürün, mağaza, transfer ve bildirim kayıtlarını içerir; kullanıcılar ve bağlantı sırları dahil değildir.

## Sunucu bağlantısı

REST API penceresinde HTTPS sunucu kök adresi kaydedilir (yerel geliştirmede localhost HTTP kullanılabilir). Aşağıdaki yollar bu uygulamanın beklediği **özel sunucu sözleşmesidir**, Nebim'in kendi API yolları değildir. Sunucu henüz bu projede uygulanmamıştır.

İsteklerde `Accept: application/json`, gövdeli isteklerde `Content-Type: application/json` gönderilir. Yönetim anahtarı girilmişse `Authorization: Bearer ...` eklenir; anahtar yalnızca sayfa belleğinde tutulur. Çerez gönderilmez. Sunucu yönetici kimliğini/yetkisini doğrulamalı, gerekli CORS izinlerini sağlamalı ve istemci rol kontrollerine güvenmemelidir.

| İşlem | İstek | Başarılı JSON yanıtı |
| --- | --- | --- |
| Bağlantı testi | `POST /integrations/{backup,email,api}/test`, `{config}` | `{ "ok": true, "service": "nebim" }` (istenen servis adı) |
| Anahtarları listele | `GET /integrations/api-keys` | `{ "ok": true, "keys": [{"id":"1","name":"Rapor","prefix":"abc","revoked":false}] }` |
| Anahtar oluştur | `POST /integrations/api-keys`, `{name,scope}` | `{ "ok": true, "key": "sunucunun-urettigi-anahtar" }` |
| Anahtar iptal et | `DELETE /integrations/api-keys/{id}` | `{ "ok": true }` |
| Bulut yedeği başlat | `POST /integrations/backup/run`, `{config}` | `{ "ok": true, "jobId": "yedek-is-numarasi" }` |

Test, kaydedilmiş ayarları kullanır. E-posta testi kullanıcı onayından sonra gerçek gönderim talep eder; sunucu ancak gönderimi doğruladığında başarı dönmelidir. Bulut yedekleme yanıtı tamamlanmayı değil işin başlatılmasını ifade eder. Zamanlama, saklama politikası, gerçek veri senkronizasyonu, SMTP gönderimi ve gizli servis bilgileri sunucuda uygulanmalıdır. Sunucu URL hedeflerini doğrulamalı, anahtar kapsamlarını (`read`; yalnızca yönetici tarafından etkinleştirildiğinde `read_write`) uygulamalı ve iptal işlemini kalıcı kaydetmelidir.

HTTP hatası, JSON dışı yanıt, doğrulanmamış başarı ve 12 saniyelik zaman aşımı kullanıcıya hata olarak gösterilir. Canlı servis bağlantısı sağlanmadan bu işlemler başarı taklidi yapmaz.


## Varsayılan Nebim okuma politikası

Nebim bağlantısı yalnızca okuma ve görüntüleme için kullanılacaktır. Mevcut uygulama Nebim isteklerini ağ çağrısından önce reddeder; eski POST bağlantı testi de engellenmiştir. Canlı okuma adaptörü henüz yoktur. Yerel stok, Excel içe aktarma ve transfer işlemleri Nebim'e gönderilmez. API anahtarı kapsamı varsayılan olarak read olur. Yönetici REST API ekranında read_write seçip ayarları kaydederse yeni anahtarlar yazma kapsamıyla talep edilir. Kaydedilmemiş seçim uygulanmaz. Bu tercih mevcut anahtarları değiştirmez ve canlı Nebim bağlantısını etkinleştirmez.

Gelecekteki entegrasyon sunucusu yalnızca onaylı okuma işlemlerini sunmalı, Nebim stok/ürün/transfer yazma işlemlerini reddetmeli ve yalnızca okuma yetkili Nebim hesabı kullanmalıdır. Tarayıcı kontrolü harici sunucu yetkilerinin yerine geçmez. Önceden oluşturulmuş harici anahtarların yetkileri bu değişiklikle değiştirilmez.
