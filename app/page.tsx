import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <h1 className="text-4xl font-bold tracking-tight">AracKimlik</h1>
      <p className="text-lg text-slate-600">
        Araçlarınız için dijital kimlik ve QR/NFC vitrin sistemi
      </p>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="rounded-lg bg-slate-900 px-5 py-2.5 text-white transition-colors hover:bg-slate-700"
        >
          Giriş Yap
        </Link>
        <Link
          href="/signup"
          className="rounded-lg border border-slate-300 px-5 py-2.5 transition-colors hover:bg-slate-100"
        >
          Kayıt Ol
        </Link>
      </div>
    </main>
  );
}
