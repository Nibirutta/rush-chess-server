-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('WAITING', 'IN_PROGRESS', 'FINISHED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "Pieces" AS ENUM ('KING', 'QUEEN', 'ROOK', 'BISHOP', 'KNIGHT', 'PAWN');

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "hashedPassword" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Token" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "playerID" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" SERIAL NOT NULL,
    "content" TEXT NOT NULL,
    "playerID" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'WAITING',
    "gameState" JSON NOT NULL,
    "playerWhiteID" TEXT,
    "playerBlackID" TEXT,
    "winnerID" TEXT,
    "loserID" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Movement" (
    "id" SERIAL NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "piece" "Pieces" NOT NULL,
    "promotion" "Pieces",
    "turnNumber" INTEGER NOT NULL,
    "effects" JSON,
    "matchID" TEXT NOT NULL,
    "playerID" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Movement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Player_username_key" ON "Player"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Token_token_key" ON "Token"("token");

-- CreateIndex
CREATE INDEX "Token_playerID_idx" ON "Token"("playerID");

-- CreateIndex
CREATE INDEX "Match_status_idx" ON "Match"("status");

-- CreateIndex
CREATE INDEX "Movement_matchID_turnNumber_idx" ON "Movement"("matchID", "turnNumber");

-- AddForeignKey
ALTER TABLE "Token" ADD CONSTRAINT "Token_playerID_fkey" FOREIGN KEY ("playerID") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_playerID_fkey" FOREIGN KEY ("playerID") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_playerWhiteID_fkey" FOREIGN KEY ("playerWhiteID") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_playerBlackID_fkey" FOREIGN KEY ("playerBlackID") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_winnerID_fkey" FOREIGN KEY ("winnerID") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_loserID_fkey" FOREIGN KEY ("loserID") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movement" ADD CONSTRAINT "Movement_matchID_fkey" FOREIGN KEY ("matchID") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movement" ADD CONSTRAINT "Movement_playerID_fkey" FOREIGN KEY ("playerID") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
