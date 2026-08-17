/* Sección "Certificaciones + Prensa" del home de bloomlife.co.
 *
 * Dos franjas en una sola sección, las dos sobre #003845, insertadas justo
 * después del banner de Fundadores:
 *   1. Sellos de calidad (una sola imagen compuesta con los 8 sellos).
 *   2. "Nos conocieron en" + los 6 logos de prensa.
 *
 * Es un port literal de la sección `.sec.dark.badges` y de la franja `.press`
 * de las internas de producto: mismo copy, mismas imágenes, mismos valores de
 * CSS. La idea es que el home no invente una versión distinta de un mensaje
 * que ya está resuelto y publicado en 20 internas.
 *
 * EL COPY NO VIVE ACÁ: vive en data/trust-home.json, que se lee fresco en cada
 * carga (cache 5 min). Cambiar el título, la bajada o sumar/sacar un medio es
 * editar ese JSON y commitear — se ve en el home en <=5 min y NO hace falta
 * tocar el admin de Tienda Nube ni republicar nada. Este archivo sí está
 * pinneado a un hash en custom_seal_code, así que tocarlo a él sí pide publish.
 * Misma división que blog-home.js y capsulas-home.js: la lógica se pinnea, el
 * dato no.
 *
 * Si el JSON falla, el copy de FALLBACK de abajo mantiene la sección en pie
 * (mismo criterio que capsulas-home.js). Peor caso: se ve el copy anterior.
 *
 * El JSON se lee de raw.githubusercontent (CORS *, cache 5 min) y NO de
 * jsDelivr: jsDelivr cachea las rutas de rama hasta 7 días, justo lo contrario
 * de lo que necesita un archivo pensado para cambiar.
 *
 * Ver ESTADO_TRUST_HOME.md en el repo del proyecto.
 */
