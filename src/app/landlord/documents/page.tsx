"use client"

import { useEffect, useState, useRef } from "react"
import { toast } from "react-toastify"
import { Upload, FileText, CheckCircle2, XCircle, Send, Clock, Image, MapPin, X, Home, Loader2 } from "lucide-react"
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
  { value: "house_photos", label: "House Photos", icon: Image, category: "Property" },
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
  const [isHouseOwner, setIsHouseOwner] = useState(false)
  const [housePhotos, setHousePhotos] = useState<{ file: File; preview: string }[]>([])
  const [uploadingHousePhotos, setUploadingHousePhotos] = useState(false)
  const houseFileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const identityDocs = docs.filter((d) =>
    ["citizenship", "passport", "driving_license", "pan_card", "voter_card"].includes(d.documentType)
  )
  const housePhotoDocs = docs.filter((d) => d.documentType === "house_photos")
  const addressDoc = docs.find((d) => d.documentType === "address")
  const hasIdentityDoc = identityDocs.length > 0
  const hasAddressDoc = !!addressDoc
  const hasSubmitted = docs.some((d) => d.submittedAt)
  const allApproved = docs.length > 0 && docs.every((d) => d.status === "approved")
  const anyRejected = docs.some((d) => d.status === "rejected")
  const allSubmitted = docs.length > 0 && docs.every((d) => d.submittedAt)

  const pendingUploads = DOCUMENT_TYPES.filter(
    (dt) => dt.value !== "house_photos" && !docs.find((d) => d.documentType === dt.value)
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

  async function handleUploadHousePhotos() {
    if (housePhotos.length === 0) return
    setUploadingHousePhotos(true)
    try {
      for (const { file } of housePhotos) {
        const formData = new FormData()
        formData.append("file", file)
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData })
        if (!uploadRes.ok) throw new Error("Upload failed")
        const { url } = await uploadRes.json()

        const res = await fetch("/api/landlord/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentType: "house_photos", documentUrl: url }),
        })
        if (!res.ok) throw new Error("Failed to save photo")
      }
      toast.success("House photos uploaded")
      setHousePhotos([])
      fetchDocs()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploadingHousePhotos(false)
    }
  }

  async function handleRemoveHousePhoto(docId: string) {
    try {
      const res = await fetch(`/api/landlord/documents?id=${docId}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Photo removed")
        fetchDocs()
      }
    } catch {
      toast.error("Failed to remove photo")
    }
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      if (isHouseOwner) {
        await fetch("/api/register/house-owner", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isHouseOwner: true }),
        })
      }
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

  function addHouseFiles(files: FileList | File[]) {
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"))
    const newPhotos = imageFiles.map((file) => ({ file, preview: URL.createObjectURL(file) }))
    setHousePhotos((prev) => [...prev, ...newPhotos])
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-10">
      <div>
        <h1 className="text-3xl font-bold">Document Verification</h1>
        <p className="text-muted-foreground">Upload required documents for landlord verification</p>
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
                <p className="text-sm">Waiting for admin verification (24-48 hours)</p>
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
            <p className="text-xs text-muted-foreground">Citizenship (REQUIRED) OR Passport / Driving License / PAN Card / Voter Card. House Photos and Address Proof are also required.</p>

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">IDENTITY DOCUMENTS (any one)</p>
              {DOCUMENT_TYPES.filter((dt) => dt.category === "Identity").map((dt) => {
                const doc = docs.find((d) => d.documentType === dt.value)
                const Icon = dt.icon
                return (
                  <div key={dt.value} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{dt.label}</p>
                        <p className="text-xs text-muted-foreground">{dt.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {doc ? (
                        <>
                          <Badge variant={doc.status === "approved" ? "success" : doc.status === "rejected" ? "destructive" : "warning"}>
                            {doc.status === "approved" ? "Approved" : doc.status === "rejected" ? "Rejected" : doc.submittedAt ? "Submitted" : "Uploaded"}
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
              })}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">PROPERTY DOCUMENTS</p>

              {/* Address Proof */}
              {(() => {
                const dt = DOCUMENT_TYPES.find((d) => d.value === "address")!
                const doc = addressDoc
                return (
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <MapPin className="h-5 w-5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">Address Proof</p>
                        <p className="text-xs text-muted-foreground">Property</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {doc ? (
                        <>
                          <Badge variant={doc.status === "approved" ? "success" : doc.status === "rejected" ? "destructive" : "warning"}>
                            {doc.status === "approved" ? "Approved" : doc.status === "rejected" ? "Rejected" : doc.submittedAt ? "Submitted" : "Uploaded"}
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
              })()}

              {/* House Photos - Multi Image Upload */}
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Image className="h-5 w-5 text-muted-foreground" />
                    <p className="text-sm font-medium">House Photos</p>
                  </div>
                  {housePhotoDocs.length > 0 && (
                    <Badge variant="success">{housePhotoDocs.length} uploaded</Badge>
                  )}
                </div>

                {/* Uploaded house photos from DB */}
                {housePhotoDocs.length > 0 && (
                  <div className="flex gap-3 overflow-x-auto pb-3 mb-3">
                    {housePhotoDocs.map((doc) => (
                      <div key={doc._id} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border bg-muted">
                        <img src={doc.documentUrl} alt="House" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveHousePhoto(doc._id)}
                          className="absolute right-1 top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black/90"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Drag & drop upload zone for new house photos */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); addHouseFiles(e.dataTransfer.files) }}
                  onClick={() => houseFileInputRef.current?.click()}
                  className={`relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-colors ${
                    dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-muted-foreground/50 hover:bg-muted/30"
                  }`}
                >
                  <div className="mb-2 rounded-full bg-primary/10 p-2">
                    <Upload className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-sm font-medium">Click to add house photos</p>
                  <p className="mt-1 text-xs text-muted-foreground">PNG, JPG, WebP (multi-select supported)</p>
                  <input
                    ref={houseFileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { if (e.target.files) addHouseFiles(e.target.files); e.target.value = "" }}
                  />
                </div>

                {/* Preview newly selected photos before upload */}
                {housePhotos.length > 0 && (
                  <>
                    <div className="flex gap-3 overflow-x-auto pb-2 mt-3">
                      {housePhotos.map((photo, i) => (
                        <div key={`new-${i}`} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border bg-muted">
                          <img src={photo.preview} alt="" className="h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setHousePhotos((prev) => prev.filter((_, j) => j !== i))}
                            className="absolute right-1 top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black/90"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <Button onClick={handleUploadHousePhotos} loading={uploadingHousePhotos} size="sm" className="mt-2">
                      <Upload className="mr-1 h-4 w-4" /> Upload {housePhotos.length} photo{housePhotos.length > 1 ? "s" : ""}
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* isHouseOwner Toggle */}
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <Home className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">I am a House Owner</p>
                <p className="text-xs text-muted-foreground">Check this if you own the house/property you are listing</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isHouseOwner}
                onClick={() => setIsHouseOwner(!isHouseOwner)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors ${
                  isHouseOwner ? "bg-primary" : "bg-input"
                }`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition-transform ${
                  isHouseOwner ? "translate-x-5" : "translate-x-0"
                }`} />
              </button>
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
                  <Upload className="mr-1 h-4 w-4" /> Upload
                </Button>
              </div>
            )}

            {docs.length > 0 && !allSubmitted && !allApproved && (
              <Button onClick={handleSubmit} loading={submitting} className="w-full">
                <Send className="mr-1 h-4 w-4" /> Submit All for Verification
              </Button>
            )}

            {docs.length > 0 && !allSubmitted && !allApproved && (
              <p className="text-xs text-muted-foreground text-center">
                Upload all required documents above, then click Submit for admin review
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
