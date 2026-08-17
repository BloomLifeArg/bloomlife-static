# -*- coding: utf-8 -*-
"""Genera las 5 fotos de la sección "Elegí por beneficio" con el grade de marca.

EL TRATAMIENTO SE HORNEA EN EL ARCHIVO, no se hace por CSS: los filtros CSS no
dan este control (split toning por luminancia) y costarían render en mobile.
Si se cambia una foto hay que volver a pasarla por acá o va a desentonar con
las otras cuatro — que es exactamente el problema que este script resuelve.

El grade son tres operaciones, en este orden:
  1. desatura PARCIAL (sat=0.40) — a cero vira a sepia y parece filtro viejo
  2. split toning: sombras al petróleo de marca, luces a crema
  3. curva S suave para que no quede lavado

Uso:  python build_beneficios.py <carpeta-con-los-originales>
"""
import os
import sys
import numpy as np
from PIL import Image

W, H = 800, 1066          # 3:4 — la foto es una ventana, no ocupa el card entero
Q = 82
SAT = 0.40
TINT = 0.30
CONTRASTE = 0.12
SOMBRA = (18, 46, 52)     # petróleo levantado
LUZ = (245, 232, 208)     # crema

# (origen, salida, anchor_x, anchor_y) — elegidos mirando cada foto entera:
# el recorte centrado deja la gota alta y mete el vilano abajo del texto.
PICK = [
    ("foco",     "beneficio-foco.jpg",     .45, .55),
    ("calma",    "beneficio-calma.jpg",    .50, .50),
    ("energia",  "beneficio-energia.jpg",  .50, .30),
    ("descanso", "beneficio-descanso.jpg", .40, .55),
    ("piel",     "beneficio-piel.jpg",     .50, .50),
]


def grade(im):
    a = np.asarray(im).astype(np.float32) / 255.0
    lum = (a[..., 0] * .2126 + a[..., 1] * .7152 + a[..., 2] * .0722)[..., None]
    a = lum + (a - lum) * SAT
    s = np.array(SOMBRA, np.float32) / 255.0
    l = np.array(LUZ, np.float32) / 255.0
    a = a * (1 - TINT) + (s + (l - s) * lum) * TINT
    a = np.clip(a, 0, 1)
    a = a + CONTRASTE * (a - 0.5) * (1 - np.abs(a - 0.5) * 2)
    return Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))


def main(src):
    dst = os.path.join(os.path.dirname(os.path.abspath(__file__)), "img", "beneficios")
    os.makedirs(dst, exist_ok=True)
    total = 0
    for name, out, ax, ay in PICK:
        im = Image.open(os.path.join(src, name + ".jpg")).convert("RGB")
        sc = max(W / im.width, H / im.height)
        nw, nh = int(im.width * sc + 1), int(im.height * sc + 1)
        im = im.resize((nw, nh), Image.LANCZOS)
        x = max(0, min(nw - W, int((nw - W) * ax)))
        y = max(0, min(nh - H, int((nh - H) * ay)))
        im = grade(im.crop((x, y, x + W, y + H)))
        p = os.path.join(dst, out)
        im.save(p, "JPEG", quality=Q, optimize=True, progressive=True)
        kb = os.path.getsize(p) / 1024
        total += kb
        print(f"{out:26s} {W}x{H}  {kb:6.1f} KB")
    print(f"{'TOTAL':26s}            {total:6.1f} KB")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else ".")
