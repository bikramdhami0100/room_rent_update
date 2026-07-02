"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { Search, MapPin, Building2, Phone, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Pagination } from "@/components/ui/pagination"
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
  landlordId?: { _id: string; name: string; phone: string }
}

function RoomCard({ room }: { room: Room }) {
  const bookedCount = room.bookedCount || 0
  const isFullyBooked = bookedCount >= (room.capacity || 1)
  const availableSpots = (room.capacity || 1) - bookedCount

  return (
    <Card className={`overflow-hidden transition-shadow hover:shadow-lg ${isFullyBooked ? "opacity-70" : ""}`}>
      <CardContent className="p-0">
        <div className="aspect-[4/3] bg-muted relative">
          {room.photos?.[0] && (
            <img
              src={room.photos[0]}
              alt={room.title}
              className="h-full w-full object-cover"
            />
          )}
          <div className="absolute top-2 right-2 flex flex-col gap-1">
            {isFullyBooked && (
              <Badge variant="destructive">Fully Booked</Badge>
            )}
            {room.roomType === "shared" && !isFullyBooked && bookedCount > 0 && (
              <Badge variant="secondary">{bookedCount}/{room.capacity} Booked</Badge>
            )}
          </div>
        </div>
        <div className="p-4 space-y-2">
          <h3 className="font-semibold line-clamp-1">{room.title}</h3>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {room.location}
          </div>
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

  const { t } = useT()

  const fetchRooms = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (location) params.set("location", location)
    if (maxPrice) params.set("maxPrice", maxPrice)
    if (roomType) params.set("roomType", roomType)
    if (searchQuery) params.set("q", searchQuery)
    params.set("sortBy", sortBy)
    params.set("order", order)
    params.set("page", String(page))
    params.set("limit", "12")
    fetch(`/api/rooms?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setRooms(Array.isArray(data) ? data : data.rooms || [])
        setTotal(data.total ?? 0)
        setTotalPages(data.totalPages ?? 0)
      })
      .catch(() => setRooms([]))
      .finally(() => setLoading(false))
  }, [location, maxPrice, roomType, searchQuery, sortBy, order, page])

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

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {total} room{total !== 1 ? "s" : ""} found
        </p>
        <select
          value={sortValue}
          onChange={(e) => handleSortChange(e.target.value)}
          className="flex h-9 rounded-lg border border-input bg-transparent px-3 py-1 text-sm sm:w-48"
        >
          <option value="createdAt-desc">Newest First</option>
          <option value="createdAt-asc">Oldest First</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
        </select>
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
              <RoomCard key={room._id} room={room} />
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
    </div>
  )
}
