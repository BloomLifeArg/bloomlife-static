/* Bloom Life · Nota individual del blog (/blog/posts/<slug>)
 *
 * Reviste la nota nativa de Tienda Nube (body.template-blog-post, div.blog-post-page)
 * con la identidad nueva del sitio: hero editorial claro sobre --sand (vuelta al
 * listado, kicker con la fecha larga, h1 Georgia, tiempo de lectura), la portada
 * nativa montada sobre el hero a 960px, columna de lectura de 680px, "Seguí
 * leyendo" con otras 3 notas y el mismo cierre --terra del listado. Mismo
 * mecanismo que /blog/ (blog.js), /search/ (buscador.js) y las institucionales.
 *
 * El contenido editorial NO se reescribe: el nodo .post-content (HTML de TinyMCE,
 * con links e imágenes) se MUEVE intacto adentro de la estructura propia y se lo
 * tipografía desde css/blog-post.css. Lo único que se le agrega son clases
 * presentacionales (bbp-first, bbp-lede, bbp-blank) — ningún nodo se pierde.
 * También se mueven el <h1> nativo (evita un h1 duplicado) y la portada nativa.
 *
 * El seal pinta el guard `#bbp-guard` (.blog-post-page,.page-header{visibility:hidden})
 * antes del primer paint y carga este archivo. Acá se engancha la hoja real
 * (css/blog-post.css, mismo commit que este JS: el hash sale de la URL propia) y
 * se destapa cuando la hoja llegó Y la vista nueva ya está pintada. Failsafe a
 * los 4 s: si algo no llega, se destapa igual. Si falta el título o el contenido,
 * se saca el guard y queda lo nativo. Interruptor: localStorage 'bbp-off' = '1'.
 *
 * Fecha: manda el "Publicado el dd/mm/aaaa" nativo (la fecha original de la nota);
 * si no está, el datePublished del JSON-LD BlogPosting, que en las notas
 * republicadas por la integración dice 2026-09-06. El autor/mail no se muestra.
 *
 * "Seguí leyendo": se trae /blog/ por fetch (12 cards nativas + su JSON-LD, siempre
 * fresco y same-origin) y se eligen las 3 notas que siguen a la actual en el orden
 * del listado (rotación: cada nota muestra vecinas distintas). Si eso falla, se
 * intenta data/blog-latest.json del repo (rama main, vía raw.githubusercontent).
 * Si nada llega, la banda se omite sin romper nada.
 *
 * Namespace: .bbp (Bloom blog post). ES5, sin dependencias.
 */
