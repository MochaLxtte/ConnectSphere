import type { Pool, PoolClient } from 'pg';
import { eventReadiness, lockEventArrangements, requireTrustedRole, type EventReadiness } from '../events/confirmation.js';
import {
  inActorTransaction, iso, isoOrNull, parseObjectBody, requestNotFound, requireRelation, UUID_PATTERN,
  WorkflowError, type LockedEventRequest, type WorkflowActor,
} from '../events/workflow-support.js';
import { recordNotifications, type NotificationInput } from '../notifications/notify.js';

type Reader = Pick<PoolClient, 'query'>;

export type SafetyDecision = 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';
export type SafetyStatus = 'PENDING' | SafetyDecision;
export type SafetyArea = 'VENUE' | 'TECHNICAL';
/** STALE: the latest round was approved, but the live arrangements no longer match it (KAN-84-AC9). */
export type SafetyOutcome = 'NONE' | SafetyStatus | 'STALE';

const PLANNING = ['APPROVED', 'CONFIRMED'];
const AREAS: readonly SafetyArea[] = ['VENUE', 'TECHNICAL'];
const NOTE_FIELDS = ['emergencyAccess', 'equipmentPlacement', 'crowdMovement'] as const;
type NoteField = (typeof NOTE_FIELDS)[number];

const invalid = (message: string) => new WorkflowError('INVALID_INPUT', 'INVALID_SAFETY_REVIEW', message);
const conflict = (code: string, message: string) => new WorkflowError('CONFLICT', code, message);
const reviewNotFound = () => new WorkflowError('NOT_FOUND', 'SAFETY_REVIEW_NOT_FOUND', 'The safety review was not found.');

function requireRole(actor: WorkflowActor, role: WorkflowActor['role'], message: string): void {
  if (actor.role !== role) throw new WorkflowError('FORBIDDEN', 'ACTION_FORBIDDEN', message);
}

function optionalText(value: unknown, label: string): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') throw invalid(`${label} must be text.`);
  const trimmed = value.trim();
  if (trimmed.length > 2000) throw invalid(`${label} must be at most 2000 characters.`);
  return trimmed || null;
}

interface RoundRow {
  id: string; round: number; status: SafetyStatus; fingerprint: string;
  emergencyAccess: string | null; equipmentPlacement: string | null; crowdMovement: string | null;
  submittedByName: string | null; submittedAt: Date; decidedByName: string | null; decidedAt: Date | null;
  decisionNotes: string | null; requestedAreas: SafetyArea[] | null;
}

const roundColumns = `s.id, s.round, s.status, s.arrangement_fingerprint AS fingerprint,
  s.emergency_access AS "emergencyAccess", s.equipment_placement AS "equipmentPlacement",
  s.crowd_movement AS "crowdMovement", su.display_name AS "submittedByName", s.submitted_at AS "submittedAt",
  du.display_name AS "decidedByName", s.decided_at AS "decidedAt", s.decision_notes AS "decisionNotes",
  s.requested_areas AS "requestedAreas"
  FROM safety_reviews s JOIN app_users su ON su.id = s.submitted_by LEFT JOIN app_users du ON du.id = s.decided_by`;

function toRound(row: RoundRow) {
  const { fingerprint: _fingerprint, ...rest } = row;
  return { ...rest, submittedAt: iso(row.submittedAt), decidedAt: isoOrNull(row.decidedAt),
    missingNotes: NOTE_FIELDS.filter(field => row[field] === null) };
}

async function rounds(client: Reader, eventRequestId: string): Promise<RoundRow[]> {
  return (await client.query<RoundRow>(`SELECT ${roundColumns} WHERE s.event_request_id = $1 ORDER BY s.round DESC`,
    [eventRequestId])).rows;
}

async function fingerprint(client: Reader, eventRequestId: string): Promise<string> {
  return (await client.query<{ fingerprint: string }>(
    'SELECT safety_arrangement_fingerprint($1) AS fingerprint', [eventRequestId])).rows[0]!.fingerprint;
}

function outcomeOf(latest: RoundRow | undefined, current: string): SafetyOutcome {
  if (!latest) return 'NONE';
  if (latest.status === 'APPROVED' && latest.fingerprint !== current) return 'STALE';
  return latest.status;
}

