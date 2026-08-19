"""
Prepara ISOTIPO para uso móvil profesional (sin cambiar el diseño):
- Master UI: 1024² PNG con fondo transparente + área de protección
- Master app icon: 1024² PNG fondo #050B18 + isotipo centrado
- Genera tamaños PWA / Apple a partir del master de app icon
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT_IMG = ROOT / "public" / "images"
OUT_ICONS = ROOT / "public" / "icons"
APP = ROOT / "app"

# Preferir Downloads si existe; si no, el del proyecto
DOWNLOADS = Path(r"C:\Users\RODY\Downloads\ISOTIPO.png")
PROJECT_ISO = OUT_IMG / "ISOTIPO.png"
BG = (5, 11, 24, 255)  # #050B18


def load_source() -> Image.Image:
    src_path = DOWNLOADS if DOWNLOADS.exists() else PROJECT_ISO
    print("source:", src_path)
    return Image.open(src_path).convert("RGBA")


def logo_bbox(im: Image.Image, step: int = 2) -> tuple[int, int, int, int]:
    """BBox del isotipo (ignora negro/casi-negro y transparente)."""
    pix = im.load()
    w, h = im.size
    minx, miny, maxx, maxy = w, h, 0, 0
    found = False
    for y in range(0, h, step):
        for x in range(0, w, step):
            r, g, b, a = pix[x, y]
            if a < 16:
                continue
            # fondo negro del archivo original
            if r < 22 and g < 22 and b < 22:
                continue
            found = True
            minx = min(minx, x)
            miny = min(miny, y)
            maxx = max(maxx, x)
            maxy = max(maxy, y)
    if not found:
        raise SystemExit("No se detectó el isotipo en la imagen fuente")
    # refinamiento pixel a pixel en banda
    for y in range(max(0, miny - 2), min(h, maxy + 3)):
        for x in range(max(0, minx - 2), min(w, maxx + 3)):
            r, g, b, a = pix[x, y]
            if a < 16 or (r < 22 and g < 22 and b < 22):
                continue
            minx = min(minx, x)
            miny = min(miny, y)
            maxx = max(maxx, x)
            maxy = max(maxy, y)
    return minx, miny, maxx + 1, maxy + 1


def extract_logo(im: Image.Image) -> Image.Image:
    x0, y0, x1, y1 = logo_bbox(im)
    crop = im.crop((x0, y0, x1, y1))
    cleaned = []
    for r, g, b, a in crop.getdata():
        if a < 16 or (r < 22 and g < 22 and b < 22):
            cleaned.append((0, 0, 0, 0))
        else:
            cleaned.append((r, g, b, a))
    crop.putdata(cleaned)
    print("logo content:", crop.size, "from bbox", (x0, y0, x1, y1))
    return crop


def place_logo(
    logo: Image.Image,
    size: int,
    *,
    bg: tuple[int, int, int, int] | None,
    logo_ratio: float,
    soft_glow: bool = False,
) -> Image.Image:
    """Centra el logo en un canvas cuadrado. ratio>1 = overscale (compensa safe-zone Android)."""
    if bg is None:
        canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    else:
        canvas = Image.new("RGBA", (size, size), bg)

    if soft_glow and bg is not None:
        glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        gd = ImageDraw.Draw(glow)
        c = size // 2
        rr = int(size * 0.34)
        gd.ellipse([c - rr, c - rr, c + rr, c + rr], fill=(37, 99, 235, 28))
        glow = glow.filter(ImageFilter.GaussianBlur(radius=max(2, size // 28)))
        canvas = Image.alpha_composite(canvas, glow)

    target = max(1, int(size * logo_ratio))
    lw, lh = logo.size
    scale = target / max(lw, lh)
    nw, nh = max(1, int(lw * scale)), max(1, int(lh * scale))
    resized = logo.resize((nw, nh), Image.Resampling.LANCZOS)
    ox = (size - nw) // 2
    oy = (size - nh) // 2
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    layer.paste(resized, (ox, oy), resized)
    return Image.alpha_composite(canvas, layer)


def main() -> None:
    OUT_IMG.mkdir(parents=True, exist_ok=True)
    OUT_ICONS.mkdir(parents=True, exist_ok=True)

    src = load_source()
    print("source size:", src.size, src.mode)
    logo = extract_logo(src)

    # --- Master UI / impresión / header: transparente + padding ~12% (área de protección)
    ui = place_logo(logo, 1024, bg=None, logo_ratio=0.78)
    ui_path = OUT_IMG / "ISOTIPO.png"
    # Backup del original no-cuadrado una sola vez
    bak = OUT_IMG / "ISOTIPO.original.png"
    if PROJECT_ISO.exists() and not bak.exists():
        PROJECT_ISO.replace(bak)
        print("backup:", bak.name)
    ui.save(ui_path, optimize=True)
    print("wrote", ui_path.name, ui.size, "transparent UI master")

    # Variante 512 UI (densidad media)
    place_logo(logo, 512, bg=None, logo_ratio=0.78).save(
        OUT_IMG / "ISOTIPO-512.png", optimize=True
    )

    # Misma proporción que “ÍCONO OFICIAL DE APP” (área de protección ≈ X ≈ 78%).
    # Sin overscale: si se agranda, Android recorta las puntas del squircle.
    app_master = place_logo(logo, 1024, bg=BG, logo_ratio=0.78, soft_glow=False).convert("RGB")
    app_master.save(OUT_ICONS / "_official-app-icon.png", optimize=True)

    sizes = {
        192: "vordia-192.png",
        512: "vordia-512.png",
        180: "vordia-180.png",
        256: "vordia-256.png",
        1024: "vordia-1024.png",
    }
    for size, name in sizes.items():
        # Derivados del ícono oficial (full-bleed), no de una variante maskable
        img = app_master.resize((size, size), Image.Resampling.LANCZOS)
        img.save(OUT_ICONS / name, optimize=True)
        print("wrote", name)

    aliases = {
        "icon-192.png": "vordia-192.png",
        "icon-512.png": "vordia-512.png",
        "icon-180.png": "vordia-180.png",
        "icon-256.png": "vordia-256.png",
        "icon-1024.png": "vordia-1024.png",
        "apple-touch-icon.png": "vordia-180.png",
        # Legacy filenames only — el manifest NO debe usar purpose: maskable
        "icon-maskable-192.png": "vordia-192.png",
        "icon-maskable-512.png": "vordia-512.png",
    }
    for old, new in aliases.items():
        Image.open(OUT_ICONS / new).save(OUT_ICONS / old, optimize=True)

    Image.open(OUT_ICONS / "vordia-512.png").save(APP / "icon.png", optimize=True)
    Image.open(OUT_ICONS / "vordia-180.png").save(APP / "apple-icon.png", optimize=True)
    print("done")


if __name__ == "__main__":
    main()
