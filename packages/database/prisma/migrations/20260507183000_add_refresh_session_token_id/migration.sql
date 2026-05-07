-- Add an indexable refresh token identifier so refresh/logout do not scan
-- every active session and run Argon2 verification in a loop.
ALTER TABLE "RefreshSession" ADD COLUMN "tokenId" TEXT;

CREATE UNIQUE INDEX "RefreshSession_tokenId_key" ON "RefreshSession"("tokenId");
CREATE INDEX "RefreshSession_tokenId_expiresAt_idx" ON "RefreshSession"("tokenId", "expiresAt");
