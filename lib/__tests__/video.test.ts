import { describe, expect, it } from 'vitest';
import { parseVideoUrl } from '@/lib/video';

describe('parseVideoUrl', () => {
  it('parses youtube watch urls', () => {
    const result = parseVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(result.provider).toBe('youtube');
    expect(result.id).toBe('dQw4w9WgXcQ');
    expect(result.embedUrl).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    expect(result.thumbnailUrl).toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
  });

  it('parses youtu.be short urls', () => {
    const result = parseVideoUrl('https://youtu.be/dQw4w9WgXcQ');
    expect(result.provider).toBe('youtube');
    expect(result.id).toBe('dQw4w9WgXcQ');
    expect(result.embedUrl).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
  });

  it('parses youtube shorts urls', () => {
    const result = parseVideoUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ');
    expect(result.provider).toBe('youtube');
    expect(result.id).toBe('dQw4w9WgXcQ');
  });

  it('parses vimeo urls', () => {
    const result = parseVideoUrl('https://vimeo.com/12345678');
    expect(result.provider).toBe('vimeo');
    expect(result.id).toBe('12345678');
    expect(result.embedUrl).toBe('https://player.vimeo.com/video/12345678');
  });

  it('falls back to other for unknown urls', () => {
    const result = parseVideoUrl('https://example.com/video.mp4');
    expect(result.provider).toBe('other');
    expect(result.embedUrl).toBe('https://example.com/video.mp4');
    expect(result.id).toBeUndefined();
  });

  it('returns empty embed for empty input', () => {
    const result = parseVideoUrl('');
    expect(result.provider).toBe('other');
    expect(result.embedUrl).toBe('');
  });
});
