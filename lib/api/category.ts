import { apiPost } from "./client";

/**
 * Port of src/app/providers/category/category.service.ts.
 */
export const getAllCategory = (payload: unknown = {}) =>
  apiPost<unknown[]>("/api/category/getAllCategory", payload);

export const getSubCategory = (payload: unknown = {}) =>
  apiPost<unknown[]>("/api/subcategory/getallsubcategory", payload);

export const getAllCollections = (payload: unknown = {}) =>
  apiPost<unknown[]>("/api/collection/getAllCollection", payload);

export const getAllCategoryCollections = (payload: unknown = {}) =>
  apiPost<unknown[]>(
    "/api/collectioncategory/getAllCollectionCategory",
    payload,
  );
