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
 */
(function () {
  var d = document;
  var reveal = function () {
    var g = d.getElementById('blp-guard');
    if (g) g.remove();
  };
  var l = d.createElement('link');
  l.rel = 'stylesheet';
  l.href = 'https://cdn.jsdelivr.net/gh/BloomLifeArg/bloomlife-static@496ceddbb0f5e1d68b19c472c773b0f12c693816/css/paginas-beneficio.css';
  l.onload = l.onerror = reveal;
  setTimeout(reveal, 4000);
  d.head.appendChild(l);
})();
