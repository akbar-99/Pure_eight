'use server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getServerContext } from '@/lib/context/server'
import { revalidatePath } from 'next/cache'
import type { Database } from '@/types/database.types'

type DocumentUpdate = Database['public']['Tables']['documents']['Update']

// ── Types ─────────────────────────────────────────────────────────────────────

export type DocumentFolder = {
  id: string
  tenant_id: string
  name: string
  parent_id: string | null
  allowed_roles: string[]
  created_at: string
  deleted_at: string | null
}

export type Document = {
  id: string
  tenant_id: string
  outlet_id: string | null
  folder_id: string | null
  uploaded_by: string
  name: string
  file_url: string | null
  file_size: number | null
  mime_type: string | null
  version: number
  expires_at: string | null
  tags: string[]
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type DocsPageData = {
  folders: DocumentFolder[]
  documents: Document[]
  expiringSoon: Document[]
  isHqUser: boolean
}

// ── Storage helpers ───────────────────────────────────────────────────────────

const BUCKET = 'documents'

/**
 * Generate a signed URL the browser can PUT a file to directly.
 * Call this before showing the upload progress bar.
 * Path pattern: {tenantId}/{uuid}/{originalFilename}
 */
export async function getSignedUploadUrl(
  fileName: string,
): Promise<{ signedUrl: string; storagePath: string; error?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { signedUrl: '', storagePath: '', error: 'Not authenticated' }

  const admin = createAdminClient()
  const storagePath = `${ctx.tenantId}/${crypto.randomUUID()}/${fileName}`

  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUploadUrl(storagePath)

  if (error) return { signedUrl: '', storagePath: '', error: error.message }
  return { signedUrl: data.signedUrl, storagePath }
}

/**
 * Generate a time-limited (1 hour) signed download URL.
 * Call this when the user clicks Download — do not store the URL in the DB.
 */
export async function getSignedDownloadUrl(
  storagePath: string,
): Promise<{ url: string; error?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { url: '', error: 'Not authenticated' }

  const admin = createAdminClient()
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 3600) // 1 hour

  if (error) return { url: '', error: error.message }
  return { url: data.signedUrl }
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getDocumentsPageData(): Promise<DocsPageData> {
  const ctx = await getServerContext()
  if (!ctx) throw new Error('Not authenticated')
  const { tenantId, isHqUser } = ctx

  const admin = createAdminClient()

  const thirtyDaysFromNow = new Date()
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
  const nowIso = new Date().toISOString()
  const thirtyIso = thirtyDaysFromNow.toISOString()

  const [foldersRes, docsRes] = await Promise.all([
    admin.from('document_folders')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('name', { ascending: true }),
    admin.from('documents')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
  ])

  const folders = (foldersRes.data ?? []) as DocumentFolder[]
  const documents = (docsRes.data ?? []) as Document[]

  const expiringSoon = documents.filter(d => {
    if (!d.expires_at) return false
    return d.expires_at >= nowIso && d.expires_at <= thirtyIso
  })

  return { folders, documents, expiringSoon, isHqUser }
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export async function createFolder(input: {
  name: string
  allowedRoles?: string[]
}): Promise<{ error?: string; id?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }
  if (!ctx.isHqUser) return { error: 'Only HQ users can create folders' }

  const admin = createAdminClient()
  const { data, error } = await admin.from('document_folders')
    .insert({
      tenant_id: ctx.tenantId,
      name: input.name.trim(),
      allowed_roles: input.allowedRoles ?? [],
      parent_id: null,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }
  revalidatePath('/dashboard/documents')
  return { id: data.id }
}

export async function addDocument(input: {
  name: string
  folderId?: string
  fileUrl?: string
  fileSize?: number
  mimeType?: string
  expiresAt?: string
  tags?: string[]
}): Promise<{ error?: string; id?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }

  const admin = createAdminClient()
  const { data, error } = await admin.from('documents')
    .insert({
      tenant_id: ctx.tenantId,
      outlet_id: ctx.outletId || null,
      folder_id: input.folderId ?? null,
      uploaded_by: ctx.userId,
      name: input.name.trim(),
      file_url: input.fileUrl ?? null,
      file_size: input.fileSize ?? null,
      mime_type: input.mimeType ?? null,
      version: 1,
      expires_at: input.expiresAt ?? null,
      tags: input.tags ?? [],
    })
    .select('id')
    .single()

  if (error) return { error: error.message }
  revalidatePath('/dashboard/documents')
  return { id: data.id }
}

export async function updateDocument(
  id: string,
  input: Partial<{
    name: string
    folderId: string
    expiresAt: string
    tags: string[]
  }>
): Promise<{ error?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  // Fetch current version first
  const { data: current, error: fetchError } = await admin.from('documents')
    .select('version')
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .is('deleted_at', null)
    .single()

  if (fetchError || !current) return { error: fetchError?.message ?? 'Document not found' }

  const updatePayload: DocumentUpdate = {
    updated_at: new Date().toISOString(),
    version: (current.version as number) + 1,
  }
  if (input.name !== undefined) updatePayload.name = input.name.trim()
  if (input.folderId !== undefined) updatePayload.folder_id = input.folderId
  if (input.expiresAt !== undefined) updatePayload.expires_at = input.expiresAt || null
  if (input.tags !== undefined) updatePayload.tags = input.tags

  const { error } = await admin.from('documents')
    .update(updatePayload)
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/documents')
  return {}
}

export async function deleteDocument(id: string): Promise<{ error?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  // Fetch file_url before soft-deleting so we can remove from storage
  const { data: doc } = await admin.from('documents')
    .select('file_url')
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .single()

  const { error } = await admin.from('documents')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)

  if (error) return { error: error.message }

  // Best-effort delete from storage (don't fail the whole action if this errors)
  if (doc?.file_url) {
    await createAdminClient().storage.from(BUCKET).remove([doc.file_url])
  }

  revalidatePath('/dashboard/documents')
  return {}
}

export async function deleteFolder(id: string): Promise<{ error?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }
  if (!ctx.isHqUser) return { error: 'Only HQ users can delete folders' }

  const admin = createAdminClient()

  // Check if there are documents in this folder
  const { data: docs, error: checkError } = await admin.from('documents')
    .select('id')
    .eq('folder_id', id)
    .eq('tenant_id', ctx.tenantId)
    .is('deleted_at', null)
    .limit(1)

  if (checkError) return { error: checkError.message }
  if (docs && docs.length > 0) return { error: 'Folder is not empty. Move or delete documents first.' }

  const { error } = await admin.from('document_folders')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/documents')
  return {}
}
