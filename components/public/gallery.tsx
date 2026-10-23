'use client';

import { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { Play, X } from 'lucide-react';
import type { PublicPhoto } from '@/lib/public-vehicle';

type PublicVideo = {
  provider: string;
  id?: string;
  embedUrl: string;
  thumbnailUrl?: string;
  title: string | null;
};

export function Gallery({ photos, videos }: { photos: PublicPhoto[]; videos: PublicVideo[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel();
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightbox(false);
        setVideoUrl(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (photos.length === 0 && videos.length === 0) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center bg-slate-100 text-sm text-slate-400">
        Görsel bulunmuyor
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex touch-pan-y">
          {photos.map((photo, i) => (
            <button
              key={i}
              type="button"
              className="relative min-w-0 flex-[0_0_100%] cursor-zoom-in"
              onClick={() => setLightbox(true)}
            >
              <img
                src={photo.md}
                srcSet={`${photo.sm} 640w, ${photo.md} 1280w, ${photo.lg} 1920w`}
                sizes="(max-width: 640px) 100vw, 640px"
                alt=""
                loading={i === 0 ? 'eager' : 'lazy'}
                decoding="async"
                {...(i === 0 ? { fetchPriority: 'high' as const } : {})}
                className="aspect-[4/3] w-full object-cover"
              />
            </button>
          ))}
        </div>
      </div>

      {photos.length > 1 && (
        <div className="mt-3 flex items-center justify-between px-1">
          <div className="flex gap-1.5">
            {photos.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Fotoğraf ${i + 1}`}
                onClick={() => emblaApi?.scrollTo(i)}
                className={`h-2 rounded-full transition-all ${i === index ? 'w-5 bg-slate-900' : 'w-2 bg-slate-300'}`}
              />
            ))}
          </div>
          <span className="text-xs text-slate-500">
            {index + 1} / {photos.length}
          </span>
        </div>
      )}

      {videos.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {videos.map((video, i) => (
            <button
              key={i}
              type="button"
              className="group relative aspect-video overflow-hidden rounded-lg bg-slate-900"
              onClick={() => setVideoUrl(videoUrl === video.embedUrl ? null : video.embedUrl)}
            >
              {video.thumbnailUrl && video.provider !== 'other' ? (
                <img
                  src={video.thumbnailUrl}
                  alt={video.title ?? 'Video'}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-100"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                  {video.provider === 'other' ? 'Video' : video.title}
                </div>
              )}
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white">
                  <Play className="h-5 w-5 fill-current" />
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      {videoUrl && (
        <div className="mt-7">
          <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
            <iframe
              src={videoUrl}
              title="Video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 h-full w-full"
            />
          </div>
        </div>
      )}

      {lightbox && photos.length > 0 && (
        <Lightbox photos={photos} index={index} onClose={() => setLightbox(false)} />
      )}
    </div>
  );
}

function Lightbox({
  photos,
  index,
  onClose,
}: {
  photos: PublicPhoto[];
  index: number;
  onClose: () => void;
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ startIndex: index });
  const [current, setCurrent] = useState(index);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCurrent(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <button
        type="button"
        aria-label="Kapat"
        onClick={onClose}
        className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white"
      >
        <X className="h-5 w-5" />
      </button>
      <div className="flex flex-1 items-center overflow-hidden" ref={emblaRef}>
        <div className="flex h-full touch-pan-y">
          {photos.map((photo, i) => (
            <div key={i} className="relative min-w-0 flex-[0_0_100%]">
              <img
                src={photo.lg}
                alt=""
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-contain"
              />
            </div>
          ))}
        </div>
      </div>
      <p className="pb-6 pt-2 text-center text-sm text-white/70">
        {current + 1} / {photos.length}
      </p>
    </div>
  );
}
