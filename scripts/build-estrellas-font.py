"""Arma fonts/bl-estrellas.woff: una fuente con SOLO dos glifos, ★ (U+2605) y ☆ (U+2606),
con la forma de la estrella del hero de la home (css/hero-carousel.css, .bh-st: path de 24x24
con trazo redondeado de 2.4 del mismo color). css/tipografia.css la pone primera en el stack
con unicode-range, asi que el navegador la usa solo para las estrellas de texto de toda la web
(fichas, combos, gondola, best-sellers, Revie) y el resto sigue en Bricolage.

★ = el poligono del hero engordado 1.2 (medio trazo) con puntas redondas, igual que el SVG.
☆ = la misma silueta, hueca: el anillo mide 2.2 de 24.
Correr con el python del venv del repo de la tienda (necesita fontTools):
  python scripts/build-estrellas-font.py
"""
import math, pathlib
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

# poligono del path del hero, en coordenadas SVG (y hacia abajo)
P = [(12, 2.8), (14.75, 8.4), (20.9, 9.3), (16.45, 13.65), (17.5, 19.8),
     (12, 16.9), (6.5, 19.8), (7.55, 13.65), (3.1, 9.3), (9.25, 8.4)]
R = 1.2          # medio stroke-width del hero
RING = 2.2       # grosor del anillo de ☆
UPM, ADV = 1000, 900
S = UPM / 24.0
CY = 12.7        # centro vertical de la estrella (y hacia arriba)
BASE_Y = 340     # a qué altura de la línea cae ese centro

def up(p): return (p[0], 24 - p[1])
def area(pts): return sum(pts[i][0]*pts[(i+1) % len(pts)][1]-pts[(i+1) % len(pts)][0]*pts[i][1] for i in range(len(pts)))/2
def norm(v):
    l = math.hypot(*v); return (v[0]/l, v[1]/l)
def inter(p, d, q, e):
    den = d[0]*e[1]-d[1]*e[0]
    t = ((q[0]-p[0])*e[1]-(q[1]-p[1])*e[0])/den
    return (p[0]+t*d[0], p[1]+t*d[1])

POLY = [up(p) for p in P]
if area(POLY) < 0: POLY = POLY[::-1]           # CCW

def offset(poly, r, round_convex):
    """offset hacia afuera (r>0) o adentro (r<0) de un poligono CCW.
    Devuelve una lista de segmentos: ('L', punto) o ('Q', control, punto)."""
    n = len(poly); out = []
    for i in range(n):
        a, b, c = poly[i-1], poly[i], poly[(i+1) % n]
        d1 = norm((b[0]-a[0], b[1]-a[1])); d2 = norm((c[0]-b[0], c[1]-b[1]))
        n1 = (d1[1], -d1[0]); n2 = (d2[1], -d2[0])      # normales hacia afuera (CCW)
        convex = d1[0]*d2[1]-d1[1]*d2[0] > 0
        p1 = (b[0]+n1[0]*r, b[1]+n1[1]*r); p2 = (b[0]+n2[0]*r, b[1]+n2[1]*r)
        if convex and round_convex and r > 0:
            a1 = math.atan2(n1[1], n1[0]); a2 = math.atan2(n2[1], n2[0])
            while a2 < a1: a2 += 2*math.pi
            k = max(1, math.ceil((a2-a1)/(math.pi/4)))
            out.append(('L', p1))
            for j in range(k):
                t0 = a1+(a2-a1)*j/k; t1 = a1+(a2-a1)*(j+1)/k; tm = (t0+t1)/2
                rc = r/math.cos((t1-t0)/2)
                out.append(('Q', (b[0]+rc*math.cos(tm), b[1]+rc*math.sin(tm)), (b[0]+r*math.cos(t1), b[1]+r*math.sin(t1))))
        else:
            out.append(('L', inter(p1, d1, p2, d2)))
    return out

def tf(p): return (round((p[0]-12)*S + ADV/2), round((p[1]-CY)*S + BASE_Y))

def draw(pen, segs, reverse):
    # TrueType: contorno exterior en sentido horario, agujero antihorario
    pts = []   # lista de (tipo, puntos) aplanada a on/off points
    for s in segs:
        if s[0] == 'L': pts.append((True, s[1]))
        else: pts.append((False, s[1])); pts.append((True, s[2]))
    if reverse: pts = pts[::-1]
    # arrancar en un punto on-curve
    while not pts[0][0]: pts = pts[1:]+pts[:1]
    pen.moveTo(tf(pts[0][1])); i = 1; off = []
    for on, p in pts[1:]+[pts[0]]:
        if on:
            if off: pen.qCurveTo(*[tf(o) for o in off], tf(p)); off = []
            else: pen.lineTo(tf(p))
        else: off.append(p)
    pen.closePath()

outer = offset(POLY, R, True)
inner = offset(POLY, R-RING, False)

def glyph(hollow):
    pen = TTGlyphPen(None)
    draw(pen, outer, reverse=True)          # CCW -> horario
    if hollow: draw(pen, inner, reverse=False)
    return pen.glyph()

fb = FontBuilder(UPM, isTTF=True)
names = ['.notdef', 'star', 'starwhite']
fb.setupGlyphOrder(names)
fb.setupCharacterMap({0x2605: 'star', 0x2606: 'starwhite'})
empty = TTGlyphPen(None).glyph()
fb.setupGlyf({'.notdef': empty, 'star': glyph(False), 'starwhite': glyph(True)})
fb.setupHorizontalMetrics({'.notdef': (500, 0), 'star': (ADV, 0), 'starwhite': (ADV, 0)})
fb.setupHorizontalHeader(ascent=800, descent=-200)
fb.setupNameTable({'familyName': 'BL Estrellas', 'styleName': 'Regular'})
fb.setupOS2(sTypoAscender=800, sTypoDescender=-200, usWinAscent=800, usWinDescent=200)
fb.setupPost()
fb.font.flavor = 'woff'
out = pathlib.Path(__file__).resolve().parent.parent / 'fonts' / 'bl-estrellas.woff'
out.parent.mkdir(exist_ok=True)
fb.save(str(out))
print(out, out.stat().st_size, 'bytes')
