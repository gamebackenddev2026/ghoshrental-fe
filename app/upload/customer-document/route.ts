import { NextRequest, NextResponse } from 'next/server'
import { getCustomerPresignedUploadUrl } from '@/lib/api/auth'

function extensionFromFile(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase()
  if (fromName) return fromName
  if (file.type === 'application/pdf') return 'pdf'
  if (file.type === 'application/msword') return 'doc'
  if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx'
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/jpeg') return 'jpg'
  if (file.type === 'image/webp') return 'webp'
  return 'bin'
}

/**
 * Browser uploads cannot PUT directly to S3 (bucket CORS). This route presigns
 * via the backend and uploads to S3 from the Next.js server instead.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const documentType = String(formData.get('document_type') ?? 'document').trim() || 'document'

    if (!(file instanceof File)) {
      return NextResponse.json({ message: 'File is required' }, { status: 400 })
    }

    const ext = extensionFromFile(file)
    const sFileName = `customer-${documentType}-${Date.now()}.${ext}`
    const sContentType = file.type || 'application/octet-stream'

    const presigned = await getCustomerPresignedUploadUrl({
      sFileName,
      sContentType,
      document_type: documentType
    })

    if (presigned.code < 200 || presigned.code >= 300) {
      return NextResponse.json({ message: presigned.message ?? 'Unable to prepare document upload.' }, { status: 400 })
    }

    const result = presigned.result
    const uploadUrl = result?.sUrl
    if (!uploadUrl) {
      return NextResponse.json({ message: 'Upload URL was not returned by the server.' }, { status: 500 })
    }

    const putRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': sContentType },
      body: Buffer.from(await file.arrayBuffer())
    })

    if (!putRes.ok) {
      const s3Error = await putRes.text().catch(() => '')
      console.error('S3 PUT failed:', putRes.status, s3Error)
      const isDev = process.env.APP_ENV === 'development'
      const detail = isDev && s3Error ? ` S3: ${s3Error.slice(0, 300)}` : ''
      return NextResponse.json(
        { message: `Document upload failed. Please try again.${detail}` },
        { status: 502 },
      )
    }

    const storedName = result.fileName ?? result.s3Key?.split('/').pop() ?? sFileName

    return NextResponse.json({
      type: documentType,
      file_name: storedName,
      original_name: file.name
    })
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Document upload failed.' }, { status: 500 })
  }
}
