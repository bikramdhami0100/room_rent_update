"use client"

import { useEffect, useRef } from "react"
import { MapPin } from "lucide-react"

interface RoomMapProps {
  latitude: number
  longitude: number
  title: string
}

export function RoomMap({ latitude, longitude, title }: RoomMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<unknown>(null)

  useEffect(() => {
    let map: unknown = null
    let L: typeof import("leaflet") | null = null

    async function initMap() {
      if (mapRef.current && !mapInstanceRef.current) {
        try {
          L = (await import("leaflet")).default
          await import("leaflet/dist/leaflet.css")

          map = L.map(mapRef.current).setView([latitude, longitude], 15)

          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a>",
            maxZoom: 19,
          }).addTo(map)

          const icon = L.divIcon({
            className: "",
            html: `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44"><path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 26 18 26s18-12.5 18-26C36 8.06 27.94 0 18 0z" fill="#e11d48" stroke="#be123c" stroke-width="1.5"/><circle cx="18" cy="18" r="7" fill="white"/></svg>`,
            iconSize: [36, 44],
            iconAnchor: [18, 44],
          })

          L.marker([latitude, longitude], { icon }).addTo(map).bindPopup(title)

          mapInstanceRef.current = map
        } catch {
          // leaflet failed to load
        }
      }
    }

    initMap()

    return () => {
      if (mapInstanceRef.current) {
        try {
          ;(mapInstanceRef.current as { remove: () => void }).remove()
        } catch {}
        mapInstanceRef.current = null
      }
    }
  }, [latitude, longitude, title])

  if (!latitude || !longitude) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <MapPin className="h-4 w-4" />
        Location on Map
      </div>
      <div ref={mapRef} className="h-64 w-full rounded-xl border overflow-hidden" />
    </div>
  )
}
