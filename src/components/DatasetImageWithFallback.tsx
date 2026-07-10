"use client";

import React, { useState, useEffect } from "react";

interface DatasetImageWithFallbackProps {
  src: string;
  alt: string;
  className?: string;
}

export default function DatasetImageWithFallback({
  src,
  alt,
  className,
}: DatasetImageWithFallbackProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (hasError || !src) {
    return (
      <div className="text-[10px] text-rose-600 font-mono bg-rose-50 p-2 border border-rose-100 rounded-lg leading-normal break-all text-center w-full">
        ⚠️ Image preview unavailable. Stored path: <span className="font-bold underline text-rose-700">{src || "None"}</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
    />
  );
}
