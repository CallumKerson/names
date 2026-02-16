/**
 * Vue Router configuration for the names application.
 */

import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      redirect: "/score",
    },
    {
      component: () => import("@/pages/score-page.vue"),
      name: "score",
      path: "/score",
    },
    {
      component: () => import("@/pages/popular-page.vue"),
      name: "popular",
      path: "/popular",
    },
    {
      component: () => import("@/pages/nearest-page.vue"),
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

export default router;
