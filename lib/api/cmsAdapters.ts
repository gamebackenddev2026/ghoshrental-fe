import { resolveCmsImage } from '@/lib/cms/cmsMedia'
import type { FaqItem } from '@/components/home/mockData'
import {
  isEffectivelyEmptyHtml,
  isHtmlContent,
  prepareCmsRichText,
  sanitizeCmsHtml,
  splitCmsHeadingLines,
  splitCmsHtmlParagraphs,
} from '@/lib/cms/htmlContent'
import { DEFAULT_PRIVACY_CMS, DEFAULT_TERMS_CMS } from '@/lib/legal/defaultLegalCms'
import type { LegalBlock, LegalPageCms } from '@/lib/legal/types'
import type { RawCmsItem, RawCmsSection } from './cms'
import { activeSections, nonEmpty, pickSection, pickSharedSectionLoose, sectionKey, sortedItems } from './cmsUtils'

const FAQ_SECTION_KEYS = ['faq', 'faqs', 'frequently-asked-questions', 'testimonials']
const FAQ_HEADING_HINTS = ['frequently asked', 'faq']

const VIP_SECTION_KEYS = ['vip', 'vip-number-plate', 'vip-number-plates', 'vip-number', 'drive-like-a-vip']
const VIP_HEADING_HINTS = ['vip', 'drive like a vip', 'number plate']

const FEATURES_SECTION_KEYS = [
  'features',
  'difference',
  'experience-difference',
  'experience',
  'experience-the-difference',
]
const FEATURES_HEADING_HINTS = ['experience the difference', 'experience']

function pickFaqSection(pageSections: RawCmsSection[], sharedSections: RawCmsSection[]): RawCmsSection | undefined {
  return pickSharedSectionLoose(pageSections, sharedSections, FAQ_SECTION_KEYS, FAQ_HEADING_HINTS)
}

function pickVipSection(pageSections: RawCmsSection[], sharedSections: RawCmsSection[]): RawCmsSection | undefined {
  return pickSharedSectionLoose(pageSections, sharedSections, VIP_SECTION_KEYS, VIP_HEADING_HINTS)
}

function pickFeaturesSection(pageSections: RawCmsSection[], sharedSections: RawCmsSection[]): RawCmsSection | undefined {
  return pickSharedSectionLoose(pageSections, sharedSections, FEATURES_SECTION_KEYS, FEATURES_HEADING_HINTS)
}

export { DEFAULT_PRIVACY_CMS, DEFAULT_TERMS_CMS }
export type { LegalPageCms }

export type AboutFeatureItem = {
  title: string
  description: string
  image: string
  alt: string
}

export type AboutSignatureService = {
  title: string
  description: string
  buttonText: string
}

export type AboutPageCms = {
  hero: { title: string; description: string }
  brands: { title: string }
  journey: { eyebrow: string; title: string; paragraphs: string[]; image: string }
  features: { title: string; items: AboutFeatureItem[] }
  signature: { title: string; intro: string; image: string; services: AboutSignatureService[] }
  vip: { title: string; subtitle: string; description: string; buttonText: string; image: string }
  faq: { title: string; subtitle: string; buttonText: string; items: FaqItem[] }
}

export type ServiceBlockCms = {
  eyebrow: string
  title: string
  subtitle: string
  body: string
  bullets: string[]
  buttonText: string
  image: string
}

export type ServicesPageCms = {
  hero: { title: string; subtitle: string }
  intro: { eyebrow: string; title: string; subtitle: string }
  car: ServiceBlockCms
  yacht: ServiceBlockCms
  chauffeur: ServiceBlockCms
  vip: { title: string; subtitle: string; description: string; buttonText: string; image: string }
  faq: { title: string; subtitle: string; buttonText: string; items: FaqItem[] }
}

export type ContactPageCms = {
  hero: { title: string; subtitle: string }
  details: {
    title: string
    subtitle: string
    address: string
    email: string
    phone: string
  }
}

export type HomeServiceCardCms = {
  href: string
  image: string
  alt: string
  title: string
  description: string
  buttonText: string
}

export type FaqCmsContent = {
  title: string
  subtitle: string
  buttonText: string
  items: FaqItem[]
}

export type BlogPageCms = {
  hero: { title: string; subtitle: string }
}

export type LeasePageCms = {
  hero: { title: string; subtitle: string }
}

export type HomePageCms = {
  services: {
    label: string
    title: string
    description: string
    buttonText: string
    heroImage: string
    cards: HomeServiceCardCms[]
  }
  about: {
    label: string
    title: string
    description: string
    buttonText: string
    image: string
  }
  features: { title: string; items: AboutFeatureItem[] }
  vip: { title: string; subtitle: string; description: string; buttonText: string; image: string }
  faq: { title: string; subtitle: string; buttonText: string; items: FaqItem[] }
}

