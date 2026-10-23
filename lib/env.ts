export function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
}

export function mediaBucket() {
  return process.env.SUPABASE_MEDIA_BUCKET || 'vehicle-media';
}
