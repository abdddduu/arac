'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Loader2, Play, SkipForward, X } from 'lucide-react';
import { confirmNfcTag, discardNfcTag, prepareNfcTag } from '@/app/dashboard/nfc/actions';
import { Button } from '@/components/ui/button';

export type NfcQueueItem = {
  vehicleId: string;
  label: string;
  hasActiveTag: boolean;
};

type ItemStatus =
  | { state: 'bekliyor' }
  | { state: 'yaziliyor' }
  | { state: 'tamam'; uid: string }
  | { state: 'hata'; message: string };

export function NfcWriter({
  items,
  initialPreselected,
}: {
  items: NfcQueueItem[];
  initialPreselected?: string;
}) {
  const supported = typeof window !== 'undefined' && 'NDEFReader' in window;

  const defaultSelected = useMemo(() => {
    const preselected = items.find((i) => i.vehicleId === initialPreselected);
    if (preselected) return [preselected.vehicleId];
    return items.filter((i) => !i.hasActiveTag).map((i) => i.vehicleId);
  }, [items, initialPreselected]);

  const [selected, setSelected] = useState<Set<string>>(new Set(defaultSelected));
  const [lock, setLock] = useState(false);
  const [running, setRunning] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [statuses, setStatuses] = useState<Record<string, ItemStatus>>({});
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const toggle = (vehicleId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(vehicleId)) next.delete(vehicleId);
      else next.add(vehicleId);
      return next;
    });
  };

  const queue = items.filter((i) => selected.has(i.vehicleId));

  const skip = () => {
    abortRef.current?.abort();
  };

  const runQueue = async () => {
    if (queue.length === 0 || running) return;
    setRunning(true);
    setProgress(0);
    const controller = new AbortController();
    abortRef.current = controller;
    const statusCopy: Record<string, ItemStatus> = {};
    setStatuses({});

    let done = 0;
    for (const item of queue) {
      if (controller.signal.aborted) break;
      statusCopy[item.vehicleId] = { state: 'yaziliyor' };
      setStatuses({ ...statusCopy });
      setCurrentId(item.vehicleId);

      try {
        const prepared = await prepareNfcTag(item.vehicleId);
        if (!prepared.ok) throw new Error(prepared.error);

        const NDEF = (window as unknown as { NDEFReader: new () => NDEFReader }).NDEFReader;
        const reader = new NDEF();

        await reader.scan({ signal: controller.signal });

        const uid = await new Promise<string>((resolve, reject) => {
          reader.onreading = (event) => resolve(event.serialNumber);
          controller.signal.addEventListener(
            'abort',
            () => reject(new DOMException('Aborted', 'AbortError')),
            { once: true },
          );
        });

        await reader.write(
          { records: [{ recordType: 'url', data: prepared.url }] },
          { signal: controller.signal },
        );
        if (lock && typeof reader.makeReadOnly === 'function') {
          try {
            await reader.makeReadOnly({ signal: controller.signal });
          } catch {
            // makeReadOnly unsupported on some cards; write still succeeded.
          }
        }

        const result = await confirmNfcTag(prepared.tagId, uid);
        if (!result.ok) throw new Error((result as { error?: string }).error ?? 'Kayıt yapılamadı.');

        statusCopy[item.vehicleId] = { state: 'tamam', uid };
        done += 1;
        setProgress(done);
      } catch (error) {
        const skipped = error instanceof DOMException && error.name === 'AbortError';
        const message = skipped
          ? 'Atlandı'
          : error instanceof Error
            ? error.message
            : 'Bilinmeyen hata';
        statusCopy[item.vehicleId] = { state: 'hata', message };
        if (!skipped) {
          try {
            const prepared = await prepareNfcTag(item.vehicleId);
            if (prepared.ok) await discardNfcTag(prepared.tagId);
          } catch {
            // cleanup failure is ignored
          }
        }
      }
      setStatuses({ ...statusCopy });
    }

    setRunning(false);
    setCurrentId(null);
    abortRef.current = null;
  };

  if (!supported) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Tarayıcınız Web NFC desteklemiyor. Web NFC, Chrome on Android üzerinde HTTPS
          bağlantısıyla çalışır. iPhone&apos;lar kartları okuyabilir ancak web üzerinden
          yazamaz. Bilgisayarda yazmak için CSV dosyasını indirip ACR122U okuyucu ve
          NFC Tools uygulamasını kullanabilirsiniz.
        </div>
        <ExportCsv />
      </div>
    );
  }

  const currentItem = items.find((i) => i.vehicleId === currentId);

  return (
    <div className="space-y-5">
      <div className="grid gap-2">
        {items.map((item) => (
          <label
            key={item.vehicleId}
            className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
          >
            <input
              type="checkbox"
              checked={selected.has(item.vehicleId)}
              onChange={() => toggle(item.vehicleId)}
              disabled={running}
              className="h-4 w-4 rounded border-slate-300"
            />
            <span className="flex-1 font-medium text-slate-900">{item.label}</span>
            {item.hasActiveTag && <span className="text-xs text-slate-400">Mevcut NFC kartı var</span>}
            {running && item.vehicleId === currentId && (
              <Button type="button" variant="outline" size="sm" onClick={skip}>
                <SkipForward className="h-3.5 w-3.5" />
                Atla
              </Button>
            )}
            {statuses[item.vehicleId] && <ItemStatusBadge status={statuses[item.vehicleId]} />}
          </label>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={lock}
            onChange={(e) => setLock(e.target.checked)}
            disabled={running}
            className="h-4 w-4 rounded border-slate-300"
          />
          Kartı kilitle (salt okunur)
        </label>
        {!running ? (
          <Button onClick={runQueue} disabled={selected.size === 0}>
            <Play className="h-4 w-4" />
            Toplu Yazmayı Başlat ({queue.length})
          </Button>
        ) : (
          <Button variant="destructive" onClick={abortRef.current?.abort}>
            <X className="h-4 w-4" />
            Durdur
          </Button>
        )}
        <ExportCsv />
      </div>

      {running && (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
          <p className="font-medium text-slate-900">
            {progress} / {queue.length} yazıldı
          </p>
          {currentItem && (
            <p className="mt-1 text-slate-600">
              Kartı telefonun arkasına dokundurun:{' '}
              <span className="font-semibold">{currentItem.label}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ItemStatusBadge({ status }: { status: ItemStatus }) {
  if (status.state === 'yaziliyor') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Yazılıyor
      </span>
    );
  }
  if (status.state === 'tamam') {
    return <span className="text-xs font-medium text-emerald-600">Tamam</span>;
  }
  if (status.state === 'hata') {
    return <span className="text-xs font-medium text-red-600">{status.message}</span>;
  }
  return <span className="text-xs text-slate-400">Bekliyor</span>;
}

function ExportCsv() {
  return (
    <a
      href="/api/nfc/export"
      className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
    >
      <Download className="h-4 w-4" />
      CSV İndir
    </a>
  );
}
