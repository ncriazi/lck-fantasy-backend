-- AlterTable
ALTER TABLE "League" ADD COLUMN     "currentPickNumber" INTEGER,
ADD COLUMN     "currentRound" INTEGER,
ADD COLUMN     "currentTeamOnClockId" TEXT,
ADD COLUMN     "draftStartedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "DraftOrderEntry" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "pickPosition" INTEGER NOT NULL,

    CONSTRAINT "DraftOrderEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DraftOrderEntry_leagueId_pickPosition_key" ON "DraftOrderEntry"("leagueId", "pickPosition");

-- CreateIndex
CREATE UNIQUE INDEX "DraftOrderEntry_leagueId_teamId_key" ON "DraftOrderEntry"("leagueId", "teamId");

-- AddForeignKey
ALTER TABLE "League" ADD CONSTRAINT "League_currentTeamOnClockId_fkey" FOREIGN KEY ("currentTeamOnClockId") REFERENCES "FantasyTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftOrderEntry" ADD CONSTRAINT "DraftOrderEntry_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftOrderEntry" ADD CONSTRAINT "DraftOrderEntry_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "FantasyTeam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
