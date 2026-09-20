const path = require('node:path');
const express = require('express');
const app = express();

app.disable('x-powered-by');
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public'), { index: false }));
app.use(require('./routes/pages'));
app.use((req, res) => res.status(404).type('text').send('Sayfa bulunamadı.'));
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).type('text').send('Sayfa yüklenirken bir hata oluştu.');
});

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  const server = app.listen(port, () => console.log(`AI Stock Manager: http://localhost:${server.address().port}`));
  server.on('error', error => { console.error('Sunucu başlatılamadı:', error.message); process.exitCode = 1; });
}
module.exports = app;
