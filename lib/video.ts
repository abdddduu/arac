export type VideoProvider = 'youtube' | 'vimeo' | 'other';

export type ParsedVideo = {
  provider: VideoProvider;
  id?: string;
  embedUrl: string;
  thumbnailUrl?: string;
};

export function parseVideoUrl(url: string): ParsedVideo {
  const trimmed = url.trim();
  if (!trimmed) return { provider: 'other', embedUrl: '' };

  const youtubeMatch =
    trimmed.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})/);
  if (youtubeMatch) {
    const id = youtubeMatch[1];
    return {
      provider: 'youtube',
      id,
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
      thumbnailUrl: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
    };
  }

  const vimeoMatch = trimmed.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    const id = vimeoMatch[1];
    return {
      provider: 'vimeo',
      id,
      embedUrl: `https://player.vimeo.com/video/${id}`,
      thumbnailUrl: `https://vumbnail.com/${id}.jpg`,
    };
  }

  return { provider: 'other', embedUrl: trimmed };
}