const HOME_SERVICE_CARD_META: Array<{ href: string; image: string; alt: string }> = [
  {
    href: '/services#car-service',
    image: 'home/services/rent-luxury-cars-in-dubai-from-ghost-rentals.webp',
    alt: 'Luxury Car Rental Services'
  },
  {
    href: '/services#yacht-service',
    image: 'home/services/yacht-rentals-in-dubai-from-ghost-rentals.webp',
    alt: 'Luxury Yacht Rental Services'
  },
  {
    href: '/services#chauffeur-service',
    image: 'home/services/chauffeur-services-in-dubai-from-ghost-rentals.webp',
    alt: 'Luxury Chauffeur Services'
  }
]

const FEATURE_ICONS: Array<{ image: string; alt: string }> = [
  {
    image: 'images/icons/hire-luxury-cars-from-ghost-rentals-dubai.webp',
    alt: 'Luxury Cars'
  },
  {
    image: 'images/icons/trusted-car-rental-services-from-ghost-rentals.webp',
    alt: 'Top Rental Service Provider'
  },
  { image: 'images/icons/247-black.svg', alt: '24/7 Rental Services' },
  { image: 'images/icons/map-black.svg', alt: 'Car Rental Services Available Across UAE' }
]

const DEFAULT_SIGNATURE_SERVICES: AboutSignatureService[] = [
  {
    title: 'Luxury Car Rental Services',
    description:
      'Find the best Luxury Car Rentals in Dubai with Ghost Rentals. Choose Rolls-Royce, Lamborghini & Range Rover with free UAE delivery.',
    buttonText: 'Hire a Car'
  },
  {
    title: 'Luxury Yacht Rental Services',
    description:
      "Sail Dubai's iconic skyline on the best yacht rental in Dubai. Fully crewed with catering and personalized service experience.",
    buttonText: 'Hire a Yacht'
  },
  {
    title: 'Luxury Chauffeur Services',
    description:
      'At Ghost Rentals, we excel at Luxury Travel. Our top-notch Luxury Chauffeur Services in Dubai provide unparalleled elegance for every trip.',
    buttonText: 'Hire a Chauffeur'
  }
]

export const DEFAULT_ABOUT_CMS: AboutPageCms = {
  hero: {
    title: 'Best in Luxury Car and Yacht Rentals Dubai',
    description:
      "Ghost Rentals delivers luxury cars, yachts, and chauffeur services in Dubai and across the UAE. As the best car rental company in Dubai, we're committed to providing unforgettable experiences that combine sophistication, reliability, and personalized service."
  },
  brands: {
    title: 'Book Your Luxury Car from Top Car Rental Brands'
  },
  journey: {
    eyebrow: 'Our Journey',
    title: 'How We Began',
    paragraphs: [
      'A team of Luxury Enthusiasts and Hospitality experts founded Ghost Rentals with the aim to provide the highest quality service with the most luxury vehicles in the market to our customers.',
      'We started as a Boutique Car Rental and soon grew into a trusted provider of Luxury Yacht Charters and Chauffeured experiences. Our team has ensured that Ghost Rentals becomes synonymous with reliability, discretion and obsession for customer satisfaction. As the best car rental service in Dubai and among the top yacht rental providers in the region, we create memorable experiences with a focus on luxury and personalization.'
    ],
    image: 'about/luxury-car-hire-in-dubai-ghost-rentals.webp'
  },
  features: {
    title: 'Experience The Difference',
    items: FEATURE_ICONS.map((icon, index) => ({
      ...icon,
      title: [
        'Luxury Cars for Rent in Dubai',
        'Top Rated Car Rental Service in Dubai',
        '24/7 Cars Available for Rent in Dubai',
        'Luxury Car Rental Services Available Throughout the UAE'
      ][index],
      description: [
        'Luxury Cars and Yacht rentals suitable for family use.',
        'Building lasting relationships through exceptional service.',
        'Instant booking with 24/7 service assistance.',
        'Enjoy seamless doorstep delivery across the UAE.'
      ][index]
    }))
  },
  signature: {
    title: 'Our Signature Services',
    intro:
      'Welcome to Ghost Rentals, where every journey becomes a statement! We offer tailored Luxury Services for Supercar Rentals, Yachts, & Chauffeur Services in UAE.',
    image: 'about/about-our-rental-services-dubai.webp',
    services: DEFAULT_SIGNATURE_SERVICES
  },
  vip: {
    title: 'Drive Like a VIP',
    subtitle: 'Rent Cars with VIP Number Plates',
    description:
      'Rent Cars with VIP number plates in Dubai, unique Luxury symbols that turn any drive into a statement. These highly demanded plates are more than just numbers they are status symbols and conversation starters that demand respect and attention anywhere you go.',
    buttonText: 'Rent a VIP Car',
    image: 'vip/rent-luxury-cars-from-ghost-rentals-dubai.webp'
  },
  faq: {
    title: 'Frequently Asked Questions',
    subtitle: "Got questions? We've got answers to help you navigate your rental experience!",
    buttonText: 'Help Center',
    items: []
  }
}

