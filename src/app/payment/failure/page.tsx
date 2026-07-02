"use client"

import { useRouter } from "next/navigation"
import { XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function PaymentFailurePage() {
  const router = useRouter()

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <XCircle className="h-10 w-10 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold">Payment Cancelled</h1>
          <p className="text-muted-foreground">
            The payment was cancelled or failed. Please try again.
          </p>
          <Button size="lg" className="w-full" onClick={() => router.back()}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
