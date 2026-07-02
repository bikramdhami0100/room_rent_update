"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "react-toastify"
import { Megaphone } from "lucide-react"
import { roomSchema, type RoomInput } from "@/lib/validations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { LocationPicker } from "@/components/ui/location-picker"

export default function NewListingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [photos, setPhotos] = useState<FileList | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RoomInput>({
    resolver: zodResolver(roomSchema),
  })

  const watchedLat = watch("latitude")
  const watchedLng = watch("longitude")

  async function onSubmit(data: RoomInput) {
    setLoading(true)
    try {
      let photoUrls: string[] = []

      if (photos && photos.length > 0) {
        for (const file of Array.from(photos)) {
          const formData = new FormData()
          formData.append("file", file)
          const uploadRes = await fetch("/api/upload", { method: "POST", body: formData })
          const { url } = await uploadRes.json()
          photoUrls.push(url)
        }
      }

      const res = await fetch("/api/landlord/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, photos: photoUrls }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to create listing")
      }

      toast.success("Room listing created successfully")
      router.push("/landlord/listings")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-10">
      <Card>
        <CardHeader>
          <CardTitle>New Room Listing</CardTitle>
          <CardDescription>List a new room for rent</CardDescription>
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
                <option value="single">Single Room</option>
                <option value="shared">Shared Room</option>
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
            <div className="space-y-1">
              <label className="text-sm font-medium">Photos</label>
              <input
                type="file"
                multiple
                accept="image/*"
                className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium"
                onChange={(e) => setPhotos(e.target.files)}
              />
            </div>
            <Button type="submit" className="w-full" loading={loading}>
              <Megaphone className="mr-2 h-4 w-4" />
              Publish Listing
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
