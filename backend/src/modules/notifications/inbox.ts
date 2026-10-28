import {
  iso, WorkflowError, type WorkflowActor, type WorkflowDependencies,
} from '../events/workflow-support.js';

/**
 * KAN-64 in-app inbox. Every query is scoped to the verified caller (`recipient_id = $1`) and to
 * what that caller may still see, rechecked on each read (AC206): their own event as organiser,
 * the event they currently coordinate, or a booking they may open as Venue Staff or as that
 * event's coordinator. The one exception is the minimal reassignment notice, which names nothing.
 * Access therefore follows the current role and assignment, not the moment the notice was written.
 */
export interface InboxItem {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  readAt: string | null;
  createdAt: string;
  /** Present only while the caller may still open the event. */
  event: { id: string; name: string | null } | null;
  booking: { id: string } | null;
  /** An application path the destination page will authorise again, or null. */
  link: string | null;
}

/** Newest notifications first; the inbox shows at most this many. */
export const INBOX_LIMIT = 100;

const FROM = `
  FROM notifications n
  LEFT JOIN event_requests e ON e.id = n.event_request_id
  LEFT JOIN venue_bookings b ON b.id = n.venue_booking_id
  LEFT JOIN equipment_requests r ON r.id = n.equipment_request_id AND r.event_request_id = e.id`;

const CAN_VIEW_EVENT = `(e.id IS NOT NULL AND (
  ($2 = 'EVENT_ORGANISER' AND e.organiser_id = $1)
  OR ($2 = 'EVENT_COORDINATOR' AND e.coordinator_id = $1 AND e.status <> 'DRAFT')))`;

const CAN_VIEW_BOOKING = `(b.id IS NOT NULL AND (
  $2 = 'VENUE_STAFF'
  OR ($2 = 'EVENT_COORDINATOR' AND e.coordinator_id = $1 AND e.status <> 'DRAFT')))`;

// Only the intended recipient's equipment notice is readable, without general event-detail access.
const CAN_VIEW_EQUIPMENT = `(r.id IS NOT NULL AND $2 = 'TECHNICAL_SUPPORT_STAFF')`;

// A cancelled registration grants only its recipient's cancellation outcome, never event details.
const CAN_VIEW_ATTENDEE_CANCELLATION = `($2 = 'ATTENDEE' AND n.type = 'EVENT_CANCELLED'
  AND e.status = 'CANCELLED' AND EXISTS (SELECT 1 FROM event_registrations registration
    WHERE registration.event_request_id = e.id AND registration.attendee_id = $1
      AND registration.status = 'CANCELLED' AND registration.cancellation_outcome_at IS NOT NULL))`;

const VISIBLE = `n.recipient_id = $1 AND (
  (n.event_request_id IS NULL AND n.venue_booking_id IS NULL AND n.equipment_request_id IS NULL)
  OR n.type = 'COORDINATOR_REASSIGNED_AWAY'
  OR ${CAN_VIEW_EVENT} OR ${CAN_VIEW_BOOKING} OR ${CAN_VIEW_EQUIPMENT}
  OR ${CAN_VIEW_ATTENDEE_CANCELLATION})`;

interface Row {
  id: string;
  type: string;
  title: string;
  message: string;
  readAt: Date | string | null;
  createdAt: Date | string;
  eventId: string | null;
  eventName: string | null;
  bookingId: string | null;
  canViewEvent: boolean;
  canViewBooking: boolean;
  canViewEquipment: boolean;
  canViewAttendeeCancellation: boolean;
  equipmentOpen: boolean;
}

const SELECT = `SELECT n.id, n.type, n.title, n.message, n.read_at AS "readAt", n.created_at AS "createdAt",
  e.id AS "eventId", e.name AS "eventName", b.id AS "bookingId",
  ${CAN_VIEW_EVENT} AS "canViewEvent", ${CAN_VIEW_BOOKING} AS "canViewBooking",
  ${CAN_VIEW_EQUIPMENT} AS "canViewEquipment", e.status IN ('APPROVED', 'CONFIRMED') AS "equipmentOpen",
  ${CAN_VIEW_ATTENDEE_CANCELLATION} AS "canViewAttendeeCancellation"`;

