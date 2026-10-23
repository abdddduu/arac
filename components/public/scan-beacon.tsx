'use client';

import { useEffect } from 'react';

export function ScanBeacon({ publicId }: { publicId: string }) {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('logged') === '1') return;

      const sessionKey = `arackimlik_scan_${publicId}`;
      if (sessionStorage.getItem(sessionKey)) return;
      sessionStorage.setItem(sessionKey, '1');

      const sourceParam = params.get('s') ?? '';
      const source = ['qr', 'nfc', 'share'].includes(sourceParam) ? sourceParam : 'direct';

      navigator.sendBeacon(
        '/api/public/scan',
        new Blob(
          [JSON.stringify({ publicId, source, referrer: document.referrer })],
          { type: 'application/json' },
        ),
      );
    } catch {
      // beacon failure is non-blocking
    }
  }, [publicId]);

  return null;
}
