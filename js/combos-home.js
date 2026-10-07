/* Sección "Combos" del home de bloomlife.co (v6, reemplaza a "Nuestros combos").
 *
 * Reemplaza en el mismo lugar a la sección nativa "Productos nuevos" del tema
 * (section[data-store="home-products-new"]), que hasta la v5 se reestilizaba
 * desde css_code con chips de ingredientes metidos en los slots de precio.
 * Acá el markup es propio: fondo petróleo, encabezado en dos columnas, 8 cards
 * con el BENEFICIO como título (no el nombre del combo), los ingredientes en
 * una línea y "Shop Now". En mobile, fila deslizable con snap.
 *
 * QUÉ COMBOS SALEN LO DECIDE data/combos-home.json, no el admin de TN: la
 * casilla "Destacar producto → Novedades" ya no cambia nada de lo que se ve.
 * El JSON se lee fresco en cada carga (raw.githubusercontent, cache 5 min);
 * cambiar un título, el orden o un combo es editar el JSON y commitear. Este
 * archivo sí está pinneado a un hash en custom_seal_code.
 *
 * Si el JSON falla se dibuja FALLBACK (copia del JSON: mantenerlas en sync).
 * La sección nativa recién se oculta DESPUÉS de insertar la propia: si este
 * script no llega a correr, el home sigue mostrando la v5 y nunca queda sin
 * combos.
 *
 * Fotos: WebP 480/800 en img/combos-home/combo-<id>-<ancho>.webp, al lado de
 * este script (mismo commit). Un combo nuevo sin WebP puede traer "img" con una
 * URL completa en el JSON.
 *
 * Ver ESTADO_COMBOS_HOME.md en el repo del proyecto.
 */
