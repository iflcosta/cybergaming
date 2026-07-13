import { createRootRoute, createRoute } from "@tanstack/react-router";
import { RootLayout } from "./routes/__root";
import { IndexPage } from "./routes/index";
import { LoginPage } from "./routes/auth/login";
import { CadastroPage } from "./routes/auth/cadastro";
import { OnboardingPage } from "./routes/onboarding";
import { HomePage } from "./routes/home";
import { RequireAuth } from "./components/RequireAuth";

const rootRoute = createRootRoute({ component: RootLayout });

const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component: IndexPage });
const loginRoute = createRoute({ getParentRoute: () => rootRoute, path: "/auth/login", component: LoginPage });
const cadastroRoute = createRoute({ getParentRoute: () => rootRoute, path: "/auth/cadastro", component: CadastroPage });
const onboardingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/onboarding",
  component: () => <RequireAuth><OnboardingPage /></RequireAuth>,
});
const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/home",
  component: () => <RequireAuth><HomePage /></RequireAuth>,
});

export const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  cadastroRoute,
  onboardingRoute,
  homeRoute,
]);