export const DEFAULT_SERVICES_CMS: ServicesPageCms = {
  hero: {
    title: 'Car Rentals, Yacht Rentals, and Chauffeur Services',
    subtitle: 'Rent VIP number plate Cars, Yachts and Chauffeur services that are crafted for your Sophistication'
  },
  intro: {
    eyebrow: 'Experience Dubai in Style',
    title: 'Cruise in a luxury car or set sail on a private yacht — we handle every detail.',
    subtitle: 'Our team takes care of everything, so you simply relax and enjoy the city — from chauffeur rides to luxury drives.'
  },
  car: {
    eyebrow: 'Rent Your Dream Car',
    title: 'Luxury Car Rental Services in Dubai',
    subtitle: 'Travel in style—drive our extraordinary collection of Luxury and Exotic vehicles today!',
    body: 'Command Rolls-Royce Luxury, unleash Lamborghini power, or cruise in Range Rover elegance. Our handpicked fleet transforms moments into memories. Day rentals to long-term solutions—every pristine vehicle arrives at your door because your time & impression matter.',
    bullets: [
      'Convenient: Self-Drive and Chauffeur Service',
      'Fast Car Rentals: Short and Long-Term Options',
      'Flexibility: Hourly, Daily, Weekly and Monthly',
      '24/7 Support and Instant Online Booking'
    ],
    buttonText: 'Rent a Car',
    image: 'services/luxury-car-rental-services-in-dubai.webp'
  },
  yacht: {
    eyebrow: 'Cruise Dubai in Luxury!',
    title: 'Yacht Rental Services in Dubai',
    subtitle: 'Luxury yacht rental services with Ghost Rentals. Fine dining, views, and crew. Book your escape today!',
    body: "Aboard our Luxury Yacht Rental in Dubai and experience floating palaces with expert crew, gourmet catering, and iconic routes past Marina's skyline and Atlantis. Every wave carries you to unforgettable celebrations.",
    bullets: [
      'Bespoke Luxury Charters for your exclusive sanctuary',
      'Custom Yacht Charters with VIP hospitality',
      'Easy booking with transparent pricing',
      'Yacht parties & intimate Dubai tours'
    ],
    buttonText: 'Rent a Yacht',
    image: 'services/yacht-rental-services-in-dubai.webp'
  },
  chauffeur: {
    eyebrow: 'Rent a Car with Driver',
    title: 'Chauffeur Services in Dubai',
    subtitle: 'Ride in style and elegance with our luxury chauffeur services, perfect for every occasion in Dubai.',
    body: 'Glide through Dubai in absolute sophistication with our Chauffeur Services. We merge professional excellence with Luxury, ensuring every journey is stylish and punctual. Perfect for VIPs, Weddings, and Airports.',
    bullets: [
      'Cars at our Chauffeur Services: Rolls-Royce, S-Class, BMW 7 Series',
      'Real-time GPS Tracking & 24/7 Dispatch Support',
      'Hourly & Event-Based Packages',
      'Multilingual Drivers Available',
      'Trained, Uniformed Drivers'
    ],
    buttonText: 'Hire a Chauffeur',
    image: 'services/chauffeur-services-in-dubai-ghost-rentals.webp'
  },
  vip: DEFAULT_ABOUT_CMS.vip,
  faq: DEFAULT_ABOUT_CMS.faq
}

export const DEFAULT_CONTACT_CMS: ContactPageCms = {
  hero: {
    title: 'Get In Touch With Us',
    subtitle: 'Book Your Luxurious journey with us'
  },
  details: {
    title: 'Contact Details',
    subtitle: 'Book Your Journey With Us Today.',
    address: 'GHOST RENTALS - Showroom No.40, MK Ghanim Warehouses, Al Quoz 3rd - Dubai, U.A.E',
    email: 'info@GhostRentals.com',
    phone: '+971 800 44678'
  }
}

export const DEFAULT_BLOG_CMS: BlogPageCms = {
  hero: {
    title: 'Ghost Rentals Blog',
    subtitle:
      'Read luxury car rental guides, yacht charter tips, and Dubai travel insights from Ghost Rentals.'
  }
}

export const DEFAULT_LEASE_CMS: LeasePageCms = {
  hero: {
    title: 'Lease to Own Cars in Dubai',
    subtitle: 'Browse lease to own cars in Dubai with Ghost Rentals. Filter by brand, price, and availability.'
  }
}

