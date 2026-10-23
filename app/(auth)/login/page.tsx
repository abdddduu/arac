import type { Metadata } from 'next';
import { LoginForm } from './login-form';

export const metadata: Metadata = {
  title: 'Giriş — AracKimlik',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const nextRaw = params.next;
  const next =
    typeof nextRaw === 'string' && nextRaw.startsWith('/') && !nextRaw.startsWith('//')
      ? nextRaw
      : '/dashboard';

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900">Giriş Yap</h1>
      <p className="mt-1 text-sm text-slate-500">Hesabınıza giriş yapın</p>
      <div className="mt-6">
        <LoginForm next={next} />
      </div>
      <p className="mt-6 text-center text-sm text-slate-500">
        Hesabınız yok mu?{' '}
        <a href="/signup" className="font-medium text-slate-900 hover:underline">
          Kayıt olun
        </a>
      </p>
    </div>
  );
}
