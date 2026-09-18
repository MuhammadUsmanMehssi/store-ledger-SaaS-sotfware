import type { Prisma } from '@prisma/client';

type TxClient = Prisma.TransactionClient;

export async function nextDocumentNumber(
  tx: TxClient,
  tenantId: string,
  docType: string,
  prefixFallback?: string
): Promise<string> {
  let sequence = await tx.documentSequence.findUnique({
    where: { tenantId_docType: { tenantId, docType } },
  });

  if (!sequence) {
    sequence = await tx.documentSequence.create({
      data: {
        tenantId,
        docType,
        prefix: prefixFallback ?? docType.toUpperCase().slice(0, 3),
        nextNumber: 1,
      },
    });
  }

  const number = sequence.nextNumber;
  const padded = String(number).padStart(5, '0');
  const documentNumber = `${sequence.prefix}-${padded}`;

  await tx.documentSequence.update({
    where: { id: sequence.id },
    data: { nextNumber: number + 1 },
  });

  return documentNumber;
}
