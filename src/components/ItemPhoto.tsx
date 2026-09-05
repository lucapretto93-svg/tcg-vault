import { useEffect, useState } from "react";
import { ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { ImageRow } from "@/lib/types";
import { cn } from "@/lib/utils";

export function useResolvedImage(image?: ImageRow | null) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setUrl(null);

    if (!image) return () => { active = false; };

    if (image.storage_path) {
      supabase.storage
        .from("item-images")
        .createSignedUrl(image.storage_path, 3600)
        .then(({ data }) => {
          if (active) setUrl(data?.signedUrl ?? image.url ?? null);
        })
        .catch(() => {
          if (active) setUrl(image.url ?? null);
        });
    } else {
      setUrl(image.url ?? null);
    }

    return () => {
      active = false;
    };
  }, [image]);

  return url;
}

export function ItemPhoto({
  image,
  alt,
  className,
}: {
  image?: ImageRow | null;
  alt: string;
  className?: string;
}) {
  const resolvedUrl = useResolvedImage(image);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const url = resolvedUrl && resolvedUrl !== failedUrl ? resolvedUrl : null;

  if (!url) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 text-muted-foreground",
          className,
        )}
        aria-label={`${alt}: immagine non disponibile`}
      >
        <ImageIcon className="h-5 w-5" aria-hidden="true" />
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailedUrl(url)}
      className={cn("rounded-lg border border-border object-cover", className)}
    />
  );
}
