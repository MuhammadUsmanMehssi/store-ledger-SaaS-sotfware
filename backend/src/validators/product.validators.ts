import { z } from 'zod';

export const idParamSchema = z.object({
  id: z.string().uuid(),
});

export const barcodeParamSchema = z.object({
  barcode: z.string().min(1),
});

const emptyToNull = (v: unknown) => (v === '' || v === undefined ? null : v);

const optionalNullableString = (max: number) =>
  z.preprocess(emptyToNull, z.string().max(max).nullable().optional());

const optionalNullableUuid = z.preprocess(
  emptyToNull,
  z.string().uuid().nullable().optional()
);

const imageUrlSchema = z
  .string()
  .max(500)
  .optional()
  .nullable()
  .refine((v) => !v || v.startsWith('/') || /^https?:\/\//i.test(v), {
    message: 'Invalid image URL',
  });

const optionalBoolean = z.preprocess((v) => {
  if (v === undefined || v === null || v === '') return undefined;
  if (v === true || v === 'true') return true;
  if (v === false || v === 'false') return false;
  return v;
}, z.boolean().optional());

export const productCreateSchema = z.object({
  name: z.string().min(1).max(200),
  sku: optionalNullableString(50),
  barcode: optionalNullableString(50),
  categoryId: optionalNullableUuid,
  brandId: optionalNullableUuid,
  flavor: optionalNullableString(100),
  size: optionalNullableString(50),
  unitId: optionalNullableUuid,
  purchasePrice: z.coerce.number().min(0).optional(),
  salePrice: z.coerce.number().min(0),
  minimumStock: z.coerce.number().min(0).optional(),
  currentStock: z.coerce.number().min(0).optional(),
  description: optionalNullableString(1000),
  imageUrl: imageUrlSchema,
  isActive: optionalBoolean,
});

export const productUpdateSchema = productCreateSchema.partial();

export const productListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  brandId: z.string().uuid().optional(),
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  lowStock: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
});

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;

export const generateProductCodesSchema = z.object({
  name: z.string().min(1).max(200),
  flavor: z.string().max(100).optional().nullable(),
  size: z.string().max(50).optional().nullable(),
  fields: z.enum(['sku', 'barcode', 'both']).default('both'),
  excludeProductId: z.string().uuid().optional(),
});

export type GenerateProductCodesInput = z.infer<typeof generateProductCodesSchema>;

const productVariantRowSchema = z.object({
  size: z.string().min(1).max(50),
  sku: optionalNullableString(50),
  barcode: optionalNullableString(50),
  purchasePrice: z.coerce.number().min(0).optional(),
  salePrice: z.coerce.number().min(0),
  minimumStock: z.coerce.number().min(0).optional(),
  currentStock: z.coerce.number().min(0).optional(),
});

export const productVariantsCreateSchema = z.object({
  name: z.string().min(1).max(200),
  categoryId: optionalNullableUuid,
  brandId: optionalNullableUuid,
  flavor: optionalNullableString(100),
  unitId: optionalNullableUuid,
  description: optionalNullableString(1000),
  imageUrl: imageUrlSchema,
  isActive: optionalBoolean,
  variants: z.array(productVariantRowSchema).min(1).max(30),
});

export type ProductVariantsCreateInput = z.infer<typeof productVariantsCreateSchema>;
