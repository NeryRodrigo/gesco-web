import { NextRequest, NextResponse } from "next/server";

const CANONICAL = "https://www.vordia.com.py";
const SITIO_PUBLICO = new Set(["vordia.com.py", "www.vordia.com.py"]);
const RESERVADOS = new Set([
  "web",
  "api",
  "login",
  "acceso",
  "images",
  "icons",
  "favicon.ico",
  "_next",
]);

function hostname(request: NextRequest) {
  return (request.headers.get("host") || "").split(":")[0].toLowerCase();
}

function primerSegmento(pathname: string) {
  return pathname.replace(/^\/+|\/+$/g, "").split("/")[0] || "";
}

export function middleware(request: NextRequest) {
  const host = hostname(request);
  const { pathname } = request.nextUrl;
  const slug = primerSegmento(pathname);
  const unSegmento = pathname.split("/").filter(Boolean).length === 1;

  if (host.endsWith("duckdns.org") && (pathname === "/web" || pathname === "/web/")) {
    return NextResponse.redirect(`${CANONICAL}/`, 308);
  }

  // /condominio-agus, /vordia, /agrofield → login con ese entorno
  if (unSegmento && slug && !RESERVADOS.has(slug)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("empresa", slug);
    return NextResponse.rewrite(url);
  }

  if (!SITIO_PUBLICO.has(host)) {
    return NextResponse.next();
  }

  if (pathname === "/web" || pathname === "/web/") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url, 308);
  }

  if (pathname === "/") {
    if (request.nextUrl.searchParams.get("empresa")) {
      return NextResponse.next();
    }
    const url = request.nextUrl.clone();
    url.pathname = "/web";
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/web", "/web/:path*", "/:slug"],
};
