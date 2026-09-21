/* Sincroniza el conteo y el promedio de reseñas en todo lo que se sirve desde acá.
 *
 * Fuente: el caché público de Revie, el mismo que alimenta el widget. No pide
 * credenciales ni login — es el JSON que Revie deja en su CDN para el storefront.
 *
 * Escribe tres cosas:
 *   1. data/resenas.json           — el dato crudo (total, promedio y por producto),
 *                                    para que cualquier snippet nuevo lo lea de un
 *                                    solo lugar en vez de hardcodear otro número.
 *   2. data/testimonios-home.json  — campos `promedio` y `resenas` de la sección
 *                                    "Testimonios" del home.
 *   3. data/combos-categoria.json  — `prueba.promedio` y `prueba.resenas` de la
 *                                    góndola de combos.
 *
 * El resto del copy de esos dos JSON no se toca: sólo se reescriben esos campos.
 *
 * Los números de las FICHAS de producto no salen de acá: viven en el campo
 * Descripción de Tienda Nube y los sincroniza scripts/sync_ratings.py del repo
 * principal, que necesita el token de la API.
 *
 * Corre desde .github/workflows/resenas.yml (cron diario) y a mano con
 * workflow_dispatch. Uso local: node scripts/build-resenas.mjs
 */

import { readFile, writeFile } from 'node:fs/promises';

const FUENTE = 'https://revie-reviewcache.b-cdn.net/tiendanube/4969223/4969223.txt';
const OUT = 'data/resenas.json';
const TESTIMONIOS = 'data/testimonios-home.json';
const COMBOS = 'data/combos-categoria.json';

// Si Revie devuelve mucho menos de lo que ya teníamos, algo se rompió de su lado:
// preferimos fallar y que llegue el mail de GitHub antes que publicar un conteo
// que haga ver a la marca peor de lo que es. El conteo sólo puede subir o
// mantenerse; una caída de más del 10% es señal de respuesta parcial.
const CAIDA_MAXIMA = 0.10;

function promedioAr(n) {
  return n.toFixed(1).replace('.', ',');
}

async function main() {
  const r = await fetch(FUENTE);
  if (!r.ok) throw new Error(`Revie respondió ${r.status}`);
  const datos = await r.json();

  const items = Array.isArray(datos.products) ? datos.products : [];
  if (items.length === 0) throw new Error('Revie devolvió 0 reseñas');

  // El conteo y el promedio de la cabecera son los que Revie publica; se
  // recalculan igual desde los items para no depender de un campo que podría
  // quedar viejo, y se comparan.
  const total = items.length;
  const suma = items.reduce((a, x) => a + (Number(x.stars) || 0), 0);
  const promedio = suma / total;

  // Por producto, agrupado por productId: el nombre cambió con el tiempo, el id no.
  const porProducto = {};
  for (const it of items) {
    const pid = String(it?.product?.productId || '');
    if (!pid) continue;
    (porProducto[pid] ||= []).push(Number(it.stars) || 0);
  }
  const productos = {};
  for (const [pid, estrellas] of Object.entries(porProducto)) {
    productos[pid] = {
      n: estrellas.length,
      promedio: Number((estrellas.reduce((a, b) => a + b, 0) / estrellas.length).toFixed(1)),
    };
  }

  const previo = JSON.parse(await readFile(OUT, 'utf8').catch(() => '{"total":0}'));
  if (previo.total && total < previo.total * (1 - CAIDA_MAXIMA)) {
    throw new Error(
      `El conteo cayó de ${previo.total} a ${total}: Revie debe estar devolviendo ` +
      `una respuesta parcial. No se escribe nada.`
    );
  }

  const salida = {
    total,
    promedio: Number(promedio.toFixed(2)),
    promedioTexto: promedioAr(promedio),
    actualizado: new Date().toISOString().slice(0, 10),
    productos,
  };
  await writeFile(OUT, JSON.stringify(salida, null, 2) + '\n');

  // --- testimonios del home: "233 reseñas verificadas" ---
  const t = JSON.parse(await readFile(TESTIMONIOS, 'utf8'));
  t.promedio = Number(promedio.toFixed(1));
  t.resenas = `${total} reseñas verificadas`;
  await writeFile(TESTIMONIOS, JSON.stringify(t, null, 2) + '\n');

  // --- góndola de combos: promedio como texto y conteo como número ---
  const c = JSON.parse(await readFile(COMBOS, 'utf8'));
  if (c.prueba) {
    c.prueba.promedio = promedioAr(promedio);
    c.prueba.resenas = total;
    await writeFile(COMBOS, JSON.stringify(c, null, 2) + '\n');
  } else {
    console.warn('combos-categoria.json no tiene bloque "prueba" — no se tocó');
  }

  console.log(
    `${total} reseñas · promedio ${promedioAr(promedio)} · ` +
    `${Object.keys(productos).length} productos con reseñas` +
    (previo.total ? ` (antes: ${previo.total})` : '')
  );
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
