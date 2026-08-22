import { useEffect, useState } from "react";
import { ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { ImageRow } from "@/lib/types";
import { cn } from "@/lib/utils";

export function useResolvedImage(image?: ImageRow | null) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!image) {
      setUrl(null);
      return;
    }
    if (image.storage_path) {
      supabase.storage
        .from("item-images")
        .createSignedUrl(image.storage_path, 3600)
        .then(({ data }) => {
          if (active) setUrl(data?.signedUrl ?? image.url ?? null);
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
  const url = useResolvedImage(image);
  if (!url) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 text-muted-foreground",
          className,
        )}
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
      className={cn("rounded-lg border border-border object-cover", className)}
    />
  );
}
