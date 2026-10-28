import { createRouter, createWebHistory } from 'vue-router';
import DashboardPage from '../features/system/pages/DashboardPage.vue';
import LoginPage from '../features/auth/pages/LoginPage.vue';
import EventRequestsPage from '../features/events/pages/EventRequestsPage.vue';
import EventRequestDetailPage from '../features/events/pages/EventRequestDetailPage.vue';
import EventDraftEditPage from '../features/events/pages/EventDraftEditPage.vue';
import EventDetailsEditPage from '../features/events/pages/EventDetailsEditPage.vue';
import NewEventPage from '../features/events/pages/NewEventPage.vue';
import ReviewAccessPage from '../features/reviews/pages/ReviewAccessPage.vue';
import UnassignedRequestsPage from '../features/reviews/pages/UnassignedRequestsPage.vue';
import LeadAccessPage from '../features/reviews/pages/LeadAccessPage.vue';
import LeadOversightPage from '../features/reviews/pages/LeadOversightPage.vue';
import LeadRequestPage from '../features/reviews/pages/LeadRequestPage.vue';
import ReviewQueuePage from '../features/reviews/pages/ReviewQueuePage.vue';
import ReviewRequestPage from '../features/reviews/pages/ReviewRequestPage.vue';
import VenueAvailabilityPage from '../features/venues/pages/VenueAvailabilityPage.vue';
import NotificationsPage from '../features/notifications/pages/NotificationsPage.vue';
import NotFoundPage from '../components/NotFoundPage.vue';
import VenueSearchPage from '../features/venues/pages/VenueSearchPage.vue';
import VenueBookingsPage from '../features/venues/pages/VenueBookingsPage.vue';
import VenueBookingDetailPage from '../features/venues/pages/VenueBookingDetailPage.vue';
import VenueBlocksPage from '../features/venues/pages/VenueBlocksPage.vue';
import VenueCataloguePage from '../features/venues/pages/VenueCataloguePage.vue';
import VenueCatalogueEditPage from '../features/venues/pages/VenueCatalogueEditPage.vue';
import VenueSuitabilityPage from '../features/venues/pages/VenueSuitabilityPage.vue';
import EquipmentAccessPage from '../features/equipment/pages/EquipmentAccessPage.vue';
import EquipmentAvailabilityPage from '../features/equipment/pages/EquipmentAvailabilityPage.vue';
import EventEquipmentAvailabilityPage from '../features/equipment/pages/EventEquipmentAvailabilityPage.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: DashboardPage, meta: { title: 'Overview' } },
    { path: '/login', component: LoginPage, meta: { title: 'Sign in' } },
    { path: '/events', component: EventRequestsPage, meta: { title: 'Event requests' } },
    { path: '/events/new', component: NewEventPage, meta: { title: 'New event request' } },
    { path: '/events/:id/edit', component: EventDraftEditPage, meta: { title: 'Edit draft' } },
    // KAN-66: post-submission edits by the owner, or name/description by the assigned coordinator.
    { path: '/events/:id/details', component: EventDetailsEditPage, meta: { title: 'Edit event details' } },
    { path: '/events/:id', component: EventRequestDetailPage, meta: { title: 'Event request' } },
    { path: '/venues/availability', component: VenueAvailabilityPage, meta: { title: 'Venue availability' } },
    { path: '/notifications', component: NotificationsPage, meta: { title: 'Notifications' } },
    {
      path: '/equipment/availability', component: EquipmentAccessPage,
      children: [
        { path: '', component: EquipmentAvailabilityPage, meta: { title: 'Equipment availability' } },
        { path: ':id', component: EventEquipmentAvailabilityPage, meta: { title: 'Check equipment availability' } },
      ],
    },
    {
      path: '/reviews', component: ReviewAccessPage,
      children: [
        { path: '', component: ReviewQueuePage, meta: { title: 'Review queue' } },
        { path: ':id/venue-suitability', component: VenueSuitabilityPage, meta: { title: 'Venue suitability' } },
        { path: ':id', component: ReviewRequestPage, meta: { title: 'Event request review' } },
      ],
    },
    { path: '/reviews/unassigned', redirect: '/lead' },
    {
      path: '/lead', component: LeadAccessPage,
      children: [
        { path: '', component: UnassignedRequestsPage, meta: { title: 'Assignment queue' } },
        { path: 'oversight', component: LeadOversightPage, meta: { title: 'Event oversight' } },
        { path: 'oversight/:id', component: LeadRequestPage, meta: { title: 'Event allocation' } },
      ],
    },
    { path: '/venues', component: VenueSearchPage, meta: { title: 'Venue search' } },
    { path: '/venue-bookings', component: VenueBookingsPage, meta: { title: 'Venue bookings' } },
    { path: '/venue-bookings/:id', component: VenueBookingDetailPage, meta: { title: 'Venue booking' } },
    { path: '/venue-blocks', component: VenueBlocksPage, meta: { title: 'Venue blocks' } },
    { path: '/venue-catalogue', component: VenueCataloguePage, meta: { title: 'Venue catalogue' } },
    { path: '/venue-catalogue/:id', component: VenueCatalogueEditPage, meta: { title: 'Edit venue' } },
    { path: '/:pathMatch(.*)*', component: NotFoundPage, meta: { title: 'Page not found' } },
  ],
  scrollBehavior: () => ({ top: 0 }),
});

router.afterEach((to) => {
  document.title = `${String(to.meta.title || 'Workspace')} · ConnectSphere`;
});
