import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-primary px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-text-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-text-primary">Página não encontrada</h2>
        <p className="mt-2 text-sm text-text-secondary">
          Essa página não existe ou foi movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-accent-primary px-4 py-2 text-sm font-semibold text-text-on-accent transition hover:opacity-90"
          >
            Voltar pra home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-primary px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-text-primary">Algo deu errado</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Tenta atualizar a página ou voltar pra home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-accent-primary px-4 py-2 text-sm font-semibold text-text-on-accent transition hover:opacity-90"
          >
            Tentar de novo
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-border-subtle bg-bg-secondary px-4 py-2 text-sm font-medium text-text-primary transition hover:border-border-default"
          >
            Ir pra home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Cyber Brasil Arena — Voucher founding member 25% OFF" },
      {
        name: "description",
        content:
          "A nova arena gamer de Bragança Paulista tá chegando. Garanta seu voucher founding member com 25% OFF no primeiro pacote de horas.",
      },
      { name: "author", content: "Cyber Brasil Arena" },
      { property: "og:title", content: "Cyber Brasil Arena — Voucher founding member 25% OFF" },
      {
        property: "og:description",
        content:
          "A nova arena gamer de Bragança Paulista tá chegando. Garanta seu voucher founding member com 25% OFF no primeiro pacote de horas.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://arena.cyberinformatica.tech" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Cyber Brasil Arena — Voucher founding member 25% OFF" },
      { name: "twitter:description", content: "A nova arena gamer de Bragança Paulista tá chegando. Garanta seu voucher founding member com 25% OFF no primeiro pacote de horas." },
      { property: "og:image", content: "https://arena.cyberinformatica.tech/og-image.jpg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:image", content: "https://arena.cyberinformatica.tech/og-image.jpg" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "canonical", href: "https://arena.cyberinformatica.tech" },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "icon", href: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "dns-prefetch", href: "https://scrswxgvlwfndsqrclgb.supabase.co" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

const META_PIXEL_ID = "1658410715239046";

const metaPixelSnippet = `!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${META_PIXEL_ID}');
fbq('track', 'PageView');`;

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <HeadContent />
        {/* Meta Pixel */}
        <script dangerouslySetInnerHTML={{ __html: metaPixelSnippet }} />
      </head>
      <body>
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
            alt=""
          />
        </noscript>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
