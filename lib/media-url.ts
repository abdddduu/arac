export function publicMediaUrl(path: string) {
  if (!path) return path;
  if (/^https?:\/\//.test(path)) return path;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_MEDIA_BUCKET || 'vehicle-media';
  if (!base) return path;
  return `${base}/storage/v1/object/public/${bucket}/${path.replace(/^\/+/, '')}`;
}
