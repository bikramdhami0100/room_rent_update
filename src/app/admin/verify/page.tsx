"use client"

import { useEffect, useState } from "react"
import { toast } from "react-toastify"
import {
  ShieldCheck, XCircle, Phone, Mail, AlertTriangle,
  CheckCircle2, Clock, Eye, EyeOff,
} from "lucide-react"
import { useRoleGuard } from "@/hooks/useRoleGuard"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Modal } from "@/components/ui/modal"

interface LandlordDoc {
  documentType: string
  documentUrl: string
  status: string
  adminComment?: string
}

interface Landlord {
  _id: string
  name: string
  email: string
  phone?: string
  address?: string
  createdAt: string
  documents: LandlordDoc[]
}

const DOC_CATEGORIES: Record<string, { label: string; icon: string }> = {
  citizenship: { label: "Citizenship", icon: "🪪" },
  passport: { label: "Passport", icon: "🛂" },
  driving_license: { label: "Driving License", icon: "🚗" },
  pan_card: { label: "PAN Card", icon: "📋" },
  voter_card: { label: "Voter Card", icon: "🗳️" },
  room_photos: { label: "Room Photos", icon: "🏠" },
  address: { label: "Address Proof", icon: "📍" },
}

function getDocCategory(docType: string): "identity" | "room_photos" | "address" {
  if (docType === "room_photos") return "room_photos"
  if (docType === "address") return "address"
  return "identity"
}

