/* Genera data/blog-fechas.json: { "/blog/posts/<slug>": "AAAA-MM-DD" } con la fecha
 * ORIGINAL de cada nota del blog.
 *
 * Por qué existe: el JSON-LD BlogPosting del listado trae `datePublished`, pero la
 * integración que republica notas lo pisa (10 notas dicen 2026-09-06 cuando son de
 * marzo a julio). La fecha real sólo está en la página de cada nota, en el
 * "Publicado el dd/mm/aaaa" nativo. Este script la junta una vez por corrida y
 * js/blog.js la prefiere sobre el JSON-LD; si una nota no figura acá (nota nueva,
 * publicada una sola vez), el JSON-LD es correcto y sirve de fallback.
 *
 * Sin credenciales ni dependencias. Corre junto a build-blog-latest.mjs desde
 * .github/workflows/blog-latest.yml. Uso local: node scripts/build-blog-fechas.mjs
 */
import { writeFile, readFile } from 'node:fs/promises';

const BASE = 'https://www.bloomlife.co';
const OUT = 'data/blog-fechas.json';
const UA = { 'User-Agent': 'bloomlife-static blog-fechas builder' };

async function html(url) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${url} respondió ${r.status}`);
  return r.text();
}

/** URLs de nota (path) desde el JSON-LD del listado, recorriendo las páginas. */
async function listarPosts() {
  const paths = new Set();
  for (let page = 1; page <= 10; page++) {
    const h = await html(`${BASE}/blog/${page > 1 ? `?page=${page}` : ''}`);
    const antes = paths.size;
    const re = /<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi;
    let m;
    while ((m = re.exec(h)) !== null) {
      try {
        const node = JSON.parse(m[1].trim());
        for (const n of Array.isArray(node) ? node : [node]) {
          if (n && n['@type'] === 'BlogPosting' && n.url) paths.add(new URL(n.url).pathname.replace(/\/$/, ''));
        }
      } catch { /* bloque roto: seguir */ }
    }
    if (paths.size === antes) break; // página sin notas nuevas: fin
  }
  return [...paths];
}

const previo = await readFile(OUT, 'utf8').then(JSON.parse).catch(() => ({}));
const fechas = { ...previo };
const paths = await listarPosts();
if (paths.length === 0) throw new Error('El listado no devolvió notas: no se pisa el JSON.');

for (const p of paths) {
  const h = await html(BASE + p);
  const m = /Publicado el\s+(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(h);
  if (!m) { console.warn(`sin fecha nativa: ${p}`); continue; }
  fechas[p] = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

const ordenado = Object.fromEntries(Object.entries(fechas).sort(([a], [b]) => a.localeCompare(b)));
await writeFile(OUT, JSON.stringify(ordenado, null, 1) + '\n');
console.log(`${Object.keys(ordenado).length} notas → ${OUT}`);
