// Genera data/combos-menu.json: la columna "Combos" del megamenú.
//
// LA IDEA
// La fuente de verdad es el HOME, no una lista aparte. Sergio elige los combos
// destacados en el editor de Tienda Nube (módulo nativo "Novedades",
// data-store="home-products-new") y este script los sigue. Así, cuando cambia
// los del home —por ejemplo al entrar stock de algo— el menú se actualiza solo
// dentro de la hora, sin tocar código ni publicar nada en TN.
//
// POR QUÉ ALCANZA UN fetch
// Los 8 handles del módulo vienen en el HTML SERVIDO (verificado 2026-08-19).
// No hay que renderizar JS. Mismo enfoque que build-blog-latest.mjs: leer una
// página pública, sin secrets.
//
// EL FILTRO DE CALIDAD
// De los 8 del home, hoy solo 3 tienen interna premium; el resto son páginas
// nativas de ~1.700 caracteres. Mandar tráfico desde un megamenú premium a una
// página desnuda es un precipicio de calidad, así que se filtran. La detección
// NO es una lista hardcodeada (se desactualizaría al construir cada interna
// nueva): se mira la página pública del producto y se busca la marca de nuestras
// internas (atributos data-bl / clases bl-*). Verificado: Full Day da 6 hits,
// Radiance & Mind da 0.
//
// LO QUE ESTE SCRIPT NO HACE
// No mira stock ni preventa. En el HTML servido del home esos dos datos NO son
// confiables: "agotado" aparece en los 8 (hay un label oculto en cada card) y el
// badge de preventa se inyecta client-side. Y no hace falta: el disparador real
// es Sergio cambiando el home cuando entra stock. El script lo sigue a él, no al
// stock.
//
// FALLA RUIDOSO
// Si el parser no encuentra al menos MIN_HOME productos en el home, tira error y
// el job falla. A propósito: preferimos un mail de GitHub avisando que se rompió
// el parser antes que pisar el JSON bueno con una lista corta y que la columna
// del menú se degrade sin que nadie se entere. Igual que el del blog.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const HOME = 'https://www.bloomlife.co/';
const BASE_PROD = 'https://www.bloomlife.co/productos/';

const MIN_HOME = 4;   // menos que esto en el home = parser roto
const MIN_SALIDA = 4; // menos que esto tras filtrar = se rellena del ranking
const MAX_SALIDA = 5; // filas de la columna

const UA = 'Mozilla/5.0 (compatible; bloomlife-static/1.0; +https://github.com/BloomLifeArg/bloomlife-static)';

