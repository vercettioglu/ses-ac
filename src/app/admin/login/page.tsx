import { LoginForm } from '@/components/login-form';

export const metadata = { title: 'Yönetici Girişi' };

export default function AdminLoginPage() {
  return (
    <LoginForm title="Yönetici Girişi" subtitle="Susma yönetim paneli" context="admin" />
  );
}
