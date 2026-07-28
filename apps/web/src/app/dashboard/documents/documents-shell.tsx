'use client'

import { useState, useTransition, useMemo } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Search, Upload, FolderPlus, Folder, FolderOpen, Download,
  Pencil, Trash2, AlertTriangle, FileSignature, Clock,
} from 'lucide-react'
import {
  createFolder, addDocument, updateDocument, deleteDocument, deleteFolder,
  getSignedUploadUrl, getSignedDownloadUrl,
  type DocsPageData, type Document, type DocumentFolder,
} from './actions'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtSize(bytes: number | null): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fileEmoji(mime: string | null): string {
  if (!mime) return '📦'
  if (mime === 'application/pdf') return '📄'
  if (mime.includes('sheet') || mime.includes('excel') || mime.includes('csv')) return '📊'
  if (mime.startsWith('image/')) return '🖼️'
  if (mime.includes('word') || mime.includes('document') || mime.includes('text')) return '📝'
  return '📦'
}

type ExpiryStatus = 'expired' | 'expiring' | 'none'

function expiryStatus(expiresAt: string | null): ExpiryStatus {
  if (!expiresAt) return 'none'
  const exp = new Date(expiresAt)
  const now = new Date()
  if (exp < now) return 'expired'
  const thirty = new Date()
  thirty.setDate(thirty.getDate() + 30)
  if (exp <= thirty) return 'expiring'
  return 'none'
}

const MIME_OPTIONS = [
  { label: 'PDF', value: 'application/pdf' },
  { label: 'Excel / Spreadsheet', value: 'application/vnd.ms-excel' },
  { label: 'JPEG Image', value: 'image/jpeg' },
  { label: 'PNG Image', value: 'image/png' },
  { label: 'Other', value: 'other' },
]

// ── Document Form (shared by Add + Edit) ──────────────────────────────────────

type DocFormState = {
  name: string
  folderId: string
  fileUrl: string       // storage path after upload
  fileSize: string      // bytes
  mimeType: string
  expiresAt: string
  tags: string
}

type UploadState = 'idle' | 'uploading' | 'done' | 'error'

