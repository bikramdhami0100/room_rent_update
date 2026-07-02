"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "react-toastify"
import { Home } from "lucide-react"
import { roomSchema, type RoomInput } from "@/lib/validations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { LocationPicker } from "@/components/ui/location-picker"
import { useT } from "@/hooks/useT"

export default function EditListingPage() {
  const { t } = useT()
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [pageLoading, setPageLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [existingPhotos, setExistingPhotos] = useState<string[]>([])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<RoomInput>({
    resolver: zodResolver(roomSchema),
  })

  const watchedLat = watch("latitude")
  const watchedLng = watch("longitude")

  useEffect(() => {
    async function fetchRoom() {
      try {
        const res = await fetch(`/api/rooms/${id}`)
        if (!res.ok) throw new Error("Failed to load room")
        const room = await res.json()
        setExistingPhotos(room.photos || [])
        reset({
          title: room.title,
          description: room.description,
          monthlyRent: room.monthlyRent,
          location: room.location,
          address: room.address,
          latitude: room.latitude,
          longitude: room.longitude,
          whatsappNumber: room.whatsappNumber ?? "",
          facilities: room.facilities,
          roomType: room.roomType ?? "",
          capacity: room.capacity ?? 1,
        })
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load listing")
        router.push("/landlord/listings")
      } finally {
        setPageLoading(false)
      }
    }
    fetchRoom()
  }, [id, reset, router])

  async function onSubmit(data: RoomInput) {
    setSaving(true)
    try {
      const res = await fetch("/api/landlord/listings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...data, photos: existingPhotos }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to update listing")
      }

      toast.success("Room listing updated successfully")
      router.push("/landlord/listings")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  if (pageLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Edit Room Listing</CardTitle>
            <CardDescription>Loading listing details...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Edit Room Listing</CardTitle>
          <CardDescription>Update your room listing details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              id="title"
              label="Title"
              placeholder="e.g. Cozy Room in Lakeside"
              error={errors.title?.message}
              {...register("title")}
            />
            <div className="space-y-1">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <textarea
                id="description"
                rows={4}
                className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Describe the room, amenities, nearby landmarks..."
                {...register("description")}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>
            <Input
              id="monthlyRent"
              label="Monthly Rent (NPR)"
              type="number"
              placeholder="5000"
              error={errors.monthlyRent?.message}
              {...register("monthlyRent")}
            />
            <div className="space-y-1">
              <label htmlFor="roomType" className="text-sm font-medium">
                Room Type
              </label>
              <select
                id="roomType"
                className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                {...register("roomType")}
              >
                <option value="">Select room type</option>
                <option value="single">Single</option>
                <option value="shared">Shared</option>
                <option value="apartment">Apartment</option>
                <option value="studio">Studio</option>
              </select>
              {errors.roomType && (
                <p className="text-sm text-destructive">{errors.roomType.message}</p>
              )}
            </div>
            <Input
              id="capacity"
              label="Capacity (number of beds/people)"
              type="number"
              placeholder="1"
              error={errors.capacity?.message}
              {...register("capacity")}
            />
            <Input
              id="location"
              label="Location"
              placeholder="e.g. Pokhara, Lakeside"
              error={errors.location?.message}
              {...register("location")}
            />
            <div className="space-y-1">
              <Input
                id="address"
                label="Address"
                placeholder="Full street address"
                error={errors.address?.message}
                {...register("address")}
              />
              <p className="text-xs text-muted-foreground">Google Maps Link - REMOVED</p>
            </div>
            <LocationPicker
              latitude={watchedLat ?? null}
              longitude={watchedLng ?? null}
              onLocationChange={(lat, lng) => {
                setValue("latitude", lat)
                setValue("longitude", lng)
              }}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                id="latitude"
                label="Latitude"
                type="number"
                step="any"
                placeholder="28.2096"
                error={errors.latitude?.message}
                {...register("latitude", { valueAsNumber: true })}
              />
              <Input
                id="longitude"
                label="Longitude"
                type="number"
                step="any"
                placeholder="83.9856"
                error={errors.longitude?.message}
                {...register("longitude", { valueAsNumber: true })}
              />
            </div>
            <Input
              id="whatsappNumber"
              label="WhatsApp Number (optional)"
              placeholder="98XXXXXXXX"
              error={errors.whatsappNumber?.message}
              {...register("whatsappNumber")}
            />
            <Input
              id="facilities"
              label="Facilities"
              placeholder="WiFi, Parking, AC (comma separated)"
              error={errors.facilities?.message}
              {...register("facilities")}
            />
            <Button type="submit" className="w-full" loading={saving}>
              <Home className="mr-2 h-4 w-4" />
              Update Listing
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
