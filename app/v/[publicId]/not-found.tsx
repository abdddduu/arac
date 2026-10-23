import Link from 'next/link';

export default function VehicleNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-5xl">🚗</p>
      <h1 className="text-2xl font-bold text-slate-900">Araç bulunamadı</h1>
      <p className="text-sm text-slate-500">
        Aradığınız araç sayfası mevcut değil ya da yayından kaldırılmış olabilir.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700"
      >
        Ana Sayfaya Dön
      </Link>
    </main>
  );
}