export default function VerifyPage() {
  useRoleGuard(["admin"])
  const [landlords, setLandlords] = useState<Landlord[]>([])
  const [loading, setLoading] = useState(true)
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectComment, setRejectComment] = useState("")
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    fetchLandlords()
  }, [])

  async function fetchLandlords() {
    try {
      const res = await fetch("/api/admin/verify")
      if (res.ok) {
        const data = await res.json()
        setLandlords(Array.isArray(data) ? data : [])
      }
    } catch {
      toast.error("Failed to load landlords")
    } finally {
      setLoading(false)
    }
  }

  async function handleAction(userId: string, action: "approve" | "reject") {
    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action, comment: action === "reject" ? rejectComment : undefined }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`${action === "approve" ? "Approved" : "Rejected"} successfully`)
        setRejectComment("")
        setRejectId(null)
        fetchLandlords()
      } else {
        toast.error(data.error || "Action failed")
      }
    } catch {
      toast.error("Something went wrong")
    }
  }

  function isImageFile(url: string) {
    return /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (landlords.length === 0) {
    return (
      <div className="mx-auto max-w-4xl py-10">
        <h1 className="text-3xl font-bold">Verify Landlords</h1>
        <p className="mt-2 text-muted-foreground">No pending verifications</p>
        <div className="mt-8 flex items-center justify-center rounded-xl border-2 border-dashed p-12">
          <div className="text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
            <p className="mt-4 text-lg font-medium">All landlords verified</p>
            <p className="text-muted-foreground">No pending verifications at this time</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 py-10">
      <div>
        <h1 className="text-3xl font-bold">Verify Landlords</h1>
        <p className="text-muted-foreground">
          {landlords.length} landlord{landlords.length > 1 ? "s" : ""} pending verification
        </p>
      </div>

      {landlords.map((landlord) => {
        const identityDocs = landlord.documents.filter((d) => getDocCategory(d.documentType) === "identity")
        const roomPhotoDocs = landlord.documents.filter((d) => getDocCategory(d.documentType) === "room_photos")
        const addressDocs = landlord.documents.filter((d) => getDocCategory(d.documentType) === "address")

        return (
          <Card key={landlord._id} className="overflow-hidden">
            <CardHeader className="border-b bg-muted/30">
              <div className="flex flex-col gap-1">
                <CardTitle>{landlord.name}</CardTitle>
                <CardDescription className="flex flex-wrap gap-x-4 gap-y-1">
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" /> {landlord.email}
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" /> {landlord.phone || "N/A"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> Joined {new Date(landlord.createdAt).toLocaleDateString()}
                  </span>
                  {landlord.address && (
                    <span className="flex items-center gap-1 text-xs">
                      📍 {landlord.address}
                    </span>
                  )}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center gap-2 rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3 text-sm">
                <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0" />
                <span>Review all documents carefully before approving.</span>
              </div>

              {/* Identity Documents */}
              {identityDocs.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Identity Documents</h3>
                  <div className="grid gap-2">
                    {identityDocs.map((doc, i) => (
                      <div key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className="text-lg shrink-0">{DOC_CATEGORIES[doc.documentType]?.icon || "📄"}</span>
                          <span className="font-medium text-sm truncate">{DOC_CATEGORIES[doc.documentType]?.label || doc.documentType.replace(/_/g, " ")}</span>
                          <Badge
                            variant={
                              doc.status === "approved" ? "success"
                              : doc.status === "rejected" ? "destructive"
                              : "warning"
                            }
                            className="shrink-0"
                          >
                            {doc.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {doc.documentUrl && (
                            <>
                              {isImageFile(doc.documentUrl) ? (
                                <Button variant="outline" size="sm" onClick={() => setPreviewUrl(doc.documentUrl)}>
                                  <Eye className="mr-1 h-4 w-4" />
                                  View
                                </Button>
                              ) : (
                                <a href={doc.documentUrl} target="_blank" rel="noopener noreferrer">
                                  <Button variant="outline" size="sm">Open</Button>
                                </a>
                              )}
                            </>
                          )}
                          {doc.adminComment && (
                            <span className="max-w-[200px] text-sm text-destructive">{doc.adminComment}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Room Photos */}
              {roomPhotoDocs.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Room Photos</h3>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {roomPhotoDocs.map((doc, i) => (
                      <div key={i} className="group relative overflow-hidden rounded-lg border">
                        {doc.documentUrl && isImageFile(doc.documentUrl) ? (
                          <>
                            <img
                              src={doc.documentUrl}
                              alt={`Room photo ${i + 1}`}
                              className="h-48 w-full object-cover cursor-pointer transition-transform hover:scale-105"
                              onClick={() => setPreviewUrl(doc.documentUrl)}
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
                              <Eye className="h-8 w-8 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                            </div>
                          </>
                        ) : (
                          <div className="flex h-48 items-center justify-center bg-muted">
                            <a href={doc.documentUrl} target="_blank" rel="noopener noreferrer">
                              <Button variant="outline" size="sm">Open File</Button>
                            </a>
                          </div>
                        )}
                        <div className="absolute top-2 right-2">
                          <Badge
                            variant={
                              doc.status === "approved" ? "success"
                              : doc.status === "rejected" ? "destructive"
                              : "warning"
                            }
                          >
                            {doc.status}
                          </Badge>
                        </div>
                        {doc.adminComment && (
                          <div className="p-2 text-xs text-destructive bg-destructive/10">{doc.adminComment}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Address Proof */}
              {addressDocs.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Address Proof</h3>
                  <div className="grid gap-2">
                    {addressDocs.map((doc, i) => (
                      <div key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className="text-lg shrink-0">📍</span>
                          <span className="font-medium text-sm">Address Document</span>
                          <Badge
                            variant={
                              doc.status === "approved" ? "success"
                              : doc.status === "rejected" ? "destructive"
                              : "warning"
                            }
                            className="shrink-0"
                          >
                            {doc.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {doc.documentUrl && (
                            <>
                              {isImageFile(doc.documentUrl) ? (
                                <Button variant="outline" size="sm" onClick={() => setPreviewUrl(doc.documentUrl)}>
                                  <Eye className="mr-1 h-4 w-4" />
                                  View
                                </Button>
                              ) : (
                                <a href={doc.documentUrl} target="_blank" rel="noopener noreferrer">
                                  <Button variant="outline" size="sm">Open</Button>
                                </a>
                              )}
                            </>
                          )}
                          {doc.adminComment && (
                            <span className="max-w-[200px] text-sm text-destructive">{doc.adminComment}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  className="flex-1"
                  onClick={() => handleAction(landlord._id, "approved")}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Approve All
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => setRejectId(landlord._id)}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}

      {/* Image Preview Modal */}
      <Modal
        isOpen={!!previewUrl}
        onClose={() => setPreviewUrl(null)}
        title="Document Preview"
      >
        {previewUrl && (
          <div className="flex justify-center">
            <img src={previewUrl} alt="Document preview" className="max-h-[70vh] w-auto rounded-lg object-contain" />
          </div>
        )}
        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={() => setPreviewUrl(null)}>
            <EyeOff className="mr-2 h-4 w-4" />
            Close
          </Button>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={rejectId !== null}
        onClose={() => { setRejectId(null); setRejectComment("") }}
        title="Reject Landlord"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Provide a reason for rejection. The landlord will see this message.
          </p>
          <textarea
            className="min-h-[100px] w-full rounded-lg border border-input bg-transparent p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
            placeholder="Reason for rejection..."
          />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => { setRejectId(null); setRejectComment("") }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => rejectId && handleAction(rejectId, "rejected")}
              disabled={!rejectComment.trim()}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
