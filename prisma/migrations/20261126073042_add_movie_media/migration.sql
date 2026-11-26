-- CreateTable
CREATE TABLE "Trailer" (
    "id" SERIAL NOT NULL,
    "movieId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "youtubeUrl" TEXT NOT NULL,

    CONSTRAINT "Trailer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" SERIAL NOT NULL,
    "movieId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StreamingLink" (
    "movieId" INTEGER NOT NULL,
    "serviceId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "StreamingLink_pkey" PRIMARY KEY ("movieId","serviceId")
);

-- CreateIndex
CREATE INDEX "Trailer_movieId_idx" ON "Trailer"("movieId");

-- CreateIndex
CREATE INDEX "Photo_movieId_idx" ON "Photo"("movieId");

-- AddForeignKey
ALTER TABLE "Trailer" ADD CONSTRAINT "Trailer_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreamingLink" ADD CONSTRAINT "StreamingLink_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreamingLink" ADD CONSTRAINT "StreamingLink_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "StreamingService"("id") ON DELETE CASCADE ON UPDATE CASCADE;
