import test from "node:test";
import assert from "node:assert/strict";
import { bookingIdempotencyKey, createOnce } from "../services/idempotencyService.js";

test("booking duplicate request creates only one booking record", async () => {
  const rows = [];
  const request = {
    playerId: "player-1",
    venueId: "venue-1",
    slot: "Evening",
    startAt: "2026-10-02T18:00:00.000Z",
  };
  const idempotencyKey = bookingIdempotencyKey(request);

  async function fireRequest() {
    return createOnce({
      findExisting: async () => rows.find((row) => row.idempotency_key === idempotencyKey),
      insertRecord: async () => {
        rows.push({ booking_id: `booking-${rows.length + 1}`, idempotency_key: idempotencyKey });
        return rows.at(-1);
      },
    });
  }

  const first = await fireRequest();
  const second = await fireRequest();

  assert.equal(first.created, true);
  assert.equal(second.idempotent, true);
  assert.equal(rows.length, 1);
  assert.equal(first.record.booking_id, second.record.booking_id);
});

test("activity event duplicate request creates only one activity record", async () => {
  const rows = [];
  const request = { playerId: "player-1", sourceType: "exercise_session", sourceId: "session-1" };

  async function fireRequest() {
    return createOnce({
      findExisting: async () =>
        rows.find(
          (row) =>
            row.player_id === request.playerId &&
            row.source_type === request.sourceType &&
            row.source_id === request.sourceId
        ),
      insertRecord: async () => {
        rows.push({
          activity_id: `activity-${rows.length + 1}`,
          player_id: request.playerId,
          source_type: request.sourceType,
          source_id: request.sourceId,
        });
        return rows.at(-1);
      },
    });
  }

  const first = await fireRequest();
  const second = await fireRequest();

  assert.equal(first.created, true);
  assert.equal(second.idempotent, true);
  assert.equal(rows.length, 1);
  assert.equal(first.record.activity_id, second.record.activity_id);
});