function DocumentForm({
  initial,
  folders,
  onSubmit,
  onCancel,
  submitLabel,
  pending,
  readOnlyVersion,
  hideFilePicker,       // true in Edit modal — file can't be re-uploaded
}: {
  initial?: Partial<DocFormState>
  folders: DocumentFolder[]
  onSubmit: (data: DocFormState) => void
  onCancel: () => void
  submitLabel: string
  pending: boolean
  readOnlyVersion?: number
  hideFilePicker?: boolean
}) {
  const [form, setForm] = useState<DocFormState>({
    name:      initial?.name      ?? '',
    folderId:  initial?.folderId  ?? '',
    fileUrl:   initial?.fileUrl   ?? '',
    fileSize:  initial?.fileSize  ?? '',
    mimeType:  initial?.mimeType  ?? '',
    expiresAt: initial?.expiresAt ?? '',
    tags:      initial?.tags      ?? '',
  })
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [uploadedName, setUploadedName] = useState('')

  function set(field: keyof DocFormState, val: string) {
    setForm(f => ({ ...f, [field]: val }))
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadState('uploading')
    try {
      // 1. Get a signed upload URL from the server
      const { signedUrl, storagePath, error: urlErr } = await getSignedUploadUrl(file.name)
      if (urlErr || !signedUrl) throw new Error(urlErr ?? 'Failed to get upload URL')

      // 2. PUT the file directly to Supabase Storage
      const res = await fetch(signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      })
      if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`)

      // 3. Store the path + metadata in form state
      setForm(f => ({
        ...f,
        fileUrl:  storagePath,
        fileSize: String(file.size),
        mimeType: file.type,
        name:     f.name || file.name.replace(/\.[^.]+$/, ''), // auto-fill name if blank
      }))
      setUploadedName(file.name)
      setUploadState('done')
    } catch (err) {
      setUploadState('error')
      toast.error((err as Error).message ?? 'Upload failed')
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-grey mb-1 block">Document Name *</label>
        <input
          value={form.name}
          onChange={e => set('name', e.target.value)}
          placeholder="e.g. Staff Code of Conduct v3"
          className="w-full h-9 px-3 border border-silver rounded-[4px] text-sm focus:outline-none focus:border-black"
        />
      </div>

      <div>
        <label className="text-xs text-grey mb-1 block">Folder</label>
        <select
          value={form.folderId}
          onChange={e => set('folderId', e.target.value)}
          className="w-full h-9 px-3 border border-silver rounded-[4px] text-sm focus:outline-none focus:border-black"
        >
          <option value="">— No folder —</option>
          {folders.map(f => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </div>

      {/* File picker — shown only in Add mode */}
      {!hideFilePicker && (
        <div>
          <label className="text-xs text-grey mb-1 block">File *</label>
          <label className={`flex items-center gap-3 w-full px-3 py-2.5 border-2 border-dashed rounded-[4px] cursor-pointer transition-colors
            ${uploadState === 'done'    ? 'border-green-400 bg-green-50'   : ''}
            ${uploadState === 'error'   ? 'border-red-400  bg-red-50'      : ''}
            ${uploadState === 'uploading' ? 'border-blue-400 bg-blue-50 cursor-wait' : ''}
            ${uploadState === 'idle'    ? 'border-silver   hover:border-black' : ''}
          `}>
            <Upload className="h-4 w-4 text-grey flex-shrink-0" />
            <span className="text-sm text-grey truncate">
              {uploadState === 'uploading' && 'Uploading…'}
              {uploadState === 'done'      && `✓ ${uploadedName}`}
              {uploadState === 'error'     && 'Upload failed — try again'}
              {uploadState === 'idle'      && 'Click to select a file (max 50 MB)'}
            </span>
            <input
              type="file"
              className="sr-only"
              disabled={uploadState === 'uploading'}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.webp,.gif"
              onChange={handleFileChange}
            />
          </label>
          <p className="text-[11px] text-grey mt-1">
            PDF, Word, Excel, PowerPoint, images, CSV — up to 50 MB.
            File is uploaded directly to Supabase Storage.
          </p>
        </div>
      )}

      <div>
        <label className="text-xs text-grey mb-1 block">Expires At</label>
        <input
          type="date"
          value={form.expiresAt}
          onChange={e => set('expiresAt', e.target.value)}
          className="w-full h-9 px-3 border border-silver rounded-[4px] text-sm focus:outline-none focus:border-black"
        />
      </div>

      <div>
        <label className="text-xs text-grey mb-1 block">Tags (comma-separated)</label>
        <input
          value={form.tags}
          onChange={e => set('tags', e.target.value)}
          placeholder="e.g. sop, hygiene, mandatory"
          className="w-full h-9 px-3 border border-silver rounded-[4px] text-sm focus:outline-none focus:border-black"
        />
      </div>

      {readOnlyVersion !== undefined && (
        <div className="flex items-center gap-2 p-2 rounded-[4px] bg-offwhite border border-silver/60">
          <Clock className="h-3.5 w-3.5 text-grey" />
          <span className="text-xs text-grey">Version: <span className="text-charcoal font-medium">v{readOnlyVersion}</span></span>
          <span className="text-xs text-grey ml-2">(will be bumped to v{readOnlyVersion + 1} on save)</span>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button
          loading={pending}
          disabled={!hideFilePicker && uploadState !== 'done'}
          onClick={() => onSubmit(form)}
          className="flex-1"
        >
          {submitLabel}
        </Button>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  )
}

// ── Add Document Modal ────────────────────────────────────────────────────────

function AddDocumentModal({
  folders,
  onClose,
  onRefresh,
}: {
  folders: DocumentFolder[]
  onClose: () => void
  onRefresh: () => void
}) {
  const [pending, startT] = useTransition()

  function handleSubmit(form: DocFormState) {
    if (!form.name.trim()) { toast.error('Document name is required'); return }
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean)
    startT(async () => {
      const res = await addDocument({
        name: form.name.trim(),
        folderId: form.folderId || undefined,
        fileUrl: form.fileUrl || undefined,
        fileSize: form.fileSize ? Number(form.fileSize) : undefined,
        mimeType: form.mimeType || undefined,
        expiresAt: form.expiresAt
          ? new Date(form.expiresAt).toISOString()
          : undefined,
        tags: tags.length > 0 ? tags : undefined,
      })
      if (res.error) { toast.error(res.error); return }
      toast.success('Document added')
      onClose()
      onRefresh()
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-[12px] p-6 w-full max-w-lg shadow-xl my-8">
        <h3 className="text-base font-semibold text-charcoal mb-4">Upload Document</h3>
        <DocumentForm
          folders={folders}
          onSubmit={handleSubmit}
          onCancel={onClose}
          submitLabel="Save Document"
          pending={pending}
        />
      </div>
    </div>
  )
}

// ── Edit Document Modal ───────────────────────────────────────────────────────

function EditDocumentModal({
  doc,
  folders,
  onClose,
  onRefresh,
}: {
  doc: Document
  folders: DocumentFolder[]
  onClose: () => void
  onRefresh: () => void
}) {
  const [pending, startT] = useTransition()

  function handleSubmit(form: DocFormState) {
    if (!form.name.trim()) { toast.error('Document name is required'); return }
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean)
    startT(async () => {
      const res = await updateDocument(doc.id, {
        name: form.name.trim(),
        folderId: form.folderId || undefined,
        expiresAt: form.expiresAt
          ? new Date(form.expiresAt).toISOString()
          : '',
        tags,
      })
      if (res.error) { toast.error(res.error); return }
      toast.success('Document updated')
      onClose()
      onRefresh()
    })
  }

  // Format date for input[type=date]: YYYY-MM-DD
  const expiresAtForInput = doc.expires_at
    ? doc.expires_at.slice(0, 10)
    : ''

  const existingTags = (doc.tags ?? []).join(', ')

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-[12px] p-6 w-full max-w-lg shadow-xl my-8">
        <h3 className="text-base font-semibold text-charcoal mb-4">Edit Document</h3>
        <DocumentForm
          initial={{
            name: doc.name,
            folderId: doc.folder_id ?? '',
            fileUrl: doc.file_url ?? '',
            fileSize: doc.file_size ? String(doc.file_size) : '',
            mimeType: doc.mime_type ?? '',
            expiresAt: expiresAtForInput,
            tags: existingTags,
          }}
          folders={folders}
          onSubmit={handleSubmit}
          onCancel={onClose}
          submitLabel="Save Changes"
          pending={pending}
          readOnlyVersion={doc.version}
          hideFilePicker
        />
      </div>
    </div>
  )
}

// ── New Folder Popover ────────────────────────────────────────────────────────

function NewFolderPopover({
  onClose,
  onRefresh,
}: {
  onClose: () => void
  onRefresh: () => void
}) {
  const [name, setName] = useState('')
  const [pending, startT] = useTransition()

  function handleCreate() {
    if (!name.trim()) { toast.error('Folder name is required'); return }
    startT(async () => {
      const res = await createFolder({ name: name.trim() })
      if (res.error) { toast.error(res.error); return }
      toast.success('Folder created')
      onClose()
      onRefresh()
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-[12px] p-5 w-full max-w-sm shadow-xl">
        <h3 className="text-sm font-semibold text-charcoal mb-3">New Folder</h3>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Folder name (e.g. SOPs, Legal)"
          className="w-full h-9 px-3 border border-silver rounded-[4px] text-sm focus:outline-none focus:border-black mb-3"
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          autoFocus
        />
        <div className="flex gap-2">
          <Button loading={pending} onClick={handleCreate} className="flex-1">Create</Button>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  )
}

// ── Document Row ──────────────────────────────────────────────────────────────

function DocumentRow({
  doc,
  folders,
  onRefresh,
}: {
  doc: Document
  folders: DocumentFolder[]
  onRefresh: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [pending, startT] = useTransition()
  const [downloading, setDownloading] = useState(false)

  const folderName = folders.find(f => f.id === doc.folder_id)?.name ?? '—'
  const status = expiryStatus(doc.expires_at)

  function handleDelete() {
    if (!confirm(`Delete "${doc.name}"? This cannot be undone.`)) return
    startT(async () => {
      const res = await deleteDocument(doc.id)
      if (res.error) { toast.error(res.error); return }
      toast.success('Document deleted')
      onRefresh()
    })
  }

  async function handleDownload() {
    if (!doc.file_url) return
    setDownloading(true)
    try {
      const { url, error } = await getSignedDownloadUrl(doc.file_url)
      if (error || !url) { toast.error(error ?? 'Could not generate download link'); return }
      // Open in new tab — signed URL expires in 1 hour
      window.open(url, '_blank', 'noopener,noreferrer')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <>
      <tr className="border-b border-silver/60 hover:bg-offwhite/60 transition-colors">
        {/* Icon + Name */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="text-xl flex-shrink-0 leading-none">{fileEmoji(doc.mime_type)}</span>
            <div className="min-w-0">
              {doc.file_url ? (
                <button
                  onClick={handleDownload}
                  className="text-sm font-medium text-charcoal hover:text-black hover:underline truncate block max-w-[200px] text-left"
                >
                  {doc.name}
                </button>
              ) : (
                <span className="text-sm font-medium text-charcoal truncate block max-w-[200px]">{doc.name}</span>
              )}
              <span className="text-[11px] text-grey">v{doc.version}</span>
            </div>
          </div>
        </td>

        {/* Folder */}
        <td className="px-4 py-3 text-xs text-grey whitespace-nowrap hidden sm:table-cell">
          {folderName}
        </td>

        {/* Tags */}
        <td className="px-4 py-3 hidden md:table-cell">
          <div className="flex flex-wrap gap-1">
            {(doc.tags ?? []).slice(0, 3).map(tag => (
              <Badge key={tag} variant="outline" className="text-[10px] py-0 px-1.5">{tag}</Badge>
            ))}
            {(doc.tags ?? []).length > 3 && (
              <span className="text-[10px] text-grey">+{(doc.tags ?? []).length - 3}</span>
            )}
          </div>
        </td>

        {/* Size */}
        <td className="px-4 py-3 text-xs text-grey whitespace-nowrap hidden lg:table-cell">
          {fmtSize(doc.file_size)}
        </td>

        {/* Uploaded */}
        <td className="px-4 py-3 text-xs text-grey whitespace-nowrap hidden lg:table-cell">
          {fmtDate(doc.created_at)}
        </td>

        {/* Expires */}
        <td className="px-4 py-3 text-xs whitespace-nowrap hidden sm:table-cell">
          {doc.expires_at ? (
            <span className={
              status === 'expired' ? 'text-danger font-medium' :
              status === 'expiring' ? 'text-warning font-medium' :
              'text-grey'
            }>
              {fmtDate(doc.expires_at)}
              {status === 'expired' && ' · Expired'}
              {status === 'expiring' && ' · Soon'}
            </span>
          ) : (
            <span className="text-silver">—</span>
          )}
        </td>

        {/* Actions */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            {doc.file_url && (
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="h-7 w-7 flex items-center justify-center text-grey hover:text-black transition-colors rounded-[4px] hover:bg-offwhite disabled:opacity-40"
                title="Download"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={() => setEditing(true)}
              className="h-7 w-7 flex items-center justify-center text-grey hover:text-black transition-colors rounded-[4px] hover:bg-offwhite"
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleDelete}
              disabled={pending}
              className="h-7 w-7 flex items-center justify-center text-grey hover:text-danger transition-colors rounded-[4px] hover:bg-offwhite"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </td>
      </tr>

      {editing && (
        <EditDocumentModal
          doc={doc}
          folders={folders}
          onClose={() => setEditing(false)}
          onRefresh={onRefresh}
        />
      )}
    </>
  )
}

// ── E-signature Section ───────────────────────────────────────────────────────

function ESignatureSection() {
  return (
    <Card className="mt-8">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-[8px] bg-offwhite border border-silver flex items-center justify-center flex-shrink-0">
            <FileSignature className="h-4.5 w-4.5 text-grey" strokeWidth={1.5} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">E-Signature Integration</CardTitle>
              <Badge variant="outline" className="text-[10px] px-2 py-0 text-grey border-silver">Coming Soon</Badge>
            </div>
            <p className="text-xs text-grey mt-0.5">DocuSign · Leegality · agreement signing workflow</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-[8px] bg-offwhite border border-silver/60 p-5">
          <p className="text-sm text-charcoal font-medium mb-2">Sign documents without leaving the platform</p>
          <p className="text-xs text-grey leading-relaxed mb-4">
            We are working on integrating DocuSign and Leegality to allow franchise agreements, NDA templates,
            and compliance forms to be sent for e-signature directly from the Documents module.
            Signatories will receive email links, and the signed copies will be auto-archived here.
          </p>
          <div className="flex flex-wrap gap-3">
            {['Franchise Agreements', 'Staff NDAs', 'Vendor Contracts', 'Lease Renewals'].map(item => (
              <div
                key={item}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-silver/80 text-xs text-grey"
              >
                <FileSignature className="h-3 w-3" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Main Shell ────────────────────────────────────────────────────────────────

export function DocumentsShell({ initial }: { initial: DocsPageData }) {
  const [data, setData] = useState<DocsPageData>(initial)
  const [search, setSearch] = useState('')
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [, startT] = useTransition()

  function refresh() {
    startT(async () => {
      const { getDocumentsPageData } = await import('./actions')
      const fresh = await getDocumentsPageData()
      setData(fresh)
    })
  }

  // Filter documents
  const filtered = useMemo(() => {
    return data.documents.filter(doc => {
      const matchFolder = activeFolderId === null || doc.folder_id === activeFolderId
      const matchSearch = !search ||
        doc.name.toLowerCase().includes(search.toLowerCase()) ||
        (doc.tags ?? []).some(t => t.toLowerCase().includes(search.toLowerCase()))
      return matchFolder && matchSearch
    })
  }, [data.documents, activeFolderId, search])

  // Doc count per folder
  function folderDocCount(folderId: string) {
    return data.documents.filter(d => d.folder_id === folderId).length
  }

  function handleFolderDelete(folder: DocumentFolder) {
    if (!confirm(`Delete folder "${folder.name}"? It must be empty.`)) return
    startT(async () => {
      const { deleteFolder: delFolder } = await import('./actions')
      const res = await delFolder(folder.id)
      if (res.error) { toast.error(res.error); return }
      toast.success('Folder deleted')
      if (activeFolderId === folder.id) setActiveFolderId(null)
      refresh()
    })
  }

  return (
    <div>
      {/* Expiry alert banner */}
      {data.expiringSoon.length > 0 && (
        <div className="flex items-center gap-2.5 mb-5 px-4 py-3 rounded-[8px] bg-warning/10 border border-warning/30">
          <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0" />
          <p className="text-sm text-charcoal">
            <span className="font-semibold text-warning">{data.expiringSoon.length} document{data.expiringSoon.length !== 1 ? 's' : ''}</span>{' '}
            expiring within 30 days.{' '}
            <button
              onClick={() => {
                setSearch('')
                setActiveFolderId(null)
              }}
              className="underline text-charcoal hover:text-black"
            >
              Review now
            </button>
          </p>
        </div>
      )}

      {/* Top bar: search + actions */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-grey" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search documents or tags…"
            className="w-full h-9 pl-9 pr-3 border border-silver rounded-[4px] text-sm focus:outline-none focus:border-black"
          />
        </div>

        {/* Category filter chips (mobile / small screen, from folder names) */}
        <div className="flex gap-1 flex-wrap lg:hidden">
          <button
            onClick={() => setActiveFolderId(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeFolderId === null ? 'bg-black text-white' : 'bg-offwhite text-grey hover:text-charcoal'
            }`}
          >
            All ({data.documents.length})
          </button>
          {data.folders.map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFolderId(f.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeFolderId === f.id ? 'bg-black text-white' : 'bg-offwhite text-grey hover:text-charcoal'
              }`}
            >
              {f.name} ({folderDocCount(f.id)})
            </button>
          ))}
        </div>

        <div className="flex gap-2 flex-shrink-0">
          {data.isHqUser && (
            <Button size="sm" variant="secondary" onClick={() => setShowNewFolder(true)}>
              <FolderPlus className="h-3.5 w-3.5 mr-1.5" />
              New Folder
            </Button>
          )}
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            Upload Document
          </Button>
        </div>
      </div>

      {/* Two-panel layout on lg */}
      <div className="flex gap-5">
        {/* Left sidebar — folder list (desktop only) */}
        <aside className="hidden lg:flex flex-col w-52 flex-shrink-0 gap-0.5">
          <button
            onClick={() => setActiveFolderId(null)}
            className={`flex items-center gap-2 w-full px-3 py-2 rounded-[6px] text-sm transition-colors text-left ${
              activeFolderId === null
                ? 'bg-black text-white'
                : 'text-charcoal hover:bg-offwhite'
            }`}
          >
            <Folder className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="flex-1 truncate">All Documents</span>
            <span className={`text-[10px] font-medium rounded-full px-1.5 py-0.5 ${
              activeFolderId === null ? 'bg-white/20 text-white' : 'bg-offwhite text-grey'
            }`}>
              {data.documents.length}
            </span>
          </button>

          {data.folders.length > 0 && (
            <div className="mt-2 mb-1">
              <p className="px-3 text-[10px] font-medium text-grey uppercase tracking-wide mb-1">Folders</p>
              {data.folders.map(f => (
                <div key={f.id} className="group relative flex items-center">
                  <button
                    onClick={() => setActiveFolderId(f.id === activeFolderId ? null : f.id)}
                    className={`flex items-center gap-2 flex-1 px-3 py-2 rounded-[6px] text-sm transition-colors text-left ${
                      activeFolderId === f.id
                        ? 'bg-black text-white'
                        : 'text-charcoal hover:bg-offwhite'
                    }`}
                  >
                    {activeFolderId === f.id
                      ? <FolderOpen className="h-3.5 w-3.5 flex-shrink-0" />
                      : <Folder className="h-3.5 w-3.5 flex-shrink-0" />
                    }
                    <span className="flex-1 truncate">{f.name}</span>
                    <span className={`text-[10px] font-medium rounded-full px-1.5 py-0.5 ${
                      activeFolderId === f.id ? 'bg-white/20 text-white' : 'bg-offwhite text-grey'
                    }`}>
                      {folderDocCount(f.id)}
                    </span>
                  </button>
                  {data.isHqUser && (
                    <button
                      onClick={() => handleFolderDelete(f)}
                      className="opacity-0 group-hover:opacity-100 absolute right-1 h-5 w-5 flex items-center justify-center text-grey hover:text-danger transition-all"
                      title="Delete folder"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {data.folders.length === 0 && data.isHqUser && (
            <button
              onClick={() => setShowNewFolder(true)}
              className="mt-2 px-3 py-2 text-xs text-grey hover:text-charcoal text-left hover:bg-offwhite rounded-[6px] transition-colors"
            >
              + Create your first folder
            </button>
          )}
        </aside>

        {/* Main document list */}
        <div className="flex-1 min-w-0">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-grey text-sm">
              {data.documents.length === 0
                ? 'No documents yet. Upload your first document.'
                : 'No documents match your filters.'}
            </div>
          ) : (
            <div className="rounded-[8px] border border-silver bg-white overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-silver bg-offwhite/60">
                      <th className="px-4 py-2.5 text-[11px] font-semibold text-grey uppercase tracking-wide">Name</th>
                      <th className="px-4 py-2.5 text-[11px] font-semibold text-grey uppercase tracking-wide hidden sm:table-cell">Folder</th>
                      <th className="px-4 py-2.5 text-[11px] font-semibold text-grey uppercase tracking-wide hidden md:table-cell">Tags</th>
                      <th className="px-4 py-2.5 text-[11px] font-semibold text-grey uppercase tracking-wide hidden lg:table-cell">Size</th>
                      <th className="px-4 py-2.5 text-[11px] font-semibold text-grey uppercase tracking-wide hidden lg:table-cell">Uploaded</th>
                      <th className="px-4 py-2.5 text-[11px] font-semibold text-grey uppercase tracking-wide hidden sm:table-cell">Expires</th>
                      <th className="px-4 py-2.5 text-[11px] font-semibold text-grey uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(doc => (
                      <DocumentRow
                        key={doc.id}
                        doc={doc}
                        folders={data.folders}
                        onRefresh={refresh}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-2 border-t border-silver/40 bg-offwhite/30">
                <p className="text-[11px] text-grey">
                  {filtered.length} of {data.documents.length} document{data.documents.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* E-signature section */}
      <ESignatureSection />

      {/* Modals */}
      {showAdd && (
        <AddDocumentModal
          folders={data.folders}
          onClose={() => setShowAdd(false)}
          onRefresh={refresh}
        />
      )}

      {showNewFolder && (
        <NewFolderPopover
          onClose={() => setShowNewFolder(false)}
          onRefresh={refresh}
        />
      )}
    </div>
  )
}
