-- Create role enum for user authorization levels
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- Add role column with USER default for existing and new accounts
ALTER TABLE "User"
ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER';
