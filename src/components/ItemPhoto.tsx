import { useEffect, useState } from "react";
import { ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { ImageRow } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Risolve l'URL di un'immagine: prova la signed URL dello storage privato,
 * con fallback additivo sull'url salvato nella riga.
 */
export function useResolvedImage(image?: ImageRow | null) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setUrl(null);
    if (!image) return;

    const fallback = image.url && /^https?:\/\//.test(image.url) ? image.url : null;
    const path = image.storage_path ?? (image.url && !fallback ? image.url : null);

    if (path) {
      supabase.storage
        .from("item-images")
        .createSignedUrl(path, 3600)
        .then(({ data, error }) => {
          if (!active) return;
          setUrl(!error && data?.signedUrl ? data.signedUrl : fallback);
        })
        .catch(() => {
          if (active) setUrl(fallback);
        });
    } else {
      setUrl(fallback);
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
  const url = useResolvedImage(image);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [url]);

  if (!url || broken) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 text-muted-foreground",
          className,
        )}
        aria-label={alt}
        role="img"
      >
        <ImageIcon className="h-5 w-5" />
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setBroken(true)}
      className={cn("rounded-lg border border-border object-cover", className)}
    />
  );
}
