/* Páginas de beneficio — /foco/ /calma/ /energia/ /descanso/ /piel/
 * y páginas institucionales — /suscripciones/ /preguntas-frecuentes/
 * /politica-de-devolucion/ /contacto/
 *
 * El seal ya pintó el guard `#blp-guard` antes del primer paint y sólo en
 * esos paths (`.blp{visibility:hidden}`; en /contacto/, que no tiene .blp
 * hasta que se construye, `.contact-page{visibility:hidden}`); acá se
 * enganchan las hojas reales y se destapa. Failsafe: si algo no llega, se
 * destapa igual — mejor cruda que en blanco. El seal tiene su propio timeout
 * de 4 s por si este archivo tampoco llega.
 *
 * El <link> va al <head> DESPUÉS del guard: a igual especificidad gana el
 * último, así que `.blp{visibility:visible}` de la hoja destapa aunque el
 * guard siguiera puesto.
 *
 * EL HASH DE LOS OTROS ARCHIVOS NO ESTÁ ESCRITO ACÁ: sale de la URL de este
 * mismo archivo, así que CSS y JS vienen siempre del MISMO COMMIT que este.
 * En el seal hay un solo hash que mover.
 *
 * En las cuatro institucionales se suman css/paginas-institucionales.css y
 * js/paginas-institucionales.js (acordeón, buscador del FAQ y la
 * reconstrucción de /contacto/). Ese JS avisa por window.blpDone() cuando
 * terminó de armar el DOM, y recién ahí se destapa: si se destapara al
 * cargar el archivo, /contacto/ mostraría un instante el formulario crudo.
 */
(function () {
  var d = document;
  var yo = d.currentScript;   // leerlo YA: más adelante puede ser null
  var base = (yo && yo.src)
    ? yo.src.replace(/\/js\/paginas-beneficio\.js.*$/, '')
    // Sólo si currentScript no estuviera disponible. @main puede servir una
    // versión vieja (jsDelivr la cachea), pero es mejor que quedarse sin hoja.
    : 'https://cdn.jsdelivr.net/gh/BloomLifeArg/bloomlife-static@main';

  var INST = /^\/(suscripciones|preguntas-frecuentes|politica-de-devolucion|contacto)\/?$/
    .test(location.pathname);

  var pend = 0, listo = false;
  var reveal = function () {
    if (listo) return;
    listo = true;
    // el css_code esconde .blp desde el <head> hasta que alguien pone html.bl-ok
    if (d.documentElement.className.indexOf('bl-ok') < 0) d.documentElement.className += ' bl-ok';
    var g = d.getElementById('blp-guard');
    if (g) g.remove();
  };
  var uno = function () { if (--pend <= 0) reveal(); };

  var css = function (f) {
    pend++;
    var l = d.createElement('link');
    l.rel = 'stylesheet';
    l.href = base + '/css/' + f;
    l.onload = l.onerror = uno;
    d.head.appendChild(l);
  };

  css('paginas-beneficio.css');
  if (INST) {
    css('paginas-institucionales.css');
    pend++;
    window.blpDone = uno;              // lo llama paginas-institucionales.js al terminar
    var s = d.createElement('script');
    s.src = base + '/js/paginas-institucionales.js';
    s.onerror = uno;
    d.head.appendChild(s);
  }
  setTimeout(reveal, 4000);
})();