(function () {
  'use strict';

  var ANCLA = 'section[data-store="home-products-new"]';
  var ID = 'bl-cmb';
  var DATA_URL =
    'https://raw.githubusercontent.com/BloomLifeArg/bloomlife-static/main/data/combos-home.json';
  var TIMEOUT_MS = 2500;

  var FALLBACK = {
    eyebrow: 'Combos',
    titulo: 'Un combo para cada momento.',
    bajada:
      'Adaptógenos en gummies que se potencian entre sí para ir directo a lo que buscás.',
    nota: 'Suscribite y ahorrá 10% todos los meses.',
    cta: 'Ver todos los combos',
    cta_url:
      'https://www.bloomlife.co/elegi-tu-suplemento/combos-bienestar-integral/',
    combos: [
      { id: 294593106, nombre: 'Full Day Stack', titulo: 'Tu día completo, de la mañana a la noche', ing: 'Melena de León + Cordyceps + Reishi', color: '#A85713', url: 'https://www.bloomlife.co/productos/full-day-gummies-melena-de-leon-cordyceps-reishi/' },
      { id: 342427990, nombre: 'Radiance & Mind', titulo: 'Brillo por fuera, claridad por dentro', ing: 'Tremella + Melena de León + Reishi', color: '#8A6F9C', url: 'https://www.bloomlife.co/productos/radiance-mind-combo-1y7mt/' },
      { id: 294585978, nombre: 'Deep Sleep', titulo: 'Noches de descanso profundo', ing: 'Ashwagandha + Reishi', color: '#6E9E88', url: 'https://www.bloomlife.co/productos/deepsleep/' },
      { id: 341180946, nombre: 'Glow & Go', titulo: 'Verte bien y rendir todo el día', ing: 'Tremella + Cordyceps', color: '#3E7C9C', url: 'https://www.bloomlife.co/productos/glow-go-combo-tremella-y-cordyceps-gummies-134yf/' },
      { id: 357970722, nombre: 'Menopause Balance', titulo: 'Calma y buen descanso en cada etapa', ing: 'Ashwagandha + Melena de León + Reishi', color: '#6E7A2C', url: 'https://www.bloomlife.co/productos/menopausebalancegummies/' },
      { id: 330540800, nombre: 'Beauty & Balance', titulo: 'Piel luminosa, mente en calma', ing: 'Tremella + Reishi', color: '#8A6F9C', url: 'https://www.bloomlife.co/productos/combo-beauty-balance-tremella-reishi-wb97u/' },
      { id: 325250064, nombre: 'All Day Stack', titulo: 'Foco y energía de día, calma a la tarde', ing: 'Melena de León + Cordyceps + Ashwagandha', color: '#A85713', url: 'https://www.bloomlife.co/productos/fulldaygummies2/' },
      { id: 330540927, nombre: 'Glory Gummies', titulo: 'Los cinco adaptógenos, en una rutina', ing: 'Los 5 adaptógenos', color: '#6E9E88', url: 'https://www.bloomlife.co/productos/glorygummies/', zoom: true }
    ]
  };

  var self = document.currentScript;
  function rel(p) {
    try {
      return new URL(p, self.src).href;
    } catch (e) {
      return null;
    }
  }

  function cargarCSS() {
    if (document.querySelector('link[data-bl-cmb]')) return;
    var href = rel('../css/combos-section.css');
    if (!href) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    l.setAttribute('data-bl-cmb', '1');
    document.head.appendChild(l);
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function txt(v) {
    return typeof v === 'string' && v.trim() ? v.trim() : null;
  }
  function color(v) {
    return typeof v === 'string' && /^#[0-9a-f]{3,8}$/i.test(v) ? v : '#9CC3A9';
  }

  /* Un JSON a medias es peor que uno ausente: ante la duda, FALLBACK. */
  function valido(d) {
    if (!d || typeof d !== 'object') return false;
    if (!txt(d.eyebrow) || !txt(d.titulo) || !txt(d.cta) || !txt(d.cta_url)) {
      return false;
    }
    if (!Array.isArray(d.combos)) return false;
    if (d.combos.length < 1 || d.combos.length > 12) return false;
    return d.combos.every(function (c) {
      return (
        c &&
        (typeof c.id === 'number' || txt(c.img)) &&
        txt(c.nombre) &&
        txt(c.titulo) &&
        txt(c.ing) &&
        txt(c.url)
      );
    });
  }

  function traer() {
    if (typeof fetch !== 'function') return Promise.resolve(FALLBACK);
    var ctrl = null;
    var t = null;
    try {
      ctrl = new AbortController();
      t = setTimeout(function () {
        ctrl.abort();
      }, TIMEOUT_MS);
    } catch (e) {}
    return fetch(DATA_URL, ctrl ? { signal: ctrl.signal } : undefined)
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (d) {
        return valido(d) ? d : FALLBACK;
      })
      .catch(function () {
        return FALLBACK;
      })
      .then(function (d) {
        if (t) clearTimeout(t);
        return d;
      });
  }

  function imgHTML(c) {
    var alt = c.nombre + ': ' + c.ing + ' en gummies';
    var own = txt(c.img);
    var src, srcset;
    if (own) {
      src = own;
      srcset = '';
    } else {
      var b = rel('../img/combos-home/combo-' + c.id + '-');
      src = b + '800.webp';
      srcset = ' srcset="' + esc(b + '480.webp') + ' 480w, ' + esc(b + '800.webp') + ' 800w"' +
        ' sizes="(max-width:767px) 76vw, (max-width:1100px) 31vw, 304px"';
    }
    return (
      '<img src="' + esc(src) + '"' + srcset + ' alt="' + esc(alt) +
      '" width="800" height="800" loading="lazy" decoding="async">'
    );
  }

  function cardHTML(c) {
    return (
      '<li class="bl-cmb-card" style="--c:' + color(c.color) + '">' +
      '<div class="bl-cmb-tile' + (c.zoom ? ' bl-cmb-tile--zoom' : '') + '">' +
      imgHTML(c) +
      '</div>' +
      '<div class="bl-cmb-body">' +
      '<h3 class="bl-cmb-n">' + esc(c.titulo) + '</h3>' +
      '<span class="bl-cmb-meta">' + esc(c.ing) + '</span>' +
      '<span class="bl-cmb-cta">Shop Now <i aria-hidden="true">&rarr;</i></span>' +
      '</div>' +
      '<a class="bl-cmb-link" href="' + esc(c.url) + '" aria-label="' +
      esc(c.nombre + ': ' + c.titulo) + '"></a>' +
      '</li>'
    );
  }

  function dibujar(d) {
    var ancla = document.querySelector(ANCLA);
    if (!ancla) return;
    if (document.getElementById(ID)) return;
    cargarCSS();
    var nota = txt(d.nota);
    var bajada = txt(d.bajada);
    var sec = document.createElement('section');
    sec.id = ID;
    sec.className = 'bl-cmb';
    sec.setAttribute('aria-labelledby', 'bl-cmb-t');
    sec.innerHTML =
      '<div class="bl-cmb-in">' +
      '<div class="bl-cmb-head"><div>' +
      '<span class="bl-cmb-eye">' + esc(d.eyebrow) + '</span>' +
      '<h2 class="bl-cmb-t" id="bl-cmb-t">' + esc(d.titulo) + '</h2>' +
      '</div>' +
      (bajada ? '<p class="bl-cmb-aside">' + esc(bajada) + '</p>' : '') +
      '</div>' +
      '<ul class="bl-cmb-grid">' + d.combos.map(cardHTML).join('') + '</ul>' +
      '<div class="bl-cmb-foot">' +
      (nota ? '<p class="bl-cmb-note">' + esc(nota) + '</p>' : '<span></span>') +
      '<a class="bl-cmb-all" href="' + esc(d.cta_url) + '">' + esc(d.cta) +
      ' <span aria-hidden="true">&rarr;</span></a>' +
      '</div>' +
      '</div>';
    ancla.parentNode.insertBefore(sec, ancla);
    ancla.style.setProperty('display', 'none', 'important');
  }

  function arrancar() {
    if (!document.querySelector(ANCLA)) return;
    traer()
      .then(dibujar)
      .catch(function () {
        try {
          dibujar(FALLBACK);
        } catch (e) {}
      });
  }

  try {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', arrancar);
    } else {
      arrancar();
    }
  } catch (e) {}
})();
