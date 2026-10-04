import { cookies } from 'next/headers'
import { AUTH_COOKIE_KEY } from './authSession'

/** Read customer JWT from cookie for server-side vehicle pricing requests. */
export async function getServerAuthToken(): Promise<string | undefined> {
  const cookieStore = await cookies()
  const token = cookieStore.get(AUTH_COOKIE_KEY)?.value?.trim()
  return token || undefined
}
