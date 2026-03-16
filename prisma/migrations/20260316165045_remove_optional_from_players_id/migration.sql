/*
  Warnings:

  - Made the column `playerWhiteID` on table `Match` required. This step will fail if there are existing NULL values in that column.
  - Made the column `playerBlackID` on table `Match` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Match" DROP CONSTRAINT "Match_playerBlackID_fkey";

-- DropForeignKey
ALTER TABLE "Match" DROP CONSTRAINT "Match_playerWhiteID_fkey";

-- AlterTable
ALTER TABLE "Match" ALTER COLUMN "playerWhiteID" SET NOT NULL,
ALTER COLUMN "playerBlackID" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_playerWhiteID_fkey" FOREIGN KEY ("playerWhiteID") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_playerBlackID_fkey" FOREIGN KEY ("playerBlackID") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
