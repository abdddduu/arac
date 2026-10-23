'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createLogoUploadUrl, saveLogo } from '@/app/dashboard/settings/actions';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';

export function LogoUpload({ currentUrl }: { currentUrl: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function handleFile(file: File) {
    setError(null);
    setPending(true);
    const bucket = process.env.NEXT_PUBLIC_SUPABASE_MEDIA_BUCKET ?? 'vehicle-media';
    try {
      const result = await createLogoUploadUrl(file.name);
      if ('error' in result) {
        setError(result.error);
        return;
      }
      const supabase = createSupabaseBrowserClient();
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .uploadToSignedUrl(result.path, result.token, file, { contentType: file.type });
      if (uploadError) {
        setError('Logo yüklenemedi. Lütfen tekrar deneyin.');
        return;
      }
      await saveLogo(result.path);
      router.refresh();
    } catch {
      setError('Logo yüklenirken bir sorun oluştu.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      {currentUrl && (
        <Image
          src={currentUrl}
          alt="Bayi logosu"
          width={80}
          height={80}
          unoptimized
          className="mb-4 h-20 w-20 rounded-xl border border-slate-200 object-cover"
        />
      )}
      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          disabled={pending}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
            event.target.value = '';
          }}
        />
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-4 w-4" />
          {pending ? 'Yükleniyor…' : 'Logo Yükle'}
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
