"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { Search, MapPin, Building2, Phone, Users, Navigation } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Pagination } from "@/components/ui/pagination"
import { ImageGallery } from "@/components/ui/image-gallery"
import { formatPrice } from "@/lib/utils"
import { useT } from "@/hooks/useT"

interface Room {
  _id: string
  title: string
  description: string
  monthlyRent: number
  location: string
  address: string
  photos: string[]
  facilities: string[]
  whatsappNumber?: string
  roomType?: string
  capacity: number
  bookedCount: number
  distance?: number | null
  landlordId?: { _id: string; name: string; phone: string }
}

function RoomCard({ room, onImageClick }: { room: Room; onImageClick: () => void }) {
  const bookedCount = room.bookedCount || 0
  const isFullyBooked = bookedCount >= (room.capacity || 1)
  const availableSpots = (room.capacity || 1) - bookedCount

  return (
    <Card className={`overflow-hidden transition-shadow hover:shadow-lg ${isFullyBooked ? "opacity-70" : ""}`}>
      <CardContent className="p-0">
        <button onClick={onImageClick} className="aspect-[4/3] bg-muted relative w-full">
          {room.photos?.[0] && (
            <img
              src={room.photos[0]}
              alt={room.title}
              className="h-full w-full object-cover"
            />
          )}
          {room.photos && room.photos.length > 1 && (
            <div className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
              +{room.photos.length - 1} photos
            </div>
          )}
          <div className="absolute top-2 right-2 flex flex-col gap-1">
            {isFullyBooked && (
              <Badge variant="destructive">Fully Booked</Badge>
            )}
            {room.roomType === "shared" && !isFullyBooked && bookedCount > 0 && (
              <Badge variant="secondary">{bookedCount}/{room.capacity} Booked</Badge>
            )}
          </div>
        </button>
        <div className="p-4 space-y-2">
          <h3 className="font-semibold line-clamp-1">{room.title}</h3>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {room.location}
          </div>
          {room.distance != null && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Navigation className="h-3 w-3" />
              {room.distance.toFixed(1)} km away
            </div>
          )}
          <p className="text-lg font-bold text-primary">{formatPrice(room.monthlyRent)}</p>
          {room.landlordId?.phone && (
            <a href={`tel:${room.landlordId.phone}`} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
              <Phone className="h-3.5 w-3.5" />
              {room.landlordId.phone}
            </a>
          )}
          {room.facilities && room.facilities.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {room.facilities.slice(0, 3).map((f, i) => (
                <Badge key={i} variant="secondary">{f}</Badge>
              ))}
              {room.facilities.length > 3 && (
                <Badge variant="outline">+{room.facilities.length - 3}</Badge>
              )}
            </div>
          )}
          {room.roomType === "shared" && !isFullyBooked && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              {availableSpots} spot{availableSpots !== 1 ? "s" : ""} remaining
            </div>
          )}
          <Link href={`/rooms/${room._id}`}>
            <Button variant="outline" size="sm" className="w-full mt-2" disabled={isFullyBooked}>
              {isFullyBooked ? "Unavailable" : "View Details"}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