export const DEFAULT_HOME_CMS: HomePageCms = {
  services: {
    label: 'Our Rental Services',
    title: 'That Redefines Luxury Travel',
    description:
      'We specialize in Luxury Car hire & Yacht rental across the UAE, creating complete Luxury experiences with personalized attention beyond simple rentals.',
    buttonText: 'View All',
    heroImage: 'home/services/luxury-car-rental-services-dubai.webp',
    cards: HOME_SERVICE_CARD_META.map((meta, index) => ({
      ...meta,
      title: ['Luxury Car Rental Services', 'Luxury Yacht Rental Services', 'Luxury Chauffeur Services'][index],
      description: [
        'Find the best Luxury Car Rentals in Dubai with Ghost Rentals. Choose Rolls-Royce, Lamborghini & Range Rover with free UAE delivery.',
        'Sail by Dubai\u2019s famous landmarks with our crewed and catered Luxury Yacht charter services for any occasion, with a Professional crew.',
        'At Ghost Rentals, we excel at Luxury travel. Our top-notch Luxury Chauffeur services in Dubai provide unparalleled elegance for every trip.'
      ][index],
      buttonText: 'know more'
    }))
  },
  about: {
    label: 'About Ghost Rentals',
    title: 'Pure Luxury.\nPure Perfection.',
    description:
      'At Ghost Rentals, we turn Luxury Car hire and Yacht Rentals into customized experiences that we design with family-level love. We provide the UAE\u2019s safest and fastest rental services through real attention to detail, creating stunning relationships with every customer.',
    buttonText: 'know more',
    image: 'home/about-us-ghost-rentals-dubai.webp'
  },
  features: DEFAULT_ABOUT_CMS.features,
  vip: DEFAULT_ABOUT_CMS.vip,
  faq: DEFAULT_ABOUT_CMS.faq
}

function mapFeatureItems(section: RawCmsSection): AboutFeatureItem[] {
  const items = sortedItems(section.items)
  if (!items.length) return DEFAULT_ABOUT_CMS.features.items

  // Always 4 cards — CMS overrides by index; missing slots keep defaults.
  return FEATURE_ICONS.map((icon, index) => {
    const item = items[index]
    const defaults = DEFAULT_ABOUT_CMS.features.items[index]

    if (!item) {
      return (
        defaults ?? {
          image: icon.image,
          alt: icon.alt,
          title: '',
          description: ''
        }
      )
    }

    const title = cmsInlineText(item.heading) || cmsInlineText(item.type) || defaults?.title || ''
    const descriptionText =
      cmsRichText(item.description) ||
      cmsRichText(item.sub_heading) ||
      defaults?.description ||
      ''

    return {
      image: resolveCmsImage(item, icon.image),
      alt: title || icon.alt,
      title,
      description: descriptionText
    }
  })
}

function mapSignatureServices(section: RawCmsSection): AboutSignatureService[] {
  const items = sortedItems(section.items)
  if (!items.length) return DEFAULT_ABOUT_CMS.signature.services

  return items.map((item, index) => ({
    title: nonEmpty(item.heading) || DEFAULT_ABOUT_CMS.signature.services[index]?.title || '',
    description:
      cmsRichText(item.description) ||
      cmsRichText(item.sub_heading) ||
      DEFAULT_ABOUT_CMS.signature.services[index]?.description ||
      '',
    buttonText: nonEmpty(item.button_text) || DEFAULT_ABOUT_CMS.signature.services[index]?.buttonText || ''
  }))
}

function mapHomeServiceCards(section: RawCmsSection | undefined): HomeServiceCardCms[] {
  const items = section ? sortedItems(section.items) : []

  return HOME_SERVICE_CARD_META.map((meta, index) => {
    const item = items[index]
    const defaults = DEFAULT_HOME_CMS.services.cards[index]
    const descriptionText = cmsRichText(item?.description) || cmsRichText(item?.sub_heading)

    return {
      ...meta,
      title: nonEmpty(item?.heading) || defaults?.title || '',
      description: descriptionText || defaults?.description || '',
      image: resolveCmsImage(item, meta.image),
      buttonText: cmsInlineText(item?.button_text) || defaults?.buttonText || 'know more'
    }
  })
}

function mapFaqAnswer(item: RawCmsItem, questionFromHeading: boolean): string {
  const description = cmsRichText(item.description)
  const subHeading = cmsRichText(item.sub_heading)

  if (description) return description
  if (subHeading && questionFromHeading) return subHeading
  return ''
}

function mapFaqItems(section: RawCmsSection): FaqItem[] {
  const items = sortedItems(section.items)
  return items
    .map((item) => {
      const question =
        cmsInlineText(item.heading) || cmsInlineText(item.type) || cmsInlineText(item.sub_heading)
      const questionFromHeading = Boolean(cmsInlineText(item.heading) || cmsInlineText(item.type))

      let answer = ''
      if (questionFromHeading) {
        answer = mapFaqAnswer(item, true)
      } else if (cmsInlineText(item.sub_heading)) {
        const altQuestion = cmsInlineText(item.sub_heading)
        const altAnswer = mapFaqAnswer(item, false)
        if (altQuestion && altAnswer) {
          return { question: altQuestion, answer: altAnswer }
        }
      }

      return { question, answer }
    })
    .filter((item) => item.question && item.answer)
}

function mapVipSection(section: RawCmsSection | undefined, fallback: ServicesPageCms['vip']) {
  if (!section) return fallback

  const heading = cmsInlineText(section.heading) || cmsInlineText(section.type)
  const typeText = cmsInlineText(section.type)
  const subtitle =
    cmsInlineText(section.sub_heading) ||
    (typeText && heading && typeText !== heading ? typeText : '') ||
    fallback.subtitle

  return {
    title: heading || fallback.title,
    subtitle,
    description: cmsRichText(section.description) || fallback.description,
    buttonText: cmsInlineText(section.button_text) || fallback.buttonText,
    image: resolveCmsImage(section, fallback.image),
  }
}

