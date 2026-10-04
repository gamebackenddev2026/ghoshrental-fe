import type { Metadata } from "next";
import { ServicesClient } from "@/components/services/ServicesClient";
import { ServicesContentPreload } from "@/components/services/ServicesContentPreload";
import { JsonLd } from "@/components/seo/JsonLd";
import { loadServicesPageData } from "@/lib/api/servicesPage";
import { breadcrumbJsonLd } from "@/lib/seo/jsonLd";
import { buildCmsPageMetadata } from "@/lib/seo/pageMeta";

export const dynamic = "force-dynamic";

const DEFAULT_TITLE =
  "Rent VIP number plate Cars, Yachts, Chauffeur Service Dubai | Ghost Rentals";
const DEFAULT_DESC =
  "Luxury car rental, yacht charter, and chauffeur services in Dubai. Self-drive, hourly to monthly rentals, 24/7 support — Ghost Rentals.";

export async function generateMetadata(): Promise<Metadata> {
  return buildCmsPageMetadata("services", {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESC,
    path: "/services",
  });
}

export default async function ServicesPage() {
  const { cms, initialHeroBanner } = await loadServicesPageData();

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Services", path: "/services" },
        ])}
      />
      <ServicesContentPreload />
      <ServicesClient initialCms={cms} initialHeroBanner={initialHeroBanner} />
    </>
  );
}
