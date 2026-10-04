/** Shared AOS attributes for consistent fade-up scroll reveals. */
export const AOS_FADE_UP = {
  'data-aos': 'fade-up',
  'data-aos-duration': '2200',
  'data-aos-easing': 'ease-out-cubic',
} as const

export const AOS_INIT_OPTIONS = {
  duration: 2200,
  easing: 'ease-out-cubic' as const,
  once: true,
  offset: 80,
  delay: 0,
  mirror: false,
  anchorPlacement: 'top-bottom' as const,
}

let aosInitialized = false

export function scheduleAosRefresh() {
  if (typeof window === 'undefined') return
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (!aosInitialized) return
      import('aos').then(({ default: AOS }) => {
        AOS.refresh()
      })
    })
  })
}

export function markAosInitialized() {
  aosInitialized = true
}
