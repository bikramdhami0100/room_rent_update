"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, MapPin, Loader2, Pencil, Trash2 } from "lucide-react"
import { toast } from "react-toastify"
import { formatPrice } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import type { IRoom } from "@/types"

export default function MyListingsPage() {
  const router = useRouter()
  const [listings, setListings] = useState<IRoom[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetchListings()
  }, [])

  async function fetchListings() {
    try {
      const res = await fetch("/api/landlord/listings")
      if (res.ok) {
        const data = await res.json()
        setListings(data)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  function handleEdit(listing: IRoom) {
    router.push(`/landlord/listings/edit/${listing._id}`)
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Are you sure you want to delete this listing?")) return
    setDeletingId(id)
    try {
      const res = await fetch("/api/landlord/listings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        setListings((prev) => prev.filter((l) => l._id !== id))
      } else {
        const err = await res.json().catch(() => ({ error: "Failed to delete listing" }))
        toast.error(err.error)
      }
    } catch {
      toast.error("Something went wrong while deleting")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Listings</h1>
          <p className="text-muted-foreground">Manage your room listings</p>
        </div>
        <Link href="/landlord/listings/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add New Listing
          </Button>
        </Link>
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
            <Link href="/landlord/listings/new">
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Create your first listing
              </Button>
            </Link>
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(listing)}
                  >
                    <Pencil className="mr-1 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(listing._id)}
                    disabled={deletingId === listing._id}
                  >
                    {deletingId === listing._id ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-1 h-4 w-4" />
                    )}
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
