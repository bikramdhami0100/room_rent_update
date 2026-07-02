"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Loader2, Crosshair, Search, MapPin } from "lucide-react"

interface LocationPickerProps {
  latitude: number | null
  longitude: number | null
  onLocationChange: (lat: number, lng: number) => void
}

export function LocationPicker({ latitude, longitude, onLocationChange }: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const leafletRef = useRef<any>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const [gettingLocation, setGettingLocation] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [address, setAddress] = useState<string>("")
  const [resolvingAddress, setResolvingAddress] = useState(false)

  const defaultLat = 28.2096
  const defaultLng = 83.9856

  const currentLat = latitude ?? defaultLat
  const currentLng = longitude ?? defaultLng

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setResolvingAddress(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
      )
      const data = await res.json()
      setAddress(data.display_name || "")
    } catch {
      setAddress("")
    } finally {
      setResolvingAddress(false)
    }
  }, [])

  function handleLocationChange(lat: number, lng: number) {
    onLocationChange(lat, lng)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => reverseGeocode(lat, lng), 300)
  }

  function getCurrentLocation() {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser")
      return
    }

    setGettingLocation(true)
    setGeoError(null)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        handleLocationChange(lat, lng)
        if (mapInstanceRef.current && markerRef.current) {
          markerRef.current.setLatLng([lat, lng])
          mapInstanceRef.current.setView([lat, lng], 16)
        }
        setGettingLocation(false)
      },
      (err) => {
        setGeoError(err.message)
        setGettingLocation(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  async function handleSearch() {
    const q = searchQuery.trim()
    if (!q) return

    setSearching(true)
    setGeoError(null)

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&countrycodes=NP`
      )
      const data = await res.json()
      setSearchResults(data)
    } catch {
      setGeoError("Search failed. Try again.")
    } finally {
      setSearching(false)
    }
  }

  function goToResult(lat: string, lng: string, displayName: string) {
    const latNum = parseFloat(lat)
    const lngNum = parseFloat(lng)
    handleLocationChange(latNum, lngNum)
    if (mapInstanceRef.current && markerRef.current) {
      markerRef.current.setLatLng([latNum, lngNum])
      mapInstanceRef.current.setView([latNum, lngNum], 16)
    }
    setSearchQuery(displayName)
    setSearchResults([])
    setAddress(displayName)
  }

  useEffect(() => {
    async function initMap() {
      if (!mapRef.current || mapInstanceRef.current) return

      try {
        const L = (await import("leaflet")).default
        await import("leaflet/dist/leaflet.css")
        leafletRef.current = L

        const map = L.map(mapRef.current).setView([currentLat, currentLng], 15)

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
          maxZoom: 19,
        }).addTo(map)

        const icon = L.divIcon({
          className: "",
          html: `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44"><path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 26 18 26s18-12.5 18-26C36 8.06 27.94 0 18 0z" fill="#e11d48" stroke="#be123c" stroke-width="1.5"/><circle cx="18" cy="18" r="7" fill="white"/></svg>`,
          iconSize: [36, 44],
          iconAnchor: [18, 44],
        })

        const marker = L.marker([currentLat, currentLng], { draggable: true, icon }).addTo(map)
        marker.on("dragend", () => {
          const pos = marker.getLatLng()
          handleLocationChange(pos.lat, pos.lng)
        })

        map.on("click", (e: any) => {
          const { lat, lng } = e.latlng
          marker.setLatLng([lat, lng])
          handleLocationChange(lat, lng)
        })

        markerRef.current = marker
        mapInstanceRef.current = map

        reverseGeocode(currentLat, currentLng)
      } catch {
        // leaflet failed to load
      }
    }

    initMap()

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
        markerRef.current = null
        leafletRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current) {
      markerRef.current.setLatLng([currentLat, currentLng])
      mapInstanceRef.current.setView([currentLat, currentLng])
    }
  }, [currentLat, currentLng])

  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault()
      handleSearch()
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Pin Location on Map</label>
        <button
          type="button"
          onClick={getCurrentLocation}
          disabled={gettingLocation}
          className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-50"
        >
          {gettingLocation ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Crosshair className="h-3.5 w-3.5" />
          )}
          {gettingLocation ? "Locating..." : "Use My Location"}
        </button>
      </div>

      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search for a place..."
              className="flex h-9 w-full rounded-lg border border-input bg-transparent pl-8 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <button
            type="button"
            onClick={handleSearch}
            disabled={searching || !searchQuery.trim()}
            className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-50"
          >
            {searching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Search"}
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="absolute z-10 mt-1 w-full rounded-lg border bg-background shadow-lg">
            {searchResults.map((r, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goToResult(r.lat, r.lon, r.display_name)}
                className="w-full px-3 py-2 text-left text-sm transition-colors hover:bg-accent first:rounded-t-lg last:rounded-b-lg"
              >
                {r.display_name}
              </button>
            ))}
          </div>
        )}
      </div>

      {address && (
        <div className="flex items-start gap-2 rounded-lg border bg-muted/50 px-3 py-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">{address}</p>
        </div>
      )}
      {resolvingAddress && !address && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Resolving address...</p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">Click on the map or drag the marker for accurate location</p>
      {geoError && <p className="text-xs text-destructive">{geoError}</p>}
      <div ref={mapRef} className="h-64 w-full rounded-xl border overflow-hidden" />
    </div>
  )
}
