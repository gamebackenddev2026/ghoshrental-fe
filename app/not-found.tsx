import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Page Not Found',
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return (
    <section style={{ textAlign: 'center', padding: '80px 20px' }}>
      <h1 style={{ fontSize: '3rem', fontWeight: 700, marginBottom: 12 }}>404</h1>
      <p style={{ fontSize: '1.1rem', color: '#666', marginBottom: 32 }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        href="/"
        style={{
          display: 'inline-block',
          padding: '12px 28px',
          background: '#000',
          color: '#fff',
          borderRadius: 8,
          textDecoration: 'none',
          fontWeight: 600,
        }}
      >
        Back to Home
      </Link>
    </section>
  )
}
