export default function VehicleLoading() {
  return (
    <main className="pb-24">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3 px-4 py-3">
          <div className="h-8 w-32 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-8 w-28 animate-pulse rounded-lg bg-slate-200" />
        </div>
      </header>
      <div className="mx-auto max-w-xl px-4">
        <div className="mt-5 h-8 w-3/4 animate-pulse rounded-lg bg-slate-200" />
        <div className="mt-4 aspect-[4/3] animate-pulse rounded-xl bg-slate-200" />
        <div className="mt-5 grid grid-cols-4 divide-x rounded-xl border border-slate-200 bg-white py-3 text-center">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-2 px-2">
              <div className="mx-auto h-4 w-12 animate-pulse rounded bg-slate-200" />
              <div className="mx-auto h-3 w-10 animate-pulse rounded bg-slate-100" />
            </div>
          ))}
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-200" />
          ))}
        </div>
        <div className="mt-6 h-40 animate-pulse rounded-xl bg-slate-200" />
      </div>
    </main>
  );
}
