# -*- coding: utf-8 -*-
"""Genera las 5 miniaturas de adaptógenos del megamenú, más su color de filete.

POR QUÉ ESTE SCRIPT NO ES build_beneficios.py
El de beneficios hornea un grade de marca (desaturar a 0.40 + split toning) para
unificar 5 fotos de 5 fuentes distintas, con casts que pelean entre sí. Ahí el
cast común ES la solución.

Acá NO. Se probó y se descartó: estos 5 packshots ya son una sola familia (misma
luz, mismo ángulo, misma sesión, fondo transparente). Su color de etiqueta no es
ruido, es la IDENTIDAD del producto — es lo que deja distinguirlos de un vistazo.
Aplicarles el grade los convierte a los cinco en el mismo pastel grisáceo: el
ámbar de Melena queda mostaza, el celeste de Cordyceps gris, el menta de Reishi
salvia. Comparativa en assets-menu/fotos/{A_original,B_encuadre,C_encuadre_mas_grade}.jpg
del repo del tema.

Lo que estas fotos SÍ necesitaban era encuadre. Venían con el frasco ocupando
entre 0.872 y 0.939 del alto y el centro entre 0.500 y 0.579. Este script las
alinea a la referencia de la familia (fill 0.874, bbox = frasco + gomitas
volcadas, NO el frasco solo).

EL FILETE se muestrea de la etiqueta real de cada frasco y después se armoniza:
se conserva el TONO (identidad) y se llevan saturación y brillo al mismo registro
(S=0.42, V=0.72). Sin eso, Melena entra en S=0.71/V=1.00 y grita al lado de las
otras cuatro, que vienen entre 0.28 y 0.45.

SALIDA: WebP 320px con alpha. 53 KB las cinco. El header carga en TODAS las
páginas del sitio, así que el peso acá no es un detalle: el PNG a 560px pesaba
1.133 KB, veintiún veces más.

Uso:  python build_menu_adaptogenos.py <carpeta-con-los-packshots-originales>
      (los originales son la imagen en posición 1 de cada producto en TN,
       vía /v1/<store>/products/<id> → images[0].src, en -1024-1024.png)
"""
import colorsys
import json
import os
import sys

import numpy as np
from PIL import Image

S = 320                    # cubre un slot de 160px a 2x
FILL_V = 0.874             # referencia de la familia (la de Melena de León)
CX, CY = 0.50, 0.52
CALIDAD = 82
S_OBJ, V_OBJ = 0.42, 0.72  # registro común del filete

ITEMS = [
    ("melena",      "Melena de León"),
    ("ashwagandha", "Ashwagandha"),
    ("cordyceps",   "Cordyceps"),
    ("reishi",      "Reishi"),
    ("tremella",    "Tremella"),
]


def encuadrar(im):
    """Alinea por bounding box del objeto opaco, no por el lienzo."""
    a = np.asarray(im)[..., 3]
    ys, xs = np.where(a > 8)
    obj = im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    h = int(S * FILL_V)
    w = max(1, round(obj.width * h / obj.height))
    obj = obj.resize((w, h), Image.LANCZOS)
    lienzo = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    lienzo.paste(obj, (round(S * CX - w / 2), round(S * CY - h / 2)), obj)
    return lienzo


def color_etiqueta(im):
    """Muestrea el color dominante de la etiqueta: banda central-baja, opaca,
    descartando el casi-blanco del texto y el casi-negro de las sombras."""
    a = np.asarray(im).astype(np.float32)
    al, rgb = a[..., 3] / 255.0, a[..., :3] / 255.0
    ys, xs = np.where(al > 0.95)
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    by0, by1 = int(y0 + (y1 - y0) * .40), int(y0 + (y1 - y0) * .62)
    bx0, bx1 = int(x0 + (x1 - x0) * .10), int(x0 + (x1 - x0) * .55)
    m = al[by0:by1, bx0:bx1] > 0.95
    px = rgb[by0:by1, bx0:bx1][m]
    lum = px @ np.array([.2126, .7152, .0722])
    px = px[(lum > .20) & (lum < .92)]
    mx, mn = px.max(1), px.min(1)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    sel = px[sat > np.percentile(sat, 60)]
    return np.median(sel, axis=0)


def armonizar(c):
    """Conserva el tono, lleva S y V al registro común."""
    # float() explícito: c viene de np.median y es float32, que json no serializa
    h, _, _ = colorsys.rgb_to_hsv(*(float(v) for v in c))
    r, g, b = colorsys.hsv_to_rgb(h, S_OBJ, V_OBJ)
    return '#%02X%02X%02X' % tuple(round(v * 255) for v in (r, g, b)), round(float(h) * 360, 1)


def main(src):
    raiz = os.path.dirname(os.path.abspath(__file__))
    dst = os.path.join(raiz, "img", "menu")
    os.makedirs(dst, exist_ok=True)
    meta, total = {}, 0.0
    for slug, nombre in ITEMS:
        orig = Image.open(os.path.join(src, slug + ".png")).convert("RGBA")
        crudo = color_etiqueta(orig)
        filete, hue = armonizar(crudo)
        im = encuadrar(orig)
        nom = f"adaptogeno-{slug}.webp"
        p = os.path.join(dst, nom)
        im.save(p, "WEBP", quality=CALIDAD, method=6)
        kb = os.path.getsize(p) / 1024
        total += kb
        meta[slug] = {
            "nombre": nombre,
            "archivo": nom,
            "filete": filete,
            "filete_crudo": '#%02X%02X%02X' % tuple(round(float(v) * 255) for v in crudo),
            "hue": hue,
        }
        print(f"{nom:28s} {S}x{S}  {kb:5.1f} KB   filete {filete}  (crudo {meta[slug]['filete_crudo']})")
    with open(os.path.join(raiz, "data", "menu-adaptogenos.json"), "w", encoding="utf-8") as f:
        json.dump({
            "_leeme": "Generado por build_menu_adaptogenos.py. NO editar a mano: se regenera. "
                      "'filete' es el tono real de la etiqueta con S=0.42 V=0.72 para que los "
                      "cinco lean como sistema. Las bajadas NO viven acá: están en el copy "
                      "cerrado del repo del tema (assets-menu/menu-copy-cerrado.json).",
            "items": meta,
        }, f, ensure_ascii=False, indent=1)
    print(f"{'TOTAL':28s}          {total:5.1f} KB")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else ".")
