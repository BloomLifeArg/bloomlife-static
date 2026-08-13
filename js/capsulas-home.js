/* Sección "También en cápsulas" del home de bloomlife.co.
 *
 * Inserta una sección de contraste (fondo #003845) justo después de
 * "We Love Gummies", con una foto lifestyle a la izquierda y tres cards de la
 * línea de cápsulas a la derecha.
 *
 * EL COPY NO VIVE ACÁ: vive en data/capsulas-home.json, que se lee fresco en
 * cada carga (cache 5 min). Cambiar un título, un beneficio o un producto es
 * editar ese JSON y commitear — se ve en el home en <=5 min y NO hace falta
 * tocar el admin de Tienda Nube ni republicar nada. Este archivo sí está
 * pinneado a un hash en custom_seal_code, así que tocarlo a él sí pide publish.
 * Misma división que la sección del blog: la lógica se pinnea, el dato no.
 *
 * DIFERENCIA con blog-home.js: si el JSON falla, blog-home no dibuja nada
 * (sin posts no hay sección posible). Acá eso sería una regresión, así que el
 * copy está duplicado abajo como FALLBACK. Peor caso: se ve el copy viejo.
 * El home nunca se queda sin la sección por un problema de red.
 *
 * El JSON se lee de raw.githubusercontent (CORS *, cache 5 min) y NO de
 * jsDelivr: jsDelivr cachea las rutas de rama hasta 7 días, justo lo contrario
 * de lo que necesita un archivo pensado para cambiar.
 *
 * Ver ESTADO_CAPSULAS_HOME.md en el repo del proyecto.
 */
