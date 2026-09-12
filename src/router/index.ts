import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import DashboardPage from '../views/DashboardPage.vue';
import WatchlistPage from '../views/WatchlistPage.vue';
import AddMoviePage from '../views/AddMoviePage.vue';
import EditMoviePage from '../views/EditMoviePage.vue';
import FirebaseStatusPage from '../views/FirebaseStatusPage.vue';

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
    component: WatchlistPage
  },
  {
    path: '/add',
    name: 'AddMovie',
    component: AddMoviePage
  },
  {
    path: '/edit/:id',
    name: 'EditMovie',
    component: EditMoviePage
  },
  {
    path: '/firebase-status',
    name: 'FirebaseStatus',
    component: FirebaseStatusPage
  }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

export default router;
