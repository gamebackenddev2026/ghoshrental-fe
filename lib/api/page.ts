import { apiPost } from "./client";
import type { RawPage } from "./types";

/**
 * Port of src/app/providers/page/page.service.ts. Used for dynamic SEO
 * metadata on the home page (Angular calls this from HomeComponent).
 */
export const getPageWithName = (payload: { pageName: string }) =>
  apiPost<RawPage>("/api/home/getpagewithName", payload);

export const getFooterDetails = (payload: unknown = {}) =>
  apiPost<unknown>("/api/home/getFooterDetails", payload);

export const updateSearchItem = (payload: unknown) =>
  apiPost<unknown>("/api/dashboard/updateLastSearchTerm", payload);

export const updateMostViewedProducts = (payload: unknown) =>
  apiPost<unknown>("/api/dashboard/updateMostViewedProducts", payload);

export const updateBestSellerProducts = (payload: unknown) =>
  apiPost<unknown>("/api/dashboard/updateBestSellerProducts", payload);
