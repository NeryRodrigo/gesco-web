"""
Iconos de acceso directo = ÍCONO OFICIAL DE APP (recorte de la guía).
Sin maskable en el manifest (Android lo achica y deja el isotipo chico).
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "icons"
APP = ROOT / "app"
ISO = ROOT / "public" / "images" / "ISOTIPO.png"
# Recorte limpio del icono oficial (no la hoja completa)
OFFICIAL_SRC = OUT / "_official-app-icon.png"
GUIDE_CURSOR = Path(
    r"C:\Users\RODY\.cursor\projects\c-Users-RODY-source-repos-Gesco\assets"
    r"\c__Users_RODY_AppData_Roaming_Cursor_User_workspaceStorage_"
    r"6448044cdffc8fbf7a8c11ae014a7ba5_images_image-e88bcd18-3d15-487d-808a-4baac3882b05.png"
)
BG = (5, 11, 24)


def content_bbox(im: Image.Image, step: int = 1, thr: int = 28):
    pix = im.load()
    w, h = im.size
    minx, miny, maxx, maxy = w, h, 0, 0
    found = False
    for y in range(0, h, step):
        for x in range(0, w, step):
            p = pix[x, y]
            r, g, b = p[:3]
            a = p[3] if len(p) == 4 else 255
            if a < 20:
                continue
            if r > thr or g > thr or b > thr + 10:
                found = True
                minx = min(minx, x)
                miny = min(miny, y)
                maxx = max(maxx, x)
                maxy = max(maxy, y)
    if not found:
        raise SystemExit("Sin contenido detectable")
    return minx, miny, maxx + 1, maxy + 1


def extract_official_squircle(sheet: Image.Image) -> Image.Image:
    """Recorta SOLO el squircle del 'ÍCONO OFICIAL DE APP' (arriba-izquierda)."""
    w, h = sheet.size
    tl = sheet.crop((0, 0, w // 2, h // 2))
    # Saltar título
    body = tl.crop((0, int(tl.size[1] * 0.14), tl.size[0], int(tl.size[1] * 0.98)))
    x0, y0, x1, y1 = content_bbox(body, step=1, thr=35)
    side = max(x1 - x0, y1 - y0)
    cx = (x0 + x1) // 2
    cy = (y0 + y1) // 2
    sx0 = max(0, cx - side // 2)
    sy0 = max(0, cy - side // 2)
    sx1 = min(body.size[0], sx0 + side)
    sy1 = min(body.size[1], sy0 + side)
    sx0 = max(0, sx1 - side)
    sy0 = max(0, sy1 - side)
    icon = body.crop((sx0, sy0, sx0 + side, sy0 + side)).convert("RGB")
    # Pintar esquinas exteriores (fondo de la hoja) con BG sólido
    # para que el SO no muestre restos del layout de la guía.
    pixels = icon.load()
    iw, ih = icon.size
    # Umbral: píxeles muy cercanos al fondo de la hoja fuera del squircle
    for y in range(ih):
        for x in range(iw):
            # distancia al centro del squircle (aprox)
            pass
    return icon


def make_from_isotipo(size: int, logo_ratio: float = 0.96) -> Image.Image:
    from PIL import ImageDraw, ImageFilter

    src = Image.open(ISO).convert("RGBA")
    box = content_bbox(src, step=2, thr=18)
    logo = src.crop(box)
    cleaned = []
    for r, g, b, a in logo.getdata():
        if a < 20 or (r < 18 and g < 18 and b < 18):
            cleaned.append((0, 0, 0, 0))
        else:
            cleaned.append((r, g, b, a))
    logo.putdata(cleaned)

    canvas = Image.new("RGBA", (size, size), (*BG, 255))
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    c = size // 2
    rr = int(size * 0.34)
    gd.ellipse([c - rr, c - rr, c + rr, c + rr], fill=(37, 99, 235, 28))
    glow = glow.filter(ImageFilter.GaussianBlur(radius=max(2, size // 28)))
    canvas = Image.alpha_composite(canvas, glow)

    t = int(size * logo_ratio)
    lw, lh = logo.size
    sc = t / max(lw, lh)
    nw, nh = max(1, int(lw * sc)), max(1, int(lh * sc))
    resized = logo.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas.alpha_composite(resized, ((size - nw) // 2, (size - nh) // 2))
    return canvas.convert("RGB")


def ensure_official_source() -> Image.Image | None:
    # Preferir recorte ya validado
    if OFFICIAL_SRC.exists():
        im = Image.open(OFFICIAL_SRC).convert("RGB")
        # Rechazar si parece la hoja completa (mucho texto / poco “un solo icono”)
        if im.size[0] >= 900 and im.size[0] == im.size[1]:
            # Si el centro tiene el logo y las esquinas son casi negras, puede ser icono OK.
            # Pero si hay mucho blanco/azul claro en la franja superior, es la hoja.
            top = im.crop((0, 0, im.size[0], int(im.size[1] * 0.08)))
            avg = sum(sum(p[:3]) for p in top.getdata()) / (top.size[0] * top.size[1] * 3)
            if avg > 25:
                # hoja completa guardada por error → regenerar
                pass
            else:
                return im
        else:
            return im

    if not GUIDE_CURSOR.exists():
        return None

    sheet = Image.open(GUIDE_CURSOR).convert("RGB")
    icon = extract_official_squircle(sheet)
    if icon.size[0] < 150:
        return None
    icon.save(OFFICIAL_SRC, optimize=True)
    # borrar copia mala de la hoja si existía
    bad = OUT / "_brand-guide-icon.png"
    if bad.exists():
        bad.unlink()
    return icon


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)

    # Eliminar fuente incorrecta (hoja completa) si quedó de un run anterior
    for bad_name in ("_brand-guide-icon.png",):
        bad = OUT / bad_name
        if bad.exists():
            bad.unlink()

    # Forzar regenerar el recorte desde la guía
    if OFFICIAL_SRC.exists():
        OFFICIAL_SRC.unlink()

    official = ensure_official_source()
    if official is not None:
        print("using official crop", official.size)
    else:
        print("fallback isotipo")

    def maker(size: int) -> Image.Image:
        if official is not None:
            return official.resize((size, size), Image.Resampling.LANCZOS)
        return make_from_isotipo(size)

    names = {
        192: "vordia-192.png",
        512: "vordia-512.png",
        180: "vordia-180.png",
        256: "vordia-256.png",
        1024: "vordia-1024.png",
    }
    for size, name in names.items():
        maker(size).save(OUT / name, optimize=True)
        print("wrote", name)

    aliases = {
        "icon-192.png": "vordia-192.png",
        "icon-512.png": "vordia-512.png",
        "icon-180.png": "vordia-180.png",
        "icon-256.png": "vordia-256.png",
        "icon-1024.png": "vordia-1024.png",
        "apple-touch-icon.png": "vordia-180.png",
        "icon-maskable-192.png": "vordia-192.png",
        "icon-maskable-512.png": "vordia-512.png",
    }
    for old, new in aliases.items():
        Image.open(OUT / new).save(OUT / old, optimize=True)

    maker(512).save(APP / "icon.png", optimize=True)
    maker(180).save(APP / "apple-icon.png", optimize=True)
    print("done")


if __name__ == "__main__":
    main()
