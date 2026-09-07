import { ItemPhoto } from "@/components/ItemPhoto";
import { getCoverImage, isGradedCard, type ItemRow } from "@/lib/types";
import { itemTitle } from "@/lib/calc";
import { cn } from "@/lib/utils";

/**
 * Anteprima riutilizzabile di un oggetto della collezione.
 * Le carte realmente gradate (slab) ricevono la cornice oro; le semplici
 * candidate al grading restano neutre.
 */
export function ItemThumb({
  item,
  className,
  alt,
}: {
  item: ItemRow;
  className?: string;
  alt?: string;
}) {
  const graded = item.item_type === "CARD" && isGradedCard(item);
  return (
    <ItemPhoto
      image={getCoverImage(item)}
      alt={alt ?? itemTitle(item)}
      className={cn(className, graded && "thumb-graded")}
    />
  );
}
