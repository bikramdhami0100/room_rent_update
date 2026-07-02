"use client"

import { useEffect, useState, useCallback } from "react"
import { Loader2, Search, Plus, Pencil, Trash2, ImageIcon } from "lucide-react"
import { toast } from "react-toastify"
import { useRoleGuard } from "@/hooks/useRoleGuard"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"

interface DirectPaymentItem {
  _id: string
  title: string
  description: string
  qrCodeImage: string
  isActive: boolean
}

const INITIAL_FORM = {
  _id: "",
  title: "",
  description: "",
  qrCodeImage: "",
  isActive: true,
}

export default function DirectPaymentPage() {
  useRoleGuard(["admin"])

  const [items, setItems] = useState<DirectPaymentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(INITIAL_FORM)
  const [deleteTarget, setDeleteTarget] = useState<DirectPaymentItem | null>(null)
  const [previewQr, setPreviewQr] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      const res = await fetch(`/api/admin/system-config/direct-payment?${params}`)
      if (res.ok) {
        const data = await res.json()
        setItems(data.items || [])
      }
    } catch {} finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { fetchItems() }, [fetchItems])

  function openAdd() {
    setForm(INITIAL_FORM)
    setEditing(false)
    setShowModal(true)
  }

  function openEdit(item: DirectPaymentItem) {
    setForm({ ...item })
    setEditing(true)
    setShowModal(true)
  }

  async function handleQrUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      if (res.ok) {
        const { url } = await res.json()
        setForm({ ...form, qrCodeImage: url })
      } else {
        toast.error("Upload failed")
      }
    } catch {
      toast.error("Upload failed")
    } finally {
      setUploading(false)
    }
  }

  async function handleSave() {
    if (!form.title) {
      toast.error("Title is required")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/admin/system-config/direct-payment", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? form : { ...form, _id: undefined }),
      })
      if (res.ok) {
        toast.success(editing ? "Updated" : "Created")
        setShowModal(false)
        fetchItems()
      } else {
        const err = await res.json()
        toast.error(err.error || "Failed")
      }
    } catch {} finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/admin/system-config/direct-payment?id=${id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Deleted")
        setDeleteTarget(null)
        fetchItems()
      }
    } catch {}
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Direct Payment</h1>
          <p className="text-muted-foreground">Manage QR codes for direct payment method</p>
        </div>
        <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Add QR Code</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="flex h-10 w-full rounded-lg border border-input bg-transparent pl-10 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">No direct payment QR codes added yet</CardContent></Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-secondary">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Title</th>
                <th className="px-4 py-3 text-left font-medium">Description</th>
                <th className="px-4 py-3 text-left font-medium">QR Code</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item) => (
                <tr key={item._id} className="hover:bg-secondary/50">
                  <td className="px-4 py-3 font-medium">{item.title}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{item.description || "N/A"}</td>
                  <td className="px-4 py-3">
                    {item.qrCodeImage ? (
                      <Button size="sm" variant="ghost" onClick={() => setPreviewQr(item.qrCodeImage)}>
                        <ImageIcon className="h-4 w-4 mr-1" /> View
                      </Button>
                    ) : (
                      <span className="text-muted-foreground text-xs">No QR</span>
                    )}
                  </td>
                  <td className="px-4 py-3"><Badge variant={item.isActive ? "success" : "secondary"}>{item.isActive ? "Active" : "Inactive"}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => openEdit(item)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(item)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? "Edit QR Code" : "Add QR Code"}>
        <div className="space-y-4">
          <Input label="Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. eSewa QR, Bank QR" />
          <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description or instructions" />
          <div className="space-y-2">
            <label className="text-sm font-medium">QR Code Image</label>
            {form.qrCodeImage && (
              <div className="rounded-lg border bg-white p-3 flex justify-center">
                <img src={form.qrCodeImage} alt="QR preview" className="h-32 w-32 object-contain" />
              </div>
            )}
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-muted-foreground/30 p-4 hover:bg-muted/50 transition-colors">
              <span className="text-sm text-muted-foreground">{uploading ? "Uploading..." : "Click to upload QR code image"}</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleQrUpload} disabled={uploading} />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded border-input" /> Active</label>
        </div>
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>{editing ? "Update" : "Create"}</Button>
        </div>
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete QR Code">
        <p className="text-sm text-muted-foreground mb-4">Are you sure you want to delete <strong>{deleteTarget?.title}</strong>?</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="destructive" onClick={() => deleteTarget && handleDelete(deleteTarget._id)}>Delete</Button>
        </div>
      </Modal>

      <Modal isOpen={!!previewQr} onClose={() => setPreviewQr(null)} title="QR Code">
        {previewQr && (
          <div className="flex justify-center py-4">
            <div className="rounded-xl border-2 bg-white p-4 shadow-sm">
              <img src={previewQr} alt="QR Code" className="h-64 w-64 object-contain" />
            </div>
          </div>
        )}
        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={() => setPreviewQr(null)}>Close</Button>
        </div>
      </Modal>
    </div>
  )
}