function toItem(row: Row, role: WorkflowActor['role']): InboxItem {
  const link = row.canViewBooking && row.bookingId ? `/venue-bookings/${row.bookingId}`
    : row.canViewEvent && row.eventId ? (role === 'EVENT_ORGANISER' ? `/events/${row.eventId}` : `/reviews/${row.eventId}`)
      : row.canViewEquipment && row.equipmentOpen ? `/equipment/availability/${row.eventId}` : null;
  return {
    id: row.id, type: row.type, title: row.canViewAttendeeCancellation ? 'Event cancelled' : row.title,
    message: row.canViewAttendeeCancellation
      ? `${row.eventName ?? 'The event'} has been cancelled. Your registration is no longer active.`
      : row.canViewEquipment && !row.equipmentOpen
      ? `${row.message} This event is no longer open for equipment planning.` : row.message,
    read: row.readAt !== null, readAt: row.readAt === null ? null : iso(row.readAt), createdAt: iso(row.createdAt),
    event: row.canViewEvent && row.eventId ? { id: row.eventId, name: row.eventName } : null,
    booking: row.canViewBooking && row.bookingId ? { id: row.bookingId } : null,
    link,
  };
}

export async function listNotifications(
  { pool }: WorkflowDependencies, actor: WorkflowActor,
): Promise<InboxItem[]> {
  const found = await pool.query<Row>(
    `${SELECT} ${FROM} WHERE ${VISIBLE} ORDER BY n.created_at DESC, n.id DESC LIMIT ${INBOX_LIMIT}`,
    [actor.id, actor.role],
  );
  return found.rows.map((row) => toItem(row, actor.role));
}

export async function countUnreadNotifications(
  { pool }: WorkflowDependencies, actor: WorkflowActor,
): Promise<number> {
  const found = await pool.query<{ count: number }>(
    `SELECT count(*)::integer AS count ${FROM} WHERE ${VISIBLE} AND n.read_at IS NULL`,
    [actor.id, actor.role],
  );
  return found.rows[0]?.count ?? 0;
}

const notFound = () =>
  new WorkflowError('NOT_FOUND', 'NOTIFICATION_NOT_FOUND', 'The notification was not found.');

/** Idempotent: reading an already-read notification keeps its original read time. */
export async function markNotificationRead(
  { pool }: WorkflowDependencies, { notificationId, actor }: { notificationId: string; actor: WorkflowActor },
): Promise<InboxItem> {
  // Absent, someone else's and no-longer-visible notifications are indistinguishable.
  const visible = await pool.query(
    `SELECT n.id ${FROM} WHERE ${VISIBLE} AND n.id = $3`, [actor.id, actor.role, notificationId],
  );
  if (visible.rows.length === 0) throw notFound();
  await pool.query(
    'UPDATE notifications SET read_at = now() WHERE id = $1 AND recipient_id = $2 AND read_at IS NULL',
    [notificationId, actor.id],
  );
  const found = await pool.query<Row>(
    `${SELECT} ${FROM} WHERE ${VISIBLE} AND n.id = $3`, [actor.id, actor.role, notificationId],
  );
  if (!found.rows[0]) throw notFound();
  return toItem(found.rows[0], actor.role);
}

/** Marks only what the caller can currently see; returns how many changed. */
export async function markAllNotificationsRead(
  { pool }: WorkflowDependencies, actor: WorkflowActor,
): Promise<number> {
  const updated = await pool.query(
    `UPDATE notifications SET read_at = now()
     WHERE recipient_id = $1 AND read_at IS NULL AND id IN (
       SELECT n.id ${FROM} WHERE ${VISIBLE} AND n.read_at IS NULL)`,
    [actor.id, actor.role],
  );
  return updated.rowCount ?? 0;
}
