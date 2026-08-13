/* Sección "También en cápsulas" del home de bloomlife.co.
 *
 * Inserta una sección de contraste (fondo #003845) justo después de
 * "We Love Gummies", con una foto lifestyle a la izquierda y tres cards de la
 * línea de cápsulas a la derecha.
 *
 * Por qué va por JS y no por un módulo nativo del tema: los módulos de TN que
 * podrían servir exigen cargar cada card a mano en el editor de diseño, y sus
 * controles (ojo de visibilidad, lápiz de edición) no responden a automación.
 * Ver ESTADO_CAPSULAS_HOME.md en el repo del proyecto.
 *
 * Por qué el markup vive acá y no en custom_seal_code: ese campo estaba a
 * 54.379 chars de un techo de 56.000, y el HTML inline se comía casi todo el
 * margen (solo las URLs ya son ~720 chars). El campo se vació una vez en julio
 * por pasarse. Acá el costo en el seal es el loader de 229 chars y nada más.
 *
 * Todo va dentro de try/catch: si algo se rompe, la sección no se dibuja y el
 * home queda intacto. Nunca romper el home.
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

  var CDN = 'https://acdn-us.mitiendanube.com/stores/004/969/223/products/';
  var TIENDA = 'https://www.bloomlife.co/productos/';

  var EYEBROW = 'También en cápsulas';
  var TITULO = 'El formato de siempre.';
  var BAJADA = 'Para quienes prefieren una rutina sin sabor ni azúcar.';

  /* Foto lifestyle de la interna de Ashwagandha Cápsulas: manos, vaso de agua,
     cápsulas sobre la mesa. Es la única del catálogo que muestra la toma en
     situación de consumo y no producto sobre fondo neutro. */
  var FOTO = CDN + 'ash_ritual_mano-7cfad2ab9f708a0eb017839489149855-1024-1024.jpg';
  var FOTO_ALT = 'Manos con un vaso de agua y cápsulas de Bloom Life sobre la mesa';

  /* Los frascos son los PNG cuadrados con fondo transparente que ya usan las
     internas en las filas de familia: mismo encuadre y misma luz en los tres,
     así la fila queda pareja.

     El nombre de la card omite "Cápsulas" a propósito: el eyebrow de la sección
     ya dice cápsulas y repetirlo en las tres cards partía los nombres en más
     líneas sin agregar información. "Melena de León" nunca se acorta a
     "Melena" — es convención fija de la marca. */
  var PRODUCTOS = [
    {
      nombre: 'Melena de León',
      url: TIENDA + 'melena-de-leon-claridad-mental-capsulas/',
      img: CDN + 'mdl_frasco_sq-cd3bf40bb0a8de7d3017846899477616-1024-1024.png',
      alt: 'Frasco de Melena de León en cápsulas'
    },
    {
      nombre: 'Ashwagandha',
      url: TIENDA + 'ashwagandha-equilibrio-hormonal-capsulas/',
      img: CDN + 'ash_frasco_sq-1de3135a64ac514e1317846899679453-1024-1024.png',
      alt: 'Frasco de Ashwagandha en cápsulas'
    },
    {
      nombre: 'Bye Bye Anxiety',
      url: TIENDA + 'combo-bye-bye-anxiety-suplementacion-por-1-mes/',
      img: CDN + 'bye-bye-combos-bloom-529c4348dfddb872c417761714962952-1024-1024.png',
      alt: 'Combo Bye Bye Anxiety: frascos de Ashwagandha y Melena de León en cápsulas',
      badge: 'Lo más completo'
    }
  ];

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

  function cardHTML(p) {
    return (
      '<a class="bl-caps-card' +
      (p.badge ? ' bl-caps-card--feat' : '') +
      '" href="' +
      esc(p.url) +
      '">' +
      '<img src="' +
      esc(p.img) +
      '" alt="' +
      esc(p.alt) +
      '" loading="lazy">' +
      '<span class="bl-caps-info">' +
      '<span class="bl-caps-badge">' +
      (p.badge ? esc(p.badge) : '') +
      '</span>' +
      '<span class="bl-caps-name">' +
      esc(p.nombre) +
      '</span>' +
      '</span>' +
      '<span class="bl-caps-buy">Comprar &rarr;</span>' +
      '</a>'
    );
  }

  function arrancar() {
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
      esc(FOTO) +
      '" alt="' +
      esc(FOTO_ALT) +
      '" loading="lazy">' +
      '</div>' +
      '<div class="bl-caps-body">' +
      '<p class="bl-caps-eyebrow">' +
      esc(EYEBROW) +
      '</p>' +
      '<h2 class="bl-caps-h">' +
      esc(TITULO) +
      '</h2>' +
      '<p class="bl-caps-sub">' +
      esc(BAJADA) +
      '</p>' +
      '<div class="bl-caps-cards">' +
      PRODUCTOS.map(cardHTML).join('') +
      '</div>' +
      '</div>' +
      '</div>';

    ancla.parentNode.insertBefore(sec, ancla.nextSibling);
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
