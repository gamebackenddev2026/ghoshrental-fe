import Link from 'next/link'
import type { LegalBlock, LegalBlockStyle } from '@/lib/legal/types'
import styles from './legal.module.css'

export type { LegalBlock, LegalBlockStyle, LegalPageCms } from '@/lib/legal/types'

function pExtraClass(style?: LegalBlockStyle): string {
  if (style === 'bold') return 'size18 redhat-bold gray-color text-capitalize'
  if (style === 'margin') return styles.margin42
  if (style === 'medium') return 'redhat-medium'
  return ''
}

function h2ExtraClass(style?: LegalBlockStyle): string {
  if (style === 'tight') return styles.tightHeading
  return ''
}

function ulExtraClass(style?: LegalBlockStyle): string {
  if (style === 'paymentBorder') return styles.paymentPolicyBorder
  return ''
}

function renderBlock(block: LegalBlock, key: string | number) {
  if (block.type === 'h2') {
    return (
      <h2
        key={key}
        className={`${styles.h2} size55 performa-light gray-color ${
          block.className ?? h2ExtraClass(block.style)
        }`}
      >
        {block.text}
      </h2>
    )
  }

  if (block.type === 'p') {
    return (
      <p
        key={key}
        className={`${styles.p} size18 redhat-medium gray-color ${block.className ?? pExtraClass(block.style)}`}
      >
        {block.text}
      </p>
    )
  }

  if (block.type === 'html') {
    return (
      <div
        key={key}
        className={`${styles.richText} size18 redhat-medium gray-color ${block.className ?? pExtraClass(block.style)}`}
        dangerouslySetInnerHTML={{ __html: block.html }}
      />
    )
  }

  if (block.type === 'ul') {
    return (
      <ul
        key={key}
        className={`${styles.list} ${styles.liMarkerBold} size18 redhat-medium gray-color ${
          block.className ?? ulExtraClass(block.style)
        }`}
      >
        {block.items.map((item, itemIdx) => (
          <li key={itemIdx}>{item}</li>
        ))}
      </ul>
    )
  }

  if (block.type === 'ol') {
    return (
      <ol
        key={key}
        className={`${styles.olList} ${styles.liMarkerBold} size18 redhat-bold gray-color ${
          block.className ?? ''
        }`}
      >
        {block.items.map((item, itemIdx) => {
          if (typeof item === 'string') {
            return (
              <li key={itemIdx} className="size18 redhat-medium gray-color">
                {item}
              </li>
            )
          }

          return (
            <li key={itemIdx} className="size18 redhat-bold gray-color">
              <span>{item.title}</span>
              {item.body ? (
                <p className="size18 redhat-medium gray-color">{item.body}</p>
              ) : null}
              {item.bullets?.length ? (
                <ul
                  className={`${styles.nestedList} ${styles.liMarkerBold} size18 redhat-medium gray-color`}
                >
                  {item.bullets.map((bullet, bulletIdx) => (
                    <li key={bulletIdx}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </li>
          )
        })}
      </ol>
    )
  }

  if (block.type === 'contact') {
    return (
      <ul
        key={key}
        className={`${styles.contactList} ${styles.liMarkerBold} size18 redhat-medium gray-color`}
      >
        <li className="size18 redhat-bold gray-color">
          Email:{' '}
          <a
            className={`${styles.link} size18 redhat-medium gray-color`}
            href={`mailto:${block.email}`}
          >
            {block.email}
          </a>
        </li>
        <li className="size18 redhat-bold gray-color">
          Website:{' '}
          <Link
            className={`${styles.link} size18 redhat-medium gray-color`}
            href={block.websiteHref ?? '/'}
          >
            {block.websiteLabel}
          </Link>
        </li>
      </ul>
    )
  }

  return null
}

type Section = { blocks: LegalBlock[] }

function groupIntoSections(blocks: LegalBlock[]): { intro: LegalBlock[]; sections: Section[] } {
  const intro: LegalBlock[] = []
  const sections: Section[] = []
  let current: Section | null = null

  for (const block of blocks) {
    if (block.type === 'h2') {
      if (current) sections.push(current)
      current = { blocks: [block] }
    } else if (current) {
      current.blocks.push(block)
    } else {
      intro.push(block)
    }
  }
  if (current) sections.push(current)

  return { intro, sections }
}

export function LegalPage(props: { title: React.ReactNode; blocks: LegalBlock[] }) {
  const { title, blocks } = props
  const { intro, sections } = groupIntoSections(blocks)

  return (
    <section className={styles.sectionPadding}>
      <div className={styles.containerFluid}>
        <div data-aos="fade-up" className={styles.revealBlock}>
          <h1
            className={`${styles.h1} size90 performa-light ${styles.headingWidth} gray-color`}
          >
            {title}
          </h1>

          {intro.length > 0 ? (
            <div className={styles.intro}>
              {intro.map((block, idx) => renderBlock(block, `intro-${idx}`))}
            </div>
          ) : null}
        </div>

        {sections.map((section, sectionIdx) => (
          <div
            key={`section-${sectionIdx}`}
            data-aos="fade-up"
            className={styles.sectionBlock}
          >
            {sectionIdx > 0 ? (
              <hr className={styles.sectionDivider} aria-hidden />
            ) : null}
            {section.blocks.map((block, blockIdx) =>
              renderBlock(block, `section-${sectionIdx}-block-${blockIdx}`),
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