export default function SearchPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [location, setLocation] = useState("")
  const [maxPrice, setMaxPrice] = useState("")
  const [roomType, setRoomType] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("createdAt")
  const [order, setOrder] = useState("desc")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [userLat, setUserLat] = useState<string>("")
  const [userLng, setUserLng] = useState<string>("")
  const [nearbyActive, setNearbyActive] = useState(false)
  const [gettingLocation, setGettingLocation] = useState(false)

  const [galleryOpen, setGalleryOpen] = useState(false)
  const [galleryImages, setGalleryImages] = useState<string[]>([])
  const [galleryIndex, setGalleryIndex] = useState(0)

  const { t } = useT()

  const fetchRooms = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (location) params.set("location", location)
    if (maxPrice) params.set("maxPrice", maxPrice)
    if (roomType) params.set("roomType", roomType)
    if (searchQuery) params.set("q", searchQuery)
    if (userLat) params.set("lat", userLat)
    if (userLng) params.set("lng", userLng)
    params.set("sortBy", sortBy)
    params.set("order", order)
    params.set("page", String(page))
    params.set("limit", "12")
    fetch(`/api/rooms?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        const roomList = Array.isArray(data) ? data : data.rooms || []
        setRooms(roomList)
        setTotal(data.total ?? roomList.length)
        setTotalPages(data.totalPages ?? Math.ceil(roomList.length / 12))
      })
      .catch(() => setRooms([]))
      .finally(() => setLoading(false))
  }, [location, maxPrice, roomType, searchQuery, sortBy, order, page, userLat, userLng])

  const fetchRoomsRef = useRef(fetchRooms)
  fetchRoomsRef.current = fetchRooms

  useEffect(() => {
    fetchRooms()
  }, [fetchRooms])

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        fetchRoomsRef.current()
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    fetchRooms()
  }

  function handleSortChange(value: string) {
    const [newSortBy, newOrder] = value.split("-")
    setSortBy(newSortBy)
    setOrder(newOrder)
    setPage(1)
  }

  function handleNearby() {
    if (!navigator.geolocation) return
    setGettingLocation(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude.toString())
        setUserLng(pos.coords.longitude.toString())
        setNearbyActive(true)
        setGettingLocation(false)
        setPage(1)
      },
      () => {
        setGettingLocation(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  function clearNearby() {
    setUserLat("")
    setUserLng("")
    setNearbyActive(false)
    setPage(1)
  }

  function openGallery(images: string[], index: number) {
    setGalleryImages(images)
    setGalleryIndex(index)
    setGalleryOpen(true)
  }

  const sortValue = `${sortBy}-${order}`

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <form onSubmit={handleSearch} className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by title, location, address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("student.location")}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={roomType}
          onChange={(e) => { setRoomType(e.target.value); setPage(1) }}
          className="flex h-10 rounded-lg border border-input bg-transparent px-3 py-2 text-sm sm:w-36"
        >
          <option value="">All Types</option>
          <option value="single">Single</option>
          <option value="shared">Shared</option>
          <option value="apartment">Apartment</option>
          <option value="studio">Studio</option>
        </select>
        <Input
          type="number"
          placeholder={t("student.maxPrice")}
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          className="sm:w-36"
        />
        <Button type="submit">
          <Search className="mr-2 h-4 w-4" /> {t("home.searchButton")}
        </Button>
      </form>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            {total} room{total !== 1 ? "s" : ""} found
          </p>
          {nearbyActive && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Navigation className="h-3 w-3" /> Nearby
              <button onClick={clearNearby} className="ml-1 hover:text-foreground">&times;</button>
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={nearbyActive ? "default" : "outline"}
            size="sm"
            onClick={nearbyActive ? clearNearby : handleNearby}
            loading={gettingLocation}
          >
            <Navigation className="mr-1.5 h-4 w-4" />
            {nearbyActive ? "Clear Nearby" : "Near Me"}
          </Button>
          <select
            value={sortValue}
            onChange={(e) => handleSortChange(e.target.value)}
            className="flex h-9 rounded-lg border border-input bg-transparent px-3 py-1 text-sm sm:w-48"
          >
            <option value="createdAt-desc">Newest First</option>
            <option value="createdAt-asc">Oldest First</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            {nearbyActive && <option value="distance-asc">Nearest First</option>}
            {nearbyActive && <option value="distance-desc">Farthest First</option>}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-0">
                <div className="aspect-[4/3] animate-pulse bg-muted" />
                <div className="space-y-2 p-4">
                  <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : rooms.length > 0 ? (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => (
              <RoomCard
                key={room._id}
                room={room}
                onImageClick={() => openGallery(room.photos || [], 0)}
              />
            ))}
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            onPageChange={setPage}
          />
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-lg text-muted-foreground">{t("student.noRooms")}</p>
        </div>
      )}

      <ImageGallery
        images={galleryImages}
        initialIndex={galleryIndex}
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
      />
    </div>
  )
}
