/* Header — Fase 2 (2026-09-13): íconos propios + overlay de búsqueda.
 *
 * Lo carga js/menu-nav.js desde el MISMO commit (un solo hash en el seal) y
 * comparte sus datos por window.blsData (adaptógenos, cápsulas, combos y
 * objetivos ya normalizados a {nombre, bajada, href, img}). Si los datos
 * llegan después, escucha 'bls:datos'.
 *
 * 1. ÍCONOS: los <svg><use href="#search|#user|#bag"> del tema se rellenan con
 *    trazos propios (24x24, stroke 1.5, currentColor). Se conserva cada nodo:
 *    el <a> sigue siendo el del tema (login, carrito) y el badge
 *    .js-cart-widget-amount lo sigue actualizando el tema; acá sólo se lo viste.
 * 2. BÚSQUEDA: el click en la lupa abre un panel propio (.blh-s) en lugar del
 *    modal #nav-search del tema. Con el campo vacío muestra sugerencias
 *    (productos, combos, objetivos) y la puerta al finder; al tipear filtra
 *    localmente y Enter manda a /search/?q= (que ya pinta el buscador propio).
 *    Si este archivo no llega, la lupa sigue abriendo el modal del tema.
 */
(function () {
  var d = document;
  var yo = d.currentScript;
  var base = (yo && yo.src) ? yo.src.replace(/\/js\/header\.js.*$/, '')
    : 'https://cdn.jsdelivr.net/gh/BloomLifeArg/bloomlife-static@main';
  var FINDER = 'https://www.bloomlife.co/que-suplemento-es-para-vos/';
  var SEARCH = '/search/';

  var IC = {
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/>',
    user: '<circle cx="12" cy="8" r="3.8"/><path d="M4.5 20.2c0-3.5 3.4-5.9 7.5-5.9s7.5 2.4 7.5 5.9"/>',
    bag: '<path d="M5.6 8.6h12.8l-.9 10.9a1.6 1.6 0 0 1-1.6 1.5H8.1a1.6 1.6 0 0 1-1.6-1.5z"/><path d="M8.9 8.6V7.1a3.1 3.1 0 0 1 6.2 0v1.5"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    arrow: '<path d="M5 12h13M12.5 6.5L18 12l-5.5 5.5"/>'
  };

  function el(tag, cls, html) {
    var e = d.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function svg(name, cls) {
    var s = d.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('aria-hidden', 'true');
    s.setAttribute('class', 'blh-ic' + (cls ? ' ' + cls : ''));
    s.innerHTML = IC[name];
    return s;
  }
  function norm(s) {
    s = String(s || '').toLowerCase();
    try { s = s.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) {}
    return s;
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }

  /* ── 0. hoja ─────────────────────────────────────────────────────────── */
  function css() {
    if (d.querySelector('link[data-blh]')) return;
    var l = d.createElement('link'); l.rel = 'stylesheet'; l.href = base + '/css/header.css';
    l.setAttribute('data-blh', ''); d.head.appendChild(l);
  }

  /* ── 1. íconos ───────────────────────────────────────────────────────── */
  function iconos() {
    var head = d.querySelector('.js-head-main'); if (!head) return;
    var map = { '#search': 'search', '#user': 'user', '#bag': 'bag', '#cart': 'bag' };
    Array.prototype.forEach.call(head.querySelectorAll('.col-utility svg.utilities-icon, .cart-summary svg'), function (s) {
      var u = s.querySelector('use'); if (!u) return;
      var ref = u.getAttribute('xlink:href') || u.getAttribute('href') || '';
      var name = map[ref]; if (!name) return;
      s.setAttribute('viewBox', '0 0 24 24');
      s.classList.add('blh-ic');
      s.innerHTML = IC[name];
    });
    var badge = head.querySelector('.js-cart-widget-amount');
    if (badge) badge.classList.add('blh-badge');
    head.classList.add('blh-on');
  }

  /* ── 2. datos ────────────────────────────────────────────────────────── */
  function datos() {
    var b = window.blsData || {};
    return {
      productos: (b.adaptogenos || []).concat(b.capsulas || []),
      combos: b.combos || [],
      objetivos: b.objetivos || []
    };
  }
  function buscar(q) {
    var n = norm(q), D = datos();
    var f = function (it) { return norm(it.nombre + ' ' + (it.bajada || '')).indexOf(n) > -1; };
    return { productos: D.productos.filter(f), combos: D.combos.filter(f), objetivos: D.objetivos.filter(f) };
  }

  /* ── 3. overlay ──────────────────────────────────────────────────────── */
  var raiz, velo, input, cuerpo, abierto = false, disparador = null, tQ;

  function filaItem(it, chico) {
    var a = el('a', 'blh-it' + (chico ? ' blh-it--sec' : ''));
    a.href = it.href;
    if (it.img) {
      var f = el('span', 'blh-it__foto');
      var im = d.createElement('img'); im.src = it.img; im.alt = ''; im.loading = 'lazy'; im.decoding = 'async'; im.width = 56; im.height = 56;
      f.appendChild(im); a.appendChild(f);
    }
    var t = el('span', 'blh-it__txt');
    t.appendChild(el('span', 'blh-it__nombre', esc(it.nombre)));
    if (it.bajada) t.appendChild(el('span', 'blh-it__bajada', esc(it.bajada)));
    a.appendChild(t);
    a.appendChild(svg('arrow', 'blh-it__arrow'));
    return a;
  }
  function chips(items) {
    var w = el('div', 'blh-chips');
    items.forEach(function (o) { var a = el('a', 'blh-chip', esc(o.nombre)); a.href = o.href; w.appendChild(a); });
    return w;
  }
  function finderCTA() {
    var a = el('a', 'blh-finder');
    a.href = FINDER;
    a.innerHTML = '<span class="blh-finder__k">¿No sabés cuál es para vos?</span>' +
      '<span class="blh-finder__t">Hacé el test guiado: un minuto, tres preguntas, sin registro.</span>' +
      '<span class="blh-finder__a">Empezar el test</span>';
    a.querySelector('.blh-finder__a').appendChild(svg('arrow'));
    return a;
  }
  function seccion(label, nodo) {
    var s = el('section', 'blh-sec');
    s.appendChild(el('h3', 'blh-label', label));
    s.appendChild(nodo);
    return s;
  }
  function lista(items, chico) {
    var w = el('div', 'blh-lista');
    items.forEach(function (it) { w.appendChild(filaItem(it, chico)); });
    return w;
  }

  function pintar() {
    if (!cuerpo) return;
    cuerpo.innerHTML = '';
    var q = (input.value || '').replace(/^\s+|\s+$/g, '');
    var D = datos();
    if (q.length < 2) {
      if (D.productos.length) cuerpo.appendChild(seccion('Suplementos', lista(D.productos.slice(0, 5), false)));
      if (D.combos.length) cuerpo.appendChild(seccion('Combos', lista(D.combos.slice(0, 3), true)));
      if (D.objetivos.length) cuerpo.appendChild(seccion('Por objetivo', chips(D.objetivos)));
      cuerpo.appendChild(finderCTA());
      return;
    }
    var R = buscar(q), n = R.productos.length + R.combos.length + R.objetivos.length;
    if (R.productos.length) cuerpo.appendChild(seccion('Suplementos', lista(R.productos, false)));
    if (R.combos.length) cuerpo.appendChild(seccion('Combos', lista(R.combos, true)));
    if (R.objetivos.length) cuerpo.appendChild(seccion('Por objetivo', chips(R.objetivos)));
    var todo = el('a', 'blh-todo');
    todo.href = SEARCH + '?q=' + encodeURIComponent(q);
    todo.innerHTML = '<span>' + (n ? 'Ver todos los resultados para ' : 'No lo encontramos acá. Buscar ') + '<em>«' + esc(q) + '»</em> en el catálogo</span>';
    todo.appendChild(svg('arrow'));
    cuerpo.appendChild(todo);
    if (!n) cuerpo.appendChild(finderCTA());
  }

  function construir() {
    if (raiz) return;
    velo = el('div', 'blh-velo');
    raiz = el('div', 'blh-s');
    raiz.setAttribute('role', 'dialog'); raiz.setAttribute('aria-modal', 'true'); raiz.setAttribute('aria-label', 'Buscar');
    raiz.setAttribute('aria-hidden', 'true');

    var panel = el('div', 'blh-s__panel');
    var form = d.createElement('form');
    form.className = 'blh-form'; form.action = SEARCH; form.method = 'get'; form.setAttribute('role', 'search');
    var lupa = svg('search', 'blh-form__lupa');
    input = d.createElement('input');
    input.type = 'search'; input.name = 'q'; input.className = 'blh-form__in';
    input.placeholder = 'Buscá un suplemento, un combo o lo que querés mejorar';
    input.setAttribute('aria-label', 'Buscar'); input.autocomplete = 'off'; input.autocapitalize = 'off'; input.spellcheck = false;
    var cerrar = el('button', 'blh-cerrar'); cerrar.type = 'button'; cerrar.setAttribute('aria-label', 'Cerrar buscador');
    cerrar.appendChild(svg('close'));
    form.appendChild(lupa); form.appendChild(input); form.appendChild(cerrar);
    form.addEventListener('submit', function (e) {
      var q = (input.value || '').replace(/^\s+|\s+$/g, '');
      if (q.length < 1) { e.preventDefault(); input.focus(); return; }
      try { window.dataLayer && window.dataLayer.push({ event: 'buscador_header', q: q }); } catch (x) {}
    });
    input.addEventListener('input', function () { clearTimeout(tQ); tQ = setTimeout(pintar, 60); });
    cerrar.addEventListener('click', function () { abrir(false); });

    cuerpo = el('div', 'blh-s__cuerpo');
    panel.appendChild(form); panel.appendChild(cuerpo);
    raiz.appendChild(panel);
    velo.addEventListener('click', function () { abrir(false); });
    d.body.appendChild(velo); d.body.appendChild(raiz);
    d.addEventListener('bls:datos', function () { if (abierto) pintar(); });
  }

  function abrir(v) {
    construir();
    abierto = !!v;
    raiz.classList.toggle('is-open', abierto);
    velo.classList.toggle('is-open', abierto);
    raiz.setAttribute('aria-hidden', abierto ? 'false' : 'true');
    d.documentElement.classList.toggle('blh-open', abierto);
    if (abierto) {
      pintar();
      setTimeout(function () { try { input.focus({ preventScroll: true }); } catch (e) { input.focus(); } }, 30);
    } else if (disparador) {
      try { disparador.focus({ preventScroll: true }); } catch (e) {}
    }
  }

  function engancharLupa() {
    var btns = d.querySelectorAll('.js-head-main .js-search-button');
    if (!btns.length) return;
    Array.prototype.forEach.call(btns, function (b) {
      /* capture + stopImmediatePropagation: el tema delega el click en document
         para abrir #nav-search; al frenarlo en el propio <a> nunca llega. */
      b.addEventListener('click', function (e) {
        e.preventDefault(); e.stopImmediatePropagation(); e.stopPropagation();
        disparador = b;
        abrir(true);
      }, true);
      b.setAttribute('aria-haspopup', 'dialog');
    });
    d.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && abierto) abrir(false);
    });
  }

  function init() {
    css();
    iconos();
    engancharLupa();
  }
  if (d.querySelector('.js-head-main')) init();
  else d.addEventListener('DOMContentLoaded', init);
})();