function mapFaqSection(section: RawCmsSection | undefined, fallback: ServicesPageCms['faq']) {
  if (!section) return fallback
  const items = mapFaqItems(section)
  return {
    title: cmsInlineText(section.heading) || fallback.title,
    subtitle: cmsRichText(section.sub_heading) || fallback.subtitle,
    buttonText: cmsInlineText(section.button_text) || fallback.buttonText,
    items
  }
}

function htmlToPlainText(html: string): string {
  return String(html)
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .trim()
}

function cmsRichText(value: unknown): string {
  const raw = nonEmpty(value)
  if (!raw) return ''
  return prepareCmsRichText(raw)
}

function cmsHeadingText(value: unknown): string {
  const raw = nonEmpty(value)
  if (!raw) return ''
  return splitCmsHeadingLines(raw).join('\n')
}

function cmsInlineText(value: unknown): string {
  const raw = nonEmpty(value)
  if (!raw) return ''
  if (!isHtmlContent(raw)) return raw
  if (isEffectivelyEmptyHtml(raw)) return ''
  return htmlToPlainText(raw)
}

function cmsParagraphsFromSection(section: RawCmsSection): string[] {
  const items = sortedItems(section.items)
  const fromItems = items
    .map((item) => cmsRichText(item.description) || cmsRichText(item.sub_heading))
    .filter((paragraph) => paragraph && !isEffectivelyEmptyHtml(paragraph))
  if (fromItems.length) return fromItems

  const description = cmsRichText(section.description)
  if (!description) return []

  if (isHtmlContent(description)) {
    const htmlParagraphs = splitCmsHtmlParagraphs(description)
    if (htmlParagraphs.length) return htmlParagraphs
  }

  const parts = description
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
  return parts.length ? parts : [description]
}

/** Maps page + shared (`global`) CMS into just the FAQ content. */
export function toFaqCmsContent(
  pageSections: RawCmsSection[] | null | undefined,
  sharedSections: RawCmsSection[] | null | undefined = [],
): FaqCmsContent {
  const page = activeSections(pageSections)
  const shared = activeSections(sharedSections)

  const faqSection = pickFaqSection(page, shared)

  const fallback = DEFAULT_HOME_CMS.faq
  return {
    title: cmsInlineText(faqSection?.heading) || fallback.title,
    subtitle: cmsInlineText(faqSection?.sub_heading) || fallback.subtitle,
    buttonText: cmsInlineText(faqSection?.button_text) || fallback.buttonText,
    items: faqSection ? mapFaqItems(faqSection) : [],
  }
}

function normalizeLegalText(value: string): string {
  return value.replace(/\\n/g, '\n').replace(/\r\n/g, '\n').trim()
}

function pushLegalContent(blocks: LegalBlock[], raw: string): void {
  const text = normalizeLegalText(raw)
  if (!text) return
  if (isHtmlContent(text)) {
    if (!isEffectivelyEmptyHtml(text)) {
      blocks.push({ type: 'html', html: sanitizeCmsHtml(text) })
    }
    return
  }

  const parts = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)

  for (const part of parts.length ? parts : [text]) {
    blocks.push({ type: 'p', text: part })
  }
}

function parsePipeList(value: string): string[] {
  return value
    .split('|')
    .map((p) => p.trim())
    .filter(Boolean)
}

function parseBullets(value: string): { bullets: string[]; html?: string } {
  const normalized = normalizeLegalText(value)
  if (!normalized) return { bullets: [] }
  if (isHtmlContent(normalized)) return { bullets: [], html: normalized }
  return { bullets: parsePipeList(normalized) }
}

function legalContentSection(sections: RawCmsSection[]): RawCmsSection | undefined {
  return (
    pickSection(sections, [
      'privacy-policy',
      'terms-and-conditions',
      'terms',
      'privacy',
      'content',
      'body',
      'page-content',
      'blocks',
      'sections',
    ]) ?? sections.find((s) => sortedItems(s.items).length > 0)
  )
}

