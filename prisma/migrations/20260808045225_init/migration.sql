-- CreateTable
CREATE TABLE "Tournament" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Competitor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "weight" REAL,
    "birthdate" DATETIME NOT NULL,
    "belt" TEXT NOT NULL,
    "school" TEXT NOT NULL,
    "kata" BOOLEAN NOT NULL DEFAULT false,
    "kumite" BOOLEAN NOT NULL DEFAULT false,
    "tournamentId" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "kataCategory" TEXT,
    "kumiteCategory" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Competitor_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Bracket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tournamentId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "modality" TEXT NOT NULL,
    "totalSlots" INTEGER NOT NULL,
    "totalRounds" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Bracket_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Match" (
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
    "isBye" BOOLEAN NOT NULL DEFAULT false,
    "isThirdPlace" BOOLEAN NOT NULL DEFAULT false,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Match_bracketId_fkey" FOREIGN KEY ("bracketId") REFERENCES "Bracket" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LiveMatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tournamentId" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "bracketId" TEXT NOT NULL,
    "akaId" TEXT NOT NULL,
    "akaName" TEXT NOT NULL,
    "akaSchool" TEXT NOT NULL,
    "aoId" TEXT NOT NULL,
    "aoName" TEXT NOT NULL,
    "aoSchool" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "modality" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "totalRounds" INTEGER NOT NULL DEFAULT 4,
    "akaScore" INTEGER NOT NULL DEFAULT 0,
    "aoScore" INTEGER NOT NULL DEFAULT 0,
    "akaChui" INTEGER NOT NULL DEFAULT 0,
    "aoChui" INTEGER NOT NULL DEFAULT 0,
    "akaSenshu" BOOLEAN NOT NULL DEFAULT false,
    "aoSenshu" BOOLEAN NOT NULL DEFAULT false,
    "timeRemaining" INTEGER NOT NULL DEFAULT -1,
    "timerRunning" BOOLEAN NOT NULL DEFAULT false,
    "timerEndAt" DATETIME,
    "winner" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Competitor_tournamentId_idx" ON "Competitor"("tournamentId");

-- CreateIndex
CREATE INDEX "Bracket_tournamentId_idx" ON "Bracket"("tournamentId");

-- CreateIndex
CREATE INDEX "Bracket_category_idx" ON "Bracket"("category");

-- CreateIndex
CREATE INDEX "Bracket_status_idx" ON "Bracket"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Bracket_tournamentId_category_key" ON "Bracket"("tournamentId", "category");

-- CreateIndex
CREATE INDEX "Match_bracketId_idx" ON "Match"("bracketId");

-- CreateIndex
CREATE INDEX "Match_round_idx" ON "Match"("round");

-- CreateIndex
CREATE INDEX "Match_isThirdPlace_idx" ON "Match"("isThirdPlace");

-- CreateIndex
CREATE UNIQUE INDEX "Match_bracketId_round_position_key" ON "Match"("bracketId", "round", "position");

-- CreateIndex
CREATE UNIQUE INDEX "LiveMatch_tournamentId_key" ON "LiveMatch"("tournamentId");

-- CreateIndex
CREATE INDEX "LiveMatch_matchId_idx" ON "LiveMatch"("matchId");
