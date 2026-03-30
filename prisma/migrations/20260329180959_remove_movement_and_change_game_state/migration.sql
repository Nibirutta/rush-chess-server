/*
  Warnings:

  - The `FEN` column on the `GameState` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `Movement` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "GameState" DROP CONSTRAINT "GameState_matchID_fkey";

-- DropForeignKey
ALTER TABLE "Movement" DROP CONSTRAINT "Movement_matchID_fkey";

-- DropForeignKey
ALTER TABLE "Movement" DROP CONSTRAINT "Movement_playerID_fkey";

-- AlterTable
ALTER TABLE "GameState" DROP COLUMN "FEN",
ADD COLUMN     "FEN" TEXT[] DEFAULT ARRAY['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1']::TEXT[];

-- DropTable
DROP TABLE "Movement";

-- AddForeignKey
ALTER TABLE "GameState" ADD CONSTRAINT "GameState_matchID_fkey" FOREIGN KEY ("matchID") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
