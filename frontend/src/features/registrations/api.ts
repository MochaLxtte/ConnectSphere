import { getJson, postJson } from '../../lib/api-client.js';
export interface OwnRegistration {
  id: string; eventId: string; eventName: string | null; status: string; startsAt: string | null; endsAt?: string | null; purpose?: string | null;
  registeredAt: string; withdrawnAt: string | null; cancelledAt: string | null; canWithdraw: boolean;
}
export interface RosterItem {
  displayName: string; email: string; status: string; registeredAt: string; withdrawnAt: string | null; cancelledAt: string | null;
}
export interface Roster { eventId: string; eventName: string | null; activeCount: number; items: RosterItem[] }
export const listMine = (signal?: AbortSignal) => getJson<{ items: OwnRegistration[] }>('/api/registrations/mine', signal);
export const getRoster = (id: string, signal?: AbortSignal) => getJson<Roster>(`/api/events/${encodeURIComponent(id)}/registrations`, signal);
export const withdraw = (id: string, signal?: AbortSignal) => postJson<{ changed: boolean; registration: OwnRegistration }>(
  `/api/registrations/${encodeURIComponent(id)}/withdraw`, { confirm: true }, signal);
