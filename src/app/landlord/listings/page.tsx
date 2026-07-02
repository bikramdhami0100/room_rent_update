"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, MapPin, Loader2, Pencil, Trash2, Megaphone, Home } from "lucide-react"
import { toast } from "react-toastify"
import { formatPrice } from "@/lib/utils"
import { roomSchema, type RoomInput } from "@/lib/validations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Modal } from "@/components/ui/modal"
import { LocationPicker } from "@/components/ui/location-picker"
import type { IRoom } from "@/types"

interface RoomFormState {
  listing: IRoom | null
  photos: string[]
}

const EMPTY_FORM: RoomInput = {
  title: "",
  description: "",
  monthlyRent: 0,
  location: "",
  address: "",
  latitude: undefined,
  longitude: undefined,
  whatsappNumber: "",
  facilities: "",
  roomType: "",
  capacity: 1,
}

export default function MyListingsPage() {
  const [listings, setListings] = useState<IRoom[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<RoomFormState | null>(null)
  const [saving, setSaving] = useState(false)
  const [newPhotos, setNewPhotos] = useState<FileList | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<IRoom | null>(null)
  const [deleting, setDeleting] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<RoomInput>({
    resolver: zodResolver(roomSchema),
    defaultValues: EMPTY_FORM,
  })

  const watchedLat = watch("latitude")
  const watchedLng = watch("longitude")

  useEffect(() => { fetchListings() }, [])

  async function fetchListings() {
    try {
      const res = await fetch("/api/landlord/listings")
      if (res.ok) setListings(await res.json())
    } catch {} finally { setLoading(false) }
  }

  function openAdd() {
    setEditing(null)
    setNewPhotos(null)
    reset(EMPTY_FORM)
    setShowModal(true)
  }

  function openEdit(listing: IRoom) {
    setEditing({ listing, photos: listing.photos || [] })
    setNewPhotos(null)
    reset({
      title: listing.title,
      description: listing.description,
      monthlyRent: listing.monthlyRent,
      location: listing.location,
      address: listing.address,
      latitude: listing.latitude,
      longitude: listing.longitude,
      whatsappNumber: listing.whatsappNumber ?? "",
      facilities: listing.facilities,
      roomType: listing.roomType ?? "",
      capacity: listing.capacity ?? 1,
    })
    setShowModal(true)
  }

  async function onSubmit(data: RoomInput) {
    setSaving(true)
    try {
      let photoUrls = editing?.photos || []

      if (newPhotos && newPhotos.length > 0) {
        for (const file of Array.from(newPhotos)) {
          const formData = new FormData()
          formData.append("file", file)
          const uploadRes = await fetch("/api/upload", { method: "POST", body: formData })
          const { url } = await uploadRes.json()
          photoUrls.push(url)
        }
      }

      if (editing) {
        const res = await fetch("/api/landlord/listings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editing.listing._id, ...data, photos: photoUrls }),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || "Failed to update listing")
        }
        toast.success("Listing updated")
      } else {
        const res = await fetch("/api/landlord/listings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...data, photos: photoUrls }),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || "Failed to create listing")
        }
        toast.success("Listing created")
      }

      setShowModal(false)
      fetchListings()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch("/api/landlord/listings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteTarget._id }),
      })
      if (res.ok) {
        setListings((prev) => prev.filter((l) => l._id !== deleteTarget._id))
        toast.success("Listing deleted")
      } else {
        const err = await res.json().catch(() => ({ error: "Failed to delete" }))
        toast.error(err.error)
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  const isEdit = !!editing

  return (
    <div className="mx-auto max-w-5xl space-y-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Listings</h1>
          <p className="text-muted-foreground">Manage your room listings</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add New Listing
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : listings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <MapPin className="h-12 w-12 text-muted-foreground" />
            <p className="text-lg text-muted-foreground">No listings yet</p>
            <Button variant="outline" onClick={openAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Create your first listing
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <Card key={listing._id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg">{listing.title}</CardTitle>
                  <div className="flex shrink-0 gap-1">
                    <Badge variant={listing.isApproved ? "success" : "warning"}>
                      {listing.isApproved ? "Approved" : "Pending"}
                    </Badge>
                    <Badge variant={listing.isActive ? "default" : "secondary"}>
                      {listing.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
                <CardDescription>{listing.location}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold">{formatPrice(listing.monthlyRent)}/month</p>
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(listing)}>
                    <Pencil className="mr-1 h-4 w-4" />
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(listing)}>
                    <Trash2 className="mr-1 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={isEdit ? "Edit Room Listing" : "New Room Listing"}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Title" placeholder="e.g. Cozy Room in Lakeside" error={errors.title?.message} {...register("title")} />
          <div className="space-y-1">
            <label className="text-sm font-medium">Description</label>
            <textarea rows={3} className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="Describe the room..." {...register("description")} />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>
          <Input label="Monthly Rent (NPR)" type="number" placeholder="5000" error={errors.monthlyRent?.message} {...register("monthlyRent")} />
          <Input label="Location" placeholder="e.g. Pokhara, Lakeside" error={errors.location?.message} {...register("location")} />
          <Input label="Address" placeholder="Full street address" error={errors.address?.message} {...register("address")} />
          <LocationPicker
            latitude={watchedLat ?? null}
            longitude={watchedLng ?? null}
            onLocationChange={(lat, lng) => { setValue("latitude", lat); setValue("longitude", lng) }}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Latitude" type="number" step="any" placeholder="28.2096" error={errors.latitude?.message} {...register("latitude", { valueAsNumber: true })} />
            <Input label="Longitude" type="number" step="any" placeholder="83.9856" error={errors.longitude?.message} {...register("longitude", { valueAsNumber: true })} />
          </div>
          <Input label="WhatsApp Number (optional)" placeholder="98XXXXXXXX" error={errors.whatsappNumber?.message} {...register("whatsappNumber")} />
          <Input label="Facilities" placeholder="WiFi, Parking, AC (comma separated)" error={errors.facilities?.message} {...register("facilities")} />
          <div className="space-y-1">
            <label className="text-sm font-medium">Room Type</label>
            <select className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" {...register("roomType")}>
              <option value="">Select room type</option>
              <option value="single">Single Room</option>
              <option value="shared">Shared Room</option>
              <option value="apartment">Apartment</option>
              <option value="studio">Studio</option>
            </select>
            {errors.roomType && <p className="text-sm text-destructive">{errors.roomType.message}</p>}
          </div>
          <Input label="Capacity" type="number" placeholder="1" error={errors.capacity?.message} {...register("capacity")} />
          <div className="space-y-1">
            <label className="text-sm font-medium">Photos {isEdit ? "(add more)" : ""}</label>
            <input type="file" multiple accept="image/*" className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium" onChange={(e) => setNewPhotos(e.target.files)} />
            {isEdit && editing?.photos.length ? <p className="text-xs text-muted-foreground">{editing.photos.length} existing photo(s)</p> : null}
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={saving}>
              {isEdit ? <><Home className="mr-2 h-4 w-4" />Update Listing</> : <><Megaphone className="mr-2 h-4 w-4" />Publish Listing</>}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Listing">
        <p className="text-sm text-muted-foreground mb-4">
          Are you sure you want to delete <strong>{deleteTarget?.title}</strong>? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} loading={deleting}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  )
}
