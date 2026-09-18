-- Idempotency keys for safe retries on money/stock mutations
CREATE TABLE IF NOT EXISTS "idempotency_keys" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "route" TEXT NOT NULL,
  "request_hash" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "response_status" INTEGER,
  "response_body" JSONB,
  "user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "idempotency_keys_tenant_id_key_key"
  ON "idempotency_keys"("tenant_id", "key");

CREATE INDEX IF NOT EXISTS "idempotency_keys_expires_at_idx"
  ON "idempotency_keys"("expires_at");

CREATE INDEX IF NOT EXISTS "idempotency_keys_tenant_id_created_at_idx"
  ON "idempotency_keys"("tenant_id", "created_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'idempotency_keys_tenant_id_fkey'
  ) THEN
    ALTER TABLE "idempotency_keys"
      ADD CONSTRAINT "idempotency_keys_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
