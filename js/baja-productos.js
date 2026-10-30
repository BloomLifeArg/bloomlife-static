/* Productos dados de baja que la web NO expone (2026-10, baja de Cordyceps).
 *
 * Los productos siguen PUBLICADOS y con stock en Tienda Nube a propósito: así las
 * suscripciones activas se siguen renovando. Lo que se corta es la venta desde la
 * web. Este script:
 *
 *   1. Saca de la vista toda tarjeta, ítem de menú o link que lleve a uno de esos
 *      productos o a una página dada de baja (/energia/): listados nativos,
 *      secciones propias, recomendados dentro de las internas, menús, buscador.
 *      Un link suelto dentro de un texto no se borra: se le saca el link y queda
 *      el texto. Si al ocultar una tarjeta una fila de una sola línea queda con
 *      columnas vacías, se reacomoda la grilla.
 *   2. En la ficha de uno de esos productos esconde precio, opciones, botones de
 *      compra y la barra fija, y muestra "Agotado". El stock real no se toca.
 *
 * LA LISTA vive en el seal (snippet BL-BAJA, window.BL_BAJA), junto con el CSS
 * crítico que esconde las cards nativas antes del primer paint. Copia de
 * referencia: data/productos-baja.json. Este archivo es sólo la lógica.
 */
