import { createRouter, createWebHistory } from 'vue-router';
import DashboardPage from '../features/system/pages/DashboardPage.vue';
import LoginPage from '../features/auth/pages/LoginPage.vue';
import EventRequestsPage from '../features/events/pages/EventRequestsPage.vue';
import EventRequestDetailPage from '../features/events/pages/EventRequestDetailPage.vue';
import EventDraftEditPage from '../features/events/pages/EventDraftEditPage.vue';
import NewEventPage from '../features/events/pages/NewEventPage.vue';
import ReviewAccessPage from '../features/reviews/pages/ReviewAccessPage.vue';
import UnassignedRequestsPage from '../features/reviews/pages/UnassignedRequestsPage.vue';
import ReviewQueuePage from '../features/reviews/pages/ReviewQueuePage.vue';
import ReviewRequestPage from '../features/reviews/pages/ReviewRequestPage.vue';
import VenueAvailabilityPage from '../features/venues/pages/VenueAvailabilityPage.vue';
import NotFoundPage from '../components/NotFoundPage.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: DashboardPage, meta: { title: 'Overview' } },
    { path: '/login', component: LoginPage, meta: { title: 'Sign in' } },
    { path: '/events', component: EventRequestsPage, meta: { title: 'Event requests' } },
    { path: '/events/new', component: NewEventPage, meta: { title: 'New event request' } },
    { path: '/events/:id/edit', component: EventDraftEditPage, meta: { title: 'Edit draft' } },
    { path: '/events/:id', component: EventRequestDetailPage, meta: { title: 'Event request' } },
    { path: '/venues/availability', component: VenueAvailabilityPage, meta: { title: 'Venue availability' } },
    {
      path: '/reviews', component: ReviewAccessPage,
      children: [
        { path: '', component: ReviewQueuePage, meta: { title: 'Review queue' } },
        { path: 'unassigned', component: UnassignedRequestsPage, meta: { title: 'Unassigned requests' } },
        { path: ':id', component: ReviewRequestPage, meta: { title: 'Event request review' } },
      ],
    },
    { path: '/:pathMatch(.*)*', component: NotFoundPage, meta: { title: 'Page not found' } },
  ],
  scrollBehavior: () => ({ top: 0 }),
});

router.afterEach((to) => {
  document.title = `${String(to.meta.title || 'Workspace')} · ConnectSphere`;
});
