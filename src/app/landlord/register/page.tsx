"use client"

import { RegisterForm } from "@/components/auth/register-form"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default function LandlordRegisterPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Register as Landlord</CardTitle>
          <CardDescription>
            Create your landlord account. You will need to upload valid documents (citizenship, passport, etc.) after registration for verification.
          </CardDescription>
        </CardHeader>
      </Card>
      <RegisterForm defaultRole="landlord" />
    </div>
  )
}
