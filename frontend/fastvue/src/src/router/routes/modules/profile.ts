import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      hideInMenu: true,
      title: 'Profile',
    },
    name: 'Profile',
    path: '/profile',
    component: () => import('#/views/profile/index.vue'),
  },
];

export default routes;
