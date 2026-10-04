export default function Head() {
  return (
    <>
      {/* Match Angular dist head styles */}
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.rtl.min.css" rel="stylesheet" />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500&family=Inter:wght@300;400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <link rel="stylesheet" href="/styles.css" />
    </>
  )
}

