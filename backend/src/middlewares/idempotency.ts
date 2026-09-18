import { createHash } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { BadRequestError, ConflictError, ForbiddenError } from '../utils/errors';

const KEY_MAX_LEN = 128;
const PENDING_STALE_MS = 2 * 60 * 1000;
const TTL_MS = 72 * 60 * 60 * 1000;

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}

function hashRequest(method: string, path: string, body: unknown): string {
  const payload = `${method.toUpperCase()}\n${path}\n${stableStringify(body ?? null)}`;
  return createHash('sha256').update(payload).digest('hex');
}

function routeKey(req: Request): string {
  const base = req.baseUrl || '';
  const path = req.route?.path && req.route.path !== '/'
    ? String(req.route.path)
    : req.path || '';
  // Prefer concrete path (with ids) for storage clarity
  return `${req.method.toUpperCase()} ${base}${req.path || path}`;
}

/**
 * Requires `Idempotency-Key` header.
 * Same key + same body → replay stored response.
 * Same key + different body → 409.
 */
export function requireIdempotency() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const raw = req.header('Idempotency-Key')?.trim();
      if (!raw) {
        return next(new BadRequestError('Idempotency-Key header is required'));
      }
      if (raw.length > KEY_MAX_LEN) {
        return next(new BadRequestError('Idempotency-Key is too long'));
      }

      const tenantId = req.auth?.tenantId;
      if (!tenantId) {
        return next(new ForbiddenError('Store/tenant context required'));
      }

      const requestHash = hashRequest(req.method, `${req.baseUrl || ''}${req.path}`, req.body);
      const route = routeKey(req);
      const now = new Date();

      // Drop expired rows for this key (best-effort)
      await prisma.idempotencyKey.deleteMany({
        where: { tenantId, key: raw, expiresAt: { lt: now } },
      });

      const existing = await prisma.idempotencyKey.findUnique({
        where: { tenantId_key: { tenantId, key: raw } },
      });

      if (existing) {
        if (existing.requestHash !== requestHash) {
          return next(
            new ConflictError('Idempotency-Key was already used with a different request body'),
          );
        }

        if (existing.status === 'COMPLETED' && existing.responseBody != null) {
          res.setHeader('Idempotent-Replayed', 'true');
          return res.status(existing.responseStatus ?? 200).json(existing.responseBody);
        }

        if (existing.status === 'PENDING') {
          const age = now.getTime() - existing.createdAt.getTime();
          if (age < PENDING_STALE_MS) {
            return next(
              new ConflictError('A request with this Idempotency-Key is already in progress'),
            );
          }
          await prisma.idempotencyKey.delete({ where: { id: existing.id } });
        } else if (existing.status === 'FAILED') {
          await prisma.idempotencyKey.delete({ where: { id: existing.id } });
        }
      }

      try {
        await prisma.idempotencyKey.create({
          data: {
            tenantId,
            key: raw,
            route,
            requestHash,
            status: 'PENDING',
            userId: req.auth?.userId ?? null,
            expiresAt: new Date(now.getTime() + TTL_MS),
          },
        });
      } catch {
        // Race: another request created the same key — re-check
        const raced = await prisma.idempotencyKey.findUnique({
          where: { tenantId_key: { tenantId, key: raw } },
        });
        if (raced?.status === 'COMPLETED' && raced.responseBody != null) {
          if (raced.requestHash !== requestHash) {
            return next(
              new ConflictError('Idempotency-Key was already used with a different request body'),
            );
          }
          res.setHeader('Idempotent-Replayed', 'true');
          return res.status(raced.responseStatus ?? 200).json(raced.responseBody);
        }
        return next(
          new ConflictError('A request with this Idempotency-Key is already in progress'),
        );
      }

      let capturedBody: unknown;
      const originalJson = res.json.bind(res);
      res.json = ((body: unknown) => {
        capturedBody = body;
        return originalJson(body);
      }) as Response['json'];

      const persist = async () => {
        try {
          const statusCode = res.statusCode || 200;
          const ok = statusCode >= 200 && statusCode < 500;
          await prisma.idempotencyKey.updateMany({
            where: { tenantId, key: raw, status: 'PENDING' },
            data: {
              status: ok && capturedBody !== undefined ? 'COMPLETED' : 'FAILED',
              responseStatus: statusCode,
              responseBody:
                capturedBody === undefined
                  ? undefined
                  : (capturedBody as Prisma.InputJsonValue),
            },
          });
        } catch (err) {
          console.error('[Idempotency] failed to persist response', err);
        }
      };

      res.on('finish', () => {
        void persist();
      });
      res.on('close', () => {
        if (!res.writableEnded) {
          void prisma.idempotencyKey
            .updateMany({
              where: { tenantId, key: raw, status: 'PENDING' },
              data: { status: 'FAILED' },
            })
            .catch(() => undefined);
        }
      });

      return next();
    } catch (err) {
      return next(err);
    }
  };
}
