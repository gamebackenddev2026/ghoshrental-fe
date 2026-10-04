import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { Suspense } from 'react'
import './globals.css'
import { JsonLd } from '@/components/seo/JsonLd'
import { IntroVideoProvider } from '@/components/intro/IntroVideoProvider'
import { Header } from '@/components/layout/Header'
import { GlobalNavigationLoader } from '@/components/layout/GlobalNavigationLoader'
import { ScrollToTop } from '@/components/layout/ScrollToTop'
import { Footer } from '@/components/home/HomeSections'
import { AosProvider } from '@/components/shared/AosProvider'
import { localBusinessJsonLd, organizationJsonLd, webSiteJsonLd } from '@/lib/seo/jsonLd'
import { DEFAULT_SITE_DESCRIPTION, SITE_NAME, defaultOgImageUrl, getSiteOrigin } from '@/lib/seo/site'
import { WishlistToast } from '@/components/shared/WishlistToast'
import { GoogleTranslateRoot } from '@/components/i18n/GoogleTranslateRoot'
import { WishlistProvider } from '@/lib/wishlist-context'
import { googleTranslateDir, googleTranslateLangCode, parseGoogleTranslateLang } from '@/lib/i18n/googleTranslate'

export const metadata: Metadata = {
  metadataBase: new URL(getSiteOrigin()),
  title: {
    default: `${SITE_NAME} Dubai — Luxury Car & Yacht Rental`,
    template: `%s | ${SITE_NAME}`
  },
  description: DEFAULT_SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: ['luxury car rental Dubai', 'yacht rental Dubai', 'chauffeur service Dubai', 'Ghost Rentals', 'exotic car hire UAE'],
  manifest: '/assets/images/favicon/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'en_AE',
    url: '/',
    siteName: SITE_NAME,
    title: `${SITE_NAME} Dubai — Luxury Car & Yacht Rental`,
    description: DEFAULT_SITE_DESCRIPTION,
    images: [{ url: defaultOgImageUrl(), alt: SITE_NAME }]
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} Dubai`,
    description: DEFAULT_SITE_DESCRIPTION,
    images: [defaultOgImageUrl()]
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1
    }
  },
  icons: {
    icon: [{ url: '/favicon.ico', type: 'image/x-icon' }]
  }
}

/**
 * Root layout — mirrors Angular's app.component.html structure:
 *   <app-header></app-header>
 *   <main><router-outlet></router-outlet></main>
 *   <app-footer></app-footer>
 *
 * Every route inherits the fixed navbar and the global footer automatically,
 * exactly like the Angular dist build. Per-page content (home, product/search,
 * etc.) slots into {children}.
 */
export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  const cookieStore = await cookies()
  const googtrans = cookieStore.get('googtrans')?.value
  const activeLang = parseGoogleTranslateLang(googtrans)
  const initialLangCode = googleTranslateLangCode(activeLang)

  return (
    <html lang={activeLang} dir={googleTranslateDir(activeLang)} suppressHydrationWarning>
      <body>
        <JsonLd data={[organizationJsonLd(), webSiteJsonLd(), localBusinessJsonLd()]} />
        <GoogleTranslateRoot />
        <WishlistProvider>
          <IntroVideoProvider>
            <AosProvider>
              <Suspense fallback={null}>
                <GlobalNavigationLoader />
                <ScrollToTop />
              </Suspense>
              <Header initialLangCode={initialLangCode} />
              <main>{children}</main>
              <Suspense fallback={null}>
                <Footer />
              </Suspense>
              <WishlistToast />
            </AosProvider>
          </IntroVideoProvider>
        </WishlistProvider>
      </body>
    </html>
  )
}
