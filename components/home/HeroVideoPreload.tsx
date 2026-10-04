/** Preload home hero video from CMS banner API (`media_url`). */
export function HeroVideoPreload({ href }: { href: string }) {
  if (!href) return null;
  return (
    <link
      rel="preload"
      href={href}
      as="video"
      type="video/mp4"
      fetchPriority="high"
    />
  );
}
