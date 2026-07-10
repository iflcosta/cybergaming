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
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Cyber Brasil Arena — Voucher founding member 25% OFF" },
      { name: "twitter:description", content: "A nova arena gamer de Bragança Paulista tá chegando. Garanta seu voucher founding member com 25% OFF no primeiro pacote de horas." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/66f5ad27-0575-4a9c-9099-e2116848581b/id-preview-1c1ed1e4--dd006d88-973d-43de-9bd2-db42bc50247f.lovable.app-1783534589672.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/66f5ad27-0575-4a9c-9099-e2116848581b/id-preview-1c1ed1e4--dd006d88-973d-43de-9bd2-db42bc50247f.lovable.app-1783534589672.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
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

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
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
