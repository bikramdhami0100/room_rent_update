"use client"

import { UserPlus } from "lucide-react"
import { RegisterForm } from "@/components/auth/register-form"
import { useT } from "@/hooks/useT"

export default function RegisterPage() {
  const { t } = useT()
  return (
    <div className="mx-auto max-w-md py-20">
      <div className="mb-8 text-center">
        <UserPlus className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-4 text-3xl font-bold">{t("auth.registerTitle")}</h1>
      </div>
      <RegisterForm />
    </div>
  )
}
