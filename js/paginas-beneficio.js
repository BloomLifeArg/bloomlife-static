/* Páginas de beneficio — /foco/ /calma/ /energia/ /descanso/ /piel/
 *
 * El seal ya pintó el guard `#blp-guard` (.blp{visibility:hidden}) antes del
 * primer paint y sólo en esos 5 paths; acá se engancha la hoja real y se
 * destapa. Failsafe: si el CSS no llega, se destapa igual — mejor cruda que
 * en blanco. El seal tiene su propio timeout de 4 s por si este archivo
 * tampoco llega.
 *
 * El <link> va al <head> DESPUÉS del guard: a igual especificidad gana el
 * último, así que `.blp{visibility:visible}` de la hoja destapa aunque el
 * guard siguiera puesto.
 *
 * EL HASH DEL CSS NO ESTÁ ESCRITO ACÁ: sale de la URL de este mismo archivo,
 * así que el CSS siempre viene del MISMO COMMIT que este JS. Antes estaba
 * hardcodeado y eran dos pines que podían quedar desincronizados, y encima
 * obligaba a dos commits por cada cambio de CSS. Ahora los dos archivos
 * viajan juntos y en el seal hay un solo hash que mover.
 */
(function () {
  var d = document;
  var yo = d.currentScript;   // leerlo YA: más adelante puede ser null
  var base = (yo && yo.src)
    ? yo.src.replace(/\/js\/paginas-beneficio\.js.*$/, '')
    // Sólo si currentScript no estuviera disponible. @main puede servir una
    // versión vieja (jsDelivr la cachea), pero es mejor que quedarse sin hoja.
    : 'https://cdn.jsdelivr.net/gh/BloomLifeArg/bloomlife-static@main';

  var reveal = function () {
    var g = d.getElementById('blp-guard');
    if (g) g.remove();
  };
  var l = d.createElement('link');
  l.rel = 'stylesheet';
  l.href = base + '/css/paginas-beneficio.css';
  l.onload = l.onerror = reveal;
  setTimeout(reveal, 4000);
  d.head.appendChild(l);
})();
