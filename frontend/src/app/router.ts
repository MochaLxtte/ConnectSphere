import { createRouter, createWebHistory } from 'vue-router';
import DashboardPage from '../features/system/pages/DashboardPage.vue';
import LoginPage from '../features/auth/pages/LoginPage.vue';
import EventRequestsPage from '../features/events/pages/EventRequestsPage.vue';
import NewEventPage from '../features/events/pages/NewEventPage.vue';
import ReviewQueuePage from '../features/reviews/pages/ReviewQueuePage.vue';
import NotFoundPage from '../components/NotFoundPage.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: DashboardPage, meta: { title: 'Overview' } },
    { path: '/login', component: LoginPage, meta: { title: 'Sign in' } },
    { path: '/events', component: EventRequestsPage, meta: { title: 'Event requests' } },
    { path: '/events/new', component: NewEventPage, meta: { title: 'New event request' } },
    { path: '/reviews', component: ReviewQueuePage, meta: { title: 'Review queue' } },
    { path: '/:pathMatch(.*)*', component: NotFoundPage, meta: { title: 'Page not found' } },
  ],
  scrollBehavior: () => ({ top: 0 }),
});

router.afterEach((to) => {
  document.title = `${String(to.meta.title || 'Workspace')} · ConnectSphere`;
});
