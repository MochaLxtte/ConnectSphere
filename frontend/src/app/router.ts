import { createRouter, createWebHistory } from 'vue-router';
import DashboardPage from '../features/system/pages/DashboardPage.vue';
import LoginPage from '../features/auth/pages/LoginPage.vue';
import EventRequestsPage from '../features/events/pages/EventRequestsPage.vue';
import EventRequestDetailPage from '../features/events/pages/EventRequestDetailPage.vue';
import EventDraftEditPage from '../features/events/pages/EventDraftEditPage.vue';
import NewEventPage from '../features/events/pages/NewEventPage.vue';
import ReviewQueuePage from '../features/reviews/pages/ReviewQueuePage.vue';
import ReviewRequestPage from '../features/reviews/pages/ReviewRequestPage.vue';
import UnassignedRequestsPage from '../features/reviews/pages/UnassignedRequestsPage.vue';
import VenueCataloguePage from '../features/venues/pages/VenueCataloguePage.vue';
import VenueDetailPage from '../features/venues/pages/VenueDetailPage.vue';
import VenueFormPage from '../features/venues/pages/VenueFormPage.vue';
import VenueBookingQueuePage from '../features/venues/pages/VenueBookingQueuePage.vue';
import EquipmentCataloguePage from '../features/equipment/pages/EquipmentCataloguePage.vue';
import EquipmentFormPage from '../features/equipment/pages/EquipmentFormPage.vue';
import EquipmentRequestQueuePage from '../features/equipment/pages/EquipmentRequestQueuePage.vue';
import BrowseEventsPage from '../features/registrations/pages/BrowseEventsPage.vue';
import EventRegistrationPage from '../features/registrations/pages/EventRegistrationPage.vue';
import MyRegistrationsPage from '../features/registrations/pages/MyRegistrationsPage.vue';
import NotificationsPage from '../features/notifications/pages/NotificationsPage.vue';
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
    { path: '/reviews', component: ReviewQueuePage, meta: { title: 'Review queue' } },
    { path: '/reviews/unassigned', component: UnassignedRequestsPage, meta: { title: 'Unassigned requests' } },
    { path: '/reviews/:id', component: ReviewRequestPage, meta: { title: 'Event request review' } },
    { path: '/venues', component: VenueCataloguePage, meta: { title: 'Venues' } },
    { path: '/venues/new', component: VenueFormPage, meta: { title: 'Add venue' } },
    { path: '/venues/:id', component: VenueDetailPage, meta: { title: 'Venue' } },
    { path: '/venues/:id/edit', component: VenueFormPage, meta: { title: 'Edit venue' } },
    { path: '/venue-bookings', component: VenueBookingQueuePage, meta: { title: 'Venue booking requests' } },
    { path: '/equipment', component: EquipmentCataloguePage, meta: { title: 'Equipment' } },
    { path: '/equipment/new', component: EquipmentFormPage, meta: { title: 'Add equipment' } },
    { path: '/equipment/requests', component: EquipmentRequestQueuePage, meta: { title: 'Equipment requests' } },
    { path: '/equipment/:id/edit', component: EquipmentFormPage, meta: { title: 'Edit equipment' } },
    { path: '/browse', component: BrowseEventsPage, meta: { title: 'Browse events' } },
    { path: '/browse/:id', component: EventRegistrationPage, meta: { title: 'Event registration' } },
    { path: '/registrations', component: MyRegistrationsPage, meta: { title: 'My registrations' } },
    { path: '/notifications', component: NotificationsPage, meta: { title: 'Notifications' } },
    { path: '/:pathMatch(.*)*', component: NotFoundPage, meta: { title: 'Page not found' } },
  ],
  scrollBehavior: () => ({ top: 0 }),
});

router.afterEach((to) => {
  document.title = `${String(to.meta.title || 'Workspace')} · ConnectSphere`;
});
