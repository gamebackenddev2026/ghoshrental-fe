/** True when CMS value looks like TipTap / HTML editor output. */
export function isHtmlContent(value: string): boolean {
  return /<[a-z][\s\S]*>/i.test(value.trim())
}

export function isEffectivelyEmptyHtml(html: string): boolean {
  const text = html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .trim()
  return !text
}

/** Lightweight sanitizer for trusted admin HTML (strips scripts and inline handlers). */
export function sanitizeCmsHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '')
}

const EMPTY_BLOCK_TAG =
  /<(p|div|h[1-6]|li|blockquote|span)(?:\s[^>]*)?>(?:\s|&nbsp;|<br\s*\/?>)*<\/\1>/gi

/** Remove empty CMS blocks (`<p></p>`, `<p>&nbsp;</p>`, etc.) and extra breaks. */
export function normalizeCmsHtml(html: string): string {
  let normalized = html.trim()

  let previous = ''
  while (previous !== normalized) {
    previous = normalized
    normalized = normalized.replace(EMPTY_BLOCK_TAG, '')
  }

  normalized = normalized.replace(/(<br\s*\/?>\s*){3,}/gi, '<br /><br />')
  normalized = normalized.replace(/>\s+</g, '><')

  return normalized.trim()
}

/** Split sanitized CMS HTML into non-empty paragraph blocks. */
export function splitCmsHtmlParagraphs(html: string): string[] {
  const normalized = normalizeCmsHtml(sanitizeCmsHtml(html))
  if (!normalized) return []

  if (!isHtmlContent(normalized)) {
    return normalized
      .split(/\n{2,}/)
      .map((part) => part.trim())
      .filter(Boolean)
  }

  const blocks =
    normalized.match(/<p(?:\s[^>]*)?>[\s\S]*?<\/p>/gi) ??
    normalized.match(/<div(?:\s[^>]*)?>[\s\S]*?<\/div>/gi) ??
    []

  const paragraphs = blocks.map((block) => block.trim()).filter((block) => !isEffectivelyEmptyHtml(block))

  return paragraphs.length ? paragraphs : isEffectivelyEmptyHtml(normalized) ? [] : [normalized]
}

/** Sanitized HTML for CMS rich-text fields, or plain text unchanged. */
export function prepareCmsRichText(value: string): string {
  const raw = value.trim()
  if (!raw) return ''
  if (isHtmlContent(raw) && !isEffectivelyEmptyHtml(raw)) {
    return normalizeCmsHtml(sanitizeCmsHtml(raw))
  }
  return raw
}

function stripTagsKeepBreaks(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .trim()
}

/** Split CMS headings into display lines (preserves `<br>`, newlines, and two-sentence titles). */
export function splitCmsHeadingLines(value: string): string[] {
  const raw = value.trim()
  if (!raw) return []

  let text = isHtmlContent(raw) ? stripTagsKeepBreaks(raw) : raw

  const byNewline = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (byNewline.length > 1) return byNewline

  text = byNewline[0] ?? text

  const twoSentences = text.match(/^(.+?\.)\s+(.+?\.)$/)
  if (twoSentences) {
    return [twoSentences[1].trim(), twoSentences[2].trim()]
  }

  return [text]
}
