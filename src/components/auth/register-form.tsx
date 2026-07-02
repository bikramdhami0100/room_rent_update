"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { signIn } from "next-auth/react"
import { toast } from "react-toastify"
import { Eye, EyeOff, UserPlus } from "lucide-react"
import { registerSchema, type RegisterInput } from "@/lib/validations"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { useT } from "@/hooks/useT"

interface RegisterFormProps {
  defaultRole?: "student" | "landlord"
}

export function RegisterForm({ defaultRole }: RegisterFormProps) {
  const { t } = useT()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: defaultRole ? { role: defaultRole } : undefined,
  })

  async function onSubmit(data: RegisterInput) {
    setLoading(true)
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, role: defaultRole || data.role }),
      })

      const result = await res.json()

      if (!res.ok) {
        toast.error(result.error || "Registration failed")
        return
      }

      toast.success("Account created successfully")
      router.push("/login")
    } catch {
      toast.error("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true)
    await signIn("google", { callbackUrl: "/" })
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle>{t("auth.registerTitle")}</CardTitle>
        <CardDescription>{t("auth.email")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          variant="outline"
          className="w-full"
          loading={googleLoading}
          onClick={handleGoogleSignIn}
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          {t("auth.google")}
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">{t("auth.orContinueWith")}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            id="name"
            label={t("auth.name")}
            placeholder="John Doe"
            error={errors.name?.message}
            {...register("name")}
          />
          <Input
            id="email"
            label={t("auth.email")}
            type="email"
            placeholder="you@example.com"
            error={errors.email?.message}
            {...register("email")}
          />
          <Input
            id="phone"
            label={t("auth.phone")}
            type="tel"
            placeholder="98XXXXXXXX"
            error={errors.phone?.message}
            {...register("phone")}
          />
          <Input
            id="password"
            label={t("auth.password")}
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            error={errors.password?.message}
            endAdornment={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
            {...register("password")}
          />

          {!defaultRole && (
            <div className="space-y-1">
              <label htmlFor="role" className="text-sm font-medium">
                {t("auth.role")}
              </label>
              <select
                id="role"
                className={cn(
                  "flex h-10 w-full rounded-lg border border-input  px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                )}
                {...register("role")}
              >
                <option value="student">{t("auth.student")}</option>
                <option value="landlord">{t("auth.landlord")}</option>
              </select>
              {errors.role && (
                <p className="text-sm text-destructive">{errors.role.message}</p>
              )}
            </div>
          )}

          <Button type="submit" className="w-full" loading={loading}>
            <UserPlus className="mr-2 h-4 w-4" />
            {t("auth.registerButton")}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          {t("auth.hasAccount")}{" "}
          <Link
            href="/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {t("auth.loginLink")}
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
