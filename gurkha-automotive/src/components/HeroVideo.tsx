"use client";

import { useEffect, useRef, useState } from "react";
import FadeImage from "@/components/FadeImage";
import { cn } from "@/lib/utils";

type HeroVideoProps = {
  videoSrc: string;
  poster: string;
  posterAlt: string;
};

/**
 * Poster image is always rendered as the base layer (and is all that shows
 * under prefers-reduced-motion or if autoplay is blocked). The video fades
 * in on top only once it actually starts playing, so there's never a flash
 * of an unstyled/black frame.
 */
export default function HeroVideo({ videoSrc, poster, posterAlt }: HeroVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);

  useEffect(() => {
    setVideoEnabled(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  return (
    <>
      <FadeImage
        src={poster}
        alt={posterAlt}
        fill
        priority
        sizes="100vw"
        className="object-cover object-center transition-opacity duration-700 ease-premium"
      />
      {videoEnabled && (
        <video
          ref={videoRef}
          src={videoSrc}
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
          onPlaying={() => setPlaying(true)}
          className={cn(
            "absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-[800ms] ease-premium",
            playing ? "opacity-100" : "opacity-0"
          )}
        />
      )}
    </>
  );
}
