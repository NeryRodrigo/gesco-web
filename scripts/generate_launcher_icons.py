"""Genera iconos PWA / launcher al estilo USO EN LAUNCHER (guía Vordia)."""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
ISO = ROOT / "public" / "images" / "ISOTIPO.png"
OUT = ROOT / "public" / "icons"
APP = ROOT / "app"
BG = (5, 11, 24, 255)  # #050B18


def load_logo() -> Image.Image:
    src = Image.open(ISO).convert("RGBA")
    pixels = src.load()
    w, h = src.size

    def is_content(x: int, y: int) -> bool:
        r, g, b, a = pixels[x, y]
        if a < 20:
            return False
        if r < 18 and g < 18 and b < 18:
            return False
        return True

    minx, miny, maxx, maxy = w, h, 0, 0
    found = False
    for y in range(h):
        for x in range(w):
            if is_content(x, y):
                found = True
                minx = min(minx, x)
                miny = min(miny, y)
                maxx = max(maxx, x)
                maxy = max(maxy, y)
    if not found:
        raise SystemExit("No se encontró contenido en ISOTIPO.png")

    logo = src.crop((minx, miny, maxx + 1, maxy + 1))
    cleaned = []
    for r, g, b, a in logo.getdata():
        if a < 20 or (r < 18 and g < 18 and b < 18):
            cleaned.append((0, 0, 0, 0))
        else:
            cleaned.append((r, g, b, a))
    logo.putdata(cleaned)
    return logo


# Proporción del isotipo vs canvas (icono oficial de app).
# Android suele preferir "maskable"; si queda chico ahí, el acceso se ve vacío.
RATIO_ANY = 0.88
RATIO_MASKABLE = 0.78


def make_icon(
    logo: Image.Image,
    size: int,
    logo_ratio: float = RATIO_ANY,
    rounded: bool = False,
    radius_ratio: float = 0.20,
) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), BG)

    # Brillo azul muy suave detrás del isotipo (como guía oficial)
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    cx = cy = size // 2
    for radius, alpha in (
        (int(size * 0.55), 28),
        (int(size * 0.42), 40),
        (int(size * 0.30), 22),
    ):
        gd.ellipse([cx - radius, cy - radius, cx + radius, cy + radius], fill=(37, 99, 235, alpha))
    glow = glow.filter(ImageFilter.GaussianBlur(radius=max(2, size // 40)))
    canvas = Image.alpha_composite(canvas, glow)

    target = int(size * logo_ratio)
    lw, lh = logo.size
    scale = target / max(lw, lh)
    nw, nh = max(1, int(lw * scale)), max(1, int(lh * scale))
    resized = logo.resize((nw, nh), Image.Resampling.LANCZOS)
    ox = (size - nw) // 2
    oy = (size - nh) // 2
    canvas.alpha_composite(resized, (ox, oy))

    if rounded:
        # Squircle 20% con esquinas opacas del mismo color (evita relleno blanco en Android)
        mask = Image.new("L", (size, size), 0)
        md = ImageDraw.Draw(mask)
        r = int(size * radius_ratio)
        md.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=255)
        out_img = Image.new("RGBA", (size, size), BG)
        out_img.paste(canvas, (0, 0), mask)
        return out_img.convert("RGB")

    return canvas.convert("RGB")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    logo = load_logo()
    print("logo bbox", logo.size)

    any_sizes = {
        1024: "icon-1024.png",
        512: "icon-512.png",
        256: "icon-256.png",
        192: "icon-192.png",
        180: "icon-180.png",
    }
    for size, name in any_sizes.items():
        # Cuadrado opaco: el SO aplica el squircle del launcher
        make_icon(logo, size, logo_ratio=RATIO_ANY, rounded=False).save(OUT / name, optimize=True)
        print("wrote", name, f"ratio={RATIO_ANY}")

    for size, name in ((192, "icon-maskable-192.png"), (512, "icon-maskable-512.png")):
        make_icon(logo, size, logo_ratio=RATIO_MASKABLE, rounded=False).save(OUT / name, optimize=True)
        print("wrote", name, f"ratio={RATIO_MASKABLE}")

    make_icon(logo, 180, logo_ratio=RATIO_ANY).save(OUT / "apple-touch-icon.png", optimize=True)
    make_icon(logo, 512, logo_ratio=RATIO_ANY).save(APP / "icon.png", optimize=True)
    make_icon(logo, 180, logo_ratio=RATIO_ANY).save(APP / "apple-icon.png", optimize=True)

    # Vista previa visual estilo icono oficial (squircle 20%)
    make_icon(logo, 512, logo_ratio=RATIO_ANY, rounded=True).save(
        OUT / "_preview-launcher-squircle.png", optimize=True
    )
    print("done")


if __name__ == "__main__":
    main()
