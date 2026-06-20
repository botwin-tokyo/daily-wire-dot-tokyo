import {
  createRootRoute,
  createRoute,
  createRouter,
  createMemoryHistory,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

export function renderWithRouter(children: ReactNode, initialPath = "/") {
  const rootRoute = createRootRoute({
    component: () => <Outlet />,
  });

  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: () => <>{children}</>,
  });

  const worldRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/world",
    component: () => <>{children}</>,
  });

  const routeTree = rootRoute.addChildren([indexRoute, worldRoute]);

  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });

  return <RouterProvider router={router} />;
}