/** Maps legal pages (`privacy-policy`, `terms-and-conditions`) into LegalPage view model. */
export function toLegalPageCms(
  sections: RawCmsSection[] | null | undefined,
  fallback: LegalPageCms,
): LegalPageCms {
  const active = activeSections(sections)
  if (!active.length) return fallback

  const heroSection = pickSection(active, ['hero', 'page-title', 'title'])
  const contentSections = active
    .filter((s) => {
      const key = sectionKey(s)
      return key !== 'hero' && key !== 'page-title' && key !== 'title'
    })
    .sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0))

  const heroHasItems = Boolean(heroSection && sortedItems(heroSection.items).length > 0)
  const main = legalContentSection(contentSections) ?? (heroHasItems ? heroSection : undefined) ?? heroSection
  const title =
    cmsInlineText(heroSection?.heading) || cmsInlineText(main?.heading) || fallback.title
  const subtitle =
    cmsInlineText(heroSection?.sub_heading) ||
    cmsInlineText(main?.sub_heading) ||
    fallback.subtitle

  const blocks: LegalBlock[] = []

  const intro = nonEmpty(main?.description)
  if (intro) pushLegalContent(blocks, intro)

  const bodyHtml = nonEmpty(main?.sub_heading)
  if (bodyHtml && isHtmlContent(bodyHtml)) {
    pushLegalContent(blocks, bodyHtml)
  }

  const items = sortedItems(main?.items)
  for (const item of items) {
    const h2 = cmsInlineText(item.heading)
    const body = nonEmpty(item.sub_heading)
    const desc = nonEmpty(item.description)
    const closing = nonEmpty(item.button_text)

    if (!h2 && !body && !desc && !closing) continue
    if (h2) blocks.push({ type: 'h2', text: h2 })
    if (body) pushLegalContent(blocks, body)

    if (desc) {
      const { bullets, html } = parseBullets(desc)
      if (html) pushLegalContent(blocks, html)
      else if (bullets.length) blocks.push({ type: 'ul', items: bullets })
    }

    if (closing) pushLegalContent(blocks, closing)
  }

  return {
    title,
    subtitle: subtitle || undefined,
    blocks: blocks.length ? blocks : fallback.blocks,
  }
}

function serviceBlockSubtitle(section: RawCmsSection, fallback: string): string {
  const heading = nonEmpty(section.heading)
  const typeText = nonEmpty(section.type)

  // H3 line — use `type` when it is not the same as the main heading.
  if (typeText && typeText.toLowerCase() !== heading.toLowerCase()) {
    return typeText
  }

  return fallback
}

function serviceBlockBullets(section: RawCmsSection, bulletItems: RawCmsSection['items']): string[] {
  return sortedItems(bulletItems)
    .map((item) => nonEmpty(item.heading) || nonEmpty(item.description) || nonEmpty(item.sub_heading))
    .filter(Boolean)
    .map((line) => line.replace(/^-\s*/, ''))
}

/**
 * Services car / yacht / chauffeur blocks — fixed top-to-bottom CMS order:
 * 1. sub_heading → eyebrow
 * 2. heading → H2 title
 * 3. type → H3 subtitle (must differ from heading), OR items[0] as subtitle-only row
 * 4. description → body paragraph
 * 5. items[] → bullet list (all rows, or rows 2+ when row 1 is the H3)
 * 6. button_text → CTA
 */
function mapServiceBlock(section: RawCmsSection | undefined, fallback: ServiceBlockCms): ServiceBlockCms {
  if (!section) return fallback

  const items = sortedItems(section.items)
  const heading = nonEmpty(section.heading)
  const typeText = nonEmpty(section.type)
  const typeIsSubtitle = Boolean(typeText && typeText.toLowerCase() !== heading.toLowerCase())

  let subtitle = serviceBlockSubtitle(section, fallback.subtitle)
  let bulletItems = items

  // When `type` is not used for H3, first item row is the subtitle; bullets start at row 2.
  if (!typeIsSubtitle && items[0]) {
    const first = items[0]
    const firstAsSubtitle = nonEmpty(first.heading) || nonEmpty(first.sub_heading)
    if (firstAsSubtitle) {
      subtitle = nonEmpty(first.heading) || nonEmpty(first.sub_heading) || subtitle
      bulletItems = items.slice(1)
    }
  }

  const bullets = serviceBlockBullets(section, bulletItems)

  return {
    eyebrow: cmsInlineText(section.sub_heading) || fallback.eyebrow,
    title: cmsInlineText(heading) || fallback.title,
    subtitle: cmsInlineText(subtitle) || fallback.subtitle,
    body: cmsRichText(section.description) || fallback.body,
    bullets: bullets.length ? bullets.map((line) => cmsRichText(line) || line) : fallback.bullets,
    buttonText: cmsInlineText(section.button_text) || fallback.buttonText,
    image: resolveCmsImage(section, fallback.image),
  }
}

function contactDetailValue(section: RawCmsSection | undefined, label: string, fallback: string): string {
  if (!section) return fallback
  const needle = label.toLowerCase()
  const item = sortedItems(section.items).find((row) => nonEmpty(row.heading).toLowerCase() === needle)
  return cmsRichText(item?.description) || fallback
}

