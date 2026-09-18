import fs from 'fs';
import path from 'path';
import multer, { type FileFilterCallback } from 'multer';
import type { NextFunction, Request, Response } from 'express';
import { BadRequestError } from '../utils/errors';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function imageFilter(_req: Request, file: Express.Multer.File, cb: FileFilterCallback) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_MIME.includes(file.mimetype) || !ALLOWED_EXT.includes(ext)) {
    cb(new BadRequestError('Only JPG, PNG, WEBP or GIF images are allowed'));
    return;
  }
  cb(null, true);
}

function makeDiskStorage(subdir: string) {
  const uploadRoot = path.join(process.cwd(), 'uploads', subdir);
  ensureDir(uploadRoot);
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadRoot),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      const safe = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      cb(null, safe);
    },
  });
}

/** Memory upload for product create/update so DB can roll back if disk write fails */
export const productImageUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: imageFilter,
  limits: { fileSize: 3 * 1024 * 1024 },
});

export const tenantLogoUpload = multer({
  storage: makeDiskStorage('tenants'),
  fileFilter: imageFilter,
  limits: { fileSize: 3 * 1024 * 1024 },
});

/** Run multer only for multipart requests so JSON create/update still works */
export function optionalProductImage(req: Request, res: Response, next: NextFunction) {
  if (!req.is('multipart/form-data')) {
    next();
    return;
  }
  productImageUpload.single('image')(req, res, (err: unknown) => {
    if (err) {
      next(err);
      return;
    }
    next();
  });
}

export function buildProductImageFilename(originalname: string) {
  const ext = path.extname(originalname).toLowerCase() || '.jpg';
  return `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
}

export async function writeProductImage(filename: string, buffer: Buffer) {
  const dir = path.join(process.cwd(), 'uploads', 'products');
  ensureDir(dir);
  const fullPath = path.join(dir, filename);
  await fs.promises.writeFile(fullPath, buffer);
  return fullPath;
}

export async function removeUploadedFile(absolutePath: string | null | undefined) {
  if (!absolutePath) return;
  await fs.promises.unlink(absolutePath).catch(() => undefined);
}

export function productImagePublicUrl(filename: string) {
  return `/uploads/products/${filename}`;
}

export function absolutePathFromPublicUrl(publicUrl: string | null | undefined) {
  if (!publicUrl?.startsWith('/uploads/')) return null;
  return path.join(process.cwd(), publicUrl.replace(/^\//, ''));
}
