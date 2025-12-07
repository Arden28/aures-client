// src/app/settings/Settings.tsx
"use client"

import * as React from "react"
import { toast } from "sonner"
import { Check, ChevronsUpDown } from "lucide-react"

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"

import { cn } from "@/lib/utils" // Assumed path for cn helper
import { CURRENCIES, TIMEZONES } from "@/lib/constants" // NEW IMPORT
import type { Restaurant } from "@/api/restaurant"
import { fetchRestaurant, updateRestaurant } from "@/api/restaurant"

type LoadingState = "idle" | "loading" | "success" | "error"

type SettingsFormState = {
  // core
  name: string
  currency: string
  timezone: string

  // percent values shown as 0–100 in UI
  tax_rate_percent: string
  service_charge_rate_percent: string

  // settings.*
  ticket_prefix: string
  enable_tips: boolean
  kds_sound: boolean
  order_timeout_minutes: string // UI in minutes
  auto_accept_online_orders: boolean
  auto_close_paid_orders: boolean
  enable_kds_auto_bump: boolean
  receipt_footer: string
}

export default function Settings() {
  const [state, setState] = React.useState<LoadingState>("idle")
  const [restaurant, setRestaurant] = React.useState<Restaurant | null>(null)
  const [form, setForm] = React.useState<SettingsFormState | null>(null)
  const [initialForm, setInitialForm] = React.useState<SettingsFormState | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState("profile")

  // Helper: map Restaurant -> SettingsFormState
  function buildFormFromRestaurant(data: Restaurant): SettingsFormState {
    const s = data.settings ?? {}
    const taxRate = data.tax_rate ?? 0
    const serviceRate = data.service_charge_rate ?? 0
    const orderTimeoutSeconds = s.order_timeout ?? 900
    const orderTimeoutMinutes = orderTimeoutSeconds / 60

    return {
      name: data.name ?? "",
      currency: data.currency ?? "KES",
      timezone: data.timezone ?? "Africa/Nairobi",
      tax_rate_percent: (taxRate * 100).toString(),
      service_charge_rate_percent: (serviceRate * 100).toString(),
      ticket_prefix: s.ticket_prefix ?? "",
      enable_tips: s.enable_tips ?? true,
      kds_sound: s.kds_sound ?? true,
      order_timeout_minutes: orderTimeoutMinutes.toString(),
      auto_accept_online_orders: s.auto_accept_online_orders ?? true,
      auto_close_paid_orders: s.auto_close_paid_orders ?? true,
      enable_kds_auto_bump: s.enable_kds_auto_bump ?? false,
      receipt_footer: s.receipt_footer ?? "",
    }
  }

  // Load restaurant
  React.useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setState("loading")
        const data = await fetchRestaurant()
        if (!mounted) return

        const baseForm = buildFormFromRestaurant(data)
        setRestaurant(data)
        setForm(baseForm)
        setInitialForm(baseForm)
        setState("success")
      } catch (err) {
        console.error(err)
        setState("error")
        toast.error("Failed to load restaurant settings.")
      }
    })()

    return () => {
      mounted = false
    }
  }, [])

  const isLoading = state === "loading" || !form
  const isDirty =
    form &&
    initialForm &&
    JSON.stringify(form) !== JSON.stringify(initialForm)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form) return
    setSaving(true)

    try {
      const taxPercent = parseFloat(form.tax_rate_percent || "0")
      const servicePercent = parseFloat(form.service_charge_rate_percent || "0")
      const timeoutMinutes = parseFloat(form.order_timeout_minutes || "0")

      const payload = {
        name: form.name.trim(),
        currency: form.currency.trim() || "KES",
        timezone: form.timezone.trim() || "Africa/Nairobi",
        tax_rate: Number.isNaN(taxPercent) ? 0 : taxPercent / 100,
        service_charge_rate: Number.isNaN(servicePercent)
          ? 0
          : servicePercent / 100,
        settings: {
          ticket_prefix: form.ticket_prefix.trim() || null,
          enable_tips: form.enable_tips,
          kds_sound: form.kds_sound,
          order_timeout: Number.isNaN(timeoutMinutes)
            ? 0
            : Math.max(0, Math.round(timeoutMinutes * 60)),
          auto_accept_online_orders: form.auto_accept_online_orders,
          auto_close_paid_orders: form.auto_close_paid_orders,
          enable_kds_auto_bump: form.enable_kds_auto_bump,
          receipt_footer: form.receipt_footer.trim() || null,
        },
      }

      const updated = await updateRestaurant(payload)
      const nextForm = buildFormFromRestaurant(updated)

      setRestaurant(updated)
      setForm(nextForm)
      setInitialForm(nextForm)

      toast.success("Settings saved successfully.")
    } catch (err) {
      console.error(err)
      toast.error("Failed to save settings.")
    } finally {
      setSaving(false)
    }
  }

  function updateField<K extends keyof SettingsFormState>(
    key: K,
    value: SettingsFormState[K]
  ) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  function handleReset() {
    if (!initialForm) return
    setForm(initialForm)
    toast.message("Settings reset to last saved values.")
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Settings</h2>
          <p className="text-sm text-muted-foreground">
            Configure restaurant profile, taxes, order flow and KDS behaviour.
          </p>
        </div>

        {!isLoading && (
          <div className="flex items-center gap-2 text-xs">
            {isDirty ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-1 text-amber-700">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Unsaved changes
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/5 px-2 py-1 text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                All changes saved
              </span>
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Restaurant settings</CardTitle>
            <CardDescription className="text-xs">
              Organised into sections so you can adjust one area at a time.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-0">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="space-y-4"
            >
              <TabsList className="grid w-full grid-cols-2 gap-1 md:grid-cols-4">
                <TabsTrigger value="profile" className="text-xs">
                  Profile
                </TabsTrigger>
                <TabsTrigger value="taxes" className="text-xs">
                  Taxes &amp; service
                </TabsTrigger>
                <TabsTrigger value="orders" className="text-xs">
                  Orders &amp; tickets
                </TabsTrigger>
                <TabsTrigger value="kds" className="text-xs">
                  KDS &amp; notifications
                </TabsTrigger>
              </TabsList>

              {/* Profile */}
              <TabsContent value="profile" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={form?.name ?? ""}
                      onChange={(e) => updateField("name", e.target.value)}
                      placeholder="Aures Bistro"
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    {/* Replaced Input with SearchableSelect */}
                    <SearchableSelect
                      id="currency"
                      value={form?.currency ?? ""}
                      onValueChange={(value) => updateField("currency", value)}
                      options={CURRENCIES}
                      placeholder="Select currency..."
                      emptyText="No currency found."
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  {/* Replaced Input with SearchableSelect */}
                  <SearchableSelect
                    id="timezone"
                    value={form?.timezone ?? ""}
                    onValueChange={(value) => updateField("timezone", value)}
                    options={TIMEZONES}
                    placeholder="Select timezone..."
                    emptyText="No timezone found."
                    disabled={isLoading}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Use a valid PHP timezone identifier, e.g., <span className="ml-1 font-mono text-[11px]">
                      Africa/Nairobi
                    </span>.
                  </p>
                </div>
              </TabsContent>

              {/* Taxes & service */}
              <TabsContent value="taxes" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="tax-rate">Tax rate (%)</Label>
                    <Input
                      id="tax-rate"
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={form?.tax_rate_percent ?? ""}
                      onChange={(e) =>
                        updateField("tax_rate_percent", e.target.value)
                      }
                      placeholder="16"
                      disabled={isLoading}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Example: <span className="font-mono">16</span> = 16% VAT.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="service-charge">Service charge (%)</Label>
                    <Input
                      id="service-charge"
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={form?.service_charge_rate_percent ?? ""}
                      onChange={(e) =>
                        updateField(
                          "service_charge_rate_percent",
                          e.target.value
                        )
                      }
                      placeholder="10"
                      disabled={isLoading}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Example: <span className="font-mono">10</span> = 10%
                      service charge.
                    </p>
                  </div>
                </div>
              </TabsContent>

              {/* Order & ticketing */}
              <TabsContent value="orders" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="ticket-prefix">Ticket prefix</Label>
                    <Input
                      id="ticket-prefix"
                      value={form?.ticket_prefix ?? ""}
                      onChange={(e) =>
                        updateField(
                          "ticket_prefix",
                          e.target.value.toUpperCase()
                        )
                      }
                      placeholder="AB-"
                      disabled={isLoading}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Prepended to order numbers on printed tickets, e.g.
                      <span className="ml-1 font-mono text-[11px]">
                        AB-0042
                      </span>
                      .
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="order-timeout">
                      Order timeout (minutes)
                    </Label>
                    <Input
                      id="order-timeout"
                      type="number"
                      min={0}
                      step={1}
                      value={form?.order_timeout_minutes ?? ""}
                      onChange={(e) =>
                        updateField("order_timeout_minutes", e.target.value)
                      }
                      placeholder="15"
                      disabled={isLoading}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Used by dashboards / alerts when orders take too long
                      (internally stored in seconds).
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="grid gap-3 md:grid-cols-2">
                  <ToggleRow
                    label="Enable tips"
                    description="Allow waiters and cashiers to collect and record tips on payments."
                    checked={form?.enable_tips ?? false}
                    disabled={isLoading}
                    onCheckedChange={(checked) =>
                      updateField("enable_tips", checked)
                    }
                  />
                  <ToggleRow
                    label="Auto accept online orders"
                    description="Online orders are automatically accepted and sent to KDS."
                    checked={form?.auto_accept_online_orders ?? false}
                    disabled={isLoading}
                    onCheckedChange={(checked) =>
                      updateField("auto_accept_online_orders", checked)
                    }
                  />
                  <ToggleRow
                    label="Auto close paid orders"
                    description="Automatically mark orders as completed when fully paid."
                    checked={form?.auto_close_paid_orders ?? false}
                    disabled={isLoading}
                    onCheckedChange={(checked) =>
                      updateField("auto_close_paid_orders", checked)
                    }
                  />
                </div>
              </TabsContent>

              {/* KDS & notifications */}
              <TabsContent value="kds" className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <ToggleRow
                    label="KDS sound alerts"
                    description="Play a sound when new items arrive in the kitchen."
                    checked={form?.kds_sound ?? false}
                    disabled={isLoading}
                    onCheckedChange={(checked) =>
                      updateField("kds_sound", checked)
                    }
                  />
                  <ToggleRow
                    label="Auto bump ready items"
                    description="Automatically move items from ready to served after a short delay."
                    checked={form?.enable_kds_auto_bump ?? false}
                    disabled={isLoading}
                    onCheckedChange={(checked) =>
                      updateField("enable_kds_auto_bump", checked)
                    }
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="receipt-footer">Receipt footer</Label>
                  <Textarea
                    id="receipt-footer"
                    value={form?.receipt_footer ?? ""}
                    onChange={(e) =>
                      updateField("receipt_footer", e.target.value)
                    }
                    placeholder={"Thank you for dining with us.\nCome again!"}
                    rows={3}
                    disabled={isLoading}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Shown at the bottom of printed receipts. Supports new
                    lines.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>

          <CardFooter className="flex flex-col gap-2 border-t bg-muted/40 px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              {isDirty ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  <span>Unsaved changes – don&apos;t forget to save.</span>
                </>
              ) : (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span>All changes saved.</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={isLoading || saving || !isDirty}
              >
                Reset
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isLoading || saving || !isDirty}
              >
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}

/* -------------------------- Searchable Select Component -------------------------- */

type SelectOption = {
    value: string;
    label: string;
};

type SearchableSelectProps = {
    id: string;
    value: string;
    onValueChange: (value: string) => void;
    options: SelectOption[];
    placeholder: string;
    emptyText: string;
    disabled: boolean;
};

function SearchableSelect({
    id,
    value,
    onValueChange,
    options,
    placeholder,
    emptyText,
    disabled,
}: SearchableSelectProps) {
    const [open, setOpen] = React.useState(false);
    
    // Find the currently selected label to display in the button
    const selectedLabel = options.find((option) => option.value === value)?.label;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between font-normal"
                    id={id}
                    disabled={disabled}
                >
                    {value ? selectedLabel : placeholder}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                    <CommandInput placeholder={placeholder} />
                    <CommandList>
                        <CommandEmpty>{emptyText}</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    value={option.label}
                                    onSelect={() => {
                                        onValueChange(option.value);
                                        setOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === option.value ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {option.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

/* ---------- Small sub-component ---------- */

type ToggleRowProps = {
  label: string
  description?: string
  checked: boolean
  disabled?: boolean
  onCheckedChange: (checked: boolean) => void
}

function ToggleRow({
  label,
  description,
  checked,
  disabled,
  onCheckedChange,
}: ToggleRowProps) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border bg-muted/40 px-3 py-2.5">
      <div className="space-y-0.5">
        <p className="text-sm font-medium leading-none">{label}</p>
        {description && (
          <p className="text-[11px] text-muted-foreground">{description}</p>
        )}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  )
}