"use client"

import { useEffect, useState, useCallback } from "react"
import { Loader2, Search, Plus, Pencil, Trash2 } from "lucide-react"
import { toast } from "react-toastify"
import { useRoleGuard } from "@/hooks/useRoleGuard"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"

interface BankDetail {
  _id: string
  bankName: string
  accountHolderName: string
  accountNumber: string
  branch: string
  qrCodeImage: string
  isActive: boolean
}

const INITIAL_FORM = {
  _id: "",
  bankName: "",
  accountHolderName: "",
  accountNumber: "",
  branch: "",
  qrCodeImage: "",
  isActive: true,
}

export default function BankDetailsPage() {
  useRoleGuard(["admin"])

  const [items, setItems] = useState<BankDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(INITIAL_FORM)
  const [deleteTarget, setDeleteTarget] = useState<BankDetail | null>(null)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      const res = await fetch(`/api/admin/system-config/bank-details?${params}`)
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

  function openEdit(item: BankDetail) {
    setForm({ ...item })
    setEditing(true)
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.bankName || !form.accountHolderName || !form.accountNumber) {
      toast.error("Bank Name, Account Holder, and Account Number are required")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/admin/system-config/bank-details", {
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
      const res = await fetch(`/api/admin/system-config/bank-details?id=${id}`, { method: "DELETE" })
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
          <h1 className="text-3xl font-bold">Bank Details</h1>
          <p className="text-muted-foreground">Manage bank accounts for QR and manual payments</p>
        </div>
        <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Add Bank</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="flex h-10 w-full rounded-lg border border-input bg-transparent pl-10 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">No bank accounts added yet</CardContent></Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-secondary">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Bank</th>
                <th className="px-4 py-3 text-left font-medium">Account Holder</th>
                <th className="px-4 py-3 text-left font-medium">Account Number</th>
                <th className="px-4 py-3 text-left font-medium">Branch</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item) => (
                <tr key={item._id} className="hover:bg-secondary/50">
                  <td className="px-4 py-3 font-medium">{item.bankName}</td>
                  <td className="px-4 py-3">{item.accountHolderName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.accountNumber}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.branch || "N/A"}</td>
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

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? "Edit Bank" : "Add Bank"}>
        <div className="space-y-4">
          <Input label="Bank Name *" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} placeholder="e.g. NMB Bank" />
          <Input label="Account Holder Name *" value={form.accountHolderName} onChange={(e) => setForm({ ...form, accountHolderName: e.target.value })} placeholder="Full name on account" />
          <Input label="Account Number *" value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} placeholder="Account number" />
          <Input label="Branch" value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} placeholder="Branch name" />
          <Input label="QR Code Image URL" value={form.qrCodeImage} onChange={(e) => setForm({ ...form, qrCodeImage: e.target.value })} placeholder="https://example.com/qr.png" />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded border-input" /> Active</label>
        </div>
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>{editing ? "Update" : "Create"}</Button>
        </div>
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Bank">
        <p className="text-sm text-muted-foreground mb-4">Are you sure you want to delete <strong>{deleteTarget?.bankName}</strong>?</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="destructive" onClick={() => deleteTarget && handleDelete(deleteTarget._id)}>Delete</Button>
        </div>
      </Modal>
    </div>
  )
}