(function () {
  'use strict';

  /* Ancla: la sección de "We Love Gummies". Va por data-store y NO por la clase
     .section-featured-home, que aparece 3 veces en el home (también en
     home-products-new y home-products-sale). Como este selector solo existe en
     el home, hace de guard de página: en el resto del sitio no matchea y la
     función corta sola. */
  var ANCLA = 'section[data-store="home-products-featured"]';
  var ID = 'bl-caps-section';

  var DATA_URL =
    'https://raw.githubusercontent.com/BloomLifeArg/bloomlife-static/main/data/capsulas-home.json';
  var TIMEOUT_MS = 2500;

  /* Copia de seguridad del copy. Tiene que quedar en sync con el JSON — si
     divergen, esto es lo que ve el usuario cuando GitHub no responde.
     "Combo bestseller" es un dato verificado contra ventas (86 unidades en 120
     días, el combo más vendido del catálogo; el segundo va 61). Si se cambia
     ese badge, re-verificar antes. */
  var FALLBACK = {
    eyebrow: 'Un vaso de agua y listo',
    titulo: 'Adaptógenos también en formato cápsulas',
    bajada: 'La misma potencia de siempre, en el gesto más simple del día.',
    cta: 'Shop now',
    foto: {
      src:
        'https://acdn-us.mitiendanube.com/stores/004/969/223/products/ash_ritual_mano-7cfad2ab9f708a0eb017839489149855-1024-1024.jpg',
      alt: 'Manos con un vaso de agua y cápsulas de Bloom Life sobre la mesa'
    },
    productos: [
      {
        nombre: 'Melena de León',
        beneficio: 'Foco & Memoria',
        url:
          'https://www.bloomlife.co/productos/melena-de-leon-claridad-mental-capsulas/',
        img:
          'https://acdn-us.mitiendanube.com/stores/004/969/223/products/mdl_frasco_sq-cd3bf40bb0a8de7d3017846899477616-1024-1024.png',
        alt: 'Frasco de Melena de León en cápsulas'
      },
      {
        nombre: 'Ashwagandha',
        beneficio: 'Calma & Equilibrio',
        url:
          'https://www.bloomlife.co/productos/ashwagandha-equilibrio-hormonal-capsulas/',
        img:
          'https://acdn-us.mitiendanube.com/stores/004/969/223/products/ash_frasco_sq-1de3135a64ac514e1317846899679453-1024-1024.png',
        alt: 'Frasco de Ashwagandha en cápsulas'
      },
      {
        nombre: 'Combo Bye Bye Anxiety',
        beneficio: 'Calma & Foco',
        badge: 'Combo bestseller',
        url:
          'https://www.bloomlife.co/productos/combo-bye-bye-anxiety-suplementacion-por-1-mes/',
        img:
          'https://acdn-us.mitiendanube.com/stores/004/969/223/products/bye-bye-combos-bloom-529c4348dfddb872c417761714962952-1024-1024.png',
        alt:
          'Combo Bye Bye Anxiety: frascos de Ashwagandha y Melena de León en cápsulas'
      }
    ]
  };

  /* El script se sirve desde .../js/capsulas-home.js; el CSS vive al lado, en
     .../css/capsulas-section.css. Derivarlo del propio src mantiene JS y CSS
     pinneados al mismo commit sin repetir el hash en dos lugares — y sin tocar
     css_code, que es un campo más que no hace falta republicar. */
  var self = document.currentScript;

  function cargarCSS() {
    if (document.querySelector('link[data-bl-caps]')) return;
    var href;
    try {
      href = new URL('../css/capsulas-section.css', self.src).href;
    } catch (e) {
      return;
    }
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    l.setAttribute('data-bl-caps', '1');
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

  /* Valida la forma del JSON antes de usarlo. Un JSON a medias es peor que uno
     ausente: dibujaría la sección rota en producción. Ante la duda, FALLBACK. */
  function valido(d) {
    if (!d || typeof d !== 'object') return false;
    if (!txt(d.eyebrow) || !txt(d.titulo) || !txt(d.bajada) || !txt(d.cta)) {
      return false;
    }
    if (!d.foto || !txt(d.foto.src)) return false;
    if (!Array.isArray(d.productos)) return false;
    if (d.productos.length < 1 || d.productos.length > 6) return false;
    return d.productos.every(function (p) {
      return p && txt(p.nombre) && txt(p.url) && txt(p.img);
    });
  }

  function traerCopy() {
    if (typeof fetch !== 'function') return Promise.resolve(FALLBACK);

    var ctrl = null;
    var t = null;
    try {
      ctrl = new AbortController();
      t = setTimeout(function () {
        ctrl.abort();
      }, TIMEOUT_MS);
    } catch (e) {
      /* sin AbortController seguimos igual, solo sin timeout */
    }

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

  function cardHTML(p, cta) {
    var badge = txt(p.badge);
    var benef = txt(p.beneficio);
    return (
      '<a class="bl-caps-card' +
      (badge ? ' bl-caps-card--feat' : '') +
      '" href="' +
      esc(p.url) +
      '">' +
      '<img src="' +
      esc(p.img) +
      '" alt="' +
      esc(txt(p.alt) || p.nombre) +
      '" loading="lazy">' +
      '<span class="bl-caps-info">' +
      '<span class="bl-caps-badge">' +
      (badge ? esc(badge) : '') +
      '</span>' +
      '<span class="bl-caps-name">' +
      esc(p.nombre) +
      '</span>' +
      '<span class="bl-caps-benef">' +
      (benef ? esc(benef) : '') +
      '</span>' +
      '</span>' +
      '<span class="bl-caps-buy">' +
      esc(cta) +
      ' &rarr;</span>' +
      '</a>'
    );
  }

  function dibujar(d) {
    var ancla = document.querySelector(ANCLA);
    if (!ancla) return; // no es el home
    if (document.getElementById(ID)) return; // ya insertada

    cargarCSS();

    var sec = document.createElement('section');
    sec.id = ID;
    sec.className = 'bl-caps';
    sec.innerHTML =
      '<div class="bl-caps-split">' +
      '<div class="bl-caps-media">' +
      '<img src="' +
      esc(d.foto.src) +
      '" alt="' +
      esc(txt(d.foto.alt) || '') +
      '" loading="lazy">' +
      '</div>' +
      '<div class="bl-caps-body">' +
      '<p class="bl-caps-eyebrow">' +
      esc(d.eyebrow) +
      '</p>' +
      '<h2 class="bl-caps-h">' +
      esc(d.titulo) +
      '</h2>' +
      '<p class="bl-caps-sub">' +
      esc(d.bajada) +
      '</p>' +
      '<div class="bl-caps-cards">' +
      d.productos
        .map(function (p) {
          return cardHTML(p, d.cta);
        })
        .join('') +
      '</div>' +
      '</div>' +
      '</div>';

    ancla.parentNode.insertBefore(sec, ancla.nextSibling);
  }

  function arrancar() {
    // Si no estamos en el home ni siquiera pedimos el JSON.
    if (!document.querySelector(ANCLA)) return;
    traerCopy().then(dibujar).catch(function () {
      /* último recurso: nunca romper el home */
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
  } catch (e) {
    /* nunca romper el home */
  }
})();
