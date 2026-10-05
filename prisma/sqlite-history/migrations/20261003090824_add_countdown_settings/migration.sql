-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Widget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopDomain" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'ANNOUNCEMENT',
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "message" TEXT NOT NULL,
    "buttonText" TEXT,
    "buttonUrl" TEXT,
    "position" TEXT NOT NULL DEFAULT 'TOP',
    "backgroundColor" TEXT NOT NULL DEFAULT '#111827',
    "textColor" TEXT NOT NULL DEFAULT '#FFFFFF',
    "dismissible" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" DATETIME,
    "endsAt" DATETIME,
    "countdownEndsAt" DATETIME,
    "countdownTimeZone" TEXT NOT NULL DEFAULT 'UTC',
    "countdownShowDays" BOOLEAN NOT NULL DEFAULT false,
    "countdownSticky" BOOLEAN NOT NULL DEFAULT false,
    "countdownDesktopOffset" INTEGER NOT NULL DEFAULT 0,
    "countdownMobileOffset" INTEGER NOT NULL DEFAULT 0,
    "countdownExpiredText" TEXT NOT NULL DEFAULT 'Expired!',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Widget" ("backgroundColor", "buttonText", "buttonUrl", "createdAt", "dismissible", "endsAt", "id", "message", "name", "position", "shopDomain", "startsAt", "status", "textColor", "type", "updatedAt") SELECT "backgroundColor", "buttonText", "buttonUrl", "createdAt", "dismissible", "endsAt", "id", "message", "name", "position", "shopDomain", "startsAt", "status", "textColor", "type", "updatedAt" FROM "Widget";
DROP TABLE "Widget";
ALTER TABLE "new_Widget" RENAME TO "Widget";
CREATE INDEX "Widget_shopDomain_idx" ON "Widget"("shopDomain");
CREATE INDEX "Widget_shopDomain_type_idx" ON "Widget"("shopDomain", "type");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
