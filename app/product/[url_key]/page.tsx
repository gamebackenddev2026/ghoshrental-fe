import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ProductDetailPage } from "@/components/product/ProductDetailPage"
import { ProductDetailPreload } from "@/components/product/ProductDetailPreload"
import { JsonLd } from "@/components/seo/JsonLd"
import type { ProductDetailModel } from "@/lib/api/productAdapters"
import { vehicleProductPath } from "@/lib/api/adapters"
import { loadProductPageData } from "@/lib/api/productPage"
import { getServerAuthToken } from "@/lib/serverAuth"
import { breadcrumbJsonLd, vehicleProductJsonLd } from "@/lib/seo/jsonLd"
import { buildPageMetadata } from "@/lib/seo/metadata"
import { productSeoDescription, productSeoTitle } from "@/lib/seo/productMeta"

function primaryGallerySrc(product: ProductDetailModel | null) {
  if (!product) return null
  return product.gallery[0]?.src ?? product.media_data[0]?.src ?? null
}

export const dynamic = "force-dynamic"

type RouteProps = {
  params: Promise<{ url_key: string }>
}

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { url_key } = await params
  const authToken = await getServerAuthToken()
  const data = await loadProductPageData(url_key, "rent", authToken)
  if (!data.product) {
    return buildPageMetadata({
      title: "Product Not Found",
      description: "The requested product is not available.",
      path: `/product/${encodeURIComponent(url_key)}`,
      noIndex: true,
    })
  }

  const title = productSeoTitle(data.product, "rent")
  const description = productSeoDescription(data.product, "rent")

  return buildPageMetadata({
    title,
    description,
    path: vehicleProductPath(data.product.url_key, "rent"),
    keywords: data.product.meta_keywords || undefined,
    image: primaryGallerySrc(data.product) ?? undefined,
  })
}

export default async function ProductRentPage({ params }: RouteProps) {
  const { url_key } = await params
  const authToken = await getServerAuthToken()
  const data = await loadProductPageData(url_key, "rent", authToken)

  if (!data.product) notFound()

  return (
    <>
      {data.product ? (
        <JsonLd
          data={[
            vehicleProductJsonLd(data.product, "rent"),
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Search", path: "/product/search" },
              {
                name: data.product.name,
                path: vehicleProductPath(data.product.url_key, "rent"),
              },
            ]),
          ]}
        />
      ) : null}
      <ProductDetailPreload imageSrc={primaryGallerySrc(data.product)} />
      <ProductDetailPage
        mode="rent"
        product={data.product}
        related={data.related}
        reviews={data.reviews}
        location={data.location}
      />
    </>
  )
}
