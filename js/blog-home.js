/* Sección "Del blog" del home de bloomlife.co.
 *
 * Arma la sección en runtime a partir de data/blog-latest.json, que un cron de
 * GitHub Actions regenera cada hora desde el blog público. Publicar una nota
 * nueva la hace aparecer acá sola, sin tocar el admin.
 *
 * Por qué en JS y no con el módulo nativo "Banners promocionales": ese módulo
 * exige cargar cada card a mano en el editor de diseño, y además sus dos
 * controles (ojo de visibilidad y lápiz de edición) no responden a automación.
 * Ver ESTADO_BLOG_HOME.md en el repo del proyecto.
 *
 * El JSON se lee de raw.githubusercontent (CORS *, cache 5 min) y NO de
 * jsDelivr: jsDelivr cachea las rutas de rama hasta 7 días, que es justo lo
 * contrario de lo que necesita un archivo pensado para cambiar.
 *
 * Todo va dentro de try/catch y de un fetch que puede fallar: si algo se rompe,
 * la sección no se dibuja y el home queda intacto. Nunca romper el home.
 */
(function () {
  'use strict';

  var DATA_URL =
    'https://raw.githubusercontent.com/BloomLifeArg/bloomlife-static/main/data/blog-latest.json';
  var ANCLA = 'section[data-store="banner-services"]'; // citas BloomCrew
  var TITULO = 'Del blog';
  var CACHE_KEY = 'bl-blog-v1';
  var CACHE_MS = 5 * 60 * 1000;

  // El script se sirve desde .../js/blog-home.js; el CSS vive al lado, en
  // .../css/blog-section.css. Derivarlo del propio src mantiene JS y CSS
  // pinneados al mismo commit sin repetir el hash en dos lugares.
  var self = document.currentScript;

  function cssURL() {
    try {
      return new URL('../css/blog-section.css', self.src).href;
    } catch (e) {
      return null;
    }
  }

  function cargarCSS() {
    var href = cssURL();
    if (!href || document.querySelector('link[data-bl-blog]')) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    l.setAttribute('data-bl-blog', '');
    document.head.appendChild(l);
  }

  function leerCache() {
    try {
      var raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      return Date.now() - o.t < CACHE_MS ? o.d : null;
    } catch (e) {
      return null;
    }
  }

  function guardarCache(d) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), d: d }));
    } catch (e) {
      /* modo privado o storage lleno: seguimos sin cache */
    }
  }

  function el(tag, cls, texto) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (texto != null) n.textContent = texto; // textContent, nunca innerHTML
    return n;
  }

  function card(post) {
    var a = el('a', 'bl-blog-card');
    a.href = post.url;

    var marco = el('div', 'bl-blog-foto');
    var img = el('img');
    img.src = post.image;
    img.alt = ''; // decorativa: el título de al lado ya nombra el link
    img.loading = 'lazy';
    img.decoding = 'async';
    marco.appendChild(img);

    var cuerpo = el('div', 'bl-blog-cuerpo');
    cuerpo.appendChild(el('h3', 'bl-blog-titulo', post.title));
    if (post.summary) cuerpo.appendChild(el('p', 'bl-blog-extracto', post.summary));
    cuerpo.appendChild(el('span', 'bl-blog-mas', 'Leer más'));

    a.appendChild(marco);
    a.appendChild(cuerpo);
    return a;
  }

  function dibujar(posts) {
    var ancla = document.querySelector(ANCLA);
    if (!ancla || !posts || !posts.length) return;
    if (document.querySelector('.bl-blog')) return; // idempotente

    var sec = el('section', 'bl-blog');
    sec.setAttribute('aria-labelledby', 'bl-blog-h');

    var cont = el('div', 'bl-blog-cont');
    var h = el('h2', 'bl-blog-h', TITULO);
    h.id = 'bl-blog-h';
    cont.appendChild(h);

    var grid = el('div', 'bl-blog-grid');
    posts.forEach(function (p) {
      if (p && p.url && p.title && p.image) grid.appendChild(card(p));
    });
    if (!grid.children.length) return;

    cont.appendChild(grid);
    sec.appendChild(cont);
    ancla.insertAdjacentElement('afterend', sec);
  }

  function arrancar() {
    // Solo el home.
    if (!document.body || !document.body.classList.contains('template-home')) return;
    if (!document.querySelector(ANCLA)) return;

    var cacheado = leerCache();
    if (cacheado) {
      cargarCSS();
      dibujar(cacheado);
      return;
    }

    fetch(DATA_URL, { credentials: 'omit' })
      .then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.json();
      })
      .then(function (j) {
        var posts = (j && j.posts) || [];
        if (!posts.length) return;
        guardarCache(posts);
        cargarCSS();
        dibujar(posts);
      })
      .catch(function () {
        /* sin datos no hay sección; el home sigue igual */
      });
  }

  try {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', arrancar);
    } else {
      arrancar();
    }
  } catch (e) {
    /* nunca romper el home */
  }
})();
