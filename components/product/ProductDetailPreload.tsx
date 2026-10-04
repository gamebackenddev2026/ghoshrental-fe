import { vehicleImageDisplaySrc } from "@/lib/mediaUrl";

/** Preload LCP gallery image for product detail routes. */
export function ProductDetailPreload({ imageSrc }: { imageSrc: string | null | undefined }) {
  const href = vehicleImageDisplaySrc(imageSrc ?? "");
  if (!href) return null;
  return (
    <link
      rel="preload"
      href={href}
      as="image"
      fetchPriority="high"
    />
  );
}
