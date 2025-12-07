import * as React from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { cn, getErrorMessage } from "@/lib/utils"
import useAuth from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { // Added Dialog components
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

type Props = React.ComponentProps<"div">

export default function Login({ className, ...props }: Props) {
  const { login, status } = useAuth()
  const navigate = useNavigate()
  const [sp] = useSearchParams()

  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  // State for the Forgot Password dialog
  const [isForgotPwdDialogOpen, setIsForgotPwdDialogOpen] = React.useState(false) 

  const loading = status === "loading"

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    try {
      await login({ email, password })
      const next = sp.get("next")
      navigate(next || "/", { replace: true })
    } catch (err: unknown) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Sign in to operations</CardTitle>
          <CardDescription>
            Use your work credentials to access the restaurant backoffice and POS tools.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <FieldGroup>
              {error && (
                <FieldDescription className="rounded-md border border-red-500/40 bg-red-500/5 px-3 py-2 text-xs text-red-600">
                  {error}
                </FieldDescription>
              )}

              <Field>
                <FieldLabel htmlFor="email">Work email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@restaurant.com"
                  required
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
                <FieldDescription className="text-[11px] text-muted-foreground">
                  This is the email associated with your staff or owner account.
                </FieldDescription>
              </Field>

              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  
                  {/* Dialog Implementation for Forgot Password */}
                  <Dialog open={isForgotPwdDialogOpen} onOpenChange={setIsForgotPwdDialogOpen}>
                    <DialogTrigger asChild>
                      <button
                        type="button"
                        className="ml-auto text-xs text-primary underline-offset-4 hover:underline"
                        // This onClick will now just control the dialog state
                        onClick={() => setIsForgotPwdDialogOpen(true)}
                      >
                        Forgot password?
                      </button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Reset Password</DialogTitle>
                        <DialogDescription>
                          Enter your email to receive a password reset link.
                        </DialogDescription>
                      </DialogHeader>
                      {/* Placeholder for the actual password reset form */}
                      <div className="py-4 space-y-4">
                          <Input placeholder="Enter your email" />
                          <Button className="w-full">Send Reset Link</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </Field>

              <Field>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Signing in..." : "Sign in"}
                </Button>
                <FieldDescription className="mt-2 text-center text-[11px] text-muted-foreground">
                  If you don&apos;t have access, please contact your manager or system
                  administrator.
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <FieldDescription className="px-2 text-center text-[11px] text-muted-foreground">
        By signing in, you confirm you&apos;re authorized to operate on behalf of this
        restaurant.
      </FieldDescription>
    </div>
  )
}