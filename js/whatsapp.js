/* Botón flotante de WhatsApp con estética "asesoría" — corre en TODAS las páginas.
 *
 * Loader en el seal (custom_seal_code):
 *   <script>(function(){var s=document.createElement("script");
 *   s.src="https://cdn.jsdelivr.net/gh/BloomLifeArg/bloomlife-static@HASH/js/whatsapp.js";
 *   document.head.appendChild(s);})();</script>
 *
 * Opcional, para que el disco verde del tema no se vea el medio segundo que tarda
 * este archivo en llegar (el nativo ya está pintado cuando corre el seal):
 *   <style id="blw-g">.btn-whatsapp{visibility:hidden;animation:blw-g 0s 4s forwards}
 *   @keyframes blw-g{to{visibility:visible}}</style>
 * Si el JS no llega, a los 4 s el nativo vuelve solo (mismo patrón que html.bl-ok).
 *
 * Qué hace:
 *   - oculta el botón nativo de Morelia (<a class="js-btn-fixed-bottom btn-whatsapp">,
 *     server-side, sin mensaje) con una regla por selector estable. Si el tema lo
 *     pintara tarde, la regla ya está en el <head>: no hace falta observarlo.
 *   - engancha css/whatsapp.css (del MISMO commit: el hash sale de la URL de este
 *     archivo) y pinta una pastilla propia: un solo <a> a wa.me con mensaje
 *     prefijado (en internas de producto suma el nombre del h1).
 *   - entra con fade + translateY a los 1,2 s, nunca antes de que la hoja haya
 *     llegado (CSS; prefers-reduced-motion la anula). Si la hoja falla, vuelve el nativo.
 *   - mientras el banner de cookies del tema está visible, sube la pastilla la
 *     altura del banner (variable --blw-b). Observa sólo el atributo style del banner
 *     (nunca lo muta: sin riesgo de bucle).
 *
 * Kill-switch: localStorage.setItem('blw-off','1') → queda el nativo.
 */
