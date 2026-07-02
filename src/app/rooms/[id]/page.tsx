"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { MapPin, Phone, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ImageGallery } from "@/components/ui/image-gallery"
import { formatPrice } from "@/lib/utils"
import { RoomMap } from "@/components/ui/room-map"
import { toast } from "react-toastify"

interface Landlord {
  _id: string
  name: string
  phone: string
  email: string
}

interface Room {
  _id: string
  title: string
  description: string
  monthlyRent: number
  location: string
  address: string
  latitude?: number
  longitude?: number
  photos: string[]
  facilities: string[]
  whatsappNumber?: string
  landlordId: Landlord
}

export default function RoomDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [room, setRoom] = useState<Room | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState(0)
  const [galleryOpen, setGalleryOpen] = useState(false)

  useEffect(() => {
    fetch(`/api/rooms/${params.id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found")
        return res.json()
      })
      .then((data) => setRoom(data))
      .catch(() => setRoom(null))
      .finally(() => setLoading(false))
  }, [params.id])

  async function handleConfirm() {
    setConfirming(true)
    try {
      const res = await fetch("/api/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: params.id }),
      })
      if (res.status === 401) {
        router.push("/login")
        return
      }
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to confirm")
      }
      const data = await res.json()
      toast.success("Stay confirmed successfully!")
      router.push(`/payment/${data.confirmation._id}`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setConfirming(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!room) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <p className="text-muted-foreground">Room not found</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/search" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Back to search
      </Link>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <button
            onClick={() => setGalleryOpen(true)}
            className="aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted"
          >
            {room.photos?.[selectedPhoto] && (
              <img
                src={room.photos[selectedPhoto]}
                alt={room.title}
                className="h-full w-full object-cover"
              />
            )}
            {room.photos && room.photos.length > 1 && (
              <div className="absolute bottom-4 right-4 rounded-full bg-black/60 px-3 py-1 text-sm text-white">
                {selectedPhoto + 1} / {room.photos.length}
              </div>
            )}
          </button>
          {room.photos && room.photos.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {room.photos.map((photo, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedPhoto(i)}
                  className={`h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 ${
                    i === selectedPhoto ? "border-primary" : "border-transparent"
                  }`}
                >
                  <img src={photo} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
          {"latitude" in room && room.latitude && room.longitude && (
            <RoomMap
              latitude={room.latitude}
              longitude={room.longitude}
              title={room.title}
            />
          )}
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">{room.title}</h1>
            <p className="mt-2 text-3xl font-bold text-primary">{formatPrice(room.monthlyRent)}</p>
          </div>

          <div className="flex items-start gap-2 text-muted-foreground">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{room.address || room.location}</span>
          </div>

          {room.facilities && room.facilities.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {room.facilities.map((f, i) => (
                <Badge key={i} variant="secondary">{f}</Badge>
              ))}
            </div>
          )}

          <p className="text-muted-foreground">{room.description}</p>

          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="font-semibold">Landlord: {room.landlordId?.name || "N/A"}</p>
              {room.landlordId?.phone && (
                <a href={`tel:${room.landlordId.phone}`}>
                  <Button variant="outline" className="w-full">
                    <Phone className="mr-2 h-4 w-4" /> Call {room.landlordId.phone}
                  </Button>
                </a>
              )}
              {room.whatsappNumber && (
                <a
                  href={`https://wa.me/${room.whatsappNumber.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" className="w-full">
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> WhatsApp
                  </Button>
                </a>
              )}
            </CardContent>
          </Card>

          <Button size="lg" className="w-full" loading={confirming} onClick={handleConfirm}>
            Confirm Stay
          </Button>
        </div>
      </div>

      <ImageGallery
        images={room.photos || []}
        initialIndex={selectedPhoto}
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
      />
    </div>
  )
}
