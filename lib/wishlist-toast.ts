export const WISHLIST_LOGIN_MESSAGE = 'Please login to add this in wishlist.'

type WishlistToastListener = (message: string) => void

const listeners = new Set<WishlistToastListener>()

export function showWishlistToast(message: string) {
  listeners.forEach((listener) => listener(message))
}

export function subscribeWishlistToast(listener: WishlistToastListener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
