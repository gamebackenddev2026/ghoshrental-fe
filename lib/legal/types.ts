export type LegalBlockStyle = 'bold' | 'margin' | 'medium' | 'tight' | 'paymentBorder'

export type LegalBlock =
  | { type: 'p'; text: string; className?: string; style?: LegalBlockStyle }
  | { type: 'html'; html: string; className?: string; style?: LegalBlockStyle }
  | { type: 'h2'; text: string; className?: string; style?: LegalBlockStyle }
  | { type: 'ul'; items: string[]; className?: string; style?: LegalBlockStyle }
  | {
      type: 'ol'
      items: Array<string | { title: string; body?: string; bullets?: string[] }>
      className?: string
      style?: LegalBlockStyle
    }
  | {
      type: 'contact'
      email: string
      websiteLabel: string
      websiteHref?: string
    }

export type LegalPageCms = {
  title: string
  subtitle?: string
  blocks: LegalBlock[]
}
