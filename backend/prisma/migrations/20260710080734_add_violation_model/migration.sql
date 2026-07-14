-- CreateTable
CREATE TABLE "Violation" (
    "violationId" SERIAL NOT NULL,
    "raceId" INTEGER NOT NULL,
    "entryId" INTEGER,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "penalty" TEXT,
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Violation_pkey" PRIMARY KEY ("violationId")
);

-- CreateIndex
CREATE INDEX "Violation_raceId_idx" ON "Violation"("raceId");

-- CreateIndex
CREATE INDEX "Violation_entryId_idx" ON "Violation"("entryId");

-- AddForeignKey
ALTER TABLE "Violation" ADD CONSTRAINT "Violation_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race"("raceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Violation" ADD CONSTRAINT "Violation_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "RaceEntry"("entryId") ON DELETE SET NULL ON UPDATE CASCADE;