/** KAN-84-AC7: comments and changes to an unrelated planning area do not resolve requested work. */
async function unresolvedPlanningAreas(client: Reader, eventId: string, latest: RoundRow | undefined): Promise<SafetyArea[]> {
  if (latest?.status !== 'CHANGES_REQUESTED') return [];
  const requested = latest.requestedAreas ?? [];
  const baseline = (await client.query<{ venueChanged: boolean; technicalChanged: boolean }>(`SELECT
      b.venue_fingerprint <> safety_planning_area_fingerprint($1, 'VENUE') AS "venueChanged",
      b.technical_fingerprint <> safety_planning_area_fingerprint($1, 'TECHNICAL') AS "technicalChanged"
    FROM safety_review_change_baselines b WHERE b.review_id = $2`, [eventId, latest.id])).rows[0];
  // Missing historical metadata cannot establish that requested work was completed.
  return requested.filter(area => !baseline || !(area === 'VENUE' ? baseline.venueChanged : baseline.technicalChanged));
}

const readinessMessage = (readiness: EventReadiness) =>
  readiness.checks.filter(check => !check.ready).map(check => check.message).join(' ');

interface Preparation { startedAt: Date | null; startedByName: string | null; reviewId: string | null }

async function preparationOf(client: Reader, eventRequestId: string): Promise<Preparation> {
  return (await client.query<Preparation>(`SELECT e.preparation_started_at AS "startedAt",
      u.display_name AS "startedByName", e.preparation_safety_review_id AS "reviewId"
    FROM event_requests e LEFT JOIN app_users u ON u.id = e.preparation_started_by WHERE e.id = $1`,
  [eventRequestId])).rows[0]!;
}

/** KAN-84-AC8/AC11/AC12: rounds, current outcome, remedial work and preparation eligibility. */
export async function getEventSafety(
  pool: Pick<Pool, 'connect'>, { eventRequestId, actor }: { eventRequestId: string; actor: WorkflowActor },
) {
  return inActorTransaction(pool, actor.id, async (client) => {
    await requireTrustedRole(client, actor);
    const found = await client.query<LockedEventRequest>(`SELECT id, organiser_id AS "organiserId",
      coordinator_id AS "coordinatorId", status, name, revision FROM event_requests WHERE id = $1 FOR SHARE`,
    [eventRequestId]);
    const event = found.rows[0];
    if (!event) throw requestNotFound();
    const relation = requireRelation(actor, event, ['OWNER', 'ASSIGNED_COORDINATOR']);
    const history = await rounds(client, eventRequestId);
    const current = await fingerprint(client, eventRequestId);
    const latest = history[0];
    const outcome = outcomeOf(latest, current);
    const planning = PLANNING.includes(event.status);
    const readiness = planning ? await eventReadiness(client, eventRequestId) : null;
    const preparation = await preparationOf(client, eventRequestId);
    const coordinator = relation === 'ASSIGNED_COORDINATOR';
    const approvalCurrent = outcome === 'APPROVED';
    const unresolvedAreas = await unresolvedPlanningAreas(client, eventRequestId, latest);
    return {
      eventRequestId, eventStatus: event.status, outcome, readiness, unresolvedAreas,
      pendingStale: latest?.status === 'PENDING' && latest.fingerprint !== current,
      rounds: history.map(toRound),
      preparation: preparation.startedAt ? {
        startedAt: iso(preparation.startedAt), startedByName: preparation.startedByName,
        // KAN-84-AC9: external booking/closure changes can break readiness without changing this event's fingerprint.
        blocked: !(event.status === 'CONFIRMED' && approvalCurrent && preparation.reviewId === latest?.id && readiness?.ready === true),
      } : null,
      canSubmit: coordinator && planning && readiness?.ready === true && latest?.status !== 'PENDING' && !approvalCurrent
        && unresolvedAreas.length === 0,
      canStartPreparation: coordinator && event.status === 'CONFIRMED' && approvalCurrent && readiness?.ready === true
        && preparation.reviewId !== latest?.id,
    };
  });
}

