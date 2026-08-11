/* Genera data/blog-latest.json con los N posts más recientes del blog.
 *
 * Fuente: el JSON-LD BlogPosting que TiendaNube ya embebe en cada card de
 * https://www.bloomlife.co/blog. Se parsea eso y no el HTML de los divs porque
 * es dato estructurado y estable: existe para Google, así que TN no lo cambia
 * de forma caprichosa. Los nombres de clase de los divs sí cambian.
 *
 * Sin credenciales: lee la página pública. Sin dependencias: Node 20+ trae fetch.
 *
 * Corre desde .github/workflows/blog-latest.yml (cron horario) y a mano con
 * workflow_dispatch. Uso local: node scripts/build-blog-latest.mjs
 */

import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const SOURCE = 'https://www.bloomlife.co/blog';
const OUT = 'data/blog-latest.json';
const COUNT = 3;

/** Extrae los bloques JSON-LD de tipo BlogPosting. */
function extractPostings(html) {
  const posts = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    let parsed;
    try {
      parsed = JSON.parse(m[1].trim());
    } catch {
      continue; // un bloque roto no debe tirar abajo el resto
    }
    for (const node of Array.isArray(parsed) ? parsed : [parsed]) {
      if (node && node['@type'] === 'BlogPosting') posts.push(node);
    }
  }
  return posts;
}

/** Normaliza un BlogPosting al shape mínimo que consume el home. */
function toCard(node) {
  const url = typeof node.url === 'string' ? node.url : node.mainEntityOfPage?.['@id'];
  const image = typeof node.image === 'string' ? node.image : node.image?.url;
  if (!url || !node.headline) return null;
  return {
    title: String(node.headline).trim(),
    // description es la meta description: escrita para que la gente haga clic y
    // son frases completas. El extracto del cuerpo viene cortado a mitad de palabra.
    summary: String(node.description || '').trim(),
    url: new URL(url).pathname, // relativo: sirve igual en www y en el dominio de admin
    image: image || null,
    published_at: node.datePublished || null,
  };
}

const res = await fetch(SOURCE, {
  headers: { 'User-Agent': 'bloomlife-static blog-latest builder' },
});
if (!res.ok) throw new Error(`El blog respondió ${res.status}`);

const cards = extractPostings(await res.text())
  .map(toCard)
  .filter(Boolean)
  .filter((c) => c.image) // sin portada no entra: la card quedaría rota
  .sort((a, b) => new Date(b.published_at || 0) - new Date(a.published_at || 0))
  .slice(0, COUNT);

// Fallar ruidosamente. Si el parser se rompe porque TN cambió algo, queremos que
// el workflow falle y avise — no que pise el JSON bueno con una lista vacía y
// que la sección desaparezca del home en silencio.
if (cards.length < COUNT) {
  throw new Error(
    `Se esperaban ${COUNT} posts y se parsearon ${cards.length}. ` +
      `Probablemente cambió el JSON-LD de ${SOURCE}. No se escribe nada.`
  );
}

const payload = {
  generated_at: new Date().toISOString(),
  source: SOURCE,
  posts: cards,
};
const next = JSON.stringify(payload, null, 2) + '\n';

// Comparar ignorando generated_at, así el cron no commitea todas las horas.
const sansStamp = (s) => s.replace(/"generated_at":\s*"[^"]*",?\n?/, '');
let prev = '';
try {
  prev = await readFile(OUT, 'utf8');
} catch {
  /* primera corrida */
}
if (sansStamp(prev) === sansStamp(next)) {
  console.log('Sin cambios en los posts. No se reescribe.');
  process.exit(0);
}

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, next);
console.log(`Escrito ${OUT}:`);
for (const c of cards) console.log(`  · ${c.published_at?.slice(0, 10)}  ${c.title}`);
