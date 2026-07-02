"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { MapPin, Calendar, AlertTriangle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatPrice, getDaysRemaining } from "@/lib/utils"

interface Room {
  _id: string
  title: string
  monthlyRent: number
  location: string
  photos: string[]
}

interface Confirmation {
  _id: string
  roomId: Room
  commission: number
  commissionDeadline: string
  paymentStatus: "pending" | "paid" | "overdue"
}

export default function ConfirmDetailPage() {
  const params = useParams()
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/confirm/${params.id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found")
        return res.json()
      })
      .then((data) => setConfirmation(data))
      .catch(() => setConfirmation(null))
      .finally(() => setLoading(false))
  }, [params.id])

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!confirmation) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <p className="text-muted-foreground">Confirmation not found</p>
      </div>
    )
  }

  const deadline = new Date(confirmation.commissionDeadline)
  const daysLeft = getDaysRemaining(deadline)

  const statusVariant =
    confirmation.paymentStatus === "paid" ? "success" :
    confirmation.paymentStatus === "overdue" ? "destructive" : "warning"

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <Card>
        <CardContent className="p-6 space-y-6">
          <h1 className="text-2xl font-bold">Confirmation Details</h1>

          <div className="flex gap-4">
            {confirmation.roomId?.photos?.[0] && (
              <img
                src={confirmation.roomId.photos[0]}
                alt={confirmation.roomId.title}
                className="h-24 w-32 rounded-lg object-cover"
              />
            )}
            <div>
              <h2 className="text-lg font-semibold">{confirmation.roomId?.title}</h2>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <MapPin className="h-3.5 w-3.5" />
                {confirmation.roomId?.location}
              </div>
              <p className="text-primary font-bold mt-1">{formatPrice(confirmation.roomId?.monthlyRent)}</p>
            </div>
          </div>

          <hr className="border-border" />

          <div className="text-center">
            <p className="text-sm text-muted-foreground">Commission Amount</p>
            <p className="text-4xl font-bold text-primary">{formatPrice(confirmation.commission)}</p>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-muted p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Deadline</p>
                <p className="font-medium">{deadline.toLocaleDateString()}</p>
              </div>
            </div>
            <Badge variant={statusVariant}>
              {daysLeft > 0 ? `${daysLeft} days left` : "Overdue"}
            </Badge>
          </div>

          <div className="flex justify-center">
            <Badge variant={statusVariant} className="text-sm px-4 py-1.5">
              {confirmation.paymentStatus === "paid" ? "Paid" :
               confirmation.paymentStatus === "overdue" ? "Overdue" : "Pending"}
            </Badge>
          </div>

          {confirmation.paymentStatus === "pending" && (
            <Link href={`/payment/${confirmation._id}`}>
              <Button size="lg" className="w-full">Pay Commission</Button>
            </Link>
          )}

          {confirmation.paymentStatus === "overdue" && (
            <div className="flex items-start gap-3 rounded-lg bg-destructive/10 p-4 text-destructive">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">Payment overdue! Account will be suspended</p>
            </div>
          )}

          {confirmation.paymentStatus === "paid" && (
            <div className="flex items-start gap-3 rounded-lg bg-accent/30 p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent-foreground" />
              <div className="text-sm">
                <p className="font-medium text-accent-foreground">Commission paid successfully!</p>
                <p className="mt-1 text-muted-foreground">
                  Pay the full rent directly to the landlord via cash, bank transfer, Khalti, or eSewa
                </p>
              </div>
            </div>
          )}

          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">
              Pay the full rent directly to the landlord via cash, bank transfer, Khalti, or eSewa
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
