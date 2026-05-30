import type { User } from '@prisma/client';

// Üye hesabı uçlarının istemciye döndürdüğü güvenli kullanıcı şekli (şifre hariç).
export function publicUser(u: User) {
  return {
    userId: u.id,
    email: u.email,
    name: u.name,
    contact: u.contact,
    age: u.age,
    gender: u.gender,
    occupation: u.occupation,
    city: u.city,
    district: u.district,
    wantsNational: u.wantsNational,
    mutedUntil: u.mutedUntil ? u.mutedUntil.toISOString() : null,
  };
}
