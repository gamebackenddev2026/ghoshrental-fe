type JsonLdProps = {
  data: Record<string, unknown> | Array<Record<string, unknown> | null | undefined>
}

export function JsonLd({ data }: JsonLdProps) {
  const payload = (Array.isArray(data) ? data : [data]).filter(
    (entry): entry is Record<string, unknown> => Boolean(entry),
  )
  if (!payload.length) return null
  const json = payload.length === 1 ? payload[0] : payload

  return (
    <script
      type="application/ld+json"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  )
}
