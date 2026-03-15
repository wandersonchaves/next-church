import type { NextFetchEvent, NextRequest } from 'next/server';
import { detectBot } from '@arcjet/next';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import arcjet from '@/libs/Arcjet';
import { routing } from './libs/I18nRouting';

const handleI18nRouting = createMiddleware(routing);

// Rotas protegidas
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/:locale/dashboard(.*)',
]);

// Rota do Inngest: DEVE SER TOTALMENTE PÚBLICA PARA O CLOUD SYNC
const isInngestRoute = createRouteMatcher(['/api/inngest']);

const aj = arcjet.withRule(
  detectBot({
    mode: 'LIVE',
    allow: [
      'CATEGORY:SEARCH_ENGINE',
      'CATEGORY:PREVIEW',
      'CATEGORY:MONITOR',
    ],
  }),
);

export default async function proxy(
  request: NextRequest,
  event: NextFetchEvent,
) {
  // 1. BYPASS TOTAL PARA INNGEST (CRÍTICO PARA PRODUÇÃO)
  if (isInngestRoute(request)) {
    return NextResponse.next();
  }

  // 2. Proteção Arcjet
  if (process.env.ARCJET_KEY) {
    const decision = await aj.protect(request);
    if (decision.isDenied()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // 3. Clerk & I18n
  return clerkMiddleware(async (auth, req) => {
    if (isProtectedRoute(req)) {
      const locale = req.nextUrl.pathname.match(/(\/.*)\/dashboard/)?.at(1) ?? '';
      const signInUrl = new URL(`${locale}/sign-in`, req.url);

      await auth.protect({
        unauthenticatedUrl: signInUrl.toString(),
      });
    }

    return handleI18nRouting(req);
  })(request, event);
}

export const config = {
  matcher: '/((?!_next|_vercel|monitoring|.*\\..*).*)',
};
