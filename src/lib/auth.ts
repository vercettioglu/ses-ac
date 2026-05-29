import 'server-only';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import type { Role } from '@prisma/client';
import { env } from './env';
import { HttpError } from './http';
import { prisma } from './prisma';

const COOKIE_NAME = 'sa_session';
const TTL_SECONDS = 60 * 60 * 24 * 7; // 7 gün

export type SessionPayload = {
  sub: string;
  email: string;
  name: string;
  role: Role;
};

function secretKey(): Uint8Array {
  if (!env.authSecret) {
    throw new HttpError('NEXTAUTH_SECRET tanımlı değil', 500);
  }
  return new TextEncoder().encode(env.authSecret);
}

// ---- Şifre ----

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ---- JWT oturum ----

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ email: payload.email, name: payload.name, role: payload.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(secretKey());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.sub || !payload.role) return null;
    return {
      sub: payload.sub,
      email: String(payload.email ?? ''),
      name: String(payload.name ?? ''),
      role: payload.role as Role,
    };
  } catch {
    return null;
  }
}

export function setSessionCookie(token: string) {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: TTL_SECONDS,
  });
}

export function clearSessionCookie() {
  cookies().set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

// API route'larında kullanılan zorunlu oturum + rol kontrolü.
export async function requireSession(roles?: Role[]): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new HttpError('Giriş gerekli', 401);
  if (roles && !roles.includes(session.role)) {
    throw new HttpError('Bu işlem için yetkiniz yok', 403);
  }
  return session;
}

// Veritabanından aktif aktörü + yetkili bölgelerini yükler.
export async function loadActor(sub: string) {
  const actor = await prisma.adminUser.findUnique({
    where: { id: sub },
    include: { permissions: true },
  });
  if (!actor || !actor.isActive) {
    throw new HttpError('Hesap bulunamadı veya pasif', 403);
  }
  return actor;
}

// ---- Bölge yetkilendirme ----

export type RegionTarget =
  | { kind: 'national' }
  | { kind: 'city'; city: string }
  | { kind: 'district'; city: string; district: string };

type Perm = { city: string; district: string | null };

function hasFullProvince(perms: Perm[], city: string): boolean {
  return perms.some((p) => p.city === city && p.district == null);
}

function hasDistrict(perms: Perm[], city: string, district: string): boolean {
  return perms.some(
    (p) => p.city === city && (p.district == null || p.district === district),
  );
}

// Bir göndericinin belirli bir hedefe duyuru gönderme yetkisi var mı?
export function authorizeTarget(
  role: Role,
  perms: Perm[],
  target: RegionTarget,
): { allowed: boolean; reason?: string } {
  if (role === 'SUPER_ADMIN') return { allowed: true };

  if (target.kind === 'national') {
    return { allowed: false, reason: 'Ulusal duyuru gönderme yetkiniz yok' };
  }
  if (target.kind === 'city') {
    return hasFullProvince(perms, target.city)
      ? { allowed: true }
      : { allowed: false, reason: 'Bu il için yetkiniz yok' };
  }
  return hasDistrict(perms, target.city, target.district)
    ? { allowed: true }
    : { allowed: false, reason: 'Bu ilçe için yetkiniz yok' };
}

// Bir REGION_ADMIN belirli bir bölgede hesap/duyuru yönetebilir mi?
export function canManageRegion(
  role: Role,
  perms: Perm[],
  city: string,
  district: string | null,
): boolean {
  if (role === 'SUPER_ADMIN') return true;
  if (role !== 'REGION_ADMIN') return false;
  if (district == null) return hasFullProvince(perms, city);
  return hasDistrict(perms, city, district);
}
