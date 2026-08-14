/*
 * Bloom Life — Aviso de preventa en el cart drawer
 * ------------------------------------------------
 * Avisa que Ashwagandha Gummies se despacha a partir del 7 de septiembre de 2026.
 *
 * Detección: por product ID, que el drawer de Morelia ya expone en cada línea como
 * `data-store="cart-item-<PRODUCT_ID>"`. Es exacta y sobrevive a renombres del producto.
 * El match por texto ("Ashwagandha" + "Gummies") no sirve acá: matchea 13 productos
 * publicados, entre ellos el Full Day Mix Combo, donde la Ashwagandha es cápsula y el
 * "gummies" lo aporta el Cordyceps.
 *
 * Los combos NO se despachan enteros el 7/9: el único componente demorado es la
 * Ashwagandha Gummies. El copy lo dice explícitamente.
 *
 * Se autodesactiva el 7/9/2026 (hora local del visitante).
 */
(function () {
  'use strict';

  /* ── Autoexpiración ──────────────────────────────────────────────────── */
  // Mes 8 = septiembre (los meses de Date van de 0 a 11).
  var CUTOFF = new Date(2026, 8, 7, 0, 0, 0);
  if (new Date() >= CUTOFF) return;

  var FECHA = '7 de septiembre';

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
    294595560: 1, // Ultimate Balance Combo | Ashwagandha + Reishi + Cordyceps + Melena de León
    305609431: 1, // Bye Bye Anxiety Combo | Ashwagandha + Melena de León
    325250064: 1, // Full Day Gummies 2 Combo | Melena de León + Cordyceps + Ashwagandha
    330540927: 1, // Glory Gummies Combo | Tremella + Reishi + Ashwagandha + Melena de León + Cordyceps
    332298698: 1, // Clear Mind Combo | Melena de León + Reishi + Ashwagandha
    336900602: 1, // Balance Combo | Melena de León + Reishi + Ashwagandha (oculto)
    339648634: 1, // Glow your Mind Combo | Tremella + Melena de León + Ashwagandha
    341313375: 1, // Fresh Flow Combo | Melena de León + Cordyceps + Tremella + Ashwagandha
    349316562: 1, // Glow & Regulate Combo | Tremella y Ashwagandha
    357970722: 1  // Menopause Balance Combo | Ashwagandha + Melena de León + Reishi
  };

  // Red de seguridad por si TN cambiara el `data-store`: el handle del producto
  // individual, que viaja en el href de la línea.
  var HANDLE = 'ashwagandha-equilibrio-hormonal-gummies';

  var NOTICE_ID = 'bl-preventa-notice';
  var LIST = '.js-ajax-cart-list';

  /* ── Copy ────────────────────────────────────────────────────────────── */

  function mensaje(full, parcial, otros) {
    if (!full && !parcial) return '';

    // Solo Ashwagandha Gummies (o su combo x3 meses), nada más en el carrito.
    if (full && !parcial && !otros) {
      return 'Ashwagandha Gummies está en preventa. Se despacha a partir del ' + FECHA + '.';
    }

    // Ashwagandha Gummies suelta + otros productos disponibles.
    if (full && !parcial) {
      return 'Ashwagandha Gummies está en preventa y se despacha a partir del ' + FECHA +
             '. El resto de tus productos está disponible para entrega inmediata.';
    }

    // Solo combos que la incluyen: hay que aclarar que el demorado es ese frasco.
    if (!full && parcial) {
      return parcial === 1
        ? 'Tu combo incluye Ashwagandha Gummies, que está en preventa: ese frasco se ' +
          'despacha a partir del ' + FECHA + '. Los demás productos de tu pedido están ' +
          'disponibles para entrega inmediata.'
        : 'Tus combos incluyen Ashwagandha Gummies, que está en preventa: esos frascos se ' +
          'despachan a partir del ' + FECHA + '. Los demás productos de tu pedido están ' +
          'disponibles para entrega inmediata.';
    }

    // Suelta + dentro de un combo.
    return 'Ashwagandha Gummies está en preventa y se despacha a partir del ' + FECHA +
           ', también la que viene dentro de tu combo. El resto de tus productos está ' +
           'disponible para entrega inmediata.';
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
      if (FULL[id]) full++;
      else if (PARCIAL[id]) parcial++;
      else otros++;
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

  function iniciar() {
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
