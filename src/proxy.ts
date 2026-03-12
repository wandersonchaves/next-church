import type { NextFetchEvent, NextRequest } from 'next/server';
import { detectBot } from '@arcjet/next';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import arcjet from '@/libs/Arcjet';
import { routing } from './libs/I18nRouting';

const handleI18nRouting = createMiddleware(routing);

// Rotas que exigem autenticação obrigatória
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/:locale/dashboard(.*)',
]);

// Configuração do Arcjet para bots
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
  // 1. Proteção Arcjet (Bot Detection)
  if (process.env.ARCJET_KEY) {
    const decision = await aj.protect(request);
    if (decision.isDenied()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // 2. Executamos o ClerkMiddleware em TODAS as rotas mapeadas pelo matcher.
  // Isso é necessário para usar componentes de Auth no layout de marketing.
  return clerkMiddleware(async (auth, req) => {
    // Se for uma rota protegida, garantimos que o usuário está logado
    if (isProtectedRoute(req)) {
      const locale = req.nextUrl.pathname.match(/(\/.*)\/dashboard/)?.at(1) ?? '';
      const signInUrl = new URL(`${locale}/sign-in`, req.url);

      await auth.protect({
        unauthenticatedUrl: signInUrl.toString(),
      });
    }

    // Após processar Auth, passamos para o I18n
    return handleI18nRouting(req);
  })(request, event);
}

export const config = {
  // Matcher padrão que exclui arquivos estáticos e pastas de sistema
  matcher: '/((?!_next|_vercel|monitoring|.*\\..*).*)',
};
