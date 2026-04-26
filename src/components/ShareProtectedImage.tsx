"use client";

import type { CSSProperties, DragEvent, MouseEvent } from "react";

type ShareProtectedImageProps = {
  imageUrl: string;
  alt: string;
  watermark: string;
};

export function ShareProtectedImage({ imageUrl, alt, watermark }: ShareProtectedImageProps) {
  function preventImageSave(event: MouseEvent<HTMLDivElement> | DragEvent<HTMLDivElement>) {
    event.preventDefault();
  }

  return (
    <div
      className="share-protected-image"
      role="img"
      aria-label={alt}
      onContextMenu={preventImageSave}
      onDragStart={preventImageSave}
      draggable={false}
      style={{ backgroundImage: buildCssBackgroundImage(imageUrl) }}
    >
      <div className="share-watermark" aria-hidden="true">
        {watermark}
      </div>
    </div>
  );
}

function buildCssBackgroundImage(imageUrl: string): CSSProperties["backgroundImage"] {
  return `url(${JSON.stringify(imageUrl)})`;
}
