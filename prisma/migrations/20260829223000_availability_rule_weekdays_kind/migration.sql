-- CreateEnum
CREATE TYPE "AvailabilityRuleKind" AS ENUM ('available', 'unavailable');

-- AlterTable
ALTER TABLE "AvailabilityRule" ADD COLUMN "weekdays" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];
ALTER TABLE "AvailabilityRule" ADD COLUMN "kind" "AvailabilityRuleKind" NOT NULL DEFAULT 'available';
ALTER TABLE "AvailabilityRule" ADD COLUMN "allDay" BOOLEAN NOT NULL DEFAULT false;

UPDATE "AvailabilityRule" SET "weekdays" = ARRAY["weekday"];

-- Collapse identical live rules (same times) into one row with all weekdays.
WITH ranked AS (
  SELECT
    id,
    "weekday",
    FIRST_VALUE(id) OVER (
      PARTITION BY
        "tenantId",
        "teacherId",
        "startTime",
        "endTime",
        COALESCE("locationId"::text, ''),
        COALESCE("activityTags"::text, ''),
        "priority",
        "kind",
        "allDay"
      ORDER BY "createdAt" ASC, id ASC
    ) AS keep_id
  FROM "AvailabilityRule"
  WHERE "deletedAt" IS NULL
),
days AS (
  SELECT
    keep_id,
    ARRAY_AGG(DISTINCT "weekday" ORDER BY "weekday") AS weekdays
  FROM ranked
  GROUP BY keep_id
)
UPDATE "AvailabilityRule" AS r
SET
  "weekdays" = d.weekdays,
  "weekday" = d.weekdays[1]
FROM days d
WHERE r.id = d.keep_id;

WITH ranked AS (
  SELECT
    id,
    FIRST_VALUE(id) OVER (
      PARTITION BY
        "tenantId",
        "teacherId",
        "startTime",
        "endTime",
        COALESCE("locationId"::text, ''),
        COALESCE("activityTags"::text, ''),
        "priority",
        "kind",
        "allDay"
      ORDER BY "createdAt" ASC, id ASC
    ) AS keep_id
  FROM "AvailabilityRule"
  WHERE "deletedAt" IS NULL
)
UPDATE "AvailabilityRule" AS r
SET "deletedAt" = CURRENT_TIMESTAMP
FROM ranked
WHERE r.id = ranked.id
  AND ranked.id <> ranked.keep_id;