(function () {
  'use strict';
  var B = window.BL_BAJA;
  if (!B || !B.handles || !B.handles.length) return;

  var HANDLES = {};
  B.handles.forEach(function (h) { HANDLES[h] = 1; });
  var PAGINAS = {};
  (B.paginas || []).forEach(function (p) { PAGINAS[p.replace(/\/+$/, '')] = 1; });
  var IDS = {};
  (B.ids || []).forEach(function (id) { IDS[String(id)] = 1; });

  var HOST = /(^|\.)bloomlife\.(co|mitiendanube\.com)$/;

  function dadoDeBaja(href) {
    if (!href || href.charAt(0) === '#') return false;
    var u;
    try { u = new URL(href, location.href); } catch (e) { return false; }
    if (!HOST.test(u.hostname)) return false;
    var p = decodeURIComponent(u.pathname).toLowerCase().replace(/\/+$/, '');
    if (PAGINAS[p]) return true;
    var m = p.match(/^\/productos\/([^/]+)$/);
    return !!(m && HANDLES[m[1]]);
  }

  /* El contenedor "tarjeta" de un link: lo que hay que esconder entero. */
  var TARJETA = /(^|[-_])(card|item|slide|tile|bbc|rprod|pmc|thb)$/;
  // El carrito NO se toca: si un producto dado de baja ya está en un carrito, la línea tiene que
  // seguir viéndose para que el cliente la pueda sacar (y no pagar algo que no ve).
  var CARRITO = '.js-ajax-cart-list, .js-cart-item, .js-ajax-cart-panel, #modal-cart, .cart-table, .js-cart-table, [data-store="cart-page"]';
  function enCarrito(a) { return !!a.closest(CARRITO) || /^\/comprar(\/|$)/.test(location.pathname); }

  function conSlide(el) {
    // Dentro de un carrusel se esconde el slide entero; si no, queda una casilla vacía.
    var s = el.parentElement && el.parentElement.closest ? el.parentElement.closest('.swiper-slide') : null;
    return (s && s.contains(el) && s.querySelectorAll('a[href]').length <= el.querySelectorAll('a[href]').length + 1) ? s : el;
  }
  function tarjetaDe(a) {
    var e = a;
    for (var i = 0; i < 6 && e && e !== document.body; i++) {
      if (e.matches && e.matches('.js-item-product, .item-product, li')) return conSlide(e);
      var cls = (e.className && typeof e.className === 'string') ? e.className.split(/\s+/) : [];
      for (var j = 0; j < cls.length; j++) if (TARJETA.test(cls[j])) return conSlide(e);
      if (/^(MAIN|ARTICLE|SECTION|NAV|HEADER|FOOTER|UL|OL|TABLE|BODY)$/.test(e.tagName)) break;
      e = e.parentElement;
    }
    return null;
  }

  function enTexto(a) {
    // Un link dentro de un párrafo o de una respuesta: se deja el texto.
    return !a.querySelector('img, picture, svg') && !!a.closest('p, .bli-qa, .faq-a, .blp-body, .user-content p');
  }

  var tocados = [];
  function esconder(el) {
    if (el.getAttribute('data-bl-baja') === '1') return;
    el.setAttribute('data-bl-baja', '1');
    el.style.setProperty('display', 'none', 'important');
    if (el.parentElement) tocados.push(el.parentElement);
  }

  var grillas = [];
  function regrilla(p) {
    if (!p) return;
    if (grillas.indexOf(p) < 0) grillas.push(p);
    p.style.removeProperty('grid-template-columns');
    var cs = getComputedStyle(p);
    if (cs.display !== 'grid' && cs.display !== 'inline-grid') return;
    var cols = cs.gridTemplateColumns.split(' ').filter(Boolean).length;
    var vis = 0;
    for (var i = 0; i < p.children.length; i++) {
      if (getComputedStyle(p.children[i]).display !== 'none') vis++;
    }
    // Sólo filas de una línea: si había tantas columnas como tarjetas, se ajusta.
    if (vis > 0 && vis < cols && vis + p.querySelectorAll('[data-bl-baja="1"]').length === cols) {
      p.style.gridTemplateColumns = 'repeat(' + vis + ', minmax(0, 1fr))';
    }
  }
  function rehacerGrillas() { for (var i = 0; i < grillas.length; i++) regrilla(grillas[i]); }
  function swipers() {
    var s = document.querySelectorAll('.swiper-container, .swiper');
    for (var i = 0; i < s.length; i++) { try { if (s[i].swiper && s[i].querySelector('[data-bl-baja="1"]')) s[i].swiper.update(); } catch (e) {} }
  }

  function barrer(raiz) {
    var links = (raiz || document).querySelectorAll('a[href]');
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      if (a.getAttribute('data-bl-baja') || !dadoDeBaja(a.getAttribute('href'))) continue;
      if (a.closest('[data-bl-baja="1"]') || enCarrito(a)) continue;
      // En la propia ficha dada de baja no se tocan los links a sí misma (migas, etc.).
      var t = tarjetaDe(a);
      if (t) { esconder(t); continue; }
      if (enTexto(a)) {
        var span = document.createElement('span');
        span.innerHTML = a.innerHTML;
        span.setAttribute('data-bl-baja', 'texto');
        a.parentNode.replaceChild(span, a);
        continue;
      }
      esconder(a);
    }
    // Opciones de selects/buscadores que apunten a productos dados de baja.
    var regr = tocados.splice(0);
    for (var k = 0; k < regr.length; k++) regrilla(regr[k]);
    if (regr.length) swipers();
  }

  /* ---------- Ficha de un producto dado de baja ---------- */
  function idDeFicha() {
    try { if (window.LS && LS.product && LS.product.id) return String(LS.product.id); } catch (e) {}
    var m = decodeURIComponent(location.pathname).toLowerCase().replace(/\/+$/, '').match(/^\/productos\/([^/]+)$/);
    return m && HANDLES[m[1]] ? 'handle' : null;
  }
  var esFichaBaja = false;
  function marcarFicha() {
    var id = idDeFicha();
    esFichaBaja = !!id && (id === 'handle' || !!IDS[id]);
    if (esFichaBaja) document.documentElement.classList.add('bl-baja');
  }
  function aviso() {
    if (!esFichaBaja) return;
    if (document.querySelector('.bl-agotado')) return;
    var v = document.querySelector('.bl-bb [data-view]') || document.querySelector('.bl-bb .bb');
    // Ficha nativa (sin buy box propio): el aviso va arriba del formulario, que el CSS esconde.
    var nativo = !v && document.querySelector('.js-product-container .js-product-form, .js-product-form');
    if (!v && !nativo) return;
    var ref = v ? (v.querySelector('.chips') || v.querySelector('.rating') || v.querySelector('.name')) : null;
    var d = document.createElement('div');
    d.className = 'bl-agotado';
    d.innerHTML = '<span class="bl-ag-pill">Agotado</span>' +
      '<p>Este producto no está disponible por el momento.</p>' +
      '<a href="https://www.bloomlife.co/productos/">Ver todos los productos &rarr;</a>';
    if (nativo) { nativo.parentNode.insertBefore(d, nativo); return; }
    if (ref && ref.parentNode === v) v.insertBefore(d, ref.nextSibling); else v.appendChild(d);
  }

  var CSS =
    // Con !important: el buy box de las internas resetea padding/margin de sus hijos.
    'html body .bl-agotado{display:block!important;margin:18px 0 6px!important;padding:16px 18px 18px!important;border-radius:14px!important;background:#F4F0E8!important;border:1px solid rgba(0,56,69,.14)!important;color:#003845}' +
    'html body .bl-agotado .bl-ag-pill{display:inline-block!important;padding:5px 12px!important;border-radius:999px!important;background:#003845!important;color:#fff!important;font-size:12px!important;font-weight:600;letter-spacing:.08em;text-transform:uppercase;line-height:1.2}' +
    'html body .bl-agotado p{margin:12px 0 8px!important;padding:0!important;font-size:15px!important;line-height:1.45!important;color:#003845!important}' +
    'html body .bl-agotado a{display:inline-block;font-size:14px!important;font-weight:500;color:#003845!important;text-decoration:underline;text-underline-offset:3px}';
  function estilos() {
    if (document.getElementById('bl-baja-js-css')) return;
    var s = document.createElement('style');
    s.id = 'bl-baja-js-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  var pendiente = false;
  function ciclo() {
    pendiente = false;
    try { barrer(); aviso(); } catch (e) {}
  }
  function programar() {
    if (pendiente) return;
    pendiente = true;
    (window.requestAnimationFrame || setTimeout)(ciclo);
  }

  function arrancar() {
    estilos();
    marcarFicha();
    ciclo();
    // El CSS de cada sección puede llegar después: se recalculan las grillas al cargar y al cambiar el ancho.
    window.addEventListener('load', function () { rehacerGrillas(); swipers(); });
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(rehacerGrillas, 150); });
    try {
      new MutationObserver(programar).observe(document.body, { childList: true, subtree: true });
    } catch (e) {
      var n = 0, iv = setInterval(function () { ciclo(); if (++n > 40) clearInterval(iv); }, 500);
    }
  }
  try {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar);
    else arrancar();
  } catch (e) {}
})();
