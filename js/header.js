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
 *    (productos, cápsulas, los 4 combos más vendidos, objetivos) y la puerta al
 *    finder; al tipear filtra localmente por nombre, bajada y PALABRAS CLAVE
 *    (data/buscador-claves.json: ansiedad, cortisol, memoria…; editable sin
 *    publish) y suma atajos (envíos, suscripción, FAQ). Enter manda a
 *    /search/?q= (que ya pinta el buscador propio). Los combos salen de
 *    data/buscador-combos.json (top ventas) y, si falla, de los del megamenú.
 *    Si este archivo no llega, la lupa sigue abriendo el modal del tema.
 * 3. SCROLL (Fase 3): pasado el primer tramo, el header se compacta (la barra
 *    de avisos se pliega, la fila del logo baja a 60/52 px, aparece un filete)
 *    y al seguir bajando se esconde; al subir vuelve enseguida. El tema hacía
 *    lo suyo con .compress/.adbar-hidden (subía el header 32 px y agrandaba el
 *    logo por estilo inline); acá se neutraliza eso por CSS (!important) y se
 *    maneja con .blh-compact / .blh-hide. Nunca se esconde con el megamenú, el
 *    drawer o el buscador abiertos.
 */
(function () {
  var d = document;
  var yo = d.currentScript;
  var base = (yo && yo.src) ? yo.src.replace(/\/js\/header\.js.*$/, '')
    : 'https://cdn.jsdelivr.net/gh/BloomLifeArg/bloomlife-static@main';
  var FINDER = 'https://www.bloomlife.co/que-suplemento-es-para-vos/';
  var SEARCH = '/search/';
  var RAW = 'https://raw.githubusercontent.com/BloomLifeArg/bloomlife-static/main/data/';
  var claves = null, combosTop = null, pedido = false;

  function traer(a) {
    var c = typeof AbortController === 'function' ? new AbortController() : null;
    var t = setTimeout(function () { if (c) c.abort(); }, 3000);
    return fetch(RAW + a, c ? { signal: c.signal } : undefined)
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (j) { clearTimeout(t); return j; }, function () { clearTimeout(t); return null; });
  }
  function pedirDatos() {
    if (pedido) return; pedido = true;
    Promise.all([traer('buscador-claves.json'), traer('buscador-combos.json')]).then(function (r) {
      claves = r[0] || null;
      combosTop = (r[1] && r[1].items && r[1].items.length) ? r[1].items.map(function (i) {
        return { nombre: i.nombre, bajada: i.bajada, href: i.href, img: i.imagen };
      }) : null;
      if (abierto) pintar();
    });
  }
  // la clave de cada item en buscador-claves.json es el último tramo de su URL
  function llave(href) {
    var m = /\/([^\/?#]+)\/?(?:[?#].*)?$/.exec(href || '');
    return m ? m[1].toLowerCase() : '';
  }
  function clavesDe(tipo, it) {
    var t = claves && claves[tipo];
    var k = t && t[llave(it.href)];
    return k ? ' ' + k.join(' ') : '';
  }

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
      gummies: b.adaptogenos || [],
      capsulas: b.capsulas || [],
      // en resultados, gummies y cápsulas del mismo adaptógeno se llaman igual: la cápsula lleva su formato en el nombre
      productos: (b.adaptogenos || []).concat((b.capsulas || []).map(function (c) {
        return { nombre: c.nombre + ' · Cápsulas', bajada: c.bajada, href: c.href, img: c.img };
      })),
      combos: combosTop || b.combos || [],
      objetivos: b.objetivos || [],
      atajos: (claves && claves.atajos) || []
    };
  }
  function buscar(q) {
    var n = norm(q), D = datos();
    var f = function (tipo) {
      return function (it) { return norm(it.nombre + ' ' + (it.bajada || '') + clavesDe(tipo, it)).indexOf(n) > -1; };
    };
    // combos: los top del buscador + los del megamenú que no estén repetidos, para que "sueño" también traiga Deep Sleep
    var vistos = {}, combos = [];
    D.combos.concat((window.blsData && window.blsData.combos) || []).forEach(function (c) {
      var k = llave(c.href); if (vistos[k]) return; vistos[k] = 1; combos.push(c);
    });
    return {
      productos: D.productos.filter(f('productos')),
      combos: combos.filter(f('combos')),
      objetivos: D.objetivos.filter(f('objetivos')),
      atajos: D.atajos.filter(function (a) { return norm(a.texto + ' ' + (a.claves || []).join(' ')).indexOf(n) > -1; })
    };
  }
  function atajos(items) {
    var w = el('div', 'blh-atajos');
    items.forEach(function (a) {
      var x = el('a', 'blh-atajo'); x.href = a.href;
      x.appendChild(el('span', null, esc(a.texto))); x.appendChild(svg('arrow'));
      w.appendChild(x);
    });
    return w;
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
      if (D.gummies.length) cuerpo.appendChild(seccion('Gummies', lista(D.gummies.slice(0, 5), false)));
      if (D.capsulas.length) cuerpo.appendChild(seccion('Cápsulas', lista(D.capsulas, true)));
      if (D.combos.length) cuerpo.appendChild(seccion(combosTop ? 'Combos más elegidos' : 'Combos', lista(D.combos.slice(0, 4), true)));
      if (D.objetivos.length) cuerpo.appendChild(seccion('Por objetivo', chips(D.objetivos)));
      cuerpo.appendChild(finderCTA());
      return;
    }
    var R = buscar(q), n = R.productos.length + R.combos.length + R.objetivos.length + R.atajos.length;
    if (R.productos.length) cuerpo.appendChild(seccion('Suplementos', lista(R.productos, false)));
    if (R.combos.length) cuerpo.appendChild(seccion('Combos', lista(R.combos, true)));
    if (R.objetivos.length) cuerpo.appendChild(seccion('Por objetivo', chips(R.objetivos)));
    if (R.atajos.length) cuerpo.appendChild(seccion('Atajos', atajos(R.atajos)));
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
      pedirDatos();
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

  /* ── 4. scroll: compactar y esconder/mostrar ─────────────────────────── */
  function scrollHeader() {
    var head = d.querySelector('.js-head-main'); if (!head) return;
    /* Decisión de Sergio (2026-09-13): el header acompaña SIEMPRE el scroll; ya compacto ocupa 60/52 px
       (<7 % del viewport, dentro de lo que Baymard considera aceptable para un sticky). HIDE_Y=Infinity
       apaga el ocultar-al-bajar sin sacar la lógica, por si algún día se quiere volver a probar. */
    var COMPACT_Y = 72, HIDE_Y = Infinity, DELTA = 8;
    var ultimo = window.pageYOffset || 0, oculto = false, compacto = false, pedido = false;
    var abiertoAlgo = function () {
      return abierto || !!d.querySelector('.bls__li.is-open, .bls__drawer.is-open, body.move-right, #nav-hamburger[style*="display: block"]');
    };
    var aplicar = function () {
      pedido = false;
      var y = Math.max(0, window.pageYOffset || 0);
      var dy = y - ultimo;
      var c = y > COMPACT_Y;
      if (c !== compacto) { compacto = c; head.classList.toggle('blh-compact', c); }
      if (abiertoAlgo()) { if (oculto) { oculto = false; head.classList.remove('blh-hide'); } ultimo = y; return; }
      if (y <= HIDE_Y || dy < -DELTA) { if (oculto) { oculto = false; head.classList.remove('blh-hide'); } }
      else if (dy > DELTA) { if (!oculto) { oculto = true; head.classList.add('blh-hide'); } }
      if (Math.abs(dy) > DELTA || y <= HIDE_Y) ultimo = y;
    };
    window.addEventListener('scroll', function () {
      if (pedido) return; pedido = true;
      (window.requestAnimationFrame || setTimeout)(aplicar);
    }, { passive: true });
    // si se abre algo con el header escondido, que reaparezca (foco/teclado incluidos)
    d.addEventListener('focusin', function (e) { if (oculto && head.contains(e.target)) { oculto = false; head.classList.remove('blh-hide'); } });
    head.classList.add('blh-scroll');
    aplicar();
  }


  /* Aviso de cookies: el banner nativo se come 67 px del primer viewport y en el home
     tapa el segundo CTA del hero. Se acepta solo cuando el visitante scrollea, que es
     literalmente lo que dice su texto. Se usa el link nativo (.js-acknowledge-cookies)
     para que el tema persista la preferencia como corresponde. */
  function cookiesAlScroll() {
    var banner = d.querySelector('.js-notification-cookie-banner');
    if (!banner) return;
    var link = banner.querySelector('.js-acknowledge-cookies');
    if (!link) return;
    var y0 = window.pageYOffset || 0, listo = false;
    function cerrar() {
      if (listo) return;
      listo = true;
      window.removeEventListener('scroll', onScroll);
      banner.classList.add('blh-ck-out');
      setTimeout(function () { try { link.click(); } catch (e) {} }, 260);
    }
    function onScroll() {
      if (Math.abs((window.pageYOffset || 0) - y0) > 380) cerrar();
    }
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  function init() {
    css();
    iconos();
    engancharLupa();
    scrollHeader();
    cookiesAlScroll();
  }
  if (d.querySelector('.js-head-main')) init();
  else d.addEventListener('DOMContentLoaded', init);
})();
