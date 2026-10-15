import { NextResponse, type NextRequest } from "next/server";
import {
  SEGMENT_COOKIE,
  SEGMENT_HEADER,
  rootRedirectForCookie,
  segmentAliasRewrite,
  segmentCookieAttributes,
} from "@/lib/segment-memory";
import { indexNowRewritePath } from "@/lib/indexnow";
import { getSegment } from "@/lib/segments";

function withSegmentHeader(request: NextRequest, slug: string | null): Headers {
  const headers = new Headers(request.headers);
  if (slug) headers.set(SEGMENT_HEADER, slug);
  else headers.delete(SEGMENT_HEADER);
  return headers;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const indexNowPath = indexNowRewritePath(pathname);
  if (indexNowPath) {
    const url = request.nextUrl.clone();
    url.pathname = indexNowPath;
    return NextResponse.rewrite(url);
  }
  const slug = pathname.split("/").filter(Boolean)[0];
  const segment = slug ? getSegment(slug) : undefined;

  if (pathname === "/") {
    const target = rootRedirectForCookie(request.cookies.get(SEGMENT_COOKIE)?.value);
    if (target) {
      const url = request.nextUrl.clone();
      url.pathname = target;
      return NextResponse.redirect(url, 307);
    }
  }

  if (!segment) {
    return NextResponse.next({
      request: { headers: withSegmentHeader(request, null) },
    });
  }

  const rewritePath = segmentAliasRewrite(pathname);
  const headers = withSegmentHeader(request, segment.slug);
  const url = request.nextUrl.clone();
  if (rewritePath) url.pathname = rewritePath;
  const response = rewritePath
    ? NextResponse.rewrite(url, { request: { headers } })
    : NextResponse.next({ request: { headers } });

  if (request.cookies.get(SEGMENT_COOKIE)?.value !== segment.slug) {
    response.cookies.set(SEGMENT_COOKIE, segment.slug, segmentCookieAttributes());
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml|llms.txt|llms-full.txt).*)",
  ],
};
