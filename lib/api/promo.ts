import { pickActivePromo, type ActivePromo } from './adapters'
import { getPromotionalCodes } from './home'

/** Fetches the active storefront promo (date window + not already dismissed). */
export async function loadActivePromo(token?: string): Promise<ActivePromo | null> {
  const res = await getPromotionalCodes({}, token)
  if (res.code !== 200 || !Array.isArray(res.result)) return null
  return pickActivePromo(res.result)
}