export function parseSubmission(input: unknown): Record<NoteField, string | null> {
  const body = parseObjectBody(input ?? {}, NOTE_FIELDS);
  return {
    emergencyAccess: optionalText(body.emergencyAccess, 'Emergency access'),
    equipmentPlacement: optionalText(body.equipmentPlacement, 'Equipment placement'),
    crowdMovement: optionalText(body.crowdMovement, 'Crowd movement'),
  };
}

/** KAN-84-AC2/AC7/AC101: the assigned coordinator submits the current ready arrangements as a new round. */
export async function submitSafetyReview(
  pool: Pick<Pool, 'connect'>,
  { eventRequestId, actor, input }: { eventRequestId: string; actor: WorkflowActor; input: unknown },
) {
  const notes = parseSubmission(input);
  requireRole(actor, 'EVENT_COORDINATOR', 'Only the assigned coordinator can submit a safety review.');
  return inActorTransaction(pool, actor.id, async (client) => {
    await requireTrustedRole(client, actor);
    const event = await lockEventArrangements(client, eventRequestId);
    requireRelation(actor, event, ['ASSIGNED_COORDINATOR'], 'Only the currently assigned coordinator can submit a safety review.');
    if (!PLANNING.includes(event.status)) {
      throw conflict('SAFETY_NOT_SUBMITTABLE', 'Only an approved or confirmed event can be submitted for safety review.');
    }
    const history = await rounds(client, eventRequestId);
    const current = await fingerprint(client, eventRequestId);
    if (history[0]?.status === 'PENDING') throw conflict('SAFETY_REVIEW_PENDING', 'A safety review is already waiting for a decision.');
    if (outcomeOf(history[0], current) === 'APPROVED') {
      throw conflict('SAFETY_ALREADY_APPROVED', 'The current arrangements already have safety approval.');
    }
    const unresolvedAreas = await unresolvedPlanningAreas(client, eventRequestId, history[0]);
    if (unresolvedAreas.length) {
      throw conflict('SAFETY_CHANGES_NOT_COMPLETED',
        `Update the requested ${unresolvedAreas.map(area => area.toLowerCase()).join(' and ')} arrangements before submitting a new safety review. Notes alone do not complete the requested changes.`);
    }
    const readiness = await eventReadiness(client, eventRequestId);
    if (!readiness.ready) throw conflict('EVENT_NOT_READY', readinessMessage(readiness));
    const round = (history[0]?.round ?? 0) + 1;
    const created = await client.query<{ id: string }>(`INSERT INTO safety_reviews (event_request_id, round,
        arrangement_fingerprint, emergency_access, equipment_placement, crowd_movement, submitted_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [eventRequestId, round, current, notes.emergencyAccess, notes.equipmentPlacement, notes.crowdMovement, actor.id]);
    const reviewId = created.rows[0]!.id;
    // KAN-84-AC11: the Safety Officer queue is every current Safety Officer.
    const officers = await client.query<{ id: string }>("SELECT id FROM app_users WHERE role = 'SAFETY_OFFICER' ORDER BY id");
    await recordNotifications(client, officers.rows.map(({ id }) => ({
      recipientId: id, eventRequestId, safetyReviewId: reviewId, type: 'SAFETY_REVIEW_SUBMITTED',
      title: 'Safety review requested',
      message: `${event.name ?? 'An event'} was submitted for safety review (round ${round}).`,
      dedupeKey: `SAFETY_REVIEW_SUBMITTED:${reviewId}`,
    })));
    return { eventRequestId, review: toRound((await rounds(client, eventRequestId))[0]!) };
  });
}

/** KAN-84-AC1: the Safety Officer queue of rounds awaiting a decision. */
export async function listSafetyQueue(pool: Pick<Pool, 'connect'>, actor: WorkflowActor) {
  requireRole(actor, 'SAFETY_OFFICER', 'Only a Safety Officer can view the safety review queue.');
  return inActorTransaction(pool, actor.id, async (client) => {
    await requireTrustedRole(client, actor);
    const found = await client.query<{ id: string; round: number; eventId: string; eventName: string | null;
      startsAt: Date | null; submittedAt: Date; stale: boolean }>(`SELECT s.id, s.round, e.id AS "eventId",
        e.name AS "eventName", e.starts_at AS "startsAt", s.submitted_at AS "submittedAt",
        s.arrangement_fingerprint <> safety_arrangement_fingerprint(e.id) AS stale
      FROM safety_reviews s JOIN event_requests e ON e.id = s.event_request_id
      WHERE s.status = 'PENDING' ORDER BY s.submitted_at, s.id`);
    return { items: found.rows.map(row => ({ ...row, startsAt: isoOrNull(row.startsAt), submittedAt: iso(row.submittedAt) })) };
  });
}

/** KAN-84-AC3: everything the officer reviews, with missing information shown as missing. */
export async function getSafetyReview(
  pool: Pick<Pool, 'connect'>, { reviewId, actor }: { reviewId: string; actor: WorkflowActor },
) {
  requireRole(actor, 'SAFETY_OFFICER', 'Only a Safety Officer can open a safety review.');
  return inActorTransaction(pool, actor.id, async (client) => {
    await requireTrustedRole(client, actor);
    const target = await client.query<{ eventId: string }>(
      'SELECT event_request_id AS "eventId" FROM safety_reviews WHERE id = $1', [reviewId]);
    const eventId = target.rows[0]?.eventId;
    if (!eventId) throw reviewNotFound();
    const event = (await client.query(`SELECT id, name, status, starts_at AS "startsAt", ends_at AS "endsAt",
        expected_attendance AS "expectedAttendance", venue_requirements AS "venueRequirements",
        accessibility_needs AS "accessibilityNeeds", equipment_requirements AS "equipmentRequirements",
        equipment_plan_status AS "equipmentPlanStatus"
      FROM event_requests WHERE id = $1 FOR SHARE`, [eventId])).rows[0] as Record<string, unknown> & {
      status: string; startsAt: Date | null; endsAt: Date | null };
    const venues = await client.query(`SELECT b.id AS "bookingId", v.name, v.location, v.capacity, v.layouts,
        v.accessibility_features AS "accessibilityFeatures", v.wheelchair_accessible AS "wheelchairAccessible",
        v.opens_at::text AS "opensAt", v.closes_at::text AS "closesAt",
        v.setup_minutes AS "setupMinutes", v.turnaround_minutes AS "turnaroundMinutes",
        b.layout AS "bookedLayout", b.status, EXISTS (SELECT 1 FROM venue_outage_impacts i
          WHERE i.venue_booking_id = b.id AND i.status = 'RECOVERY_REQUIRED') AS "needsRecovery"
      FROM venue_bookings b JOIN venues v ON v.id = b.venue_id
      WHERE b.event_request_id = $1 AND b.status IN ('PENDING', 'HELD', 'APPROVED') ORDER BY v.name, b.id`, [eventId]);
    const equipment = await client.query(`SELECT r.id, t.name, r.quantity, r.status
      FROM equipment_requests r JOIN equipment_types t ON t.id = r.equipment_type_id
      WHERE r.event_request_id = $1 AND r.status <> 'CANCELLED' ORDER BY t.name, r.id`, [eventId]);
    const history = await rounds(client, eventId);
    const review = history.find(row => row.id === reviewId)!;
    const current = await fingerprint(client, eventId);
    return {
      review: { ...toRound(review), fingerprint: review.fingerprint },
      stale: review.fingerprint !== current,
      canDecide: review.status === 'PENDING' && PLANNING.includes(event.status),
      event: { ...event, startsAt: isoOrNull(event.startsAt), endsAt: isoOrNull(event.endsAt) },
      venues: venues.rows, equipment: equipment.rows,
      readiness: PLANNING.includes(event.status) ? await eventReadiness(client, eventId) : null,
      rounds: history.filter(row => row.id !== reviewId).map(toRound),
    };
  });
}

export function parseDecision(input: unknown): { decision: SafetyDecision; notes: string | null;
  areas: SafetyArea[] | null; fingerprint: string } {
  const body = parseObjectBody(input, ['decision', 'notes', 'areas', 'fingerprint']);
  const decision = body.decision;
  if (decision !== 'APPROVED' && decision !== 'REJECTED' && decision !== 'CHANGES_REQUESTED') {
    throw invalid('Choose Approve, Reject or Request changes.');
  }
  const notes = optionalText(body.notes, 'Notes');
  if (decision !== 'APPROVED' && !notes) throw invalid('Explain the decision before saving it.');
  let areas: SafetyArea[] | null = null;
  if (decision === 'CHANGES_REQUESTED') {
    if (!Array.isArray(body.areas) || body.areas.length === 0
        || body.areas.some(area => !AREAS.includes(area as SafetyArea))) {
      throw invalid('Choose the venue area, the technical area or both.');
    }
    areas = AREAS.filter(area => (body.areas as unknown[]).includes(area));
  } else if (body.areas !== undefined && !(Array.isArray(body.areas) && body.areas.length === 0)) {
    throw invalid('Planning areas apply only when requesting changes.');
  }
  if (typeof body.fingerprint !== 'string' || !/^[0-9a-f]{32}$/.test(body.fingerprint)) {
    throw invalid('Reload the safety review before deciding.');
  }
  return { decision, notes, areas, fingerprint: body.fingerprint };
}

const decisionTitles: Record<SafetyDecision, string> = {
  APPROVED: 'Safety review approved', REJECTED: 'Safety review rejected', CHANGES_REQUESTED: 'Safety changes requested',
};

/** KAN-84-AC4–AC7/AC10/AC101: one decision per round, only on the version the officer reviewed. */
export async function decideSafetyReview(
  pool: Pick<Pool, 'connect'>, { reviewId, actor, input }: { reviewId: string; actor: WorkflowActor; input: unknown },
) {
  const decision = parseDecision(input);
  requireRole(actor, 'SAFETY_OFFICER', 'Only a Safety Officer can decide a safety review.');
  if (!UUID_PATTERN.test(reviewId)) throw reviewNotFound();
  return inActorTransaction(pool, actor.id, async (client) => {
    await requireTrustedRole(client, actor);
    const target = await client.query<{ eventId: string }>(
      'SELECT event_request_id AS "eventId" FROM safety_reviews WHERE id = $1', [reviewId]);
    const eventId = target.rows[0]?.eventId;
    if (!eventId) throw reviewNotFound();
    const event = await lockEventArrangements(client, eventId);
    const review = (await client.query<RoundRow>(`SELECT ${roundColumns} WHERE s.id = $1 FOR UPDATE OF s`, [reviewId])).rows[0]!;
    if (review.status !== 'PENDING') {
      // A repeated identical decision is a no-op; a different one cannot overwrite the round.
      if (review.status === decision.decision) return { changed: false, review: toRound(review) };
      throw conflict('SAFETY_REVIEW_DECIDED', 'This safety review round has already been decided.');
    }
    if (decision.fingerprint !== review.fingerprint) {
      throw conflict('SAFETY_REVIEW_STALE', 'This review changed after you opened it. Reload it before deciding.');
    }
    if (!PLANNING.includes(event.status)) {
      throw conflict('SAFETY_EVENT_CLOSED', 'This event is no longer in planning, so the review cannot be decided.');
    }
    if (decision.decision === 'APPROVED') {
      if (await fingerprint(client, eventId) !== review.fingerprint) {
        throw conflict('SAFETY_REVIEW_STALE',
          'The arrangements changed after this round was submitted. Reject it or request changes so the coordinator resubmits.');
      }
      const readiness = await eventReadiness(client, eventId);
      if (!readiness.ready) throw conflict('EVENT_NOT_READY', readinessMessage(readiness));
    }
    await client.query(`UPDATE safety_reviews SET status = $2, decided_by = $3, decided_at = now(),
      decision_notes = $4, requested_areas = $5 WHERE id = $1`,
    [reviewId, decision.decision, actor.id, decision.notes, decision.areas]);
    if (decision.decision === 'CHANGES_REQUESTED') {
      await client.query(`INSERT INTO safety_review_change_baselines (review_id, venue_fingerprint, technical_fingerprint)
        VALUES ($1, safety_planning_area_fingerprint($2, 'VENUE'), safety_planning_area_fingerprint($2, 'TECHNICAL'))`,
      [reviewId, eventId]);
    }
    const label = event.name ?? 'the event';
    const notices: NotificationInput[] = event.coordinatorId ? [{
      recipientId: event.coordinatorId, eventRequestId: eventId, safetyReviewId: reviewId,
      type: `SAFETY_REVIEW_${decision.decision}`, title: decisionTitles[decision.decision],
      message: decision.decision === 'APPROVED'
        ? `Safety review round ${review.round} for ${label} was approved.`
        : `Safety review round ${review.round} for ${label}: ${decision.notes}`,
      dedupeKey: `SAFETY_REVIEW_DECIDED:${reviewId}`,
    }] : [];
    if (decision.areas?.includes('VENUE')) {
      const staff = await client.query<{ recipientId: string; bookingId: string }>(`SELECT decided_by AS "recipientId",
        id AS "bookingId" FROM venue_bookings WHERE event_request_id = $1 AND status IN ('HELD', 'APPROVED')
        AND decided_by IS NOT NULL ORDER BY id`, [eventId]);
      for (const row of staff.rows) notices.push({ recipientId: row.recipientId, eventRequestId: eventId,
        venueBookingId: row.bookingId, safetyReviewId: reviewId, type: 'SAFETY_CHANGES_REQUESTED',
        title: decisionTitles.CHANGES_REQUESTED, message: `The Safety Officer asked for venue changes for ${label}: ${decision.notes}`,
        dedupeKey: `SAFETY_CHANGES_REQUESTED:${reviewId}` });
    }
    if (decision.areas?.includes('TECHNICAL')) {
      const staff = await client.query<{ recipientId: string; lineId: string }>(`SELECT decided_by AS "recipientId",
        id AS "lineId" FROM equipment_requests WHERE event_request_id = $1 AND status = 'RESERVED'
        AND decided_by IS NOT NULL ORDER BY id`, [eventId]);
      for (const row of staff.rows) notices.push({ recipientId: row.recipientId, eventRequestId: eventId,
        equipmentRequestId: row.lineId, safetyReviewId: reviewId, type: 'SAFETY_CHANGES_REQUESTED',
        title: decisionTitles.CHANGES_REQUESTED, message: `The Safety Officer asked for technical changes for ${label}: ${decision.notes}`,
        dedupeKey: `SAFETY_CHANGES_REQUESTED:${reviewId}` });
    }
    await recordNotifications(client, notices);
    const saved = (await client.query<RoundRow>(`SELECT ${roundColumns} WHERE s.id = $1`, [reviewId])).rows[0]!;
    return { changed: true, review: toRound(saved) };
  });
}

/** KAN-84-AC8/AC9: start (or resume) preparation only on a confirmed event with current approval. */
export async function startPreparation(
  pool: Pick<Pool, 'connect'>,
  { eventRequestId, actor, input }: { eventRequestId: string; actor: WorkflowActor; input: unknown },
) {
  parseObjectBody(input ?? {}, []);
  requireRole(actor, 'EVENT_COORDINATOR', 'Only the assigned coordinator can start event preparation.');
  return inActorTransaction(pool, actor.id, async (client) => {
    await requireTrustedRole(client, actor);
    const event = await lockEventArrangements(client, eventRequestId);
    requireRelation(actor, event, ['ASSIGNED_COORDINATOR'], 'Only the currently assigned coordinator can start event preparation.');
    if (event.status !== 'CONFIRMED') throw conflict('EVENT_NOT_CONFIRMED', 'Confirm the event before starting preparation.');
    const latest = (await rounds(client, eventRequestId))[0];
    const outcome = outcomeOf(latest, await fingerprint(client, eventRequestId));
    if (outcome === 'STALE') {
      throw conflict('SAFETY_APPROVAL_STALE', 'The arrangements changed after safety approval. Submit them for a new safety review.');
    }
    if (outcome !== 'APPROVED') {
      throw conflict('SAFETY_APPROVAL_REQUIRED', outcome === 'PENDING' ? 'The safety review is still waiting for a decision.'
        : 'Preparation needs an approved safety review of the current arrangements.');
    }
    const readiness = await eventReadiness(client, eventRequestId);
    if (!readiness.ready) throw conflict('EVENT_NOT_READY', readinessMessage(readiness));
    if ((await preparationOf(client, eventRequestId)).reviewId === latest!.id) {
      return { eventRequestId, changed: false };
    }
    await client.query(`UPDATE event_requests SET preparation_started_at = now(), preparation_started_by = $2,
      preparation_safety_review_id = $3, updated_at = now() WHERE id = $1`, [eventRequestId, actor.id, latest!.id]);
    return { eventRequestId, changed: true };
  });
}