/** Maps page + optional shared (`global`) CMS into the About page view model. */
export function toAboutPageCms(
  sections: RawCmsSection[] | null | undefined,
  sharedSections: RawCmsSection[] | null | undefined = []
): AboutPageCms {
  const active = activeSections(sections)
  const shared = activeSections(sharedSections)
  if (!active.length && !shared.length) return DEFAULT_ABOUT_CMS

  const heroSection = pickSection(active, ['hero'])
  const brandsSection = pickSection(active, ['brands', 'top-brands'])
  const journeySection = pickSection(active, ['journey', 'our-journey', 'story'])
  const featuresSection = pickFeaturesSection(active, shared)
  const signatureSection = pickSection(active, ['signature', 'signature-services', 'services'], 'Our Signature Services')
  const vipSection = pickVipSection(active, shared)
  const faqSection = pickFaqSection(active, shared)

  const journeyParagraphs = journeySection ? cmsParagraphsFromSection(journeySection) : []
  const faqItems = faqSection ? mapFaqItems(faqSection) : []

  return {
    hero: {
      title: cmsInlineText(heroSection?.heading) || DEFAULT_ABOUT_CMS.hero.title,
      description: cmsRichText(heroSection?.description) || DEFAULT_ABOUT_CMS.hero.description
    },
    brands: {
      title: nonEmpty(brandsSection?.heading) || DEFAULT_ABOUT_CMS.brands.title
    },
    journey: {
      eyebrow: nonEmpty(journeySection?.sub_heading) || DEFAULT_ABOUT_CMS.journey.eyebrow,
      title: nonEmpty(journeySection?.heading) || DEFAULT_ABOUT_CMS.journey.title,
      paragraphs: journeyParagraphs.length ? journeyParagraphs : DEFAULT_ABOUT_CMS.journey.paragraphs,
      image: resolveCmsImage(journeySection, DEFAULT_ABOUT_CMS.journey.image),
    },
    features: {
      title: cmsInlineText(featuresSection?.heading) || DEFAULT_ABOUT_CMS.features.title,
      items: featuresSection ? mapFeatureItems(featuresSection) : DEFAULT_ABOUT_CMS.features.items
    },
    signature: {
      title: cmsInlineText(signatureSection?.heading) || DEFAULT_ABOUT_CMS.signature.title,
      intro: cmsRichText(signatureSection?.description) || DEFAULT_ABOUT_CMS.signature.intro,
      image: resolveCmsImage(signatureSection, DEFAULT_ABOUT_CMS.signature.image),
      services: signatureSection ? mapSignatureServices(signatureSection) : DEFAULT_ABOUT_CMS.signature.services
    },
    vip: mapVipSection(vipSection, DEFAULT_ABOUT_CMS.vip),
    faq: {
      ...mapFaqSection(faqSection, DEFAULT_ABOUT_CMS.faq),
      items: faqItems
    }
  }
}

/** Maps `getCmsByPage({ page: "blog" })` into the Blog listing hero content. */
export function toBlogPageCms(sections: RawCmsSection[] | null | undefined): BlogPageCms {
  const active = activeSections(sections)
  if (!active.length) return DEFAULT_BLOG_CMS

  const heroSection = pickSection(active, ['hero', 'blog-hero', 'blog'])

  return {
    hero: {
      title: cmsInlineText(heroSection?.heading) || DEFAULT_BLOG_CMS.hero.title,
      subtitle:
        cmsRichText(heroSection?.description) ||
        cmsRichText(heroSection?.sub_heading) ||
        DEFAULT_BLOG_CMS.hero.subtitle
    }
  }
}

/** Maps `getCmsByPage({ page: "lease" })` into the Lease-to-Own page hero content. */
export function toLeasePageCms(sections: RawCmsSection[] | null | undefined): LeasePageCms {
  const active = activeSections(sections)
  if (!active.length) return DEFAULT_LEASE_CMS

  const heroSection = pickSection(active, ['hero', 'lease-hero', 'page-title', 'title'])

  return {
    hero: {
      title: cmsInlineText(heroSection?.heading) || DEFAULT_LEASE_CMS.hero.title,
      subtitle:
        cmsRichText(heroSection?.description) ||
        cmsRichText(heroSection?.sub_heading) ||
        DEFAULT_LEASE_CMS.hero.subtitle
    }
  }
}

/** Maps page + optional shared (`global`) CMS into the Services page view model. */
export function toServicesPageCms(
  sections: RawCmsSection[] | null | undefined,
  sharedSections: RawCmsSection[] | null | undefined = []
): ServicesPageCms {
  const active = activeSections(sections)
  const shared = activeSections(sharedSections)
  if (!active.length && !shared.length) return DEFAULT_SERVICES_CMS

  const heroSection = pickSection(active, ['hero'])
  const introSection = pickSection(active, ['intro', 'introduction'])
  const carSection = pickSection(active, ['car-service', 'car-rental', 'car', 'luxury-car'], 'Luxury Car Rental Services in Dubai')
  const yachtSection = pickSection(active, ['yacht-service', 'yacht-rental', 'yacht'], 'Yacht Rental Services in Dubai')
  const chauffeurSection = pickSection(active, ['chauffeur-service', 'chauffeur'], 'Chauffeur Services in Dubai')
  const vipSection = pickVipSection(active, shared)
  const faqSection = pickFaqSection(active, shared)

  return {
    hero: {
      title: cmsInlineText(heroSection?.heading) || DEFAULT_SERVICES_CMS.hero.title,
      subtitle:
        cmsRichText(heroSection?.sub_heading) ||
        cmsRichText(heroSection?.description) ||
        DEFAULT_SERVICES_CMS.hero.subtitle
    },
    intro: {
      eyebrow: cmsInlineText(introSection?.sub_heading) || DEFAULT_SERVICES_CMS.intro.eyebrow,
      title: cmsInlineText(introSection?.heading) || DEFAULT_SERVICES_CMS.intro.title,
      subtitle: cmsRichText(introSection?.description) || DEFAULT_SERVICES_CMS.intro.subtitle
    },
    car: mapServiceBlock(carSection, DEFAULT_SERVICES_CMS.car),
    yacht: mapServiceBlock(yachtSection, DEFAULT_SERVICES_CMS.yacht),
    chauffeur: mapServiceBlock(chauffeurSection, DEFAULT_SERVICES_CMS.chauffeur),
    vip: mapVipSection(vipSection, DEFAULT_SERVICES_CMS.vip),
    faq: mapFaqSection(faqSection, DEFAULT_SERVICES_CMS.faq)
  }
}

