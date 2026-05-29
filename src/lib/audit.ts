import { prisma } from './prisma';
import type { Prisma } from '@prisma/client';

type AuditInput = {
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  meta?: Prisma.InputJsonValue;
};

// Denetim kaydı yaz. Ana akışı asla bozmaması için hatalar yutulur.
export async function logAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        actorEmail: input.actorEmail ?? null,
        action: input.action,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        meta: input.meta,
      },
    });
  } catch (err) {
    console.error('[audit] kayıt yazılamadı:', err);
  }
}
