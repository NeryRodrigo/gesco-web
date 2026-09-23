import { NextRequest, NextResponse } from "next/server";
import {
  esRecursoEstatico,
  VORDIA_ALIAS_CANONICO,
  VORDIA_MODULOS_HQ,
  VORDIA_RESERVADOS,
  VORDIA_SLUGS_PRODUCTO,
} from "@/lib/vordiaEntornos";

const CANONICAL = "https://www.vordia.com.py";
const SITIO_PUBLICO = new Set(["vordia.com.py", "www.vordia.com.py"]);

function hostname(request: NextRequest) {
  return (request.headers.get("host") || "").split(":")[0].toLowerCase();
}

function primerSegmento(pathname: string) {
  return pathname.replace(/^\/+|\/+$/g, "").split("/")[0] || "";
}

function noIndex(res: NextResponse) {
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export function middleware(request: NextRequest) {
  const host = hostname(request);
  const publico = SITIO_PUBLICO.has(host);
  const { pathname } = request.nextUrl;
  const slug = primerSegmento(pathname);
  const segmentos = pathname.split("/").filter(Boolean);
  const unSegmento = segmentos.length === 1;

  if (esRecursoEstatico(pathname) || pathname.startsWith("/api") || pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  if (host.endsWith("duckdns.org") && (pathname === "/web" || pathname === "/web/")) {
    return NextResponse.redirect(`${CANONICAL}/`, 308);
  }

  if (publico && (pathname === "/web-institucional" || pathname.startsWith("/web-institucional/"))) {
    return NextResponse.redirect(new URL("/", request.url), 308);
  }

  if (publico && (pathname === "/web" || pathname === "/web/")) {
    return NextResponse.redirect(new URL("/", request.url), 308);
  }

  if (publico && pathname.startsWith("/sitio/")) {
    const producto = segmentos[1] || "";
    if (VORDIA_SLUGS_PRODUCTO.has(producto)) {
      return NextResponse.redirect(new URL(`/${producto}`, request.url), 308);
    }
  }

  if (unSegmento && slug && VORDIA_SLUGS_PRODUCTO.has(slug)) {
    if (publico || !VORDIA_MODULOS_HQ.has(slug)) {
      const url = request.nextUrl.clone();
      url.pathname = `/sitio/${slug}`;
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  if (publico && unSegmento && slug && VORDIA_ALIAS_CANONICO[slug]) {
    return NextResponse.redirect(new URL(`/${VORDIA_ALIAS_CANONICO[slug]}`, request.url), 308);
  }

  if (segmentos[0] === "acceso") {
    const empresa = segmentos[1] || "";
    const url = request.nextUrl.clone();
    url.pathname = "/";
    if (empresa) url.searchParams.set("empresa", empresa);
    return noIndex(NextResponse.rewrite(url));
  }

  if (unSegmento && slug && !VORDIA_RESERVADOS.has(slug) && !VORDIA_MODULOS_HQ.has(slug)) {
    if (publico) {
      return NextResponse.redirect(new URL(`/acceso/${slug}`, request.url), 308);
    }
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("empresa", slug);
    return noIndex(NextResponse.rewrite(url));
  }

  if (!publico) {
    return NextResponse.next();
  }

  if (pathname === "/") {
    if (request.nextUrl.searchParams.get("empresa")) {
      return noIndex(NextResponse.next());
    }
    const url = request.nextUrl.clone();
    url.pathname = "/web";
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/web",
    "/web/:path*",
    "/web-institucional",
    "/web-institucional/:path*",
    "/acceso",
    "/acceso/:path*",
    "/sitio/:path*",
    "/recursos",
    "/recursos/:path*",
    "/:slug",
  ],
};
