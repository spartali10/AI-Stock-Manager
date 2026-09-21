const router = require('express').Router();
const pages = require('./page-map.json');
function redirect(req, res, route) {
  const query = req.originalUrl.indexOf('?');
  res.redirect(302, route + (query < 0 ? '' : req.originalUrl.slice(query)));
}
router.get('/', (req, res) => redirect(req, res, '/Home'));
router.get('/Migration', (req, res) => res.render('migration.html'));
router.get('/TransferEmri', (req, res) => res.render('transfer-emri.html'));
router.get('/AkilliDagitim', (req, res) => res.render('transferler.html', { distributionPage: true }));
for (const [file, route] of Object.entries(pages)) {
  router.get(route, (req, res) => {
    if (req.path !== route) return redirect(req, res, route);
    res.render(file);
  });
  router.get('/' + file, (req, res) => redirect(req, res, route));
}
module.exports = router;
