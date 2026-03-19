/*
  Warnings:

  - You are about to drop the column `gameState` on the `Match` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Match" DROP COLUMN "gameState";

-- CreateTable
CREATE TABLE "GameState" (
    "id" SERIAL NOT NULL,
    "matchID" TEXT NOT NULL,
    "FEN" TEXT NOT NULL,

    CONSTRAINT "GameState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GameState_matchID_key" ON "GameState"("matchID");

-- AddForeignKey
ALTER TABLE "GameState" ADD CONSTRAINT "GameState_matchID_fkey" FOREIGN KEY ("matchID") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