(function () {
  'use strict';

  /* Ancla: el banner de Fundadores. Va por data-store; el otro match de
     "home-banner-news" en el HTML es la clase del div interno, que este
     selector no toca. Como la sección solo existe en el home, hace de guard de
     página: en el resto del sitio no matchea y la función corta sola. */
  var ANCLA = 'section[data-store="home-banner-news"]';
  var ID = 'bl-trust-section';

  var DATA_URL =
    'https://raw.githubusercontent.com/BloomLifeArg/bloomlife-static/main/data/trust-home.json';
  var TIMEOUT_MS = 2500;

  /* Copia de seguridad del copy. Tiene que quedar en sync con el JSON — si
     divergen, esto es lo que ve el usuario cuando GitHub no responde.
     El copy es textual de las internas; la imagen de sellos es el único
     archivo que existe en el CDN (trae 8 sellos, no 7). */
  var FALLBACK = {
    certificaciones: {
      kicker: 'Sellos & calidad internacional',
      titulo: 'Producido en EE.UU., certificado para el mundo.',
      bajada:
        'Cada frasco se fabrica bajo estrictos estándares internacionales de calidad, trazabilidad y pureza de ingredientes.',
      imagen: {
        src:
          'https://acdn-us.mitiendanube.com/stores/004/969/223/products/ash_certrow_usa3-0a5078bc4485b143c917839744999686-1024-1024.png',
        alt:
          'Made in USA · GMP · Cruelty Free · Non-GMO · Vegan · Gluten Free · Sulfate Free · FDA'
      }
    },
    prensa: {
      eyebrow: 'Nos conocieron en',
      medios: [
        {
          nombre: 'Ámbito',
          url:
            'https://www.ambito.com/negocios/nuevo-negocio-crearon-una-marca-hongos-adaptogenos-y-apuntan-facturar-us1-millon-2026-n6262268',
          img:
            'https://acdn-us.mitiendanube.com/stores/004/969/223/products/press_ambito_white-9f44731820ca8a030817839563992995-1024-1024.png'
        },
        {
          nombre: 'Forbes',
          url:
            'https://www.forbesargentina.com/negocios/suplementos-naturales-sello-argentino-produccion-eeuu-crecen-15-mes-proyectan-facturar-us-1-millon-tras-su-primer-ano-n83594',
          img:
            'https://acdn-us.mitiendanube.com/stores/004/969/223/products/press_forbes_white-a4e025e2a54ff4b9ef17839564007088-1024-1024.png'
        },
        {
          nombre: 'iProfesional',
          url:
            'https://www.iprofesional.com/negocios/445702-dos-argentinos-no-paran-de-facturar-con-un-negocio-nuevo-planean-facturar-1-millon-de-dolares',
          img:
            'https://acdn-us.mitiendanube.com/stores/004/969/223/products/press_iprofesional_white-a5745efa38ae019dcb17839564020390-1024-1024.png'
        },
        {
          nombre: 'La Nación',
          url:
            'https://www.lanacion.com.ar/salud/que-son-los-adaptogenos-y-como-incorporarlos-en-la-dieta-nid09022026',
          img:
            'https://acdn-us.mitiendanube.com/stores/004/969/223/products/press_lanacion_white-a46f5e148758864b0117839564034476-1024-1024.png'
        },
      
        {
          nombre: 'TN',
          url:
            'https://tn.com.ar/sociedad/2026/02/08/dos-amigos-crearon-una-marca-de-gomitas-de-hongos-adaptogenos-y-proyectan-facturar-us-1-millon-en-2026',
          img:
            'https://acdn-us.mitiendanube.com/stores/004/969/223/products/press_tn_white-e9c4521be19a5b6f2e17839564071111-1024-1024.png'
        }
      ]
    }
  };

  /* El script se sirve desde .../js/trust-home.js; el CSS vive al lado, en
     .../css/trust-section.css. Derivarlo del propio src mantiene JS y CSS
     pinneados al mismo commit sin repetir el hash en dos lugares — y sin tocar
     css_code, que es un campo más que no hace falta republicar. */
  var self = document.currentScript;

  function cargarCSS() {
    if (document.querySelector('link[data-bl-trust]')) return;
    var href;
    try {
      href = new URL('../css/trust-section.css', self.src).href;
    } catch (e) {
      return;
    }
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    l.setAttribute('data-bl-trust', '1');
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

    var c = d.certificaciones;
    if (!c || !txt(c.kicker) || !txt(c.titulo) || !txt(c.bajada)) return false;
    if (!c.imagen || !txt(c.imagen.src)) return false;

    var p = d.prensa;
    if (!p || !txt(p.eyebrow)) return false;
    if (!Array.isArray(p.medios)) return false;
    if (p.medios.length < 1 || p.medios.length > 10) return false;

    return p.medios.every(function (m) {
      return m && txt(m.nombre) && txt(m.url) && txt(m.img);
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

  function logoHTML(m) {
    /* target=_blank + rel=noopener, igual que en las internas: son notas de
       medios externos y no queremos sacar al visitante del home. */
    return (
      '<a href="' +
      esc(m.url) +
      '" target="_blank" rel="noopener">' +
      '<img src="' +
      esc(m.img) +
      '" alt="' +
      esc(m.nombre) +
      '" loading="lazy">' +
      '</a>'
    );
  }

  function dibujar(d) {
    var ancla = document.querySelector(ANCLA);
    if (!ancla) return; // no es el home
    if (document.getElementById(ID)) return; // ya insertada

    cargarCSS();

    var c = d.certificaciones;
    var p = d.prensa;

    var sec = document.createElement('section');
    sec.id = ID;
    sec.className = 'bl-trust';
    sec.innerHTML =
      '<div class="bl-trust-certs">' +
      '<div class="bl-trust-in">' +
      '<span class="bl-trust-kicker">' +
      esc(c.kicker) +
      '</span>' +
      '<h2 class="bl-trust-h">' +
      esc(c.titulo) +
      '</h2>' +
      '<p class="bl-trust-lead">' +
      esc(c.bajada) +
      '</p>' +
      '<img class="bl-trust-certrow" src="' +
      esc(c.imagen.src) +
      '" alt="' +
      esc(txt(c.imagen.alt) || '') +
      '" loading="lazy">' +
      '</div>' +
      '</div>' +
      '<div class="bl-trust-press">' +
      '<div class="bl-trust-in">' +
      '<div class="bl-trust-eye">' +
      esc(p.eyebrow) +
      '</div>' +
      '<div class="bl-trust-logos">' +
      p.medios.map(logoHTML).join('') +
      '</div>' +
      '</div>' +
      '</div>';

    ancla.parentNode.insertBefore(sec, ancla.nextSibling);
  }

  function arrancar() {
    // Si no estamos en el home ni siquiera pedimos el JSON.
    if (!document.querySelector(ANCLA)) return;
    traerCopy()
      .then(dibujar)
      .catch(function () {
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
