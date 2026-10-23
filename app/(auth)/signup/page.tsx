import type { Metadata } from 'next';
import Link from 'next/link';
import { SignupForm } from './signup-form';

export const metadata: Metadata = {
  title: 'Kayıt Ol — AracKimlik',
};

export default function SignupPage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900">Hesap Oluştur</h1>
      <p className="mt-1 text-sm text-slate-500">
        Bayiniz için AracKimlik hesabı oluşturun
      </p>
      <div className="mt-6">
        <SignupForm />
      </div>
      <p className="mt-6 text-center text-sm text-slate-500">
        Zaten hesabınız var mı?{' '}
        <Link href="/login" className="font-medium text-slate-900 hover:underline">
          Giriş yapın
        </Link>
      </p>
    </div>
  );
}
