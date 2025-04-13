-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Campaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "totalRecipients" INTEGER NOT NULL,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "subject" TEXT NOT NULL,
    "fromEmail" TEXT NOT NULL,
    "fromName" TEXT,
    "replyToEmail" TEXT NOT NULL,
    "templateId" TEXT,
    "pdfTemplatePath" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_Campaign" ("createdAt", "failedCount", "fromEmail", "fromName", "id", "name", "pdfTemplatePath", "replyToEmail", "sentCount", "skippedCount", "status", "subject", "templateId", "totalRecipients", "updatedAt") SELECT "createdAt", "failedCount", "fromEmail", "fromName", "id", "name", "pdfTemplatePath", "replyToEmail", "sentCount", "skippedCount", "status", "subject", "templateId", "totalRecipients", "updatedAt" FROM "Campaign";
DROP TABLE "Campaign";
ALTER TABLE "new_Campaign" RENAME TO "Campaign";
CREATE INDEX "Campaign_isArchived_idx" ON "Campaign"("isArchived");
CREATE TABLE "new_Template" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "htmlContent" TEXT NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Template" ("createdAt", "htmlContent", "id", "name", "updatedAt") SELECT "createdAt", "htmlContent", "id", "name", "updatedAt" FROM "Template";
DROP TABLE "Template";
ALTER TABLE "new_Template" RENAME TO "Template";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
