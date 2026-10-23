'use client';

import { useCallback, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { ArrowLeft, ArrowRight, Check, ExternalLink, Loader2, Plus, Star, Trash2, Upload, X } from 'lucide-react';
import {
  addVideoLink,
  createMediaUploadUrl,
  deleteMedia,
  registerDocument,
  registerPhoto,
  reorderMedia,
  setCoverPhoto,
  updateMediaMeta,
} from '@/app/dashboard/vehicles/[id]/media-actions';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { publicMediaUrl } from '@/lib/media-url';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import type { Media } from '@/lib/db/schema';

const MEDIA_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_MEDIA_BUCKET ?? 'vehicle-media';

const PHOTO_ACCEPT = { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'], 'image/heic': ['.heic'] };
const DOC_ACCEPT = { 'application/pdf': ['.pdf'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'] };

const PHOTO_CATEGORIES: { value: string; label: string }[] = [
  { value: 'exterior', label: 'Dış' },
  { value: 'interior', label: 'İç' },
  { value: 'engine', label: 'Motor' },
  { value: 'damage', label: 'Hasar' },
  { value: 'other', label: 'Diğer' },
];

type UploadTask = {
  file: File;
  status: 'uploading' | 'processing' | 'done' | 'error';
  progress: number;
  error?: string;
};

export function MediaManager({
  vehicleId,
  photos,
  videos,
  documents,
}: {
  vehicleId: string;
  photos: Media[];
  videos: Media[];
  documents: Media[];
}) {
  const router = useRouter();
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [tasksDoc, setTasksDoc] = useState<UploadTask[]>([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [docTitle, setDocTitle] = useState('Ekspertiz Raporu');
  const [docPublic, setDocPublic] = useState(true);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const sortedPhotos = [...photos].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  const uploadPhoto = useCallback(
    async (file: File) => {
      setTasks((prev) => [...prev, { file, status: 'uploading', progress: 0 }]);
      try {
        const created = await createMediaUploadUrl(vehicleId, file.name, file.type, 'photo');
        if (!created.ok || !created.path || !created.token) {
          throw new Error(!created.ok ? created.error : 'Yükleme URL oluşturulamadı.');
        }
        const supabase = createSupabaseBrowserClient();
        const upload = await supabase.storage.from(MEDIA_BUCKET).uploadToSignedUrl(created.path, created.token, file);
        if (upload.error) throw new Error(upload.error.message);
        setTasks((prev) => prev.map((t) => (t.file.name === file.name ? { ...t, status: 'processing', progress: 100 } : t)));
        const registered = await registerPhoto(vehicleId, created.path);
        if (!registered.ok) throw new Error(registered.error);
        setTasks((prev) => prev.map((t) => (t.file.name === file.name ? { ...t, status: 'done', progress: 100 } : t)));
        router.refresh();
      } catch (error) {
        const err = error as Error;
        setTasks((prev) => prev.map((t) => (t.file.name === file.name ? { ...t, status: 'error', error: err.message } : t)));
      }
    },
    [vehicleId, router],
  );

  const uploadDocument = useCallback(
    async (file: File) => {
      setTasksDoc((prev) => [...prev, { file, status: 'uploading', progress: 0 }]);
      try {
        const created = await createMediaUploadUrl(vehicleId, file.name, file.type, 'document');
        if (!created.ok || !created.path || !created.token) {
          throw new Error(!created.ok ? created.error : 'Yükleme URL oluşturulamadı.');
        }
        const supabase = createSupabaseBrowserClient();
        const upload = await supabase.storage.from(MEDIA_BUCKET).uploadToSignedUrl(created.path, created.token, file);
        if (upload.error) throw new Error(upload.error.message);
        setTasksDoc((prev) => prev.map((t) => (t.file.name === file.name ? { ...t, status: 'processing', progress: 100 } : t)));
        const registered = await registerDocument(vehicleId, created.path, docTitle || file.name, file.type, file.size, docPublic);
        if (!registered.ok) throw new Error(registered.error);
        setTasksDoc((prev) => prev.map((t) => (t.file.name === file.name ? { ...t, status: 'done', progress: 100 } : t)));
        router.refresh();
      } catch (error) {
        const err = error as Error;
        setTasksDoc((prev) => prev.map((t) => (t.file.name === file.name ? { ...t, status: 'error', error: err.message } : t)));
      }
    },
    [vehicleId, docTitle, docPublic, router],
  );

  const photoDropzone = useDropzone({
    accept: PHOTO_ACCEPT,
    maxSize: 25 * 1024 * 1024,
    multiple: true,
    onDropAccepted: (files: File[]) => {
      void files.forEach((file) => uploadPhoto(file));
    },
  });

  const docDropzone = useDropzone({
    accept: DOC_ACCEPT,
    maxSize: 20 * 1024 * 1024,
    multiple: true,
    onDropAccepted: (files: File[]) => {
      void files.forEach((file) => uploadDocument(file));
    },
  });

  const movePhoto = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= sortedPhotos.length) return;
    const next = [...sortedPhotos];
    [next[index], next[target]] = [next[target], next[index]];
    const result = await reorderMedia(vehicleId, next.map((p) => p.id));
    if (result.ok) router.refresh();
    else setMessage({ ok: false, text: result.error });
  };

  const onDeleteMedia = async (mediaId: string) => {
    if (!window.confirm('Bu öğeyi silmek istediğinize emin misiniz?')) return;
    const result = await deleteMedia(mediaId);
    if (result.ok) router.refresh();
    else setMessage({ ok: false, text: result.error });
  };

  const addVideo = async () => {
    setVideoError(null);
    const result = await addVideoLink(vehicleId, videoUrl.trim(), videoTitle.trim());
    if (result.ok) {
      setVideoUrl('');
      setVideoTitle('');
      router.refresh();
    } else {
      setVideoError(result.error);
    }
  };

  return (
    <div className="space-y-6">
      {message && (
        <p className={message.ok ? 'text-sm text-emerald-600' : 'text-sm text-red-600'}>{message.text}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Fotoğraflar</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...photoDropzone.getRootProps()}
            className="cursor-pointer rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center transition-colors hover:border-slate-400"
          >
            <input {...photoDropzone.getInputProps()} />
            <Upload className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-2 text-sm font-medium text-slate-700">Fotoğrafları buraya sürükleyin veya tıklayın</p>
            <p className="mt-1 text-xs text-slate-500">JPG, PNG, WebP, HEIC — en fazla 25MB, birden fazla seçilebilir</p>
          </div>

          {tasks.length > 0 && (
            <ul className="mt-4 space-y-2">
              {tasks.map((task) => (
                <li key={`${task.file.name}-${task.file.size}`} className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2 text-sm">
                  {task.status === 'done' ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : task.status === 'error' ? (
                    <X className="h-4 w-4 text-red-500" />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                  )}
                  <span className="flex-1 truncate text-slate-700">{task.file.name}</span>
                  {task.status === 'uploading' && <span className="text-xs text-slate-500">Yükleniyor</span>}
                  {task.status === 'processing' && <span className="text-xs text-slate-500">İşleniyor</span>}
                  {task.status === 'error' && <span className="text-xs text-red-500">{task.error}</span>}
                </li>
              ))}
            </ul>
          )}

          {sortedPhotos.length > 0 && (
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {sortedPhotos.map((photo, index) => (
                <div key={photo.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <div className="relative aspect-[4/3] bg-slate-100">
                    <Image
                      src={publicMediaUrl(photo.variants?.sm ?? photo.storagePath ?? '')}
                      alt={photo.title ?? 'Fotoğraf'}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                    {photo.isCover && (
                      <span className="absolute left-2 top-2 rounded-full bg-slate-900/80 px-2 py-0.5 text-xs text-white">
                        Kapak
                      </span>
                    )}
                  </div>
                  <div className="space-y-2 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex gap-1">
                        <Button type="button" variant="outline" size="sm" disabled={index === 0} onClick={() => movePhoto(index, -1)} aria-label="Sola taşı">
                          <ArrowLeft className="h-3.5 w-3.5" />
                        </Button>
                        <Button type="button" variant="outline" size="sm" disabled={index === sortedPhotos.length - 1} onClick={() => movePhoto(index, 1)} aria-label="Sağa taşı">
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            const result = await setCoverPhoto(vehicleId, photo.id);
                            if (result.ok) router.refresh();
                          }}
                          aria-label="Kapak yap"
                        >
                          <Star className={`h-4 w-4 ${photo.isCover ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => onDeleteMedia(photo.id)} aria-label="Sil">
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    <select
                      value={photo.category ?? ''}
                      onChange={async (e) => {
                        const result = await updateMediaMeta(photo.id, { category: e.target.value });
                        if (result.ok) router.refresh();
                      }}
                      className="h-8 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs outline-none focus:border-slate-400"
                    >
                      <option value="">Kategori</option>
                      {PHOTO_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Videolar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Video Bağlantısı" className="sm:col-span-2">
              <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="YouTube veya Vimeo bağlantısı" />
            </Field>
            <Field label="Başlık (isteğe bağlı)">
              <Input value={videoTitle} onChange={(e) => setVideoTitle(e.target.value)} placeholder="Örn. Tanıtım videosu" />
            </Field>
          </div>
          {videoError && <p className="text-sm text-red-600">{videoError}</p>}
          <Button type="button" onClick={addVideo}>
            <Plus className="h-4 w-4" />
            Video Ekle
          </Button>
          {videos.length > 0 && (
            <ul className="mt-2 space-y-2">
              {videos.map((video) => (
                <li key={video.id} className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2">
                  {video.provider === 'youtube' && video.externalUrl ? (
                    <img
                      src={`https://img.youtube.com/vi/${extractYoutubeId(video.externalUrl)}/hqdefault.jpg`}
                      alt=""
                      className="h-12 w-20 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-20 items-center justify-center rounded bg-slate-100 text-xs text-slate-400">
                      {video.provider}
                    </div>
                  )}
                  <span className="flex-1 truncate text-sm text-slate-700">{video.title ?? video.provider}</span>
                  <a href={video.externalUrl ?? '#'} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-700">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <Button type="button" variant="ghost" size="sm" onClick={() => onDeleteMedia(video.id)} aria-label="Sil">
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dokümanlar (Ekspertiz Raporları)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Başlık">
              <Input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} />
            </Field>
            <label className="flex items-end gap-2 pb-2.5 text-sm text-slate-700">
              <Switch checked={docPublic} onChange={(e) => setDocPublic(e.target.checked)} />
              Herkese açık
            </label>
          </div>
          <div
            {...docDropzone.getRootProps()}
            className="mt-3 cursor-pointer rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center transition-colors hover:border-slate-400"
          >
            <input {...docDropzone.getInputProps()} />
            <Upload className="mx-auto h-7 w-7 text-slate-400" />
            <p className="mt-2 text-sm font-medium text-slate-700">PDF veya görsel yükleyin</p>
            <p className="mt-1 text-xs text-slate-500">En fazla 20MB</p>
          </div>
          {tasksDoc.length > 0 && (
            <ul className="mt-4 space-y-2">
              {tasksDoc.map((task) => (
                <li key={`${task.file.name}-${task.file.size}`} className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2 text-sm">
                  {task.status === 'done' ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : task.status === 'error' ? (
                    <X className="h-4 w-4 text-red-500" />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                  )}
                  <span className="flex-1 truncate text-slate-700">{task.file.name}</span>
                  {task.status === 'uploading' && <span className="text-xs text-slate-500">Yükleniyor</span>}
                  {task.status === 'processing' && <span className="text-xs text-slate-500">Kaydediliyor</span>}
                  {task.status === 'error' && <span className="text-xs text-red-500">{task.error}</span>}
                </li>
              ))}
            </ul>
          )}
          {documents.length > 0 && (
            <ul className="mt-4 space-y-2">
              {documents.map((doc) => (
                <li key={doc.id} className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2">
                  <span className="flex-1 truncate text-sm text-slate-700">{doc.title ?? doc.storagePath}</span>
                  <span className="text-xs text-slate-400">{formatSize(doc.sizeBytes)}</span>
                  <label className="flex items-center gap-2 text-xs text-slate-600">
                    <Switch
                      checked={doc.isPublic ?? false}
                      onChange={async (e) => {
                        const result = await updateMediaMeta(doc.id, { isPublic: e.target.checked });
                        if (result.ok) router.refresh();
                      }}
                    />
                    Herkese açık
                  </label>
                  <a href={publicMediaUrl(doc.storagePath ?? '')} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-700">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <Button type="button" variant="ghost" size="sm" onClick={() => onDeleteMedia(doc.id)} aria-label="Sil">
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function extractYoutubeId(embedUrl: string) {
  const match = embedUrl.match(/embed\/([\w-]{11})/);
  return match ? match[1] : '';
}

function formatSize(bytes: number | null | undefined) {
  if (bytes === null || bytes === undefined) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
