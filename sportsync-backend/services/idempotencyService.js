import { createHash } from "crypto";

export function stableIdempotencyKey(scope, parts) {
  const normalized = parts.map((part) => String(part ?? "").trim()).join("|");
  return `${scope}:${createHash("sha256").update(normalized).digest("hex")}`;
}

export function bookingIdempotencyKey({ playerId, venueId, slot, startAt }) {
  return stableIdempotencyKey("booking", [playerId, venueId, slot, startAt || ""]);
}

export async function createOnce({ findExisting, insertRecord, findAfterConflict = findExisting }) {
  const existing = await findExisting();
  if (existing) return { created: false, record: existing, idempotent: true };

  const inserted = await insertRecord();
  if (inserted) return { created: true, record: inserted, idempotent: false };

  const afterConflict = await findAfterConflict();
  if (afterConflict) return { created: false, record: afterConflict, idempotent: true };

  const error = new Error("Idempotent create did not return or find a record.");
  error.status = 409;
  throw error;
}
