"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Loader2, Search, ArrowUpDown, ArrowUp, ArrowDown, Trash2,
  ChevronLeft, ChevronRight, Plus, Pencil,
} from "lucide-react"
import { formatPrice } from "@/lib/utils"
import { toast } from "react-toastify"
import { useRoleGuard } from "@/hooks/useRoleGuard"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"

interface User {
  _id: string
  name: string
  email: string
  phone?: string
  role: string
  commissionDue?: number
  isSuspended: boolean
  suspensionReason?: string
  createdAt?: string
}

interface UsersResponse {
  users: User[]
  total: number
  page: number
  totalPages: number
}

const INITIAL_FORM = {
  _id: "",
  name: "",
  email: "",
  password: "",
  phone: "",
  role: "student",
  isSuspended: false,
}

export default function AdminStudentsPage() {
  useRoleGuard(["admin"])

  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)

  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortBy, setSortBy] = useState("createdAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [page, setPage] = useState(1)

  const [showFormModal, setShowFormModal] = useState(false)
  const [form, setForm] = useState(INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  const [confirmSuspendId, setConfirmSuspendId] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (roleFilter !== "all") params.set("role", roleFilter)
      if (statusFilter !== "all") params.set("status", statusFilter)
      params.set("sortBy", sortBy)
      params.set("sortOrder", sortOrder)
      params.set("page", String(page))
      params.set("limit", "20")

      const res = await fetch(`/api/admin/manage/students?${params}`)
      if (res.ok) {
        const data: UsersResponse = await res.json()
        setUsers(data.users)
        setTotal(data.total)
        setTotalPages(data.totalPages)
      } else {
        toast.error("Failed to fetch users")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setLoading(false)
    }
  }, [search, roleFilter, statusFilter, sortBy, sortOrder, page])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  async function handleToggleSuspend(id: string, suspend: boolean) {
    setActing(id)
    try {
      const res = await fetch("/api/admin/manage/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: id, action: suspend ? "suspend" : "unsuspend" }),
      })
      if (res.ok) {
        toast.success(suspend ? "User suspended" : "User unsuspended")
        setConfirmSuspendId(null)
        fetchUsers()
      } else {
        const err = await res.json()
        toast.error(err.error || "Action failed")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setActing(null)
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      const res = await fetch(`/api/admin/manage/students?id=${id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("User deleted")
        setDeleteTarget(null)
        fetchUsers()
      } else {
        const err = await res.json()
        toast.error(err.error || "Failed to delete user")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setDeleting(null)
    }
  }

  function handleSort(column: string) {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortBy(column)
      setSortOrder("asc")
    }
    setPage(1)
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value)
    setPage(1)
  }

  function handleRoleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setRoleFilter(e.target.value)
    setPage(1)
  }

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setStatusFilter(e.target.value)
    setPage(1)
  }

  function openAddModal() {
    setForm(INITIAL_FORM)
    setIsEditing(false)
    setShowFormModal(true)
  }

  function openEditModal(user: User) {
    setForm({
      _id: user._id,
      name: user.name,
      email: user.email,
      password: "",
      phone: user.phone || "",
      role: user.role,
      isSuspended: user.isSuspended,
    })
    setIsEditing(true)
    setShowFormModal(true)
  }

  async function handleSaveUser() {
    if (!form.name || !form.email) {
      toast.error("Name and Email are required")
      return
    }
    if (!isEditing && !form.password) {
      toast.error("Password is required for new users")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/admin/manage/students", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          _id: isEditing ? form._id : undefined,
          name: form.name,
          email: form.email,
          password: form.password || undefined,
          phone: form.phone || undefined,
          role: form.role,
          isSuspended: form.isSuspended,
        }),
      })
      if (res.ok) {
        toast.success(isEditing ? "User updated" : "User created")
        setShowFormModal(false)
        setPage(1)
        fetchUsers()
      } else {
        const err = await res.json()
        toast.error(err.error || "Failed to save user")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  function SortIcon({ column }: { column: string }) {
    if (sortBy !== column) return <ArrowUpDown className="ml-1 h-3 w-3 inline opacity-40" />
    return sortOrder === "asc"
      ? <ArrowUp className="ml-1 h-3 w-3 inline" />
      : <ArrowDown className="ml-1 h-3 w-3 inline" />
  }

  function Pagination() {
    if (totalPages <= 1) return null

    function getPageNumbers() {
      const pages: (number | "...")[] = []
      const delta = 2
      const left = Math.max(2, page - delta)
      const right = Math.min(totalPages - 1, page + delta)

      pages.push(1)
      if (left > 2) pages.push("...")
      for (let i = left; i <= right; i++) pages.push(i)
      if (right < totalPages - 1) pages.push("...")
      if (totalPages > 1) pages.push(totalPages)

      return pages
    }

    return (
      <div className="flex items-center justify-between gap-4 pt-4">
        <p className="text-sm text-muted-foreground">
          {total} result{total !== 1 ? "s" : ""}
        </p>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {getPageNumbers().map((p, i) =>
            p === "..." ? (
              <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground text-sm">...</span>
            ) : (
              <Button
                key={p}
                variant={p === page ? "default" : "outline"}
                size="sm"
                className="min-w-[2.25rem]"
                onClick={() => setPage(p)}
              >
                {p}
              </Button>
            )
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  const roleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin": return "destructive" as const
      case "landlord": return "warning" as const
      default: return "default" as const
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 py-10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Manage Users</h1>
          <p className="text-muted-foreground">View and manage student, landlord, and admin accounts</p>
        </div>
        <Button onClick={openAddModal}>
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, email, phone..."
            value={search}
            onChange={handleSearchChange}
            className="flex h-10 w-full rounded-lg border border-input bg-transparent pl-10 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        <select
          value={roleFilter}
          onChange={handleRoleChange}
          className="h-10 rounded-lg border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="all">All Roles</option>
          <option value="student">Student</option>
          <option value="landlord">Landlord</option>
          <option value="admin">Admin</option>
        </select>
        <select
          value={statusFilter}
          onChange={handleStatusChange}
          className="h-10 rounded-lg border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <p className="text-lg text-muted-foreground">No users found</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-secondary">
                <tr>
                  <th
                    className="cursor-pointer select-none px-4 py-3 text-left font-medium"
                    onClick={() => handleSort("name")}
                  >
                    Name <SortIcon column="name" />
                  </th>
                  <th
                    className="cursor-pointer select-none px-4 py-3 text-left font-medium"
                    onClick={() => handleSort("email")}
                  >
                    Email <SortIcon column="email" />
                  </th>
                  <th className="px-4 py-3 text-left font-medium">Phone</th>
                  <th className="px-4 py-3 text-left font-medium">Role</th>
                  <th className="px-4 py-3 text-left font-medium">Commission Due</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-secondary/50">
                    <td className="px-4 py-3 font-medium">{u.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.phone || "N/A"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={roleBadgeVariant(u.role)}>
                        {u.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {u.commissionDue ? formatPrice(u.commissionDue) : "N/A"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={u.isSuspended ? "destructive" : "success"}>
                        {u.isSuspended ? "Suspended" : "Active"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditModal(u)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant={u.isSuspended ? "default" : "destructive"}
                          onClick={() => setConfirmSuspendId(u._id)}
                          loading={acting === u._id}
                        >
                          {u.isSuspended ? "Unsuspend" : "Suspend"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteTarget(u)}
                          disabled={u.role === "admin"}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination />
        </>
      )}

      {/* Add/Edit User Modal */}
      <Modal isOpen={showFormModal} onClose={() => setShowFormModal(false)} title={isEditing ? "Edit User" : "Add User"}>
        <div className="space-y-4">
          <Input
            label="Name *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Full name"
          />
          <Input
            label="Email *"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="email@example.com"
          />
          <Input
            label={isEditing ? "Password (leave blank to keep current)" : "Password *"}
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder={isEditing ? "New password (optional)" : "Password"}
          />
          <Input
            label="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="Phone number"
          />
          <div className="space-y-1">
            <label className="text-sm font-medium block mb-1">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="flex h-10 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="student">Student</option>
              <option value="landlord">Landlord</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isSuspended}
              onChange={(e) => setForm({ ...form, isSuspended: e.target.checked })}
              className="rounded border-input"
            />
            Suspended
          </label>
        </div>
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={() => setShowFormModal(false)}>Cancel</Button>
          <Button onClick={handleSaveUser} loading={saving}>
            {isEditing ? "Update" : "Create"}
          </Button>
        </div>
      </Modal>

      {/* Suspend/Unsuspend Confirmation */}
      <Modal
        isOpen={confirmSuspendId !== null}
        onClose={() => setConfirmSuspendId(null)}
        title="Confirm Action"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to {users.find((s) => s._id === confirmSuspendId)?.isSuspended ? "unsuspend" : "suspend"} this user?
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmSuspendId(null)}>Cancel</Button>
            <Button
              variant={users.find((s) => s._id === confirmSuspendId)?.isSuspended ? "default" : "destructive"}
              onClick={() => {
                const user = users.find((s) => s._id === confirmSuspendId)
                if (user) handleToggleSuspend(confirmSuspendId!, !user.isSuspended)
              }}
              loading={acting === confirmSuspendId}
            >
              Confirm
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete User">
        <p className="text-sm text-muted-foreground mb-4">
          Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={() => deleteTarget && handleDelete(deleteTarget._id)}
            loading={deleting === deleteTarget?._id}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  )
}
