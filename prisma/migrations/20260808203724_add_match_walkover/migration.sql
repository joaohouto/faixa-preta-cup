-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Match" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bracketId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "akaId" TEXT,
    "aoId" TEXT,
    "winnerId" TEXT,
    "akaScore" INTEGER DEFAULT 0,
    "aoScore" INTEGER DEFAULT 0,
    "decisionByHantei" BOOLEAN NOT NULL DEFAULT false,
    "akaSenshu" BOOLEAN NOT NULL DEFAULT false,
    "aoSenshu" BOOLEAN NOT NULL DEFAULT false,
    "isBye" BOOLEAN NOT NULL DEFAULT false,
    "isWalkover" BOOLEAN NOT NULL DEFAULT false,
    "isThirdPlace" BOOLEAN NOT NULL DEFAULT false,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Match_bracketId_fkey" FOREIGN KEY ("bracketId") REFERENCES "Bracket" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Match" ("akaId", "akaScore", "akaSenshu", "aoId", "aoScore", "aoSenshu", "bracketId", "completedAt", "createdAt", "decisionByHantei", "id", "isBye", "isCompleted", "isThirdPlace", "position", "round", "winnerId") SELECT "akaId", "akaScore", "akaSenshu", "aoId", "aoScore", "aoSenshu", "bracketId", "completedAt", "createdAt", "decisionByHantei", "id", "isBye", "isCompleted", "isThirdPlace", "position", "round", "winnerId" FROM "Match";
DROP TABLE "Match";
ALTER TABLE "new_Match" RENAME TO "Match";
CREATE INDEX "Match_bracketId_idx" ON "Match"("bracketId");
CREATE INDEX "Match_round_idx" ON "Match"("round");
CREATE INDEX "Match_isThirdPlace_idx" ON "Match"("isThirdPlace");
CREATE UNIQUE INDEX "Match_bracketId_round_position_key" ON "Match"("bracketId", "round", "position");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
