import type { PlatformRole, StoreRole } from '@prisma/client';

export interface AuthContext {
  userId: string;
  tenantId: string | null;
  email: string;
  platformRole: PlatformRole;
  storeRole: StoreRole | null;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

export {};
