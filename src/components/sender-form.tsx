'use client';

import { useMemo, useState } from 'react';
import { Plus, Trash2, User, Building2 } from 'lucide-react';
import type { Role, SenderType } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { Switch } from '@/components/ui/switch';
import { getDistricts, hasDistrictData, PROVINCES } from '@/lib/regions';
import { cn } from '@/lib/utils';

export type Permission = { city: string; district: string | null };

export type SenderFormValues = {
  name: string;
  senderType: SenderType;
  email: string;
  password: string;
  role: Role;
  permissions: Permission[];
  isActive: boolean;
};

const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: 'Süper Yönetici',
  REGION_ADMIN: 'Bölge Yöneticisi',
  SENDER: 'Gönderici',
};

export function SenderForm({
  mode,
  isSuperAdmin,
  myPerms,
  initial,
  submitting,
  error,
  onSubmit,
}: {
  mode: 'create' | 'edit';
  isSuperAdmin: boolean;
  myPerms: Permission[];
  initial?: Partial<SenderFormValues>;
  submitting: boolean;
  error: string | null;
  onSubmit: (values: SenderFormValues) => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [senderType, setSenderType] = useState<SenderType>(initial?.senderType ?? 'INDIVIDUAL');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>(initial?.role ?? 'SENDER');
  const [perms, setPerms] = useState<Permission[]>(initial?.permissions ?? []);
  const [isActive, setIsActive] = useState<boolean>(initial?.isActive ?? true);
  const [rowCity, setRowCity] = useState('');
  const [rowDistrict, setRowDistrict] = useState('');
  const [localErr, setLocalErr] = useState<string | null>(null);

  const manageableCities = useMemo(
    () => (isSuperAdmin ? PROVINCES : Array.from(new Set(myPerms.map((p) => p.city)))),
    [isSuperAdmin, myPerms],
  );

  const allowedDistricts = useMemo(() => {
    if (!rowCity) return [];
    if (isSuperAdmin) return getDistricts(rowCity);
    const cityPerms = myPerms.filter((p) => p.city === rowCity);
    if (cityPerms.some((p) => p.district == null)) return getDistricts(rowCity);
    return cityPerms.map((p) => p.district!).filter(Boolean);
  }, [rowCity, isSuperAdmin, myPerms]);

  const canPickWholeCity = useMemo(() => {
    if (!rowCity) return false;
    if (isSuperAdmin) return true;
    return myPerms.some((p) => p.city === rowCity && p.district == null);
  }, [rowCity, isSuperAdmin, myPerms]);

  const roleOptions: Role[] = isSuperAdmin ? ['SENDER', 'REGION_ADMIN', 'SUPER_ADMIN'] : ['SENDER'];
  const nameLabel = senderType === 'ORGANIZATION' ? 'Kurum Adı' : 'Ad Soyad';

  function addPermission() {
    if (!rowCity) return;
    // Bölge yöneticisi her zaman il geneli (ilçe yok)
    if (role === 'REGION_ADMIN') {
      if (perms.some((p) => p.city === rowCity && p.district == null)) return;
      setPerms([...perms, { city: rowCity, district: null }]);
      setRowCity('');
      setLocalErr(null);
      return;
    }
    const district = rowDistrict.trim() ? rowDistrict.trim() : null;
    if (!district && !canPickWholeCity) {
      setLocalErr('Bu il için il geneli yetkiniz yok; bir ilçe seçin.');
      return;
    }
    if (perms.some((p) => p.city === rowCity && (p.district ?? '') === (district ?? ''))) return;
    setPerms([...perms, { city: rowCity, district }]);
    setRowDistrict('');
    setLocalErr(null);
  }

  function submit() {
    setLocalErr(null);
    if (!name.trim()) {
      setLocalErr(`${nameLabel} gerekli.`);
      return;
    }
    if (mode === 'create') {
      if (!email.trim()) return setLocalErr('E-posta gerekli.');
      if (password.length < 8) return setLocalErr('Şifre en az 8 karakter olmalı.');
    } else if (password && password.length < 8) {
      return setLocalErr('Yeni şifre en az 8 karakter olmalı.');
    }
    if (role !== 'SUPER_ADMIN' && perms.length === 0) {
      return setLocalErr('En az bir bölge yetkisi ekleyin.');
    }
    onSubmit({ name: name.trim(), senderType, email: email.trim(), password, role, permissions: perms, isActive });
  }

  return (
    <div className="space-y-5">
      {/* Tip seçimi */}
      <div className="space-y-2">
        <Label>Gönderici türü</Label>
        <div className="grid grid-cols-2 gap-2">
          {(['INDIVIDUAL', 'ORGANIZATION'] as SenderType[]).map((t) => {
            const Icon = t === 'ORGANIZATION' ? Building2 : User;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setSenderType(t)}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium',
                  senderType === t
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background hover:bg-muted',
                )}
              >
                <Icon className="h-4 w-4" />
                {t === 'ORGANIZATION' ? 'Kurumsal' : 'Bireysel'}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="sf-name">{nameLabel}</Label>
          <Input
            id="sf-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={senderType === 'ORGANIZATION' ? 'Örn. Konyaaltı Mahalle Derneği' : 'Ad Soyad'}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sf-email">E-posta {mode === 'edit' && '(değiştirilemez)'}</Label>
          <Input
            id="sf-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={mode === 'edit'}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sf-pass">{mode === 'edit' ? 'Yeni şifre (boş = değişmez)' : 'Şifre (en az 8 karakter)'}</Label>
          <Input id="sf-pass" type="text" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sf-role">Rol</Label>
          <Select
            id="sf-role"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            disabled={!isSuperAdmin}
          >
            {roleOptions.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {mode === 'edit' && (
        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <Label className="text-base">Hesap aktif</Label>
          <Switch checked={isActive} onCheckedChange={setIsActive} aria-label="Hesap aktif" />
        </div>
      )}

      {role !== 'SUPER_ADMIN' && (
        <div>
          <Label>Bölge yetkileri</Label>
          <p className="mb-2 text-sm text-muted-foreground">
            {role === 'REGION_ADMIN'
              ? 'Bölge yöneticisi her zaman il geneli yetkilidir; yalnızca il seçin. Her il için en fazla bir bölge yöneticisi olabilir.'
              : 'İl seçip ilçe bırakırsanız “il geneli” yetki verilir.'}
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[150px] flex-1">
              <Combobox
                value={rowCity}
                options={manageableCities}
                placeholder="İl arayın"
                onChange={(c) => {
                  setRowCity(c);
                  setRowDistrict('');
                }}
              />
            </div>
            {role !== 'REGION_ADMIN' && (
              <div className="min-w-[150px] flex-1">
                {hasDistrictData(rowCity) && allowedDistricts.length > 0 ? (
                  <Select
                    value={rowDistrict}
                    onChange={(e) => setRowDistrict(e.target.value)}
                    disabled={!rowCity}
                  >
                    <option value="">{canPickWholeCity ? 'İl geneli' : 'İlçe seçin'}</option>
                    {allowedDistricts.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Input
                    placeholder={canPickWholeCity ? 'İlçe (boş = il geneli)' : 'İlçe adı'}
                    value={rowDistrict}
                    onChange={(e) => setRowDistrict(e.target.value)}
                    disabled={!rowCity}
                  />
                )}
              </div>
            )}
            <Button type="button" variant="outline" onClick={addPermission} disabled={!rowCity}>
              <Plus className="h-4 w-4" />
              Ekle
            </Button>
          </div>

          {perms.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {perms.map((p, i) => (
                <span
                  key={`${p.city}-${p.district ?? ''}-${i}`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm"
                >
                  {p.city}
                  {p.district ? ` · ${p.district}` : ' · il geneli'}
                  <button
                    type="button"
                    onClick={() => setPerms(perms.filter((_, idx) => idx !== i))}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Kaldır"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {(localErr || error) && (
        <p className="text-sm font-medium text-destructive">{localErr || error}</p>
      )}

      <Button onClick={submit} disabled={submitting} className="w-full sm:w-auto">
        {submitting ? 'Kaydediliyor…' : mode === 'edit' ? 'Değişiklikleri Kaydet' : 'Hesabı Oluştur'}
      </Button>
    </div>
  );
}
