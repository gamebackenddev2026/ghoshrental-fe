export type UploadedDocument = {
  type: string
  file_name: string
  original_name: string
}

/**
 * Upload a customer document for registration.
 * Uses a same-origin Next.js route so S3 PUT is not blocked by browser CORS.
 */
export async function uploadCustomerDocument(
  file: File,
  documentType: string,
): Promise<UploadedDocument> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('document_type', documentType)

  const response = await fetch('/upload/customer-document', {
    method: 'POST',
    body: formData,
  })

  const data = (await response.json().catch(() => ({}))) as UploadedDocument & { message?: string }

  if (!response.ok) {
    throw new Error(data.message || 'Document upload failed. Please try again.')
  }

  return {
    type: data.type ?? documentType,
    file_name: data.file_name,
    original_name: data.original_name ?? file.name,
  }
}
