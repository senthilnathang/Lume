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
    path: '/automation/workflows/:workflowId/executions/:executionId',
    name: 'WorkflowExecution',
    component: () => import('../layouts/BasicLayout.vue'),
    children: [
      {
        path: '',
        component: () => import('@modules/base_automation/static/views/workflow-execution.vue'),
        props: route => ({
          workflowId: route.params.workflowId,
          executionId: route.params.executionId
        }),
        meta: { requiresAuth: true, title: 'Workflow Execution' }
      }
    ],
    meta: { requiresAuth: true }
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
