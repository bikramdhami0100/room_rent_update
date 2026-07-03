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

interface EsewaConfig {
  _id: string
  name: string
  merchantCode: string
  secretKey: string
  paymentUrl: string
  statusUrl: string
  successUrl: string
  failureUrl: string
  isActive: boolean
}

const INITIAL_FORM = {
  _id: "",
  name: "",
  merchantCode: "",
  secretKey: "",
  paymentUrl: "",
  statusUrl: "",
  successUrl: "",
  failureUrl: "",
  isActive: true,
}

export default function EsewaConfigPage() {
  useRoleGuard(["admin"])

  const [items, setItems] = useState<EsewaConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(INITIAL_FORM)
  const [deleteTarget, setDeleteTarget] = useState<EsewaConfig | null>(null)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      const res = await fetch(`/api/admin/system-config/esewa?${params}`)
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

  function openEdit(item: EsewaConfig) {
    setForm({ ...item })
    setEditing(true)
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name || !form.merchantCode || !form.secretKey) {
      toast.error("Name, Merchant Code, and Secret Key are required")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/admin/system-config/esewa", {
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
      const res = await fetch(`/api/admin/system-config/esewa?id=${id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Deleted")
        setDeleteTarget(null)
        fetchItems()
      }
    } catch {}
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">eSewa Configuration</h1>
          <p className="text-muted-foreground">Manage eSewa payment gateway settings</p>
        </div>
        <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Add Config</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="flex h-10 w-full rounded-lg border border-input bg-transparent pl-10 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">No eSewa configurations found</CardContent></Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-secondary">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Merchant Code</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item) => (
                <tr key={item._id} className="hover:bg-secondary/50">
                  <td className="px-4 py-3 font-medium">{item.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.merchantCode}</td>
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

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? "Edit eSewa Config" : "Add eSewa Config"}>
        <div className="space-y-4">
          <Input label="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Production eSewa" />
          <Input label="Merchant Code *" value={form.merchantCode} onChange={(e) => setForm({ ...form, merchantCode: e.target.value })} placeholder="eSewa merchant code" />
          <Input label="Secret Key *" type="password" value={form.secretKey} onChange={(e) => setForm({ ...form, secretKey: e.target.value })} placeholder="eSewa secret key" />
          <Input label="Payment URL" value={form.paymentUrl} onChange={(e) => setForm({ ...form, paymentUrl: e.target.value })} placeholder="https://rc-epay.esewa.com.np/api/epay/main/v2/form" />
          <Input label="Status URL" value={form.statusUrl} onChange={(e) => setForm({ ...form, statusUrl: e.target.value })} placeholder="https://rc-epay.esewa.com.np/api/epay/main/v2/status" />
          <Input label="Success URL" value={form.successUrl} onChange={(e) => setForm({ ...form, successUrl: e.target.value })} />
          <Input label="Failure URL" value={form.failureUrl} onChange={(e) => setForm({ ...form, failureUrl: e.target.value })} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded border-input" /> Active</label>
        </div>
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>{editing ? "Update" : "Create"}</Button>
        </div>
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Config">
        <p className="text-sm text-muted-foreground mb-4">Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="destructive" onClick={() => deleteTarget && handleDelete(deleteTarget._id)}>Delete</Button>
        </div>
      </Modal>
    </div>
  )
}
