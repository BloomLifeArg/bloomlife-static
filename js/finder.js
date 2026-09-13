/* Finder guiado — /que-suplemento-es-para-vos/
 *
 * Lo carga js/paginas-beneficio.js junto con css/finder.css, solo en ese path.
 * La página del CMS trae un markup pelado (.blp .blp-finder) con el hero y,
 * dentro de .bfn-app, la lista de los cinco adaptógenos como contenido sin JS.
 * Este archivo reemplaza esa lista por el asistente: tres preguntas, una por
 * pantalla, y una recomendación principal + una alternativa.
 *
 * Todo el criterio está en TABLAS al principio (objetivo → ingrediente,
 * ingrediente → producto, momento → compañero) y en una función de puntaje
 * sobre data/combos-categoria.json (con copia de respaldo acá adentro por si
 * el JSON no llega). El estado vive en el hash: #r=foco,calma;f=gum;m=noche.
 *
 * Al terminar de armar el DOM avisa por window.blpDone() para que
 * paginas-beneficio.js saque el guard anti-FOUC. Expone window.bfn (estado y
 * recomendar) para que assets-finder/verificar.py recorra todas las
 * combinaciones sin clickear.
 */
(function () {
  var d = document;
  var yo = d.currentScript;
  var base = (yo && yo.src) ? yo.src.replace(/\/js\/finder\.js.*$/, '')
    : 'https://cdn.jsdelivr.net/gh/BloomLifeArg/bloomlife-static@main';
  var SITE = 'https://www.bloomlife.co';
  var CDN = 'https://acdn-us.mitiendanube.com/stores/004/969/223/products/';

  /* ══════════════ 1. TABLAS ══════════════ */

  // Pregunta 1. `ing` es el adaptógeno que cubre el objetivo; `cobj` la clave
  // con la que combos-categoria.json etiqueta ese objetivo en sus combos.
  var OBJ = {
    foco:     { corto: 'foco', t: 'Foco y claridad',       d: 'Concentrarte sin releer tres veces lo mismo.',          ing: 'mln', cobj: 'foco',    art: 'el foco',
                frase: 'apoya los factores que el cerebro usa para regenerarse y conectar: la base de una mente despierta.' },
    calma:    { corto: 'calma', t: 'Calma y menos estrés',  d: 'Bajar un cambio cuando la cabeza no para.',             ing: 'ash', cobj: 'calma',   art: 'la calma',
                frase: 'se asocia con una respuesta más equilibrada del cuerpo frente al estrés sostenido.' },
    energia:  { corto: 'energía', t: 'Energía sostenida',     d: 'Llegar a la tarde sin el tercer café.',                 ing: 'cor', cobj: 'energia', art: 'la energía',
                frase: 'se asocia con un mejor aprovechamiento del oxígeno y con la producción de energía en las células.' },
    dormir:   { corto: 'dormir mejor', t: 'Dormir mejor',          d: 'Descansar de verdad, no solo cumplir horas.',           ing: 'rsh', cobj: 'dormir',  art: 'el descanso',
                frase: 'se asocia con un descanso más profundo, no solo con más horas.' },
    piel:     { corto: 'piel', t: 'Piel e hidratación',    d: 'Que se note desde adentro, con constancia.',            ing: 'trm', cobj: 'piel',    art: 'la piel',
                frase: 'retiene agua como pocos ingredientes: hidratación que trabaja desde adentro.' },
    defensas: { corto: 'defensas', t: 'Defensas',              d: 'Acompañar al cuerpo cuando le pedís de más.',           ing: 'rsh', cobj: 'dormir',  art: 'las defensas',
                frase: 'acompaña al sistema inmune, sobre todo cuando venís exigiéndole demasiado al cuerpo.' }
  };
  var OBJ_ORDEN = ['foco', 'calma', 'energia', 'dormir', 'piel', 'defensas'];

  // Ingredientes. `ventana` = cuándo rinde más (decide si la alternativa es el
  // pack x3 o un combo que sume el compañero del momento). `orden` ordena las
  // filas de "Cuándo tomarlo" como un día: mañana → cualquiera → tarde → noche.
  var ING = {
    mln: { nombre: 'Melena de León', pc: 'blp-p-melena', rol: 'el foco', orden: 1, ventana: ['manana'],
           cuando: 'a la mañana, antes de arrancar el día.',
           gum: { handle: 'melena-de-leon-claridad-mental-gummies', img: 'glo_frasco_mlg_aligned-cdf69710d3ae1ba92f17852036974149-480-0.png',
                  x3: 'combo-brain-health-gummies-suplementacion-por-3-meses' },
           cap: { handle: 'melena-de-leon-claridad-mental-capsulas', img: 'mdl_frasco_sq-cd3bf40bb0a8de7d3017846899477616-480-0.png',
                  x3: 'combo-brain-health-capsulas-suplementacion-por-3-meses' } },
    ash: { nombre: 'Ashwagandha', pc: 'blp-p-ashwagandha', rol: 'la calma', orden: 3, ventana: ['tarde', 'noche'],
           cuando: 'a la tarde o a la noche, cuando el estrés se acumula.',
           gum: { handle: 'ashwagandha-equilibrio-hormonal-gummies', img: 'glo_frasco_ashg_aligned-81dc67e47c74152bf817852036948664-480-0.png',
                  x3: 'combo-hormonal-balance-suplementacion-con-ashwagandha-gummies-por-3-meses' },
           cap: { handle: 'ashwagandha-equilibrio-hormonal-capsulas', img: 'ash_frasco_sq-1de3135a64ac514e1317846899679453-480-0.png',
                  x3: 'combo-hormonal-balance-suplementacion-por-3-meses-con-ashwagandha-capsulas' } },
    cor: { nombre: 'Cordyceps', pc: 'blp-p-cordyceps', rol: 'la energía', orden: 1, ventana: ['manana'],
           cuando: 'a la mañana, o un rato antes de entrenar.',
           gum: { handle: 'cordyceps-energia-sostenida-gummies', img: 'glo_frasco_cor_aligned-f687f8835f6b10a31c17852037001289-480-0.png',
                  x3: 'combo-energy-support-suplementacion-por-3-meses' } },
    rsh: { nombre: 'Reishi', pc: 'blp-p-reishi', rol: 'el descanso', orden: 4, ventana: ['noche'],
           cuando: 'a la noche, un rato antes de acostarte.',
           gum: { handle: 'reishi-descanso-profundo-gummies-kjqoe', img: 'glo_frasco_rsh_aligned-219725eb8c5265ca8017852036922133-480-0.png',
                  x3: 'combo-relaxation-suplementacion-por-3-meses' } },
    trm: { nombre: 'Tremella', pc: 'blp-p-tremella', rol: 'la piel', orden: 2, ventana: ['tarde'],
           cuando: 'en cualquier momento del día, siempre a la misma hora.',
           gum: { handle: 'tremella-hongo-de-la-belleza-gummies-1n9ff', img: 'glo_frasco_trm_aligned-5c8a6794e8d4bcffeb17852036898521-480-0.png',
                  x3: 'combobeautiful' } }
  };
  // Precios de los sueltos: no están en ningún JSON del repo estático.
  var PRECIO = { single: 69500, x3: 198075, x3lista: 208500 };

  // Pregunta 2.
  var FMT = {
    gum: { t: 'Gummies',    d: 'Dos gomitas al día, ricas y sin agua. Nuestro diferencial.', en: 'en gummies' },
    cap: { t: 'Cápsulas',   d: 'Un vaso de agua y listo. Melena de León y Ashwagandha.',      en: 'en cápsulas' },
    any: { t: 'Me da igual', d: 'Te recomendamos el formato que mejor cubra lo que buscás.', en: 'en el formato que mejor cubra' }
  };
  var FMT_ORDEN = ['gum', 'cap', 'any'];

  // Pregunta 3. `comp` es el adaptógeno que suma cuando el momento difícil no
  // coincide con la ventana del que ya cubre el objetivo.
  var MOM = {
    manana: { t: 'Mañana',       d: 'Arrancar cuesta, y la cabeza tarda en prenderse.',        comp: 'cor', la: 'la mañana' },
    tarde:  { t: 'Tarde',        d: 'Después de almorzar se apaga todo.',                       comp: 'ash', la: 'la tarde' },
    noche:  { t: 'Noche',        d: 'Llegás acelerado y apagar la cabeza es lo difícil.',       comp: 'rsh', la: 'la noche' },
    dia:    { t: 'Todo el día',  d: 'Un poco de todo, todo el tiempo.',                          comp: null,  la: 'el día entero' }
  };
  var MOM_ORDEN = ['manana', 'tarde', 'noche', 'dia'];

  // Copia mínima de data/combos-categoria.json por si el fetch falla. Mismos
  // campos que usa el puntaje. Si el JSON llega, manda el JSON.
  var FALLBACK = [
    { id: 270150341, nombre: 'High Performance', formato: 'Gomitas', ing: ['cor', 'mln'], caps: [], objetivos: ['energia', 'foco'], handle: 'combo-performance-gummies-suplementacion-por-1-mes', precio: 132050, lista: 139000, vendidas: 163, why: 'Cuerpo y mente para las horas que exigen.' },
    { id: 279852999, nombre: 'Bye Bye Anxiety', formato: 'Cápsulas', ing: ['ash', 'mln'], caps: ['ash', 'mln'], objetivos: ['calma', 'foco'], handle: 'combo-bye-bye-anxiety-suplementacion-por-1-mes', precio: 132050, lista: 139000, vendidas: 434, why: 'Bajar un cambio sin perder la mente clara.' },
    { id: 305609431, nombre: 'Bye Bye Anxiety', formato: 'Gomitas', ing: ['ash', 'mln'], caps: [], objetivos: ['calma', 'foco'], handle: 'combo-bye-bye-anxiety-ashwagandha-melena-de-leon-gummies-56w9q', precio: 132050, lista: 139000, vendidas: 159, why: 'La misma fórmula, en gomita: calma y claridad.' },
    { id: 294585978, nombre: 'Deep Sleep', formato: 'Gomitas', ing: ['ash', 'rsh'], caps: [], objetivos: ['dormir', 'calma'], handle: 'deepsleep', precio: 132050, lista: 139000, vendidas: 0, why: 'Cerrar el día de verdad y despertarte repuesto.' },
    { id: 294591691, nombre: 'Clarity & Defense', formato: 'Gomitas', ing: ['mln', 'rsh'], caps: [], objetivos: ['foco'], handle: 'comboclarityanddefense', precio: 132050, lista: 139000, vendidas: 0, why: 'Foco sostenido, con las defensas acompañadas.' },
    { id: 330540800, nombre: 'Beauty & Balance', formato: 'Gomitas', ing: ['trm', 'rsh'], caps: [], objetivos: ['piel', 'dormir'], handle: 'combo-beauty-balance-tremella-reishi-wb97u', precio: 132050, lista: 139000, vendidas: 0, why: 'Lo que se ve, y el descanso que lo sostiene.' },
    { id: 341180946, nombre: 'Glow & Go', formato: 'Gomitas', ing: ['trm', 'cor'], caps: [], objetivos: ['piel', 'energia'], handle: 'glow-go-combo-tremella-y-cordyceps-gummies-134yf', precio: 132050, lista: 139000, vendidas: 0, why: 'Verte bien sin quedarte sin energía.' },
    { id: 349316562, nombre: 'Glow & Regulate', formato: 'Gomitas', ing: ['trm', 'ash'], caps: [], objetivos: ['piel', 'calma'], handle: 'glow-calma-combo-tremella-y-ashwagandha-gummies-3tmb0', precio: 132050, lista: 139000, vendidas: 0, why: 'Belleza desde adentro, con el estrés en su lugar.' },
    { id: 294593106, nombre: 'Full Day Stack', formato: 'Gomitas', ing: ['mln', 'cor', 'rsh'], caps: [], objetivos: ['dia', 'dormir'], handle: 'full-day-gummies-melena-de-leon-cordyceps-reishi', precio: 198075, lista: 208500, vendidas: 0, why: 'Foco, energía y descanso: el arco entero del día.' },
    { id: 325250064, nombre: 'All Day Stack', formato: 'Gomitas', ing: ['mln', 'cor', 'ash'], caps: [], objetivos: ['dia', 'calma'], handle: 'fulldaygummies2', precio: 198075, lista: 208500, vendidas: 0, why: 'El día completo, cerrando con calma en vez de sueño.' },
    { id: 331475056, nombre: 'All Day Mix', formato: 'Mixto', ing: ['mln', 'cor', 'ash'], caps: ['mln', 'ash'], objetivos: ['dia', 'foco'], handle: 'fulldaymix', precio: 198075, lista: 208500, vendidas: 0, why: 'El mismo día completo, para quien prefiere la cápsula.' },
    { id: 339648634, nombre: 'Glow your Mind', formato: 'Gomitas', ing: ['trm', 'mln', 'ash'], caps: [], objetivos: ['piel', 'foco'], handle: 'glowyourmindgummies', precio: 198075, lista: 208500, vendidas: 0, why: 'Verse bien, pensar mejor, sentirse en calma.' },
    { id: 342427990, nombre: 'Radiance & Mind', formato: 'Gomitas', ing: ['trm', 'mln', 'rsh'], caps: [], objetivos: ['piel', 'foco'], handle: 'radiance-mind-combo-1y7mt', precio: 198075, lista: 208500, vendidas: 0, why: 'Piel cuidada, mente clara, cuerpo que se repone.' },
    { id: 357970572, nombre: 'Glow & Energy', formato: 'Mixto', ing: ['trm', 'cor', 'ash'], caps: ['ash'], objetivos: ['piel', 'energia'], handle: 'glow-energy-combo-tremella-ashwagandha-capsulas-cordyceps-y48oq', precio: 198075, lista: 208500, vendidas: 0, why: 'Piel, energía pareja y una mente tranquila.' },
    { id: 357970722, nombre: 'Menopause Balance', formato: 'Gomitas', ing: ['ash', 'mln', 'rsh'], caps: [], objetivos: ['calma', 'dormir'], handle: 'menopausebalancegummies', precio: 198075, lista: 208500, vendidas: 0, why: 'Para transitar la etapa con calma y descanso.' },
    { id: 294595560, nombre: 'Ultimate Balance', formato: 'Gomitas', ing: ['mln', 'cor', 'ash', 'rsh'], caps: [], objetivos: ['dia', 'dormir'], handle: 'combo-gloria-adaptogena-ashwagandha-reishi-cordyceps-melena-de-leon-gummies-ubwy1', precio: 264100, lista: 278000, vendidas: 0, why: 'Los cuatro tramos del día, sin huecos.' },
    { id: 341313375, nombre: 'Fresh Flow', formato: 'Gomitas', ing: ['mln', 'cor', 'trm', 'ash'], caps: [], objetivos: ['dia', 'piel'], handle: 'fresh-flow-combo-1km44', precio: 264100, lista: 278000, vendidas: 0, why: 'Mente, cuerpo, piel y calma a la vez.' },
    { id: 356749974, nombre: 'Ultimate Balance Mix', formato: 'Mixto', ing: ['mln', 'ash', 'trm', 'rsh'], caps: ['mln', 'ash'], objetivos: ['dia', 'piel'], handle: 'ultimate-balance-mix-ashwagandha-reishi-cordyceps-melena-de-leon-gummies-copia-8qbws', precio: 264100, lista: 278000, vendidas: 0, why: 'El combo completo, en dos formatos.' },
    { id: 330540927, nombre: 'Glory Gummies', formato: 'Gomitas', ing: ['trm', 'rsh', 'ash', 'mln', 'cor'], caps: [], objetivos: ['dia', 'piel'], handle: 'glorygummies', precio: 330125, lista: 347500, vendidas: 0, why: 'Los cinco adaptógenos. El sistema entero.' }
  ];

  /* ══════════════ 2. UTILIDADES ══════════════ */
  function el(tag, cls, html) {
    var e = d.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function plata(n) { return '$' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function has(arr, k) { return arr.indexOf(k) > -1; }
  function uniq(arr) { var o = [], i; for (i = 0; i < arr.length; i++) if (!has(o, arr[i])) o.push(arr[i]); return o; }
  function href(handle) { return SITE + '/productos/' + handle + '/'; }
  function reduced() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  function ga(ev, params) {
    try {
      if (!window.dataLayer || typeof window.dataLayer.push !== 'function') return;
      var o = { event: ev }, k;
      for (k in params) if (params.hasOwnProperty(k)) o[k] = params[k];
      window.dataLayer.push(o);
    } catch (e) {}
  }
  function y(lista) {
    // "foco y calma" / "foco, calma y energía"
    if (lista.length < 2) return lista.join('');
    return lista.slice(0, -1).join(', ') + ' y ' + lista[lista.length - 1];
  }

  /* ══════════════ 3. ESTADO EN EL HASH ══════════════ */
  // #r=foco,calma;f=gum;m=noche  — sólo claves válidas; el paso se deriva.
  function leer() {
    var s = { r: [], f: null, m: null, p: null };
    var h = location.hash.replace(/^#/, '');
    if (!h) return s;
    h.split(';').forEach(function (par) {
      var i = par.indexOf('='); if (i < 0) return;
      var k = par.slice(0, i), v = par.slice(i + 1);
      if (k === 'r') s.r = uniq(v.split(',').filter(function (x) { return OBJ[x]; })).slice(0, 2);
      else if (k === 'f' && FMT[v]) s.f = v;
      else if (k === 'm' && MOM[v]) s.m = v;
      else if (k === 'p' && /^[123]$/.test(v)) s.p = +v;
    });
    if (!s.r.length) { s.f = null; s.m = null; }
    else if (!s.f) s.m = null;
    if (s.p && s.p >= derivado(s)) s.p = null;
    return s;
  }
  // el paso que las respuestas implican…
  function derivado(s) {
    if (!s.r.length) return 1;
    if (!s.f) return 2;
    if (!s.m) return 3;
    return 4;
  }
  // …y el que se muestra: "Volver" baja `p` sin borrar lo respondido, así las
  // opciones aparecen preseleccionadas y el link sigue siendo compartible.
  function paso(s) { var dv = derivado(s); return (s.p && s.p < dv) ? s.p : dv; }
  function serializar(s) {
    var p = [];
    if (s.r.length) p.push('r=' + s.r.join(','));
    if (s.r.length && s.f) p.push('f=' + s.f);
    if (s.r.length && s.f && s.m) p.push('m=' + s.m);
    if (s.p && s.p < derivado(s)) p.push('p=' + s.p);
    return p.length ? '#' + p.join(';') : '';
  }
  function escribir(s) {
    var h = serializar(s);
    var url = location.pathname + location.search + h;
    if (history.pushState) history.pushState(null, '', url);
    else location.hash = h;
  }

  /* ══════════════ 4. RECOMENDACIÓN ══════════════ */
  var combos = FALLBACK, combosListo = false, combosEspera = [];

  function puntaje(c, need, fmt, m, cobjs) {
    var i, n;
    for (i = 0; i < need.length; i++) if (!has(c.ing, need[i])) return null;   // tiene que cubrirlos todos
    var s = -(c.ing.length - need.length) * 10;                                // cada frasco de más pesa
    if (m === 'dia' && has(c.objetivos, 'dia')) s += 18;                        // "todo el día" pide un stack (18 > 10 de frasco extra + 6 de formato + 3 de objetivo)
    if (fmt === 'gum') s += c.formato === 'Gomitas' ? 6 : c.formato === 'Mixto' ? -4 : -8;
    else if (fmt === 'cap') {
      for (n = 0, i = 0; i < need.length; i++) if (has(c.caps || [], need[i])) n++;
      s += n * 5 + (c.formato === 'Cápsulas' ? 6 : c.formato === 'Gomitas' ? -2 : 0);
    } else s += c.formato === 'Gomitas' ? 3 : 0;                                // "me da igual" → gummies, el diferencial
    for (i = 0; i < cobjs.length; i++) if (has(c.objetivos, cobjs[i])) s += 3;   // que el combo esté pensado para eso
    if (m && MOM[m].comp && has(c.ing, MOM[m].comp)) s += 2;                     // desempate: trae el compañero del momento
    s += Math.min(c.vendidas || 0, 500) / 250;                                   // y lo que la gente ya elige
    return s;
  }
  function mejorCombo(need, fmt, m, cobjs, excluir, minSize) {
    var best = null, bs = -1e9;
    combos.forEach(function (c) {
      if (excluir && c.id === excluir.id) return;
      if (minSize && c.ing.length < minSize) return;
      var s = puntaje(c, need, fmt, m, cobjs || []);
      if (s !== null && s > bs) { bs = s; best = c; }
    });
    return best;
  }

  function imgDe(k, cap) {
    var v = (cap && ING[k].cap) ? ING[k].cap : ING[k].gum;
    return { src: CDN + v.img, alt: 'Frasco de ' + ING[k].nombre + (cap && ING[k].cap ? ' Cápsulas' : ' Gummies') + ' de Bloom Life' };
  }
  function filasCuando(keys, capsDe) {
    return keys.slice().sort(function (a, b) { return ING[a].orden - ING[b].orden; }).map(function (k) {
      return { k: k, pc: ING[k].pc, html: '<b>' + esc(ING[k].nombre) + (has(capsDe, k) ? ' (cápsulas)' : '') + '</b> — ' + esc(ING[k].cuando) };
    });
  }

  function productoSingle(k, fmt, objs, m) {
    var cap = fmt === 'cap' && !!ING[k].cap;
    var v = cap ? ING[k].cap : ING[k].gum;
    var frases = objs.filter(function (o) { return OBJ[o].ing === k; }).map(function (o) {
      return '<b>' + esc(ING[k].nombre) + '</b> ' + esc(OBJ[o].frase);
    });
    var why = frases.join(' ');
    if (m && m !== 'dia') {
      why += has(ING[k].ventana, m)
        ? ' Y rinde justo en tu momento: ' + esc(ING[k].cuando.replace(/\.$/, '')) + '.'
        : ' Lo que más te cuesta es ' + esc(MOM[m].la) + ', y ahí este solo llega hasta cierto punto: por eso abajo te dejamos una opción que suma ' + esc(ING[MOM[m].comp].nombre) + '.';
    }
    return {
      tipo: 'single', k: k, pc: ING[k].pc, size: 1,
      nombre: ING[k].nombre, nombre_em: cap ? 'Cápsulas' : 'Gummies',
      handle: v.handle, href: href(v.handle),
      imgs: [imgDe(k, cap)],
      precio: PRECIO.single, lista: null,
      tags: [cap ? 'Cápsulas' : 'Gummies', 'Rinde 1 mes'],
      why: why,
      cuando: filasCuando([k], cap ? [k] : []),
      nota: (fmt === 'cap' && !ING[k].cap)
        ? esc(ING[k].nombre) + ' viene solo en gummies: te lo recomendamos igual porque es el que mejor cubre lo que buscás.' : null
    };
  }
  function productoX3(k, fmt) {
    var cap = fmt === 'cap' && !!ING[k].cap;
    var v = cap ? ING[k].cap : ING[k].gum;
    return {
      tipo: 'x3', k: k, pc: ING[k].pc, size: 3,
      nombre: ING[k].nombre + ' ' + (cap ? 'Cápsulas' : 'Gummies'), nombre_em: '× 3 meses',
      handle: v.x3, href: href(v.x3),
      imgs: [imgDe(k, cap), imgDe(k, cap), imgDe(k, cap)],
      precio: PRECIO.x3, lista: PRECIO.x3lista,
      tags: [cap ? 'Cápsulas' : 'Gummies', '3 frascos', '3 meses'],
      kicker: 'Si ya sabés que es el tuyo',
      why: 'Tres frascos en una compra, con el 5% que llevan los combos. Los adaptógenos se notan con constancia: tres meses es el tiempo justo para saberlo.',
      cuando: filasCuando([k], cap ? [k] : []), nota: null
    };
  }
  function productoCombo(c, need, fmt, objs) {
    var extra = c.ing.filter(function (k) { return !has(need, k); });
    var partes = objs.map(function (o) {
      return '<b>' + esc(ING[OBJ[o].ing].nombre) + '</b> para ' + esc(OBJ[o].art);
    });
    var why = '<span class="bfn-em">' + esc(c.why) + '</span> ';
    if (need.length > 1) {
      why += 'Cubre ' + esc(y(objs.map(function (o) { return OBJ[o].corto; }))) + ' en ' + c.ing.length + ' frascos: ' + y(partes) + '.';
      if (extra.length) why += ' Y además trae ' + y(extra.map(function (k) { return '<b>' + esc(ING[k].nombre) + '</b> para ' + esc(ING[k].rol); })) + '.';
    } else {
      why += y(partes) + (extra.length ? '; ' + y(extra.map(function (k) { return '<b>' + esc(ING[k].nombre) + '</b>'; })) + (extra.length > 1 ? ' completan' : ' completa') + ' el día con ' + esc(y(extra.map(function (k) { return ING[k].rol; }))) + '.' : '.');
    }
    var caps = c.caps || [];
    var nota = null;
    if (fmt === 'cap') {
      var sin = need.filter(function (k) { return !has(caps, k); });
      if (sin.length) nota = y(sin.map(function (k) { return ING[k].nombre; })) + (sin.length > 1 ? ' vienen' : ' viene') + ' solo en gummies; por eso este combo ' + (c.formato === 'Mixto' ? 'mezcla los dos formatos.' : 'es en gummies.');
    } else if (fmt === 'gum' && c.formato !== 'Gomitas') {
      nota = 'Este combo trae ' + y(caps.map(function (k) { return ING[k].nombre; })) + ' en cápsulas: no hay una versión toda en gummies que junte estos adaptógenos.';
    }
    var fmtTag = c.formato === 'Gomitas' ? 'Gummies' : c.formato === 'Cápsulas' ? 'Cápsulas' : 'Gummies + cápsulas';
    return {
      tipo: 'combo', id: c.id, size: c.ing.length, pc: ING[c.ing[0]].pc,
      nombre: c.nombre, nombre_em: c.formato === 'Mixto' ? 'Mix' : (c.formato === 'Cápsulas' ? 'Cápsulas' : 'Gummies'),
      handle: c.handle, href: href(c.handle),
      imgs: c.ing.map(function (k) { return imgDe(k, has(caps, k)); }),
      precio: c.precio, lista: c.lista && c.lista > c.precio ? c.lista : null,
      tags: [fmtTag, c.ing.length + ' frascos', 'Rinde 1 mes'],
      why: why, cuando: filasCuando(c.ing, caps), nota: nota
    };
  }

  // La función central. Devuelve {main, alt} o null si el estado no está completo.
  function recomendar(s) {
    if (paso(s) < 4) return null;
    var objs = s.r, fmt = s.f, m = s.m;
    var need = uniq(objs.map(function (o) { return OBJ[o].ing; }));
    var cobjs = uniq(objs.map(function (o) { return OBJ[o].cobj; }));
    var main, alt, c;

    if (need.length === 1) {
      var k = need[0];
      if (m === 'dia') {
        c = mejorCombo(need, fmt, m, cobjs);
        main = productoCombo(c, need, fmt, objs);
        main.kicker = 'Para el día entero';
        alt = productoSingle(k, fmt, objs, null);
        alt.kicker = 'Si preferís empezar por uno';
        alt.why = esc(ING[k].nombre) + ' es el que cubre ' + esc(y(objs.map(function (o) { return OBJ[o].art; }))) + '. Empezá por acá y sumá el resto cuando lo sientas.';
      } else {
        main = productoSingle(k, fmt, objs, m);
        main.kicker = 'Para ' + y(objs.map(function (o) { return OBJ[o].art; }));
        var comp = MOM[m].comp;
        if (has(ING[k].ventana, m) || comp === k) {
          alt = productoX3(k, fmt);
        } else {
          c = mejorCombo([k, comp], fmt, m, cobjs);
          alt = c ? productoCombo(c, [k, comp], fmt, objs) : productoX3(k, fmt);
          if (c) {
            alt.kicker = 'Para cubrir también ' + MOM[m].la;
            alt.why = '<span class="bfn-em">' + esc(c.why) + '</span> Suma <b>' + esc(ING[comp].nombre) + '</b> para ' + esc(ING[comp].rol) + ', que es lo que ' + esc(MOM[m].la) + ' te pide.';
          }
        }
      }
    } else {
      c = mejorCombo(need, fmt, m, cobjs);
      main = productoCombo(c, need, fmt, objs);
      main.kicker = m === 'dia' ? 'Para el día entero' : 'Para ' + y(objs.map(function (o) { return OBJ[o].art; }));
      if (c.ing.length >= 3) {
        var c2 = mejorCombo(need, fmt, null, cobjs, c);
        if (c2 && c2.ing.length < c.ing.length) {
          alt = productoCombo(c2, need, fmt, objs);
          alt.kicker = 'Si preferís empezar por dos';
          alt.why = '<span class="bfn-em">' + esc(c2.why) + '</span> Los dos que cubren lo que elegiste, sin el tercero.';
        }
      }
      if (!alt && m === 'dia') {
        var c3 = mejorCombo(need, fmt, 'dia', cobjs, c, c.ing.length + 1);
        if (c3 && c3.ing.length > c.ing.length) {
          alt = productoCombo(c3, need, fmt, objs);
          alt.kicker = 'Para cubrir el día entero';
          var mas = c3.ing.filter(function (k) { return !has(c.ing, k); });
          alt.why = '<span class="bfn-em">' + esc(c3.why) + '</span> Suma ' + y(mas.map(function (k) { return '<b>' + esc(ING[k].nombre) + '</b> para ' + esc(ING[k].rol); })) + '.';
        }
      }
      if (!alt) {
        // el suelto que va con el momento; si ninguno, el del primer objetivo
        var ka = null, i;
        for (i = 0; i < need.length; i++) if (m !== 'dia' && has(ING[need[i]].ventana, m)) { ka = need[i]; break; }
        if (!ka) ka = need[0];
        var oa = objs.filter(function (o) { return OBJ[o].ing === ka; });
        alt = productoSingle(ka, fmt, oa, null);
        alt.kicker = 'Si preferís empezar por uno';
        alt.why = esc(ING[ka].nombre) + ' es el que cubre ' + esc(y(oa.map(function (o) { return OBJ[o].art; }))) +
          (m !== 'dia' && has(ING[ka].ventana, m) ? ' y el que va con ' + esc(MOM[m].la) : '') + '. Empezá por acá y sumá el otro después.';
      }
    }
    return { main: main, alt: alt, need: need };
  }

  /* ══════════════ 5. RENDER ══════════════ */
  var host, shell, view, fill, label, live, estado;

  function scrollAlShell() {
    var r = shell.getBoundingClientRect();
    if (r.top < 0 || r.top > window.innerHeight * .55) {
      var top = r.top + window.pageYOffset - 96;
      if (window.scrollTo) window.scrollTo({ top: top, behavior: reduced() ? 'auto' : 'smooth' });
    }
  }
  function foco(e) { try { e.focus({ preventScroll: true }); } catch (x) { try { e.focus(); } catch (z) {} } }

  function opcion(cls, k, t, dsc, role, on, pc) {
    var a = el('a', 'bfn-opt' + (pc ? ' ' + pc : '') + (on ? ' on' : ''));
    a.href = '#';
    a.setAttribute('role', role);
    a.setAttribute('aria-checked', on ? 'true' : 'false');
    a.setAttribute('data-k', k);
    a.innerHTML = (pc ? '<span class="bfn-opt-dot"></span>' : '') +
      '<span class="bfn-opt-h">' + esc(t) + '</span><span class="bfn-opt-t">' + esc(dsc) + '</span><span class="bfn-opt-chk"></span>';
    return a;
  }
  function teclado(grid) {
    // Space activa (Enter ya lo hace el <a>); flechas mueven el foco entre opciones
    grid.addEventListener('keydown', function (e) {
      var t = e.target; if (!t.classList || !t.classList.contains('bfn-opt')) return;
      var opts = Array.prototype.slice.call(grid.querySelectorAll('.bfn-opt')), i = opts.indexOf(t);
      if (e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); t.click(); }
      else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); foco(opts[(i + 1) % opts.length]); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); foco(opts[(i - 1 + opts.length) % opts.length]); }
    });
  }

  function cabecera(n, q, sub) {
    var w = el('div', 'bfn-step');
    var h = el('h2', 'bfn-q', q); h.id = 'bfn-q'; h.setAttribute('tabindex', '-1');
    w.appendChild(h);
    w.appendChild(el('div', 'bfn-q-sub', sub));
    return w;
  }
  function navegacion(w, s, conNext) {
    var nav = el('div', 'bfn-nav');
    if (paso(s) > 1) {
      var back = el('a', 'bfn-back', '← Volver'); back.href = '#';
      back.addEventListener('click', function (e) { e.preventDefault(); volver(); });
      nav.appendChild(back);
    } else nav.appendChild(el('span'));
    nav.appendChild(el('div', 'bfn-hint'));
    if (conNext) {
      var nx = el('a', 'bfn-btn bfn-next', 'Siguiente →'); nx.href = '#';
      nx.addEventListener('click', function (e) { e.preventDefault(); if (!nx.classList.contains('off')) avanzar(); });
      nav.appendChild(nx);
    }
    w.appendChild(nav);
    return nav;
  }

  function paso1(s) {
    var w = cabecera(1, '¿Qué querés lograr?', 'Elegí hasta dos. Si son más, empezá por los que más te pesan hoy.');
    var grid = el('div', 'bfn-opts'); grid.setAttribute('role', 'group'); grid.setAttribute('aria-labelledby', 'bfn-q');
    OBJ_ORDEN.forEach(function (k) {
      grid.appendChild(opcion(null, k, OBJ[k].t, OBJ[k].d, 'checkbox', has(s.r, k), ING[OBJ[k].ing].pc));
    });
    teclado(grid);
    w.appendChild(grid);
    var nav = navegacion(w, s, true);
    var hint = nav.querySelector('.bfn-hint'), nx = nav.querySelector('.bfn-next');
    function pintar() {
      Array.prototype.forEach.call(grid.querySelectorAll('.bfn-opt'), function (a) {
        var on = has(estado.r, a.getAttribute('data-k'));
        a.classList.toggle('on', on); a.setAttribute('aria-checked', on ? 'true' : 'false');
      });
      var n = estado.r.length;
      hint.innerHTML = n === 0 ? 'Elegí hasta dos.' : n === 1 ? 'Podés sumar uno más, o seguir.' : '<b>2 de 2.</b> Tocá otro para reemplazar el primero.';
      nx.classList.toggle('off', n === 0); nx.setAttribute('aria-disabled', n === 0 ? 'true' : 'false');
    }
    grid.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('.bfn-opt') : null; if (!a) return;
      e.preventDefault();
      var k = a.getAttribute('data-k'), r = estado.r.slice();
      if (has(r, k)) r.splice(r.indexOf(k), 1);
      else { r.push(k); if (r.length > 2) r.shift(); }
      estado.r = r;
      pintar();
    });
    pintar();
    return w;
  }
  function pasoSimple(n, q, sub, orden, tabla, key, c4) {
    return function (s) {
      var w = cabecera(n, q, sub);
      var grid = el('div', 'bfn-opts bfn-plain' + (c4 ? ' bfn-c4' : '')); grid.setAttribute('role', 'radiogroup'); grid.setAttribute('aria-labelledby', 'bfn-q');
      orden.forEach(function (k) { grid.appendChild(opcion(null, k, tabla[k].t, tabla[k].d, 'radio', s[key] === k, null)); });
      teclado(grid);
      w.appendChild(grid);
      grid.addEventListener('click', function (e) {
        var a = e.target.closest ? e.target.closest('.bfn-opt') : null; if (!a) return;
        e.preventDefault();
        if (grid.getAttribute('data-lock')) return;
        grid.setAttribute('data-lock', '1');
        Array.prototype.forEach.call(grid.querySelectorAll('.bfn-opt'), function (o) {
          var on = o === a; o.classList.toggle('on', on); o.setAttribute('aria-checked', on ? 'true' : 'false');
        });
        estado[key] = a.getAttribute('data-k');
        setTimeout(avanzar, reduced() ? 0 : 220);   // que se vea la marca antes de pasar
      });
      navegacion(w, s, false);
      return w;
    };
  }
  var paso2 = pasoSimple(2, '¿Cómo preferís tomarlo?', 'Los dos formatos llevan el mismo extracto. Es una cuestión de gesto.', FMT_ORDEN, FMT, 'f', false);
  var paso3 = pasoSimple(3, '¿Cuándo te cuesta más el día?', 'Nos ayuda a decidir si te alcanza con uno o te conviene un combo, y cuál.', MOM_ORDEN, MOM, 'm', true);

  function frascos(p) {
    var f = el('div', 'bfn-frascos bfn-n' + p.imgs.length);
    p.imgs.forEach(function (im) {
      var i = el('img'); i.src = im.src; i.alt = im.alt; i.width = 220; i.height = 220; i.loading = 'lazy'; f.appendChild(i);
    });
    return f;
  }
  function cardMain(p) {
    var c = el('div', 'bfn-main');
    var fig = el('div', 'bfn-main-fig'); fig.appendChild(frascos(p)); c.appendChild(fig);
    var b = el('div', 'bfn-main-body');
    b.innerHTML =
      '<div class="bfn-kicker">' + esc(p.kicker || 'Nuestra elección') + '</div>' +
      '<div class="bfn-name">' + esc(p.nombre) + ' <span class="bfn-em">' + esc(p.nombre_em) + '</span></div>' +
      '<div class="bfn-tags">' + p.tags.map(function (t, i) { return '<span class="bfn-tag' + (i === 0 ? ' bfn-tag-gold' : '') + '">' + esc(t) + '</span>'; }).join('') + '</div>' +
      '<div class="bfn-why">' + p.why + '</div>' +
      (p.nota ? '<div class="bfn-note">' + p.nota + '</div>' : '') +
      '<div class="bfn-when"><div class="bfn-when-h">Cuándo tomarlo</div>' +
        p.cuando.map(function (r) { return '<div class="bfn-when-row ' + r.pc + '"><span class="bfn-when-dot"></span><span>' + r.html + '</span></div>'; }).join('') +
      '</div>' +
      '<div class="bfn-buy"><div><div class="bfn-price">' + plata(p.precio) + (p.lista ? '<span class="bfn-lista">' + plata(p.lista) + '</span>' : '') + '</div>' +
        '<div class="bfn-price-t">' + (p.tipo === 'x3' ? 'Tres meses, en una sola compra.' : 'Rinde un mes. Hasta 6 cuotas sin interés.') + '</div></div>' +
        '<div class="bfn-buy-act"><span class="bfn-sub">Con suscripción, <b>10% OFF</b> en cada envío</span>' +
        '<a class="bfn-btn bfn-btn-gold bfn-cta" href="' + esc(p.href) + '">Ver producto</a></div></div>';
    c.appendChild(b);
    return c;
  }
  function cardAlt(p) {
    var c = el('div', 'bfn-alt ' + p.pc);
    c.innerHTML = '<div class="bfn-alt-bar"></div>';
    var fig = el('div', 'bfn-alt-fig'); fig.appendChild(frascos(p)); c.appendChild(fig);
    c.appendChild(el('div', 'bfn-alt-body',
      '<div class="bfn-alt-k">' + esc(p.kicker || 'Otra opción') + '</div>' +
      '<div class="bfn-alt-name">' + esc(p.nombre) + ' <span class="bfn-em">' + esc(p.nombre_em) + '</span></div>' +
      '<div class="bfn-alt-t">' + p.why + '</div>' +
      '<div class="bfn-alt-price">' + plata(p.precio) + (p.lista ? '<span class="bfn-lista">' + plata(p.lista) + '</span>' : '') + '</div>'));
    c.appendChild(el('div', 'bfn-alt-act', '<a class="bfn-btn bfn-btn-ghost bfn-cta-alt" href="' + esc(p.href) + '">Ver producto</a>'));
    return c;
  }
  function resumen(s) {
    var objs = s.r.map(function (o) { return '<b>' + esc(OBJ[o].corto) + '</b>'; });
    return 'Elegiste ' + y(objs) + ', ' + esc(FMT[s.f].en) + ', y lo que más te cuesta es ' + esc(MOM[s.m].la) + '.';
  }
  function resultado(s) {
    var w = el('div', 'bfn-res');
    var rec = recomendar(s);
    var head = el('div', 'bfn-res-head');
    var h = el('h2', 'bfn-q', rec.main.tipo === 'combo' ? 'Te conviene un combo.' : 'Empezá por acá.');
    h.id = 'bfn-q'; h.setAttribute('tabindex', '-1');
    head.appendChild(el('div', 'bfn-eyebrow', 'Tu recomendación'));
    head.appendChild(h);
    head.appendChild(el('div', 'bfn-res-sub', resumen(s)));
    w.appendChild(head);
    w.appendChild(cardMain(rec.main));
    if (rec.alt) w.appendChild(cardAlt(rec.alt));
    w.appendChild(el('div', 'bfn-trust', '<span>Todos rinden un mes</span><span>Envío gratis desde $180.000</span><span>Suscripción con 10% OFF</span>'));
    var acts = el('div', 'bfn-res-actions');
    var links = el('div', 'bfn-res-links');
    var back = el('a', 'bfn-back', '← Cambiar respuestas'); back.href = '#';
    back.addEventListener('click', function (e) { e.preventDefault(); volver(); });
    links.appendChild(back);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      var cp = el('a', 'bfn-link bfn-copy', 'Copiar el link'); cp.href = '#';
      cp.addEventListener('click', function (e) {
        e.preventDefault();
        navigator.clipboard.writeText(location.href).then(function () {
          cp.textContent = 'Link copiado'; cp.classList.add('bfn-copied');
          setTimeout(function () { cp.textContent = 'Copiar el link'; cp.classList.remove('bfn-copied'); }, 2400);
        }, function () {});
      });
      links.appendChild(cp);
    }
    acts.appendChild(links);
    var re = el('a', 'bfn-btn bfn-btn-ghost bfn-restart', 'Empezar de nuevo'); re.href = '#';
    re.addEventListener('click', function (e) { e.preventDefault(); estado = { r: [], f: null, m: null, p: null }; escribir(estado); render(true); });
    acts.appendChild(re);
    w.appendChild(acts);
    ga('finder_result', { finder_answers: serializar(s).slice(1), finder_result: rec.main.handle, finder_result_type: rec.main.tipo,
      finder_alt: rec.alt ? rec.alt.handle : '', finder_alt_type: rec.alt ? rec.alt.tipo : '' });
    return w;
  }

  var esperando = false;
  function render(mover) {
    var n = paso(estado);
    var pct = n === 4 ? 100 : Math.round((n - 1) / 3 * 100);
    label.textContent = n === 4 ? 'Listo' : 'Paso ' + n + ' de 3';
    fill.style.width = pct + '%';
    view.innerHTML = '';
    if (n === 4 && !combosListo) {
      // el JSON de combos todavía viaja: esperar hasta 2,5 s y después seguir con el respaldo
      if (!esperando) {
        esperando = true;
        view.appendChild(el('div', 'bfn-q-sub', 'Armando tu recomendación…'));
        var t = setTimeout(function () { combosListo = true; listoCombos(); }, 2500);
        combosEspera.push(function () { clearTimeout(t); esperando = false; render(mover); });
      }
      return;
    }
    var w = n === 1 ? paso1(estado) : n === 2 ? paso2(estado) : n === 3 ? paso3(estado) : resultado(estado);
    view.appendChild(w);
    live.textContent = label.textContent;
    if (n < 4) ga('finder_step', { finder_step: n, finder_answers: serializar(estado).slice(1) });
    if (mover) { scrollAlShell(); foco(view.querySelector('.bfn-q')); }
  }
  function avanzar() {
    var n = paso(estado);
    estado.p = (n + 1 < derivado(estado)) ? n + 1 : null;
    escribir(estado); render(true);
  }
  function volver() {
    var n = paso(estado);
    if (n <= 1) return;
    estado.p = n - 1;
    escribir(estado); render(true);
  }
  function listoCombos() { var fs = combosEspera; combosEspera = []; fs.forEach(function (f) { f(); }); }

  /* ══════════════ 6. ARRANQUE ══════════════ */
  function cargarCombos() {
    if (!window.fetch) { combosListo = true; return; }
    fetch(base + '/data/combos-categoria.json', { credentials: 'omit' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (j && j.combos && j.combos.length) {
          combos = j.combos.filter(function (c) {
            return c.handle && c.ing && c.ing.length && c.ing.every(function (k) { return ING[k]; });
          });
        }
      })
      .catch(function () {})
      .then(function () { combosListo = true; listoCombos(); });
  }
  function asegurarCss() {
    if (d.querySelector('link[href*="/css/finder.css"]')) return;
    var l = d.createElement('link'); l.rel = 'stylesheet'; l.href = base + '/css/finder.css'; d.head.appendChild(l);
  }
  function init() {
    host = d.querySelector('.bfn-app .blp-in');
    if (!host || d.querySelector('.bfn-shell')) return;
    asegurarCss();
    cargarCombos();
    shell = el('div', 'bfn-shell');
    var prog = el('div', 'bfn-prog'); prog.setAttribute('aria-hidden', 'true');
    label = el('span', 'bfn-prog-label', 'Paso 1 de 3');
    var track = el('div', 'bfn-prog-track'); fill = el('div', 'bfn-prog-fill'); track.appendChild(fill);
    prog.appendChild(label); prog.appendChild(track);
    live = el('div', 'bfn-sr'); live.setAttribute('aria-live', 'polite');
    view = el('div', 'bfn-view');
    shell.appendChild(prog); shell.appendChild(live); shell.appendChild(view);
    host.innerHTML = '';
    host.appendChild(shell);
    estado = leer();
    render(false);
    Array.prototype.forEach.call(d.querySelectorAll('.blp-finder a[href="#finder"]'), function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var top = shell.getBoundingClientRect().top + window.pageYOffset - 96;
        window.scrollTo({ top: top, behavior: reduced() ? 'auto' : 'smooth' });
        var o = view.querySelector('.bfn-opt, .bfn-cta'); if (o) foco(o);
      });
    });
    window.addEventListener('popstate', function () { estado = leer(); render(true); });
    if (typeof window.blpDone === 'function') window.blpDone();
  }
  window.bfn = {
    recomendar: function (s) { return recomendar({ r: (s.r || []).slice(0, 2), f: s.f, m: s.m, p: null }); },
    estado: function () { return estado; },
    tablas: { OBJ: OBJ, ING: ING, FMT: FMT, MOM: MOM, PRECIO: PRECIO },
    combosListo: function () { return combosListo; }
  };
  if (d.readyState !== 'loading' || d.querySelector('.bfn-app')) init();
  else d.addEventListener('DOMContentLoaded', init);
})();
