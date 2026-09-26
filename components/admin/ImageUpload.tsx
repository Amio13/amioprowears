"use client";

import { ImagePlus, RefreshCw, Trash2 } from "lucide-react";
import Image from "next/image";
import { useId, useRef, useState } from "react";
import { cn } from "@/components/ui/cn";
import { Spinner } from "@/components/ui/Spinner";
import { compressImage, extensionFor, type CompressOptions } from "@/lib/image-compress";
import { createClient } from "@/lib/supabase/client";

type Bucket = "product-images" | "badge-images";

/**
 * Compress in the browser, then upload straight to Supabase Storage with the
 * admin's login (Storage policies allow admins only). Returns the public URL.
 */
export async function uploadImage(file: File, bucket: Bucket, folder: string, opts: CompressOptions): Promise<string> {
  const blob = await compressImage(file, opts);
  const path = `${folder}/${crypto.randomUUID()}.${extensionFor(blob)}`;
  const storage = createClient().storage.from(bucket);
  const { error } = await storage.upload(path, blob, { contentType: blob.type, cacheControl: "31536000", upsert: false });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return storage.getPublicUrl(path).data.publicUrl;
}

/** One image slot (front photo, back photo, badge image) with preview, replace and remove. */
export function ImageUpload({
  label,
  hint,
  value,
  onChange,
  bucket,
  folder,
  options,
  aspect = "aspect-[4/5]",
  required,
  error,
}: {
  label: string;
  hint?: string;
  value: string | null;
  onChange: (url: string | null) => void;
  bucket: Bucket;
  folder: string;
  options: CompressOptions;
  aspect?: string;
  required?: boolean;
  error?: string;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setUploadError(null);
    try {
      onChange(await uploadImage(file, bucket, folder, options));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  const message = uploadError ?? error;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
        {!required && <span className="font-normal text-muted"> (optional)</span>}
      </label>
      <div className={cn("relative w-full overflow-hidden rounded-lg border border-dashed border-line bg-surface", aspect, message && "border-brand")}>
        {value ? (
          <Image src={value} alt={label} fill sizes="200px" className="object-contain" unoptimized />
        ) : (
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-sm text-muted"
            disabled={busy}
          >
            <ImagePlus className="size-6" strokeWidth={1.8} />
            Add photo
          </button>
        )}
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <Spinner label="Uploading" />
          </div>
        )}
      </div>
      <input
        ref={input}
        id={id}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      {value && (
        <div className="mt-1 flex gap-3 text-sm">
          <button type="button" className="inline-flex min-h-11 items-center gap-1.5 font-medium" onClick={() => input.current?.click()} disabled={busy}>
            <RefreshCw className="size-4" />
            Replace
          </button>
          {!required && (
            <button type="button" className="inline-flex min-h-11 items-center gap-1.5 text-muted hover:text-brand" onClick={() => onChange(null)} disabled={busy}>
              <Trash2 className="size-4" />
              Remove
            </button>
          )}
        </div>
      )}
      {message ? (
        <p className="mt-1 text-sm text-brand">{message}</p>
      ) : hint ? (
        <p className="mt-1 text-sm text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
