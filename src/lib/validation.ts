import { z } from 'zod';
import { normalizeTrMobile } from './phone';

export const TITLE_MAX = 80;
export const BODY_MAX = 220;

export const GENDERS = ['FEMALE', 'MALE', 'UNSPECIFIED'] as const;

// ---- Public ----

export const registerSchema = z.object({
  userId: z.string().cuid().optional(),
  name: z.string().trim().max(80, 'Ad Soyad en fazla 80 karakter').optional().nullable(),
  contact: z
    .string()
    .trim()
    .max(24)
    .optional()
    .nullable()
    .refine((v) => !v || normalizeTrMobile(v) !== null, {
      message: 'Geçerli bir cep telefonu girin (örn. 0539 624 92 95)',
    }),
  age: z.number().int('Yaş tam sayı olmalı').min(1, 'Geçersiz yaş').max(120, 'Geçersiz yaş').nullable().optional(),
  gender: z.enum(GENDERS).nullable().optional(),
  occupation: z.string().trim().max(80, 'Meslek en fazla 80 karakter').optional().nullable(),
  city: z.string().trim().min(1, 'İl seçilmeli').max(80),
  district: z.string().trim().max(80).optional().nullable(),
  wantsNational: z.boolean().default(false),
  consentAccepted: z.literal(true, {
    errorMap: () => ({ message: 'Devam etmek için onay gerekli' }),
  }),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const subscribeSchema = z.object({
  userId: z.string().cuid('Geçersiz kullanıcı'),
  subscription: z.object({
    endpoint: z.string().url('Geçersiz endpoint'),
    keys: z.object({
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }),
  }),
  userAgent: z.string().max(400).optional(),
  platform: z.enum(['ios', 'android', 'desktop', 'unknown']).default('unknown'),
});
export type SubscribeInput = z.infer<typeof subscribeSchema>;

export const unsubscribeSchema = z.object({
  endpoint: z.string().url(),
});

// ---- Auth ----

export const loginSchema = z.object({
  email: z.string().trim().email('Geçerli bir e-posta girin'),
  password: z.string().min(1, 'Şifre gerekli'),
});

// ---- Son kullanıcı (üye) hesabı ----

// Üye olma: mevcut cihaz kullanıcısı (userId) varsa onu yükseltir; yoksa bölgeyle yeni üye açar.
export const accountRegisterSchema = z.object({
  userId: z.string().cuid().optional(),
  email: z.string().trim().email('Geçerli bir e-posta girin'),
  password: z.string().min(8, 'Şifre en az 8 karakter olmalı').max(200),
  city: z.string().trim().max(80).optional().nullable(),
  district: z.string().trim().max(80).optional().nullable(),
  wantsNational: z.boolean().optional(),
});
export type AccountRegisterInput = z.infer<typeof accountRegisterSchema>;

export const accountLoginSchema = z.object({
  email: z.string().trim().email('Geçerli bir e-posta girin'),
  password: z.string().min(1, 'Şifre gerekli'),
  // Cihazın mevcut push aboneliği bu hesaba yeniden bağlanır (varsa).
  endpoint: z.string().url().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Geçerli bir e-posta girin'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10, 'Geçersiz bağlantı'),
  password: z.string().min(8, 'Şifre en az 8 karakter olmalı').max(200),
});

// ---- Duyuru oluşturma ----

export const announcementCreateSchema = z
  .object({
    title: z.string().trim().min(1, 'Başlık gerekli').max(TITLE_MAX, `Başlık en fazla ${TITLE_MAX} karakter`),
    body: z.string().trim().min(1, 'Mesaj gerekli').max(BODY_MAX, `Mesaj en fazla ${BODY_MAX} karakter`),
    scope: z.enum(['national', 'city', 'districts']),
    city: z.string().trim().max(80).optional(),
    districts: z.array(z.string().trim().min(1).max(80)).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.scope === 'city' && !val.city) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'İl seçilmeli', path: ['city'] });
    }
    if (val.scope === 'districts') {
      if (!val.city) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'İl seçilmeli', path: ['city'] });
      }
      if (!val.districts || val.districts.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'En az bir ilçe seçilmeli',
          path: ['districts'],
        });
      }
    }
  });
export type AnnouncementCreateInput = z.infer<typeof announcementCreateSchema>;

// ---- Admin: gönderici hesabı ----

const permissionSchema = z.object({
  city: z.string().trim().min(1).max(80),
  district: z.string().trim().max(80).optional().nullable(),
});

export const senderCreateSchema = z.object({
  name: z.string().trim().min(1, 'İsim/kurum adı gerekli').max(160),
  senderType: z.enum(['INDIVIDUAL', 'ORGANIZATION']).default('INDIVIDUAL'),
  email: z.string().trim().email('Geçerli e-posta girin'),
  password: z.string().min(8, 'Şifre en az 8 karakter olmalı').max(200),
  role: z.enum(['SUPER_ADMIN', 'REGION_ADMIN', 'SENDER']),
  permissions: z.array(permissionSchema).default([]),
});
export type SenderCreateInput = z.infer<typeof senderCreateSchema>;

export const senderUpdateSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  senderType: z.enum(['INDIVIDUAL', 'ORGANIZATION']).optional(),
  password: z.string().min(8).max(200).optional(),
  isActive: z.boolean().optional(),
  role: z.enum(['SUPER_ADMIN', 'REGION_ADMIN', 'SENDER']).optional(),
  permissions: z.array(permissionSchema).optional(),
});
export type SenderUpdateInput = z.infer<typeof senderUpdateSchema>;

// Bildirimleri belirli bir süre sessize alma (kapatma değil). hours=0 → sessizliği kaldır.
export const snoozeSchema = z.object({
  userId: z.string().cuid(),
  hours: z.coerce.number().int().min(0).max(720),
});

// ---- Admin: ayarlar ----

export const settingsSchema = z.object({
  senderRateLimitPerMin: z.coerce.number().int().min(1).max(120),
});