(function () {
  var d = document;
  var guard = d.getElementById('blw-g');
  // devolver el nativo: saca el guard del seal (si lo hay) y marca html.blw-native, que es
  // lo que destapa la regla `html:not(.blw-native) .btn-whatsapp{visibility:hidden}` del css_code
  var nativoVisible = function () {
    if (guard && guard.parentNode) guard.parentNode.removeChild(guard);
    var H = d.documentElement;
    if (H.className.indexOf('blw-native') < 0) H.className += ' blw-native';
  };
  try {
    if (window.localStorage && localStorage.getItem('blw-off') === '1') {
      nativoVisible();
      return;
    }
  } catch (e) {}
  if (d.getElementById('blw')) return;

  var yo = d.currentScript;
  var base = (yo && yo.src)
    ? yo.src.replace(/\/js\/whatsapp\.js.*$/, '')
    : 'https://cdn.jsdelivr.net/gh/BloomLifeArg/bloomlife-static@main';

  var TEL = '5491124785477';
  var SEL_NATIVO = '.js-btn-fixed-bottom.btn-whatsapp';
  var SVGNS = 'http://www.w3.org/2000/svg';
  var WA_PATH = 'M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z';

  // 1. nativo afuera (regla en el <head>: vale también si el tema lo pinta tarde)
  //    y la pastilla propia invisible hasta que la hoja llegó y pasó la espera
  var hide = d.createElement('style');
  hide.id = 'blw-hide';
  hide.appendChild(d.createTextNode(SEL_NATIVO + '{display:none!important}' +
    '#blw:not(.blw-in){opacity:0!important;visibility:hidden!important;transition:none!important}'));
  d.head.appendChild(hide);

  // 2. hoja propia. Si no llega (error o 8 s), se devuelve el nativo: nunca una
  //    pastilla sin estilos ni una página sin WhatsApp.
  var a = null, cssOk = false, esperaOk = false, muerto = false;
  function fallar() {
    if (muerto) return; muerto = true;
    if (hide.parentNode) hide.parentNode.removeChild(hide);
    nativoVisible();
    if (a && a.parentNode) a.parentNode.removeChild(a);
  }
  function revelar() {
    if (muerto || !cssOk || !esperaOk || !a) return;
    if (!/\bblw-in\b/.test(a.className)) a.className += ' blw-in';
  }
  var l = d.createElement('link');
  l.rel = 'stylesheet';
  l.href = base + '/css/whatsapp.css';
  l.onload = function () { cssOk = true; revelar(); };
  l.onerror = fallar;
  d.head.appendChild(l);
  setTimeout(function () { if (!cssOk) fallar(); }, 8000);
  setTimeout(function () { esperaOk = true; revelar(); }, 1200);

  function el(tag, cls, txt) {
    var e = d.createElement(tag);
    if (cls) e.className = cls;
    if (txt) e.appendChild(d.createTextNode(txt));
    return e;
  }

  // nombre del producto en las internas (h1 nativo del tema); vacío en el resto
  function producto() {
    if (!d.body || !/\btemplate-product\b/.test(d.body.className)) return '';
    var h = d.querySelector('h1.js-product-name') || d.querySelector('[data-store^="product-name"]') || d.querySelector('h1');
    var t = h ? (h.textContent || '').replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '') : '';
    return (t.length > 2 && t.length < 120) ? t : '';
  }
  function mensaje() {
    var p = producto();
    return p
      ? 'Hola Bloom Life 👋 Estoy viendo ' + p + ' y quiero que me ayuden a elegir mi adaptógeno.'
      : 'Hola Bloom Life 👋 Quiero que me ayuden a elegir mi adaptógeno.';
  }

  function icono() {
    var s = d.createElementNS(SVGNS, 'svg');
    s.setAttribute('viewBox', '0 0 448 512');
    s.setAttribute('aria-hidden', 'true');
    s.setAttribute('focusable', 'false');
    var p = d.createElementNS(SVGNS, 'path');
    p.setAttribute('d', WA_PATH);
    s.appendChild(p);
    return s;
  }

  function armar() {
    a = el('a', 'blw');
    a.id = 'blw';
    a.href = 'https://wa.me/' + TEL + '?text=' + encodeURIComponent(mensaje());
    a.target = '_blank';
    a.rel = 'noopener';
    a.setAttribute('aria-label', 'Asesoría Bloom por WhatsApp: te ayudamos a elegir tu adaptógeno');

    var eb = el('span', 'blw-eb');
    eb.appendChild(el('span', 'blw-l', 'Asesoría'));
    eb.appendChild(el('span', 'blw-l', 'Bloom'));
    var disc = el('span', 'blw-disc');
    disc.appendChild(icono());
    var sub = el('span', 'blw-sub');
    sub.appendChild(el('span', 'blw-l', 'Te ayudamos'));
    sub.appendChild(el('span', 'blw-l blw-l2', 'a elegir'));

    a.appendChild(eb);
    a.appendChild(disc);
    a.appendChild(sub);
    d.body.appendChild(a);

    // entrada suave: cuando la hoja llegó Y pasaron 1,2 s (la transición vive en el CSS)
    revelar();

    // 3. banner de cookies del tema: subir la pastilla mientras esté visible
    var banner = d.querySelector('.js-notification-cookie-banner');
    function ajustar() {
      var lift = 0;
      if (banner) {
        var cs = getComputedStyle(banner);
        if (cs.display !== 'none' && cs.visibility !== 'hidden') {
          var r = banner.getBoundingClientRect();
          if (r.height > 0 && r.top < innerHeight) lift = Math.round(innerHeight - r.top);
        }
      }
      if (lift > 0) a.style.setProperty('--blw-b', (lift + (innerWidth <= 640 ? 14 : 18)) + 'px');
      else a.style.removeProperty('--blw-b');
    }
    ajustar();
    // el tema lo muestra en DOMContentLoaded; por si llega después
    setTimeout(ajustar, 300); setTimeout(ajustar, 1500); setTimeout(ajustar, 4000);
    if (window.addEventListener) window.addEventListener('resize', ajustar, false);
    if (banner && window.MutationObserver) {
      new MutationObserver(ajustar).observe(banner, { attributes: true, attributeFilter: ['style', 'class'] });
    }
    // fallback si no hay MutationObserver: el click en "Entendido"
    d.addEventListener('click', function (ev) {
      var t = ev.target;
      while (t && t !== d) {
        if (/\bjs-acknowledge-cookies\b/.test(t.className || '')) { setTimeout(ajustar, 50); setTimeout(ajustar, 400); return; }
        t = t.parentNode;
      }
    }, true);
  }

  function go() { if (muerto) return; if (d.body) armar(); else setTimeout(go, 30); }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', go);
  else go();
})();
