/*
 * Bloom Life — Aviso de preventa en el cart drawer
 * ------------------------------------------------
 * Avisa que Ashwagandha Gummies está en preventa: se entrega cuando ingrese el stock,
 * la primera semana de diciembre de 2026 (segunda preventa, prendida el 2026-11-13).
 *
 * Detección: por product ID, que el drawer de Morelia ya expone en cada línea como
 * `data-store="cart-item-<PRODUCT_ID>"`. Es exacta y sobrevive a renombres del producto.
 * El match por texto ("Ashwagandha" + "Gummies") no sirve acá: matchea 13 productos
 * publicados, entre ellos el Full Day Mix Combo, donde la Ashwagandha es cápsula y el
 * "gummies" lo aporta el Cordyceps.
 *
 * En los combos el único componente demorado es la Ashwagandha Gummies; el resto de
 * los suplementos ya está disponible para su entrega. El copy lo dice explícitamente.
 *
 * Se autodesactiva el 15/12/2026 (hora local del visitante): una semana de margen sobre
 * la fecha anunciada. Apagar la preventa de verdad es manual (fichas + este loader).
 */
(function () {
  'use strict';

  /* ── Autoexpiración ──────────────────────────────────────────────────── */
  // Mes 11 = diciembre (los meses de Date van de 0 a 11).
  var CUTOFF = new Date(2026, 11, 15, 0, 0, 0);
  if (new Date() >= CUTOFF) return;

  var FECHA = 'la primera semana de diciembre';

  /* ── Qué ítems arrastran la preventa ─────────────────────────────────── */

  // FULL: el ítem entero es Ashwagandha Gummies. No hay "resto del combo" disponible.
  var FULL = {
    281944575: 1, // Ashwagandha | Anti-Estrés & Calma | Gummies
    286699791: 1  // Hormonal Balance Combo | Ashwagandha Gummies x 3 meses
  };

  // PARCIAL: combos que incluyen Ashwagandha Gummies junto a otros componentes que
  // sí están disponibles. Cruzados contra COMBO_COMPONENTES del proxy (SKU
  // ASHWAGANDHAGUMMIES), no contra el nombre del producto.
  var PARCIAL = {
    294585978: 1, // Deep Sleep Combo | Ashwagandha + Reishi
    305609431: 1, // Bye Bye Anxiety Combo | Ashwagandha + Melena de León | Gummies
    332298698: 1, // Clear Mind Combo | Melena de León + Reishi + Ashwagandha
    339648634: 1, // Glow your Mind Combo | Tremella + Melena de León + Ashwagandha
    349316562: 1, // Glow & Regulate Combo | Tremella y Ashwagandha
    357970722: 1, // Menopause Balance Combo | Ashwagandha + Melena de León + Reishi
    370942354: 1, // Ultimate Glow Balance Combo | Melena de León + Ashwagandha + Reishi + Tremella
    380224437: 1  // Calm & Glow Combo | Tremella + Ashwagandha + Reishi | Gummies
    // Fuera: los que llevan Cordyceps (dados de baja, la web no los vende) y los de
    // Ashwagandha en cápsulas. Cruzado por SKU (ASHG…), no por nombre.
  };

  // Red de seguridad por si TN cambiara el `data-store`: el handle del producto
  // individual, que viaja en el href de la línea.
  var HANDLE = 'ashwagandha-equilibrio-hormonal-gummies';

  var NOTICE_ID = 'bl-preventa-notice';
  var LIST = '.js-ajax-cart-list';

  /* ── Cucarda "Preventa" en las cards del listado ──────────────────────
   * Reemplaza a la que hoy pinta la app Preventa/Personalizados de LerenTools
   * (`.lerentools-preorder-label`), para poder darla de baja.
   *
   * Vive acá, y no en un archivo aparte, porque la lista de IDs de arriba ya es
   * la fuente de verdad: duplicarla sería abrir la puerta a que la card y el
   * aviso del carrito se contradigan. Leyendo de FULL/PARCIAL no puede pasar.
   *
   * (Verificado 2026-09-05: la config de LerenTools cubre los mismos 12
   * publicados, repartidos en las dos páginas del catálogo. No hay diferencia
   * que corregir — sólo dejamos de depender de una config que vive en la app.)
   *
   * Convive con la app: si la cucarda de LerenTools ya está en esa card, no
   * pintamos, así no salen dos. Cuando se desinstale, esta toma el relevo sola.
   */
  var CUCARDA_CLASE = 'bl-preventa-label';
  var CARD = /^product-item-(\d+)$/;
  // Calcado del render de LerenTools para que el cambio no se note:
  // 10px, fondo arena y texto gris, sin radio, pegado al borde del grupo.
  var CUCARDA_CSS = 'background:#F2F1ED;color:#6A6060;padding:5px 8px;' +
                    'letter-spacing:1px;display:block;margin:0;border-radius:0;' +
                    'line-height:1.2;font-weight:400';

  /* ── Copy ────────────────────────────────────────────────────────────── */

  function mensaje(full, parcial, otros) {
    if (!full && !parcial) return '';
    var CUANDO = 'se entrega cuando ingrese el stock, ' + FECHA;

    // Solo Ashwagandha Gummies (o su pack x3 meses), nada más en el carrito.
    if (full && !parcial && !otros) {
      return 'Ashwagandha Gummies está en preventa: ' + CUANDO + '.';
    }

    // Ashwagandha Gummies suelta + otros productos disponibles.
    if (full && !parcial) {
      return 'Ashwagandha Gummies está en preventa: ' + CUANDO +
             '. El resto de tus productos ya está disponible para su entrega.';
    }

    // Solo combos que la incluyen: hay que aclarar que el demorado es ese frasco.
    if (!full && parcial) {
      return parcial === 1
        ? 'Tu combo incluye Ashwagandha Gummies, que está en preventa: ese frasco ' + CUANDO +
          '. El resto de los suplementos del combo ya están disponibles para su entrega.'
        : 'Tus combos incluyen Ashwagandha Gummies, que está en preventa: esos frascos se ' +
          'entregan cuando ingrese el stock, ' + FECHA + '. El resto de los suplementos de ' +
          'los combos ya están disponibles para su entrega.';
    }

    // Suelta + dentro de un combo.
    return 'Ashwagandha Gummies está en preventa: ' + CUANDO + ', también la que viene ' +
           'dentro de tu combo. El resto de los suplementos ya están disponibles para su entrega.';
  }


  /* ── Lectura del carrito ─────────────────────────────────────────────── */

  function productId(item) {
    var ds = item.getAttribute('data-store') || '';
    var m = ds.match(/cart-item-(\d+)/);
    if (m) return m[1];
    // Sin data-store: lo deducimos del link a la ficha.
    var a = item.querySelector('a[href*="/productos/"]');
    if (a && a.getAttribute('href').indexOf(HANDLE) !== -1) return '281944575';
    return '';
  }

  function leerCarrito() {
    var lista = document.querySelector(LIST);
    if (!lista) return null;

    var items = lista.querySelectorAll('.js-cart-item');
    var full = 0, parcial = 0, otros = 0;

    for (var i = 0; i < items.length; i++) {
      var id = productId(items[i]);
      // Unidades, no líneas: 2 del mismo combo son "esos frascos" (QA 2026-11-13).
      var q = items[i].querySelector('input[type="number"], .js-cart-quantity-input, [data-component="line-item.quantity"] input');
      var n = q ? parseInt(q.value, 10) : 1;
      if (!(n > 0)) n = 1;
      if (FULL[id]) full += n;
      else if (PARCIAL[id]) parcial += n;
      else otros += n;
    }
    return { lista: lista, full: full, parcial: parcial, otros: otros };
  }

  /* ── Render ──────────────────────────────────────────────────────────── */

  var CSS =
    'display:block;' +
    'background:#FFF3CD;' +
    'border-left:3px solid #CCA352;' +
    'border-radius:6px;' +
    'color:#003845;' +
    'padding:10px 14px;' +
    'margin:12px 0;' +
    'line-height:1.45;' +
    'text-align:left;';

  function pintar() {
    var estado = leerCarrito();
    if (!estado) return;

    var texto = mensaje(estado.full, estado.parcial, estado.otros);
    var el = document.getElementById(NOTICE_ID);

    if (!texto) {
      if (el && el.parentNode) el.parentNode.removeChild(el);
      return;
    }

    if (!el) {
      el = document.createElement('div');
      el.id = NOTICE_ID;
      el.className = 'bl-preventa-notice';
      el.setAttribute('role', 'status');
      // Inline para no depender de hojas externas ni pelear con el CSS del tema.
      el.style.cssText = CSS;
      // 13px con important: el css_code del tema tiene reglas de tamaño globales.
      el.style.setProperty('font-size', '13px', 'important');
    }

    if (el.textContent !== texto) el.textContent = texto;

    // Debajo del último ítem y por encima de la barra de envío y del calculador.
    var destino = estado.lista.nextSibling;
    if (el.previousSibling !== estado.lista) {
      estado.lista.parentNode.insertBefore(el, destino);
    }
  }

  /* ── Cucarda en las cards ────────────────────────────────────────────── */

  function enPreventa(id) {
    return FULL[id] === 1 || PARCIAL[id] === 1;
  }

  function pintarCucardas() {
    var cards = document.querySelectorAll('[data-store^="product-item-"]');
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      var m = CARD.exec(card.getAttribute('data-store') || '');
      if (!m || !enPreventa(m[1])) continue;

      // Desde 2026-11-13 la etiqueta es la misma pastilla dorada que en el resto de la web,
      // sobre la foto (QA: el rótulo gris de LerenTools convivía con otro estilo en el mismo home).
      // Dentro de la placa de la foto (el <a> que envuelve la imagen): el contenedor de imagen de
      // las cards del home también lleva el kicker y la pregunta, y la pastilla los pisaba.
      var img = card.querySelector('[data-store^="product-item-image-"] img');
      var placa = img && (img.closest('a') || img.parentElement);
      if (placa) { pill(placa); continue; }
      var grupo = card.querySelector('[data-store="product-item-labels"]');
      if (!grupo) continue;

      // La app pinta async, y a veces DESPUÉS que nosotros. Un guard que sólo
      // mirara al entrar dejaría las dos cucardas en la misma card (pasó en vivo
      // el 2026-09-05, en la página 2 del catálogo). Así que la convivencia se
      // resuelve en los dos sentidos: si aparece la de LerenTools, sacamos la
      // nuestra. El observador vuelve a llamar acá cuando ella se pinta.
      var suya = grupo.querySelector('.lerentools-preorder-label');
      var nuestra = grupo.querySelector('.' + CUCARDA_CLASE);
      if (suya) {
        if (nuestra) nuestra.parentNode.removeChild(nuestra);
        continue;
      }
      if (nuestra) continue;

      var el = document.createElement('div');
      el.className = 'label ' + CUCARDA_CLASE;
      el.textContent = 'Preventa';
      el.style.cssText = CUCARDA_CSS;
      // El css_code del tema tiene reglas de tamaño globales que la aplastarían.
      el.style.setProperty('font-size', '10px', 'important');
      grupo.appendChild(el);
    }
  }

  /* ── Etiqueta en las tarjetas PROPIAS (2026-11-13) ─────────────────────
   * Desde septiembre los listados (/productos/, categorías, /search/) los dibuja
   * js/buscador.js (.bsq-c, con data-id), la góndola de combos js/combos-categoria.js
   * (.bl-cc a.c) y la sección de combos del home js/combos-home.js (.bl-cmb-card).
   * Ninguna usa la card nativa, así que la cucarda de arriba no tiene dónde pegarse.
   * Se marcan desde acá para no duplicar la lista de productos en preventa: la
   * góndola y el home no exponen el ID, así que van por el handle de la URL. */
  var HANDLES = {
    'ashwagandha-equilibrio-hormonal-gummies': 281944575,
    'combo-hormonal-balance-suplementacion-con-ashwagandha-gummies-por-3-meses': 286699791,
    'deepsleep': 294585978,
    'combo-bye-bye-anxiety-ashwagandha-melena-de-leon-gummies-56w9q': 305609431,
    'focusandchill': 332298698,
    'glowyourmindgummies': 339648634,
    'glow-calma-combo-tremella-y-ashwagandha-gummies-3tmb0': 349316562,
    'menopausebalancegummies': 357970722,
    'combo-ultimate-glow-balance-gummies': 370942354,
    'combo-calm-glow-tremella-ashwagandha-reishi-gummies': 380224437
  };
  var TAG = 'bl-preventa-tag';
  var PILL_CSS = 'position:absolute;top:10px;right:10px;z-index:4;display:inline-block;' +
                 'font-weight:700;letter-spacing:.1em;text-transform:uppercase;line-height:1;' +
                 'color:#7E5F2A;background:rgba(255,255,255,.94);border:1px solid #CCA352;' +
                 'border-radius:999px;padding:6px 10px;pointer-events:none';

  function handleDe(href) {
    var m = /\/productos\/([^\/?#]+)/.exec(href || '');
    return m ? m[1] : '';
  }
  function enPreventaHref(href) {
    var id = HANDLES[handleDe(href)];
    return id ? enPreventa(String(id)) : false;
  }
  function pill(contenedor, chica) {
    if (contenedor.querySelector('.' + TAG)) return;
    if (getComputedStyle(contenedor).position === 'static') contenedor.style.position = 'relative';
    var el = document.createElement('span');
    el.className = TAG;
    el.textContent = 'Preventa';
    el.style.cssText = PILL_CSS;
    if (chica) { el.style.top = '6px'; el.style.right = '6px'; el.style.padding = '4px 7px'; el.style.letterSpacing = '.08em'; }
    el.style.setProperty('font-size', chica ? '9px' : '10px', 'important');
    contenedor.appendChild(el);
  }

  function pintarTarjetasPropias() {
    var i, c;
    // Listados y buscador: pastilla sobre la miniatura. Como etiqueta de la fila bajaba a una
    // segunda línea en 9 de 10 tarjetas (+27 px, filas desalineadas) y se leía como "Combo".
    var bsq = document.querySelectorAll('.bsq-c[data-id]');
    for (i = 0; i < bsq.length; i++) {
      c = bsq[i];
      if (!enPreventa(c.getAttribute('data-id'))) continue;
      var th = c.querySelector('.bsq-thumb');
      if (th) pill(th, true);
    }
    // Góndola de combos: sobre la foto, arriba a la derecha (la izquierda es de "Más vendido").
    var gon = document.querySelectorAll('.bl-cc a.c');
    for (i = 0; i < gon.length; i++) {
      c = gon[i];
      if (!enPreventaHref(c.getAttribute('href'))) continue;
      var esc = c.querySelector('.escena');
      if (esc) pill(esc);
    }
    // El combo destacado de la góndola va en un bloque propio (.dest), no como tarjeta.
    var dest = document.querySelectorAll('.bl-cc .dest');
    for (i = 0; i < dest.length; i++) {
      var cta = dest[i].querySelector('.dest-cta');
      if (!cta || !enPreventaHref(cta.getAttribute('href'))) continue;
      var cab = dest[i].querySelector('.dest-cab');
      if (!cab || cab.querySelector('.' + TAG)) continue;
      var pd = document.createElement('span');
      pd.className = TAG;
      pd.textContent = 'Preventa';
      pd.style.cssText = PILL_CSS.replace('position:absolute;top:10px;right:10px;', 'position:static;margin:0 auto 12px;');
      pd.style.setProperty('font-size', '10px', 'important');
      cab.insertBefore(pd, cab.firstChild);
    }
    // Sección de combos del home.
    var cmb = document.querySelectorAll('.bl-cmb-card');
    for (i = 0; i < cmb.length; i++) {
      c = cmb[i];
      var a = c.querySelector('a.bl-cmb-link');
      if (!a || !enPreventaHref(a.getAttribute('href'))) continue;
      var tile = c.querySelector('.bl-cmb-tile');
      if (tile) pill(tile);
    }
  }

  /* ── Arranque + observador ───────────────────────────────────────────── */

  var pendiente = null;
  function programar() {
    if (pendiente) return;
    pendiente = setTimeout(function () {
      pendiente = null;
      pintar();
    }, 60);
  }

  function observar() {
    var lista = document.querySelector(LIST);
    if (!lista) return false;

    // Observamos solo la lista de ítems. El aviso vive fuera de ella (es su hermano),
    // así que pintarlo no vuelve a disparar el observador.
    new MutationObserver(programar).observe(lista, { childList: true, subtree: true });

    // El drawer se rellena al abrirse; el cambio de `display` no muta la lista.
    var drawer = document.getElementById('modal-cart');
    if (drawer) {
      new MutationObserver(programar).observe(drawer, {
        attributes: true,
        attributeFilter: ['style', 'class']
      });
    }

    pintar();
    return true;
  }

  // Las cards van por su cuenta: existen en home y listados, donde el drawer del
  // carrito puede no estar armado todavía. No comparten el observador con el aviso.
  var pendienteCuc = null;
  function programarCucardas() {
    if (pendienteCuc) return;
    pendienteCuc = setTimeout(function () {
      pendienteCuc = null;
      pintarCucardas();
      pintarTarjetasPropias();
    }, 120);
  }

  function iniciarCucardas() {
    pintarCucardas();
    pintarTarjetasPropias();
    // Los listados se rellenan async (filtros, "ver más", carruseles del home).
    // `pintarCucardas` es idempotente —no repinta lo ya puesto—, así que la
    // mutación que provoca no realimenta el observador más de una vuelta.
    new MutationObserver(programarCucardas)
      .observe(document.body, { childList: true, subtree: true });
  }

  function iniciar() {
    iniciarCucardas();

    if (observar()) return;
    // La lista todavía no existe: esperamos a que el tema arme el drawer.
    var intentos = 0;
    var reloj = setInterval(function () {
      if (observar() || ++intentos > 40) clearInterval(reloj);
    }, 250);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
