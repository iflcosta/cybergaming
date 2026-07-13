import { createRootRoute, createRoute, Outlet } from "@tanstack/react-router";
import { RootLayout } from "./routes/__root";
import { LoginPage } from "./routes/login";
import { DashboardPage } from "./routes/index";
import { SessionsPage } from "./routes/sessions";
import { StationsPage } from "./routes/stations";
import { CustomersPage } from "./routes/customers";
import { TournamentsPage } from "./routes/tournaments";
import { TransactionsPage } from "./routes/transactions";

// Root route wraps everything but login uses a plain Outlet (no sidebar/auth guard)
const rootRoute = createRootRoute({ component: () => <Outlet /> });

// Auth-guarded layout
const appRoute = createRoute({ getParentRoute: () => rootRoute, id: "app", component: RootLayout });

// Public
const loginRoute = createRoute({ getParentRoute: () => rootRoute, path: "/login", component: LoginPage });

// Protected
const dashboardRoute   = createRoute({ getParentRoute: () => appRoute, path: "/",             component: DashboardPage });
const sessionsRoute    = createRoute({ getParentRoute: () => appRoute, path: "/sessions",     component: SessionsPage });
const stationsRoute    = createRoute({ getParentRoute: () => appRoute, path: "/stations",     component: StationsPage });
const customersRoute   = createRoute({ getParentRoute: () => appRoute, path: "/customers",    component: CustomersPage });
const tournamentsRoute = createRoute({ getParentRoute: () => appRoute, path: "/tournaments",  component: TournamentsPage });
const transactionsRoute = createRoute({ getParentRoute: () => appRoute, path: "/transactions", component: TransactionsPage });

export const routeTree = rootRoute.addChildren([
  loginRoute,
  appRoute.addChildren([
    dashboardRoute,
    sessionsRoute,
    stationsRoute,
    customersRoute,
    tournamentsRoute,
    transactionsRoute,
  ]),
]);
