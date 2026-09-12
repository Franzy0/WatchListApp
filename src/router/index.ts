import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import DashboardPage from '../views/DashboardPage.vue';

// The dashboard is the landing route, so it is bundled eagerly. The rest load on demand,
// which keeps the cold start of the packaged app smaller.
const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: DashboardPage
  },
  {
    path: '/watchlist',
    name: 'Watchlist',
    component: () => import('../views/WatchlistPage.vue')
  },
  {
    path: '/add',
    name: 'AddMovie',
    component: () => import('../views/AddMoviePage.vue')
  },
  {
    path: '/movie/:id',
    name: 'MovieDetail',
    component: () => import('../views/MovieDetailPage.vue')
  },
  {
    path: '/edit/:id',
    name: 'EditMovie',
    component: () => import('../views/EditMoviePage.vue')
  },
  {
    path: '/firebase-status',
    name: 'FirebaseStatus',
    component: () => import('../views/FirebaseStatusPage.vue')
  },
  {
    // Anything unrecognised goes home rather than rendering a blank page.
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard'
  }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

export default router;