(function () {
  'use strict';
  var d = document;
  if (window.__bbpOn) return;
  window.__bbpOn = 1;

  var yo = d.currentScript;   // leerlo YA: más adelante puede ser null
  var base = (yo && yo.src)
    ? yo.src.replace(/\/js\/blog-post\.js.*$/, '')
    : 'https://cdn.jsdelivr.net/gh/BloomLifeArg/bloomlife-static@main';

  var TIMEOUT_FETCH = 3500;
  var PALABRAS_MIN = 200;     // ritmo de lectura para el "N min de lectura"
  var MAS = 3;                // notas en "Seguí leyendo"
  var LEDE_MAX = 340;         // chars: el primer párrafo se agranda como entradilla si es corto
  var JSON_FALLBACK = 'https://raw.githubusercontent.com/BloomLifeArg/bloomlife-static/main/data/blog-latest.json';
  var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  var MESES_L = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
    'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var COPY = {
    kicker: 'Wellness Blog',
    volver: 'Todas las notas',
    lectura: ' min de lectura',
    mas: 'Seguí leyendo',
    leer: 'Leer nota',
    finalH2: 'De la lectura al hábito.',
    finalSub: 'Los adaptógenos de los que hablamos, en gummies y cápsulas.',
    btn1: 'Ver los suplementos', url1: '/productos/',
    btn2: 'Ver los combos', url2: '/elegi-tu-suplemento/combos-bienestar-integral/'
  };

  function guardOff() {
    // el css_code esconde lo nativo desde el <head> hasta que alguien pone html.bl-ok
    if (document.documentElement.className.indexOf('bl-ok') < 0) document.documentElement.className += ' bl-ok';
    var g = d.getElementById('bbp-guard');
    if (g && g.parentNode) g.parentNode.removeChild(g);
  }

  try {
    if (window.localStorage && localStorage.getItem('bbp-off') === '1') { guardOff(); return; }
  } catch (e) { /* storage bloqueado: seguimos */ }

  if (!/^\/blog\/posts\/[^/]+\/?$/.test(location.pathname)) { guardOff(); return; }

  /* ───────── helpers ───────── */
  var esc = function (v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  var trim = function (s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').replace(/^ | $/g, ''); };
  var conTimeout = function (p, ms) {
    return new Promise(function (res) {
      var t = setTimeout(function () { res(null); }, ms);
      p.then(function (v) { clearTimeout(t); res(v); }, function () { clearTimeout(t); res(null); });
    });
  };
  /* "/blog/posts/slug" para comparar URLs con y sin host ni barra final */
  var pathDe = function (u) {
    u = String(u || '');
    var m = /^(?:https?:)?\/\/[^/]+(\/.*)$/.exec(u);
    return (m ? m[1] : u).replace(/[?#].*$/, '').replace(/\/$/, '');
  };
  var aFecha = function (v) {
    if (!v) return null;
    // "AAAA-MM-DD" se parsea como fecha LOCAL (new Date('2026-03-06') sería UTC y en
    // Argentina caería en el 5)
    var dm = typeof v === 'string' && /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
    var t = v instanceof Date ? v : dm ? new Date(+dm[1], +dm[2] - 1, +dm[3]) : new Date(v);
    return isNaN(t.getTime()) ? null : t;
  };
  var fechaLarga = function (t) {           // "4 de agosto de 2026"
    t = aFecha(t);
    return t ? t.getDate() + ' de ' + MESES_L[t.getMonth()] + ' de ' + t.getFullYear() : '';
  };
  var fechaCorta = function (t) {           // "4 ago 2026" (cards)
    t = aFecha(t);
    return t ? t.getDate() + ' ' + MESES[t.getMonth()] + ' ' + t.getFullYear() : '';
  };
  /* "Publicado el 07/03/2026 por …" → Date local */
  var fechaNativa = function (el) {
    if (!el) return null;
    var m = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(el.textContent || '');
    return m ? aFecha(new Date(+m[3], +m[2] - 1, +m[1])) : null;
  };
  var elegirImagen = function (img) {
    if (!img) return '';
    /* TN manda el mismo archivo en todos los anchos del srcset: hay UNA portada */
    var ss = img.getAttribute('data-srcset') || img.getAttribute('srcset') || '';
    var u = '';
    if (ss) u = trim(ss.split(',')[0]).split(/\s+/)[0] || '';
    if (!u) {
      u = img.getAttribute('data-src') || img.getAttribute('src') || '';
      if (/^data:/.test(u)) u = '';
    }
    if (u && u.indexOf('//') === 0) u = location.protocol + u;
    return u;
  };

  /* ───────── JSON-LD: BlogPosting → {url, titulo, desc, fecha, img} ───────── */
  function leerLd(root) {
    var out = [];
    var scripts = root.querySelectorAll('script[type="application/ld+json"]');
    for (var i = 0; i < scripts.length; i++) {
      var o;
      try { o = JSON.parse(scripts[i].textContent); } catch (e) { continue; }
      var lista = Object.prototype.toString.call(o) === '[object Array]' ? o : [o];
      for (var j = 0; j < lista.length; j++) {
        var n = lista[j];
        if (!n || n['@type'] !== 'BlogPosting') continue;
        var u = typeof n.url === 'string' ? n.url : (n.mainEntityOfPage && n.mainEntityOfPage['@id']);
        var img = typeof n.image === 'string' ? n.image : (n.image && n.image.url) || '';
        out.push({ path: u ? pathDe(u) : '', url: u || '', titulo: trim(n.headline),
          desc: trim(n.description), fecha: n.datePublished || '', img: img });
      }
    }
    return out;
  }

  /* ───────── "Seguí leyendo": leer las cards nativas de /blog/ ───────── */
  function leerListado(html) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var sec = doc.querySelector('.blog-page');
    if (!sec) return [];
    var ld = {}, lds = leerLd(sec);
    for (var k = 0; k < lds.length; k++) if (lds[k].path) ld[lds[k].path] = lds[k];
    var cards = sec.querySelectorAll('.post-item[data-post-id]'), posts = [], vistos = {};
    for (var i = 0; i < cards.length; i++) {
      var el = cards[i];
      var a = el.querySelector('a.post-item-link[href]') || el.querySelector('a[href*="/blog/posts/"]');
      var url = a ? a.getAttribute('href') : '';
      var path = pathDe(url);
      if (!path || vistos[path]) continue;
      var tEl = el.querySelector('.post-item-title');
      var titulo = tEl ? trim(tEl.textContent) : (a ? trim(a.getAttribute('title')) : '');
      var meta = ld[path] || {};
      var img = elegirImagen(el.querySelector('img.post-item-image') || el.querySelector('img')) || meta.img || '';
      if (!titulo) continue;
      vistos[path] = 1;
      posts.push({ path: path, url: url, titulo: titulo, img: img, fecha: meta.fecha || '' });
    }
    return posts;
  }

  function leerJson(o) {
    var lista = (o && o.posts) || [], posts = [];
    for (var i = 0; i < lista.length; i++) {
      var p = lista[i];
      if (!p || !p.url || !p.title) continue;
      posts.push({ path: pathDe(p.url), url: p.url, titulo: trim(p.title), img: p.image || '', fecha: p.published_at || '' });
    }
    return posts;
  }

  /* las MAS notas que siguen a la actual en el orden del listado (cíclico) */
  function elegir(posts, actual) {
    var otros = [], idx = -1;
    for (var i = 0; i < posts.length; i++) {
      if (posts[i].path === actual) { idx = i; continue; }
      otros.push(posts[i]);
    }
    if (!otros.length) return [];
    var desde = idx < 0 ? 0 : idx;   // tras quitar la actual, el índice apunta a la siguiente
    var out = [];
    for (var k = 0; k < otros.length && out.length < MAS; k++) out.push(otros[(desde + k) % otros.length]);
    return out;
  }

  function cardHTML(p) {
    var f = fechaCorta(p.fecha);
    return '<a class="bbp-c" href="' + esc(p.url) + '">' +
      '<span class="bbp-img">' + (p.img
        ? '<img src="' + esc(p.img) + '" alt="" loading="lazy" decoding="async">' : '') + '</span>' +
      '<span class="bbp-cbody">' +
        (f ? '<span class="bbp-date">' + esc(f) + '</span>' : '') +
        '<span class="bbp-t">' + esc(p.titulo) + '</span>' +
        '<span class="bbp-cmore">' + esc(COPY.leer) + ' <i>&rarr;</i></span>' +
      '</span></a>';
  }

  function masNotas(slot, actual) {
    if (!(window.fetch && window.Promise && window.DOMParser)) return;
    var pintarMas = function (posts) {
      var sel = elegir(posts || [], actual);
      if (!sel.length || !slot.parentNode) return;
      slot.innerHTML = '<section class="bbp-more"><div class="bbp-in-wide">' +
        '<h2 class="bbp-more-h"><span>' + esc(COPY.mas) + '</span></h2>' +
        '<div class="bbp-grid">' + sel.map(cardHTML).join('') + '</div>' +
        '</div></section>';
    };
    // fecha ORIGINAL de cada nota (data/blog-fechas.json del mismo commit); el JSON-LD
    // del listado trae la de la última republicación
    var fechasP = conTimeout(fetch(base + '/data/blog-fechas.json').then(function (r) { return r.ok ? r.json() : null; }), TIMEOUT_FETCH)
      .then(null, function () { return null; });
    var conFechas = function (posts, F) {
      if (F) posts.forEach(function (p) { var k = pathDe(p.url); if (F[k]) p.fecha = F[k]; });
      return posts;
    };
    Promise.all([conTimeout(fetch('/blog/', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.text() : null; }), TIMEOUT_FETCH), fechasP])
      .then(function (rs) {
        var html = rs[0], F = rs[1], posts = [];
        if (html) { try { posts = leerListado(html); } catch (e) { posts = []; } }
        if (posts.length) { pintarMas(conFechas(posts, F)); return; }
        return conTimeout(fetch(JSON_FALLBACK, { cache: 'no-store' })
          .then(function (r) { return r.ok ? r.json() : null; }), TIMEOUT_FETCH)
          .then(function (o) { try { pintarMas(leerJson(o)); } catch (e) { /* sin banda */ } });
      })
      .then(null, function () { /* sin banda: nada que romper */ });
  }

  /* ───────── marcas presentacionales sobre el contenido movido (sin quitar nodos) ───────── */
  function marcarContenido(content, root) {
    /* primer elemento "de verdad" (saltando los wrappers div del export) */
    var primero = content.firstElementChild;
    while (primero && primero.tagName === 'DIV') primero = primero.firstElementChild;
    if (primero) {
      primero.className += (primero.className ? ' ' : '') + 'bbp-first';
      if (primero.tagName === 'P') {
        var t = trim(primero.textContent);
        if (t.length >= 40 && t.length <= LEDE_MAX && !primero.querySelector('img')) primero.className += ' bbp-lede';
      }
    }
    /* párrafos vacíos (<p>&nbsp;</p>) que el export deja al final */
    var ps = content.querySelectorAll('p');
    for (var i = 0; i < ps.length; i++) {
      if (!trim(ps[i].textContent) && !ps[i].querySelector('img,iframe,video')) ps[i].className += ' bbp-blank';
    }
    /* notas cuyo título de sección es h3 (sin h2): la jerarquía se corre un nivel */
    if (!content.querySelector('h2') && content.querySelector('h3')) root.className += ' bbp-h3top';
  }

  /* ───────── arranque ───────── */
  function start() {
    var body = d.body;
    if (!body || !/(^|\s)template-blog-post(\s|$)/.test(body.className)) { guardOff(); return; }
    var sec = d.querySelector('.blog-post-page');
    var content = sec ? sec.querySelector('.post-content') : null;
    var h1 = d.querySelector('.page-header h1') || d.querySelector('h1');
    var titulo = h1 ? trim(h1.textContent) : '';
    if (!sec || !content || !titulo || !trim(content.textContent)) { guardOff(); return; }   // sin piezas clave: lo nativo

    var estado = { css: false, listo: false };
    var revelar = function () { if (estado.css && estado.listo) guardOff(); };
    var l = d.createElement('link');
    l.rel = 'stylesheet';
    l.href = base + '/css/blog-post.css';
    l.onload = l.onerror = function () { estado.css = true; revelar(); };
    d.head.appendChild(l);
    setTimeout(guardOff, 4000);

    try {
      var actual = pathDe(location.pathname);
      var lds = leerLd(d), ld = null;
      for (var i = 0; i < lds.length; i++) if (lds[i].path === actual) { ld = lds[i]; break; }
      if (!ld && lds.length === 1) ld = lds[0];

      // primero la fecha nativa ("Publicado el dd/mm/aaaa"): es la original de la nota.
      // El datePublished del JSON-LD dice 2026-09-06 en las 10 notas que la
      // integración republicó ese día, y eso no es cuando se escribieron.
      var fecha = fechaNativa(sec.querySelector('.post-date')) || aFecha(ld && ld.fecha);
      var palabras = trim(content.textContent).split(' ').length;
      var minutos = Math.max(1, Math.round(palabras / PALABRAS_MIN));

      /* portada nativa: el <img> de .blog-post-page que no está dentro del contenido */
      var imgs = sec.querySelectorAll('img'), cover = null;
      for (var k = 0; k < imgs.length; k++) {
        if (!content.contains(imgs[k])) { cover = imgs[k]; break; }
      }
      var coverUrl = elegirImagen(cover) || (ld && ld.img) || '';

      var root = d.createElement('div');
      root.className = 'bbp' + (coverUrl ? ' bbp-has-cover' : '');
      root.innerHTML =
        '<section class="bbp-hero"><div class="bbp-in">' +
          '<a class="bbp-back" href="/blog/"><i>&larr;</i> ' + esc(COPY.volver) + '</a>' +
          '<div class="bbp-kicker">' + esc(COPY.kicker) +
            (fecha ? '<span class="bbp-dot">&middot;</span>' + esc(fechaLarga(fecha)) : '') + '</div>' +
          '<div data-bbp-h1></div>' +
          '<div class="bbp-meta">' + minutos + esc(COPY.lectura) + '</div>' +
        '</div></section>' +
        (coverUrl ? '<div class="bbp-cover"><div class="bbp-cover-in" data-bbp-cover></div></div>' : '') +
        '<article class="bbp-art">' +
          '<div class="bbp-body" data-bbp-body></div>' +
          '<div class="bbp-end"><div class="bbp-end-in">' +
            '<a class="bbp-back" href="/blog/"><i>&larr;</i> ' + esc(COPY.volver) + '</a>' +
            (fecha ? '<span class="bbp-end-date">Publicado el ' + esc(fechaLarga(fecha)) + '</span>' : '') +
          '</div></div>' +
        '</article>' +
        '<div data-bbp-more></div>' +
        '<section class="bbp-final"><div class="bbp-in-wide">' +
          '<h2 class="bbp-h2">' + esc(COPY.finalH2) + '</h2>' +
          '<div class="bbp-final-sub">' + esc(COPY.finalSub) + '</div>' +
          '<div class="bbp-btns">' +
            '<a class="bbp-btn-g" href="' + COPY.url1 + '">' + esc(COPY.btn1) + '</a>' +
            '<a class="bbp-btn-g" href="' + COPY.url2 + '">' + esc(COPY.btn2) + '</a>' +
          '</div></div></section>';

      /* h1 nativo → hero (se mueve el nodo: un solo h1 en la página) */
      var slotH1 = root.querySelector('[data-bbp-h1]');
      h1.className = 'bbp-h1';
      h1.removeAttribute('style');
      slotH1.parentNode.replaceChild(h1, slotH1);

      /* portada nativa → bajo el hero, con la URL real (sin lazyload ni fade-in del tema) */
      if (coverUrl) {
        var slotCover = root.querySelector('[data-bbp-cover]');
        if (cover) {
          cover.className = 'bbp-cover-img';
          cover.removeAttribute('data-srcset'); cover.removeAttribute('srcset');
          cover.removeAttribute('data-src'); cover.removeAttribute('data-sizes'); cover.removeAttribute('sizes');
          cover.removeAttribute('style');
          if (!trim(cover.getAttribute('alt'))) cover.setAttribute('alt', titulo);
        } else {
          cover = d.createElement('img');
          cover.className = 'bbp-cover-img';
          cover.setAttribute('alt', titulo);
        }
        cover.setAttribute('decoding', 'async');
        cover.setAttribute('fetchpriority', 'high');
        cover.src = coverUrl;
        slotCover.appendChild(cover);
      }

      /* contenido editorial → columna de lectura, intacto */
      root.querySelector('[data-bbp-body]').appendChild(content);
      marcarContenido(content, root);

      /* lo nativo que quedó en .blog-post-page (p.post-date con autor/mail) → oculto */
      var resto = d.createElement('div');
      resto.hidden = true; resto.setAttribute('data-bbp-native', '');
      while (sec.firstChild) resto.appendChild(sec.firstChild);
      sec.appendChild(root);
      sec.appendChild(resto);

      /* el wrapper .container-narrow del template limita el ancho: las bandas van a sangre */
      var wrap = sec.parentNode;
      if (wrap && wrap.className != null) wrap.className += ' bbp-wrap';
      body.className += ' bbp-on';

      masNotas(root.querySelector('[data-bbp-more]'), actual);
    } catch (e) {
      guardOff();
      if (window.console && console.error) console.error('[bbp] render', e);
      return;
    }
    estado.listo = true;
    revelar();
  }

  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', start);
  else start();
})();
