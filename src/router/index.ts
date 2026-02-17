/**
 * Vue Router configuration for the names application.
 */

import "vue-router";
import { createRouter, createWebHistory } from "vue-router";

declare module "vue-router" {
  interface RouteMeta {
    title?: string;
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      redirect: "/score",
    },
    {
      component: () => import("@/pages/score-page.vue"),
      meta: { title: "score" },
      name: "score",
      path: "/score",
    },
    {
      component: () => import("@/pages/popular-page.vue"),
      meta: { title: "popular" },
      name: "popular",
      path: "/popular",
    },
    {
      component: () => import("@/pages/nearest-page.vue"),
      meta: { title: "nearest" },
      name: "nearest",
      path: "/nearest",
    },
    {
      component: () => import("@/pages/name-lookup-page.vue"),
      name: "lookup",
      path: "/name/:name",
    },
    {
      component: () => import("@/pages/name-year-page.vue"),
      name: "year",
      path: "/name/:name/year/:year",
    },
  ],
});

router.afterEach((to) => {
  const name = String(to.params.name ?? "");
  const year = String(to.params.year ?? "");

  if (to.meta.title !== undefined) {
    document.title = `names - ${to.meta.title}`;
  } else if (to.name === "lookup") {
    document.title = `names - ${name}`;
  } else if (to.name === "year") {
    document.title = `names - ${name} (${year})`;
  } else {
    document.title = "names";
  }
});

export default router;
