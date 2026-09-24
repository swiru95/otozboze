-- AlterTable
ALTER TABLE "GrainOffer" ADD COLUMN     "photoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "thumbnailUrl" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "galleryUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "logoUrl" TEXT;

-- Keep galleries and photo sets small: these columns carry inlined images.
ALTER TABLE "GrainOffer" ADD CONSTRAINT "GrainOffer_photo_count_check"
  CHECK (coalesce(array_length("photoUrls", 1), 0) <= 6);

ALTER TABLE "User" ADD CONSTRAINT "User_gallery_count_check"
  CHECK (coalesce(array_length("galleryUrls", 1), 0) <= 8);
