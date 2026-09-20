const fs = require('node:fs');
const path = require('node:path');
process.chdir(path.resolve(__dirname, '..'));
const groups = new Map();
for (const file of fs.readdirSync('views').filter(f => f.endsWith('.html'))) {
  const html = fs.readFileSync(`views/${file}`, 'utf8');
  const block = html.match(/<aside\b[^>]*class="sidebar"[^>]*>[\s\S]*?<\/aside>/)?.[0];
  if (!block) continue;
  let active = '';
  const template = block.replace(/<a href="([^"]+)" class="menu-item( active)?">/g, (_, href, selected) => {
    if (selected) active = href;
    return `<a href="${href}" class="menu-item<%= active === '${href}' ? ' active' : '' %>">`;
  });
  if (!groups.has(template)) groups.set(template, []);
  groups.get(template).push({ file, html, block, active });
}
let count = 0;
for (const [template, pages] of groups) {
  if (pages.length < 2) continue;
  const name = `sidebar-shared-${++count}.html`;
  fs.writeFileSync(`views/partials/${name}`, template);
  for (const { file, html, block, active } of pages) {
    fs.writeFileSync(`views/${file}`, html.replace(block, `<%- include('partials/${name}', { active: '${active}' }) %>`));
  }
  console.log(name, pages.map(p => p.file).join(', '));
}
