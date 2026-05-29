import { LoginForm } from '@/components/login-form';

export const metadata = { title: 'Gönderici Girişi' };

export default function PanelLoginPage() {
  return (
    <LoginForm title="Gönderici Girişi" subtitle="Duyuru gönderme paneli" context="panel" />
  );
}
