"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Search, Home, IndianRupee, ArrowRight, Building2, MapPin, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatPrice } from "@/lib/utils"
import { useT } from "@/hooks/useT"

interface Room {
  _id: string
  title: string
  monthlyRent: number
  location: string
  photos: string[]
  facilities: string[]
  roomType?: string
  capacity: number
  bookedCount: number
}

export default function HomePage() {
  const { t } = useT()
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)

  const steps = [
    {
      icon: Search,
      title: t("home.step1"),
      description: t("home.step1Desc"),
    },
    {
      icon: Home,
      title: t("home.step2"),
      description: t("home.step2Desc"),
    },
    {
      icon: IndianRupee,
      title: t("home.step3"),
      description: t("home.step3Desc"),
    },
  ]

  useEffect(() => {
    fetch("/api/rooms?limit=6")
      .then((res) => res.json())
      .then((data) => setRooms(Array.isArray(data) ? data : data.rooms || []))
      .catch(() => setRooms([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20 px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            {t("home.title")}
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            {t("home.subtitle")}
          </p>
          <div className="mx-auto mt-10 flex max-w-xl items-center gap-2 rounded-xl bg-background p-2 shadow-lg">
            <Input
              placeholder={t("home.searchPlaceholder")}
              className="border-0 focus-visible:ring-0"
            />
            <Link href="/search">
              <Button size="lg" className="shrink-0">
                <Search className="mr-2 h-4 w-4" />
                {t("home.searchButton")}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <h2 className="text-center text-3xl font-bold">{t("home.howItWorks")}</h2>
        <p className="mt-2 text-center text-muted-foreground">
          {t("home.step1Desc")}
        </p>
        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((step, i) => (
            <Card key={i} className="text-center">
              <CardContent className="pt-6">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <step.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="mt-4 text-xl font-semibold">{step.title}</h3>
                <p className="mt-2 text-muted-foreground">{step.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-muted/30 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-center text-3xl font-bold">{t("home.featuredTitle")}</h2>
          <p className="mt-2 text-center text-muted-foreground">
            {t("home.subtitle")}
          </p>
          {loading ? (
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room) => {
                const bookedCount = room.bookedCount || 0
                const isFullyBooked = bookedCount >= (room.capacity || 1)
                const availableSpots = (room.capacity || 1) - bookedCount
                return (
                  <Link key={room._id} href={`/rooms/${room._id}`}>
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
                        <div className="p-4">
                          <h3 className="font-semibold">{room.title}</h3>
                          <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" />
                            {room.location}
                          </div>
                          <p className="mt-2 text-lg font-bold text-primary">
                            {formatPrice(room.monthlyRent)}
                          </p>
                          {room.roomType === "shared" && !isFullyBooked && bookedCount > 0 && (
                            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                              <Users className="h-3 w-3" />
                              {availableSpots} spot{availableSpots !== 1 ? "s" : ""} remaining
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="mt-12 text-center">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-lg text-muted-foreground">{t("student.noRooms")}</p>
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-primary/5 p-12 text-center">
          <h2 className="text-3xl font-bold">{t("landlord.listNewRoom")}</h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            {t("landlord.registerTitle")}
          </p>
          <Link href="/register">
            <Button size="lg" className="mt-8">
              {t("common.submit")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}
