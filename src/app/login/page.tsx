"use client"

import { DoorOpen } from "lucide-react"
import { LoginForm } from "@/components/auth/login-form"
import { useT } from "@/hooks/useT"

export default function LoginPage() {
  const { t } = useT()
  return (
    <div className="mx-auto max-w-md py-20">
      <div className="mb-8 text-center">
        <DoorOpen className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-4 text-3xl font-bold">{t("auth.loginTitle")}</h1>
      </div>
      <LoginForm />
    </div>
  )
}
