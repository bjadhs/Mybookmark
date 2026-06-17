"use client";

import { useCallback, useRef, useState } from "react";

interface ImageSlotProps {
  placeholder?: string;
  shape?: "rect" | "rounded" | "circle" | "pill";
  radius?: number;
  className?: string;
  style?: React.CSSProperties;
  /** Initial / external image (data URL) — used to seed the slot when editing. */
  value?: string | null;
  onImageChange?: (dataUrl: string | null) => void;
}

export function ImageSlot({
  placeholder = "Drop an image",
  shape = "rounded",
  radius = 12,
  className = "",
  style,
  value = null,
  onImageChange,
}: ImageSlotProps) {
  // Seeded once from `value` so the edit form opens with the existing image.
  const [image, setImage] = useState<string | null>(value);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setImage(dataUrl);
        onImageChange?.(dataUrl);
      };
      reader.readAsDataURL(file);
    },
    [onImageChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const borderRadius =
    shape === "circle" ? "50%" : shape === "pill" ? "999px" : `${radius}px`;

  return (
    <div
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`
        relative overflow-hidden cursor-pointer transition-all duration-150
        ${dragOver ? "ring-2 ring-glance-focus ring-offset-2 ring-offset-glance-bg" : ""}
        ${className}
      `}
      style={{
        borderRadius,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.09)",
        ...style,
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleInputChange}
      />
      {image ? (
        <img
          src={image}
          alt="Preview"
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex flex-col items-center justify-center w-full h-full gap-2 text-glance-muted">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
          <span className="text-[13px] font-medium text-center px-4">
            {placeholder}
          </span>
        </div>
      )}
    </div>
  );
}
