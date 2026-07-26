"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Wraps next/image with a gentle opacity fade once the image finishes
 * loading. Checks `complete` on mount too, since cached images can load
 * before the onLoad listener attaches (otherwise they'd stay invisible).
 */
export default function FadeImage({ className, onLoad, ...props }: ImageProps) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (imgRef.current?.complete) {
      setLoaded(true);
    }
  }, []);

  return (
    <Image
      {...props}
      ref={imgRef}
      className={cn(className, loaded ? "opacity-100" : "opacity-0")}
      onLoad={(e) => {
        setLoaded(true);
        onLoad?.(e);
      }}
    />
  );
}
