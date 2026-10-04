import { toAssetUrl } from "@/lib/config";

const SERVICE_SECTION_IMAGES = [
  "services/luxury-car-rental-services-in-dubai.webp",
  "services/yacht-rental-services-in-dubai.webp",
  "services/chauffeur-services-in-dubai-ghost-rentals.webp",
  "loader-video/luxury-car-and-yacht-services.webp",
  "services/car-rental-services-in-dubai-banner.webp",
] as const;

/** Warm cache for /services hero poster + section images (same-origin webp). */
export function ServicesContentPreload() {
  return (
    <>
      {SERVICE_SECTION_IMAGES.map((path) => (
        <link
          key={path}
          rel="preload"
          href={toAssetUrl(path)}
          as="image"
          type="image/webp"
        />
      ))}
    </>
  );
}
