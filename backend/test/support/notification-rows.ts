/** Reads the notification rows a mocked client was asked to insert (seven values per row). */
export interface InsertedNotification {
  recipientId: string;
  eventRequestId: string;
  venueBookingId: string | null;
  type: string;
  title: string;
  message: string;
  dedupeKey: string;
}

export function notificationRows(calls: readonly (readonly unknown[])[]): InsertedNotification[] {
  return calls
    .filter(([sql]) => typeof sql === 'string' && sql.includes('INSERT INTO notifications'))
    .flatMap(([, values]) => {
      const flat = values as unknown[];
      const rows: InsertedNotification[] = [];
      for (let index = 0; index < flat.length; index += 7) {
        rows.push({
          recipientId: flat[index] as string, eventRequestId: flat[index + 1] as string,
          venueBookingId: flat[index + 2] as string | null, type: flat[index + 3] as string,
          title: flat[index + 4] as string, message: flat[index + 5] as string, dedupeKey: flat[index + 6] as string,
        });
      }
      return rows;
    });
}
