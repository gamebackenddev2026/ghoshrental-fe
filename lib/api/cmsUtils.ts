import type { RawCmsItem, RawCmsSection } from './cms'

export function nonEmpty(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function isActiveSection(section: RawCmsSection): boolean {
  if (section.isDeleted === true || section.is_deleted === true) return false
  const status = section.status
  if (status === false || status === 0 || status === '0') return false
  if (typeof status === 'string' && status.toLowerCase() === 'inactive') return false
  if (typeof status === 'string' && status.toLowerCase() === 'disabled') return false
  return true
}

export function sectionKey(section: RawCmsSection): string {
  return String(section.section_key ?? section.sectionKey ?? '')
    .trim()
    .toLowerCase()
}

export function sectionHeading(section: RawCmsSection): string {
  return String(section.heading ?? section.type ?? '').trim()
}

function normalizeLooseToken(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_]+/g, '-')
}

function sectionMatchesLoose(section: RawCmsSection, keys: string[], headingHints: string[]): boolean {
  const key = sectionKey(section)
  const normalizedKeys = keys.map((k) => normalizeLooseToken(k))
  if (normalizedKeys.includes(key)) return true

  const heading = sectionHeading(section).toLowerCase()
  const type = nonEmpty(section.type).toLowerCase()

  return headingHints.some((hint) => {
    const needle = hint.toLowerCase()
    const loose = normalizeLooseToken(hint)
    return (
      heading.includes(needle) ||
      type.includes(needle) ||
      key.includes(loose) ||
      normalizeLooseToken(heading).includes(loose) ||
      normalizeLooseToken(type).includes(loose)
    )
  })
}

export function pickSectionLoose(
  sections: RawCmsSection[],
  keys: string[],
  headingHints: string[] = [],
): RawCmsSection | undefined {
  const byKey = pickSection(sections, keys)
  if (byKey) return byKey

  return sections.find((section) => sectionMatchesLoose(section, keys, headingHints))
}

/** Page section wins; otherwise use shared `global` CMS (vip / features / faq). */
export function pickSharedSectionLoose(
  pageSections: RawCmsSection[],
  sharedSections: RawCmsSection[],
  keys: string[],
  headingHints: string[] = [],
): RawCmsSection | undefined {
  return (
    pickSectionLoose(pageSections, keys, headingHints) ??
    pickSectionLoose(sharedSections, keys, headingHints)
  )
}

export function sortedItems(items: RawCmsItem[] | undefined): RawCmsItem[] {
  if (!Array.isArray(items)) return []
  return [...items].sort(
    (a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0),
  )
}

export function pickSection(
  sections: RawCmsSection[],
  keys: string[],
  headingMatch?: string,
): RawCmsSection | undefined {
  const normalizedKeys = keys.map((k) => k.toLowerCase())
  const byKey = sections.find((s) => normalizedKeys.includes(sectionKey(s)))
  if (byKey) return byKey
  if (!headingMatch) return undefined
  const needle = headingMatch.toLowerCase()
  return sections.find((s) => sectionHeading(s).toLowerCase() === needle)
}

/** Page section wins; otherwise use shared `global` CMS (vip / features / faq). */
export function pickSharedSection(
  pageSections: RawCmsSection[],
  sharedSections: RawCmsSection[],
  keys: string[],
  headingMatch?: string,
): RawCmsSection | undefined {
  return (
    pickSection(pageSections, keys, headingMatch) ??
    pickSection(sharedSections, keys, headingMatch)
  )
}

export function paragraphsFromSection(section: RawCmsSection): string[] {
  const items = sortedItems(section.items)
  const fromItems = items.map((item) => nonEmpty(item.description)).filter(Boolean)
  if (fromItems.length) return fromItems

  const description = nonEmpty(section.description)
  if (!description) return []
  return description
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
}

/** Build a lookup map keyed by `section_key` (lowercase). */
export function cmsBySection(sections: RawCmsSection[]): Record<string, RawCmsSection> {
  return Object.fromEntries(
    sections.filter(isActiveSection).map((section) => [sectionKey(section), section]),
  )
}

export function activeSections(sections: RawCmsSection[] | null | undefined): RawCmsSection[] {
  return (sections ?? []).filter(isActiveSection)
}

export function bulletLines(section: RawCmsSection | undefined): string[] {
  if (!section) return []
  return sortedItems(section.items)
    .map((item) => nonEmpty(item.heading) || nonEmpty(item.description))
    .filter(Boolean)
}
