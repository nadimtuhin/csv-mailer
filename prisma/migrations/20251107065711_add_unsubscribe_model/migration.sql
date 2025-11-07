-- CreateTable
CREATE TABLE "Unsubscribe" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "reason" TEXT,
    "token" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Unsubscribe_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Unsubscribe_token_key" ON "Unsubscribe"("token");

-- CreateIndex
CREATE INDEX "Unsubscribe_email_idx" ON "Unsubscribe"("email");

-- CreateIndex
CREATE INDEX "Unsubscribe_organizationId_idx" ON "Unsubscribe"("organizationId");

-- CreateIndex
CREATE INDEX "Unsubscribe_token_idx" ON "Unsubscribe"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Unsubscribe_email_organizationId_key" ON "Unsubscribe"("email", "organizationId");
