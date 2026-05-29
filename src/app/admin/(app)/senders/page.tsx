'use client';

import { useEffect, useMemo, useState } from 'react';
import { UserPlus, ShieldCheck, Pencil, X, User, Building2 } from 'lucide-react';
import type { Role, SenderType } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SenderForm, type SenderFormValues, type Permission } from '@/components/sender-form';
import { apiGet, apiPost, apiPatch } from '@/lib/client/api';
import { useSession } from '@/lib/client/use-session';

type Sender = {
  id: string;
  name: string;
  senderType: SenderType;
  email: string;
  role: Role;
  isActive: boolean;
  permissions: (Permission & { id: string })[];
};

const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: 'Süper Yönetici',
  REGION_ADMIN: 'Bölge Yöneticisi',
  SENDER: 'Gönderici',
};

export default function SendersPage() {
  const session = useSession();
  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';
  const myPerms = useMemo(() => session?.permissions ?? [], [session]);

  const [senders, setSenders] = useState<Sender[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [createKey, setCreateKey] = useState(0);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);
  const [createMsg, setCreateMsg] = useState<string | null>(null);

  const [editing, setEditing] = useState<Sender | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editErr, setEditErr] = useState<string | null>(null);

  async function load() {
    try {
      const res = await apiGet<{ senders: Sender[] }>('/api/admin/senders');
      setSenders(res.senders);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yüklenemedi');
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function handleCreate(values: SenderFormValues) {
    setCreateErr(null);
    setCreateMsg(null);
    setCreateSubmitting(true);
    try {
      await apiPost('/api/admin/senders', {
        name: values.name,
        senderType: values.senderType,
        email: values.email,
        password: values.password,
        role: values.role,
        permissions: values.permissions,
      });
      setCreateMsg('Hesap oluşturuldu.');
      setCreateKey((k) => k + 1); // formu sıfırla
      void load();
    } catch (e) {
      setCreateErr(e instanceof Error ? e.message : 'Oluşturulamadı');
    } finally {
      setCreateSubmitting(false);
    }
  }

  async function handleEdit(values: SenderFormValues) {
    if (!editing) return;
    setEditErr(null);
    setEditSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        name: values.name,
        senderType: values.senderType,
        permissions: values.permissions,
        isActive: values.isActive,
      };
      if (isSuperAdmin) payload.role = values.role;
      if (values.password) payload.password = values.password;
      await apiPatch(`/api/admin/senders/${editing.id}`, payload);
      setEditing(null);
      void load();
    } catch (e) {
      setEditErr(e instanceof Error ? e.message : 'Güncellenemedi');
    } finally {
      setEditSubmitting(false);
    }
  }

  async function toggleActive(s: Sender) {
    try {
      await apiPatch(`/api/admin/senders/${s.id}`, { isActive: !s.isActive });
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Güncellenemedi');
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Göndericiler</h1>
      {error && <p className="text-sm font-medium text-destructive">{error}</p>}

      {/* Oluşturma */}
      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Yeni hesap</h2>
        </div>
        <SenderForm
          key={createKey}
          mode="create"
          isSuperAdmin={Boolean(isSuperAdmin)}
          myPerms={myPerms}
          submitting={createSubmitting}
          error={createErr}
          onSubmit={handleCreate}
        />
        {createMsg && <p className="mt-3 text-sm font-medium text-emerald-600">{createMsg}</p>}
      </Card>

      {/* Liste */}
      <div className="space-y-3">
        {senders.map((s) => (
          <Card key={s.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 font-semibold">
                    {s.senderType === 'ORGANIZATION' ? (
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <User className="h-4 w-4 text-muted-foreground" />
                    )}
                    {s.name}
                  </span>
                  <Badge variant={s.role === 'SENDER' ? 'secondary' : 'default'}>
                    {ROLE_LABEL[s.role]}
                  </Badge>
                  {s.isActive ? (
                    <Badge variant="success">Aktif</Badge>
                  ) : (
                    <Badge variant="destructive">Pasif</Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">{s.email}</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {s.role === 'SUPER_ADMIN' ? (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <ShieldCheck className="h-3.5 w-3.5" /> Tüm bölgeler
                    </span>
                  ) : (
                    s.permissions.map((p) => (
                      <span key={p.id} className="rounded-full bg-muted px-2 py-0.5 text-xs">
                        {p.city}
                        {p.district ? ` · ${p.district}` : ' · il geneli'}
                      </span>
                    ))
                  )}
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditing(s)}>
                  <Pencil className="h-4 w-4" />
                  Düzenle
                </Button>
                <Button
                  variant={s.isActive ? 'ghost' : 'default'}
                  size="sm"
                  onClick={() => toggleActive(s)}
                >
                  {s.isActive ? 'Pasifleştir' : 'Aktifleştir'}
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {senders.length === 0 && <p className="text-sm text-muted-foreground">Henüz hesap yok.</p>}
      </div>

      {/* Düzenleme modalı */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
          <button aria-label="Kapat" className="absolute inset-0 bg-black/40" onClick={() => setEditing(null)} />
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-auto rounded-t-2xl border border-border bg-card p-5 shadow-xl sm:rounded-2xl">
            <button
              aria-label="Kapat"
              onClick={() => setEditing(null)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="mb-4 text-lg font-bold">Göndericiyi düzenle</h2>
            <SenderForm
              mode="edit"
              isSuperAdmin={Boolean(isSuperAdmin)}
              myPerms={myPerms}
              submitting={editSubmitting}
              error={editErr}
              initial={{
                name: editing.name,
                senderType: editing.senderType,
                email: editing.email,
                role: editing.role,
                permissions: editing.permissions.map((p) => ({ city: p.city, district: p.district })),
                isActive: editing.isActive,
              }}
              onSubmit={handleEdit}
            />
          </div>
        </div>
      )}
    </div>
  );
}
