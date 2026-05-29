'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/combobox';
import { Switch } from '@/components/ui/switch';
import { PROVINCES, getDistricts, hasDistrictData } from '@/lib/regions';

export type RegionValue = {
  city: string;
  district: string;
  wantsNational: boolean;
};

// İl / İlçe / Tüm Türkiye seçimi (tek kolon, sade, aranabilir). Home ve Ayarlar'da kullanılır.
export function RegionFields({
  value,
  onChange,
}: {
  value: RegionValue;
  onChange: (next: RegionValue) => void;
}) {
  const districts = getDistricts(value.city);
  const knownDistricts = hasDistrictData(value.city);

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="city">İliniz</Label>
        <Combobox
          id="city"
          value={value.city}
          options={PROVINCES}
          placeholder="İl arayın veya seçin"
          onChange={(city) => onChange({ ...value, city, district: '' })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="district">İlçeniz</Label>
        {knownDistricts ? (
          <Combobox
            id="district"
            value={value.district}
            options={districts}
            placeholder="İlçe arayın (isteğe bağlı)"
            onChange={(district) => onChange({ ...value, district })}
          />
        ) : (
          <Input
            id="district"
            placeholder="İlçenizi yazın (isteğe bağlı)"
            value={value.district}
            onChange={(e) => onChange({ ...value, district: e.target.value })}
            disabled={!value.city}
          />
        )}
        <p className="text-sm text-muted-foreground">
          İlçe seçmezseniz ilinizin geneli için gelen duyuruları alırsınız.
        </p>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
        <div className="pr-4">
          <Label htmlFor="national" className="text-base">
            Tüm Türkiye duyuruları
          </Label>
          <p className="text-sm text-muted-foreground">
            Ülke geneli önemli duyuruları da almak isterseniz açın.
          </p>
        </div>
        <Switch
          id="national"
          checked={value.wantsNational}
          onCheckedChange={(checked) => onChange({ ...value, wantsNational: checked })}
          aria-label="Tüm Türkiye duyuruları"
        />
      </div>
    </div>
  );
}