/** Maps `getCmsByPage({ page: "contact-us" })` into the Contact page view model. */
export function toContactPageCms(sections: RawCmsSection[] | null | undefined): ContactPageCms {
  const active = activeSections(sections)
  if (!active.length) return DEFAULT_CONTACT_CMS

  const heroSection = pickSection(active, ['hero'])
  const detailsSection = pickSection(active, ['contact-details', 'contact', 'details'], 'Contact Details')

  return {
    hero: {
      title: cmsInlineText(heroSection?.heading) || DEFAULT_CONTACT_CMS.hero.title,
      subtitle:
        cmsRichText(heroSection?.sub_heading) ||
        cmsRichText(heroSection?.description) ||
        DEFAULT_CONTACT_CMS.hero.subtitle
    },
    details: {
      title: cmsInlineText(detailsSection?.heading) || DEFAULT_CONTACT_CMS.details.title,
      subtitle: cmsRichText(detailsSection?.sub_heading) || DEFAULT_CONTACT_CMS.details.subtitle,
      address: contactDetailValue(detailsSection, 'Address', DEFAULT_CONTACT_CMS.details.address),
      email: contactDetailValue(detailsSection, 'Email', DEFAULT_CONTACT_CMS.details.email),
      phone: contactDetailValue(detailsSection, 'Phone', DEFAULT_CONTACT_CMS.details.phone)
    }
  }
}

/** Maps `home` page + shared (`global`) CMS into the Home page view model. */
export function toHomePageCms(
  sections: RawCmsSection[] | null | undefined,
  sharedSections: RawCmsSection[] | null | undefined = []
): HomePageCms {
  const active = activeSections(sections)
  const shared = activeSections(sharedSections)
  if (!active.length && !shared.length) return DEFAULT_HOME_CMS

  const servicesSection = pickSection(active, ['services', 'our-services', 'rental-services'])
  const aboutSection = pickSection(active, ['about', 'about-teaser', 'about-us-teaser'])
  const featuresSection = pickFeaturesSection(active, shared)
  const vipSection = pickVipSection(active, shared)
  const faqSection = pickFaqSection(active, shared)

  const faqItems = faqSection ? mapFaqItems(faqSection) : []

  return {
    services: {
      label: cmsInlineText(servicesSection?.sub_heading) || DEFAULT_HOME_CMS.services.label,
      title: cmsInlineText(servicesSection?.heading) || DEFAULT_HOME_CMS.services.title,
      description: cmsRichText(servicesSection?.description) || DEFAULT_HOME_CMS.services.description,
      buttonText: cmsInlineText(servicesSection?.button_text) || DEFAULT_HOME_CMS.services.buttonText,
      heroImage: resolveCmsImage(servicesSection, DEFAULT_HOME_CMS.services.heroImage),
      cards: mapHomeServiceCards(servicesSection)
    },
    about: {
      label: cmsInlineText(aboutSection?.sub_heading) || DEFAULT_HOME_CMS.about.label,
      title: cmsHeadingText(aboutSection?.heading) || DEFAULT_HOME_CMS.about.title,
      description: cmsRichText(aboutSection?.description) || DEFAULT_HOME_CMS.about.description,
      buttonText: cmsInlineText(aboutSection?.button_text) || DEFAULT_HOME_CMS.about.buttonText,
      image: resolveCmsImage(aboutSection, DEFAULT_HOME_CMS.about.image),
    },
    features: {
      title: cmsInlineText(featuresSection?.heading) || DEFAULT_HOME_CMS.features.title,
      items: featuresSection ? mapFeatureItems(featuresSection) : DEFAULT_HOME_CMS.features.items
    },
    vip: mapVipSection(vipSection, DEFAULT_HOME_CMS.vip),
    faq: {
      ...mapFaqSection(faqSection, DEFAULT_HOME_CMS.faq),
      items: faqItems
    }
  }
}
