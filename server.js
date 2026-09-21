const path = require('node:path');
const express = require('express');
const { createRepository } = require('./backend/repository');
const { makeApi } = require('./backend/api');
if (require.main === module) require('./backend/environment')();
function createApp({ repository, env = process.env } = {}) {
const app = express();
const repo = repository || createRepository(env);
app.locals.repository = repo;
if (env.RENDER) app.set('trust proxy', 1);

app.disable('x-powered-by');
app.engine('html', (file, options, callback) => require('ejs').renderFile(file, options, (error, html) => {
  if (error) return callback(error);
  callback(null, html.replace('<script src="/js/auth.js">', '<script src="/api/session.js"></script>\n    <script src="/js/auth.js">'));
}));
app.set('view engine', 'html');
app.set('views', path.join(__dirname, 'views'));
const api = makeApi(repo, env);
app.locals.authReady = api.ready;
app.use('/api', api);
app.get('/health', async (req, res) => {
  try { await repo.read(); res.json({ ok: true }); } catch { res.status(503).json({ ok: false }); }
});
app.use(express.static(path.join(__dirname, 'public'), { index: false }));
app.use(require('./routes/pages'));
app.use((req, res) => res.status(404).type('text').send('Sayfa bulunamadı.'));
app.use((error, req, res, next) => {
  console.error('Sunucu hatası:', error.code || error.name);
  res.status(500).type('text').send('Sayfa yüklenirken bir hata oluştu.');
});
return app;
}
const app = createApp();

if (require.main === module) {
  app.locals.authReady.then(result => {
    if (result.status === 'created') console.log('İlk merkezi yönetici oluşturuldu. Kullanıcı adı: admin.');
    else if (result.status === 'configuration-required') console.warn('İlk kurulum için ADMIN_PASSWORD tanımlayın (8–1024 karakter) ve sunucuyu yeniden başlatın.');
    else if (result.status === 'recovery-required') console.warn('İlk kurulum tamamlanmış ancak hesaplar eksik. Kullanıcı yedeğini kontrol edin.');
  }).catch(() => console.error('Merkezi kullanıcılar başlatılamadı. Veritabanı bağlantısını kontrol edin.'));
  const port = Number(process.env.PORT || 3000);
  const server = app.listen(port, () => console.log(`AI Stock Manager: http://localhost:${server.address().port}`));
  server.on('error', error => { console.error('Sunucu başlatılamadı:', error.message); process.exitCode = 1; });
  const stop = () => server.close(async () => { await app.locals.repository.close(); process.exit(0); });
  process.on('SIGTERM', stop); process.on('SIGINT', stop);
}
module.exports = app;
module.exports.createApp = createApp;
