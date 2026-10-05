-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,
    "refreshToken" TEXT,
    "refreshTokenExpires" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Widget" (
    "id" TEXT NOT NULL,
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
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "countdownEndsAt" TIMESTAMP(3),
    "countdownTimeZone" TEXT NOT NULL DEFAULT 'UTC',
    "countdownShowDays" BOOLEAN NOT NULL DEFAULT false,
    "countdownSticky" BOOLEAN NOT NULL DEFAULT false,
    "countdownDesktopOffset" INTEGER NOT NULL DEFAULT 0,
    "countdownMobileOffset" INTEGER NOT NULL DEFAULT 0,
    "countdownExpiredText" TEXT NOT NULL DEFAULT 'Expired!',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Widget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Widget_shopDomain_idx" ON "Widget"("shopDomain");

-- CreateIndex
CREATE INDEX "Widget_shopDomain_type_idx" ON "Widget"("shopDomain", "type");