async function traer(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA, 'Cache-Control': 'no-cache' } });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText} al pedir ${url}`);
  return r.text();
}

// Recorta la <section> del módulo nativo balanceando las etiquetas, porque
// adentro hay <section> anidadas y un indexOf('</section>') corta de más.
function recortarSeccion(html) {
  const i = html.indexOf('data-store="home-products-new"');
  if (i === -1) throw new Error('No se encontró data-store="home-products-new" en el home. ¿Apagaron el módulo o le cambiaron el nombre?');
  const inicio = html.lastIndexOf('<section', i);
  let prof = 0;
  const re = /<\/?section\b/g;
  re.lastIndex = inicio;
  for (let m; (m = re.exec(html)); ) {
    prof += m[0] === '<section' ? 1 : -1;
    if (prof === 0) return html.slice(inicio, m.index + 10);
  }
  return html.slice(inicio, inicio + 250000);
}

function limpiar(s) {
  return s.replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
    .replace(/\s+/g, ' ').trim();
}

// Handles del home, EN ORDEN y sin repetir.
function handlesDelHome(seccion) {
  const bloques = seccion.split(/(?=<div class="[^"]*js-item-product)/).slice(1);
  const vistos = new Set();
  const out = [];
  for (const b of bloques) {
    const h = b.match(/\/productos\/([^"/?#]+)/);
    if (!h || vistos.has(h[1])) continue;
    vistos.add(h[1]);
    const n = b.match(/class="[^"]*item-name[^"]*"[^>]*>([\s\S]*?)<\//);
    out.push({ handle: h[1], nombre_tn: n ? limpiar(n[1]) : null });
  }
  return out;
}

// ¿Tiene interna premium? Se mira la página pública, no una lista.
async function inspeccionar(handle) {
  const html = await traer(`${BASE_PROD}${handle}/`);
  const marcas = (html.match(/data-bl[\w-]*=/g) || []).length
               + (html.match(/class="bl-[a-z]{2,5}\b/g) || []).length;
  const og = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i)
          || html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:image"/i);
  return { premium: marcas > 0, marcas, imagen: og ? og[1] : null };
}

const main = async () => {
  const copy = JSON.parse(await readFile(join(RAIZ, 'data', 'combos-copy.json'), 'utf8'));

  const seccion = recortarSeccion(await traer(HOME));
  const delHome = handlesDelHome(seccion);
  if (delHome.length < MIN_HOME) {
    throw new Error(`El home devolvió ${delHome.length} combos (mínimo ${MIN_HOME}). El parser está roto o cambió el markup del módulo: NO se pisa el JSON bueno.`);
  }

  const info = new Map();
  for (const { handle } of delHome) info.set(handle, await inspeccionar(handle));

  const items = [], descartados = [], sinCopy = [], rellenados = [];

  const agregar = async (handle, origen) => {
    if (items.length >= MAX_SALIDA || items.some(i => i.handle === handle)) return;
    const c = copy.bajadas[handle];
    if (!c) { sinCopy.push(handle); return; }
    // Los de relleno no pasaron por el barrido del home, así que hay que ir a
    // buscarles la imagen igual: una fila sin foto rompe el diseño del panel.
    if (!info.has(handle)) info.set(handle, await inspeccionar(handle));
    const i = info.get(handle);
    if (!i.imagen) {
      sinCopy.push(`${handle} (sin og:image)`);
      return;
    }
    items.push({
      handle, nombre: c.nombre, bajada: c.bajada,
      href: `${BASE_PROD}${handle}/`,
      imagen: i.imagen,
      origen,
    });
    if (origen === 'relleno') rellenados.push(handle);
  };

  for (const { handle, nombre_tn } of delHome) {
    const i = info.get(handle);
    if (!i.premium) { descartados.push({ handle, nombre_tn, motivo: 'sin interna premium' }); continue; }
    await agregar(handle, 'home');
  }

  if (items.length < MIN_SALIDA) {
    for (const handle of copy.ranking) await agregar(handle, 'relleno');
  }

  if (items.length < MIN_SALIDA) {
    throw new Error(`Solo ${items.length} combos utilizables incluso tras rellenar del ranking. Revisar data/combos-copy.json.`);
  }

  const salida = {
    _leeme: 'GENERADO AUTOMÁTICAMENTE por scripts/build-combos-menu.mjs. No editar a mano: se sobrescribe cada hora. Para cambiar QUÉ combos aparecen, cambiá los destacados del home en el editor de Tienda Nube. Para cambiar el TEXTO, editá data/combos-copy.json.',
    _fuente: 'Módulo nativo del home data-store="home-products-new" (los 8 destacados del editor de TN), filtrado por interna premium.',
    _del_home: delHome.map(d => d.handle),
    _descartados: descartados,
    _rellenados_del_ranking: rellenados,
    _sin_copy: sinCopy,
    items,
  };

  if (sinCopy.length) {
    console.warn(`\n⚠ ${sinCopy.length} combo(s) del home tienen interna premium pero NO tienen bajada en data/combos-copy.json, así que quedaron afuera del menú:`);
    for (const h of sinCopy) console.warn(`    ${h}`);
    console.warn('  Escribiles la bajada en combos-copy.json para que entren.\n');
  }

  await writeFile(join(RAIZ, 'data', 'combos-menu.json'), JSON.stringify(salida, null, 1) + '\n');

  console.log(`home: ${delHome.length} · con interna: ${delHome.length - descartados.length} · relleno: ${rellenados.length} · salida: ${items.length}`);
  for (const i of items) console.log(`  ${i.origen === 'relleno' ? '+' : '·'} ${i.nombre.padEnd(18)} ${i.bajada}`);
  if (descartados.length) {
    console.log('descartados por no tener interna premium:');
    for (const d of descartados) console.log(`  − ${d.handle}`);
  }
};

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
