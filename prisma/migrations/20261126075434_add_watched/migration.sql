-- CreateTable
CREATE TABLE "WatchedEntry" (
    "userId" INTEGER NOT NULL,
    "movieId" INTEGER NOT NULL,
    "watchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WatchedEntry_pkey" PRIMARY KEY ("userId","movieId")
);

-- CreateIndex
CREATE INDEX "WatchedEntry_userId_watchedAt_idx" ON "WatchedEntry"("userId", "watchedAt");

-- AddForeignKey
ALTER TABLE "WatchedEntry" ADD CONSTRAINT "WatchedEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchedEntry" ADD CONSTRAINT "WatchedEntry_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;
