import { publicMediaUrl, toAssetUrl } from "@/lib/config";
import { brandImageDisplaySrc } from "@/lib/mediaUrl";
import { brands as fallbackBrands } from "./mockData";

/** Local hero/backdrop images for mid-page sections (same-origin, high priority). */
const LOCAL_PRELOADS = [
  "home/services/luxury-car-rental-services-dubai.webp",
  "home/about-us-ghost-rentals-dubai.webp",
] as const;

/** First marquee logos — warm cache before API data arrives. */
const BRAND_PRELOAD_COUNT = 10;

function brandPreloadHref(image: string): string | undefined {
  return brandImageDisplaySrc(image) ?? (image.trim() ? publicMediaUrl("brand", image) : undefined);
}

export function HomeContentPreload() {
  return (
    <>
      {LOCAL_PRELOADS.map((path) => (
        <link
          key={path}
          rel="preload"
          href={toAssetUrl(path)}
          as="image"
          type="image/webp"
        />
      ))}
      {fallbackBrands.slice(0, BRAND_PRELOAD_COUNT).map((brand) => {
        const href = brandPreloadHref(brand.image);
        if (!href) return null;
        return (
          <link
            key={brand.url_key}
            rel="preload"
            href={href}
            as="image"
          />
        );
      })}
    </>
  );
}
