import assert from "node:assert/strict";
import {
  addCalendarDays,
  dateKey,
  isBriefingDue,
  isReminderDue,
  tzParts,
  zonedLocalDate,
} from "../apps/web/utils/rome-time";

const start = new Date("2026-08-29T12:00:00.000Z");
assert.equal(isReminderDue(start, new Date("2026-08-29T11:44:59.000Z")), false);
assert.equal(isReminderDue(start, new Date("2026-08-29T11:45:00.000Z")), true);
assert.equal(isReminderDue(start, new Date("2026-08-29T11:59:00.000Z")), true);
assert.equal(isReminderDue(start, start), false);

const morning = zonedLocalDate({ year: 2026, month: 8, day: 29 }, 7, 59);
const eight = zonedLocalDate({ year: 2026, month: 8, day: 29 }, 8, 0);
assert.equal(isBriefingDue(morning), false);
assert.equal(isBriefingDue(eight), true);

const today = tzParts(eight);
assert.equal(dateKey(today), "2026-08-29");
assert.deepEqual(addCalendarDays(today, 1), { year: 2026, month: 8, day: 30 });

console.log("rome-time tests passed");
