"use client"

import { useEffect, useState } from "react"
import { toast } from "react-toastify"
import { Upload, FileText, CheckCircle2, XCircle, Send, Clock, Image, MapPin } from "lucide-react"
import { useRoleGuard } from "@/hooks/useRoleGuard"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

interface DocItem {
  _id: string
  documentType: string
  documentUrl: string
  status: string
  adminComment?: string
  submittedAt?: string | null
}

const DOCUMENT_TYPES = [
  { value: "citizenship", label: "Citizenship", icon: FileText, category: "Identity" },
  { value: "passport", label: "Passport", icon: FileText, category: "Identity" },
  { value: "driving_license", label: "Driving License", icon: FileText, category: "Identity" },
  { value: "pan_card", label: "PAN Card", icon: FileText, category: "Identity" },
  { value: "voter_card", label: "Voter Card", icon: FileText, category: "Identity" },
  { value: "room_photos", label: "Room Photos", icon: Image, category: "Property" },
  { value: "address", label: "Address Proof", icon: MapPin, category: "Property" },
] as const

export default function DocumentsPage() {
  useRoleGuard(["landlord"])
  const [docs, setDocs] = useState<DocItem[]>([])
  const [loading, setLoading] = useState(true)
  const [file, setFile] = useState<File | null>(null)
  const [documentType, setDocumentType] = useState("citizenship")
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const identityDocs = docs.filter((d) =>
    ["citizenship", "passport", "driving_license", "pan_card", "voter_card"].includes(d.documentType)
  )
  const propertyDocs = docs.filter((d) =>
    ["room_photos", "address"].includes(d.documentType)
  )
  const hasIdentityDoc = identityDocs.length > 0
  const hasPropertyDoc = propertyDocs.length > 0
  const hasSubmitted = docs.some((d) => d.submittedAt)
  const allApproved = docs.length > 0 && docs.every((d) => d.status === "approved")
  const anyRejected = docs.some((d) => d.status === "rejected")
  const allSubmitted = docs.length > 0 && docs.every((d) => d.submittedAt)

  const pendingUploads = DOCUMENT_TYPES.filter(
    (dt) => !docs.find((d) => d.documentType === dt.value)
  )

  useEffect(() => { fetchDocs() }, [])

  async function fetchDocs() {
    setLoading(true)
    try {
      const res = await fetch("/api/landlord/documents")
      if (res.ok) {
        const data = await res.json()
        setDocs(data)
      }
    } catch {
      toast.error("Failed to load documents")
    } finally {
      setLoading(false)
    }
  }

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData })
      if (!uploadRes.ok) throw new Error("Upload failed")
      const { url } = await uploadRes.json()

      const res = await fetch("/api/landlord/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentType, documentUrl: url }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Upload failed")
      }
      toast.success("Document uploaded")
      setFile(null)
      fetchDocs()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const res = await fetch("/api/landlord/documents/submit", { method: "POST" })
      if (res.ok) {
        toast.success("Documents submitted for verification")
        fetchDocs()
      } else {
        const err = await res.json()
        throw new Error(err.error || "Submit failed")
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submit failed")
    } finally {
      setSubmitting(false)
    }
  }

  function getDocForType(type: string) {
    return docs.find((d) => d.documentType === type)
  }

  function renderDocRow(docType: typeof DOCUMENT_TYPES[number]) {
    const doc = getDocForType(docType.value)
    const Icon = docType.icon

    return (
      <div key={docType.value} className="flex items-center justify-between rounded-lg border p-3">
        <div className="flex items-center gap-3 min-w-0">
          <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-sm font-medium">{docType.label}</p>
            <p className="text-xs text-muted-foreground">{docType.category}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {doc ? (
            <>
              <Badge variant={
                doc.status === "approved" ? "success" :
                doc.status === "rejected" ? "destructive" :
                "warning"
              }>
                {doc.status === "approved" ? "Approved" :
                 doc.status === "rejected" ? "Rejected" :
                 doc.submittedAt ? "Submitted" : "Uploaded"}
              </Badge>
              {doc.documentUrl && (
                <a href={doc.documentUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm">View</Button>
                </a>
              )}
            </>
          ) : (
            <Badge variant="outline">Not uploaded</Badge>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-10">
      <div>
        <h1 className="text-3xl font-bold">Document Verification</h1>
        <p className="text-muted-foreground">Upload the required documents for landlord verification</p>
      </div>

      {!loading && allApproved && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 text-green-600">
              <CheckCircle2 className="h-6 w-6" />
              <div>
                <p className="font-semibold">All Documents Verified</p>
                <p className="text-sm">You can now list rooms</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && allSubmitted && !allApproved && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 text-yellow-600">
              <Clock className="h-6 w-6" />
              <div>
                <p className="font-semibold">Documents Submitted</p>
                <p className="text-sm">Waiting for admin verification. This may take 24-48 hours.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-center text-muted-foreground">Loading...</p>
      ) : (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <p className="font-semibold">Required Documents</p>
            <p className="text-xs text-muted-foreground">Citizenship (REQUIRED) OR Passport / Driving License / PAN Card / Voter Card. Room Photos and Address Proof are also required.</p>

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">IDENTITY DOCUMENTS (any one)</p>
              {DOCUMENT_TYPES.filter((dt) => dt.category === "Identity").map(renderDocRow)}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">PROPERTY DOCUMENTS</p>
              {DOCUMENT_TYPES.filter((dt) => dt.category === "Property").map(renderDocRow)}
            </div>

            {anyRejected && docs.filter((d) => d.status === "rejected").map((doc) => (
              <div key={doc._id} className="rounded-lg border border-red-500/50 bg-red-500/10 p-3">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <p className="text-sm font-medium text-red-600 capitalize">
                    {doc.documentType.replace(/_/g, " ")} Rejected
                  </p>
                </div>
                {doc.adminComment && (
                  <p className="mt-1 text-sm text-red-600">Reason: {doc.adminComment}</p>
                )}
              </div>
            ))}

            {pendingUploads.length > 0 && !allSubmitted && (
              <div className="space-y-3 rounded-lg border p-4">
                <p className="text-sm font-medium">Upload Document</p>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
                >
                  {pendingUploads.map((dt) => (
                    <option key={dt.value} value={dt.value}>{dt.label} ({dt.category})</option>
                  ))}
                </select>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="w-full text-sm file:mr-2 file:rounded file:border-0 file:bg-secondary file:px-2 file:py-1 file:text-sm"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <Button onClick={handleUpload} loading={uploading} disabled={!file}>
                  <Upload className="mr-1 h-4 w-4" /> Upload {DOCUMENT_TYPES.find((dt) => dt.value === documentType)?.label}
                </Button>
              </div>
            )}

            {docs.length > 0 && !allSubmitted && !allApproved && (
              <Button onClick={handleSubmit} loading={submitting}>
                <Send className="mr-1 h-4 w-4" /> Submit All for Verification
              </Button>
            )}

            {docs.length > 0 && !allSubmitted && !allApproved && (
              <p className="text-xs text-muted-foreground">
                Upload all required documents above, then click Submit for admin review
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
