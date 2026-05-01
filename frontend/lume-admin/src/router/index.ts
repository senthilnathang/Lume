import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import { setupAuthGuard, setupAccessGuard } from './guards'

const staticRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('../layouts/BasicLayout.vue'),
    children: [
      {
        path: '',
        component: () => import('../views/DashboardView.vue'),
        meta: { requiresAuth: true, title: 'Dashboard' }
      }
    ],
    meta: { requiresAuth: true }
  },
  {
    path: '/forbidden',
    name: 'Forbidden',
    component: () => import('../views/ForbiddenView.vue')
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../views/NotFoundView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes: staticRoutes
})

// Setup guards
setupAuthGuard(router)
setupAccessGuard(router)

export default router
