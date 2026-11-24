import { zodResolver } from "@hookform/resolvers/zod";
import {
  DEAL_SIZES,
  DEAL_SIZE_LABELS,
  DIGITAL_GAPS,
  DIGITAL_GAP_LABELS,
  INDUSTRIES,
  PRIORITY_LABELS,
  SERVICES,
  SERVICE_LABELS,
  WEBSITE_STATUSES,
  WEBSITE_STATUS_LABELS,
  computeGapScore,
} from "@sdr/core";
import { Badge } from "@sdr/ui/components/ui/badge";
import { Button } from "@sdr/ui/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@sdr/ui/components/ui/card";
import { Checkbox } from "@sdr/ui/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@sdr/ui/components/ui/form";
import { Input } from "@sdr/ui/components/ui/input";
import { Label } from "@sdr/ui/components/ui/label";
import { ScrollArea } from "@sdr/ui/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@sdr/ui/components/ui/select";
import { Separator } from "@sdr/ui/components/ui/separator";
import { Textarea } from "@sdr/ui/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@sdr/ui/components/ui/toggle-group";
import { cn } from "@sdr/ui/lib/utils";
import { Star } from "lucide-react";
import { useForm, type UseFormReturn } from "react-hook-form";

import { leadFormSchema, type LeadFormValues } from "@/lib/form";

type StringFieldName =
  | "companyName"
  | "category"
  | "address"
  | "phone"
  | "whatsapp"
  | "email"
  | "instagram"
  | "website"
  | "picName"
  | "picRole";

interface StringFieldProps {
  form: UseFormReturn<LeadFormValues>;
  name: StringFieldName;
  label: string;
  placeholder?: string;
  type?: string;
}

function StringField({ form, name, label, placeholder, type = "text" }: StringFieldProps) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input {...field} type={type} placeholder={placeholder} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export interface LeadFormProps {
  defaultValues: LeadFormValues;
  submitting?: boolean;
  pendingCount?: number;
  onSubmit: (values: LeadFormValues) => void | Promise<void>;
  onDraft: (values: LeadFormValues) => void | Promise<void>;
}

export function LeadForm({ defaultValues, submitting, pendingCount = 0, onSubmit, onDraft }: LeadFormProps) {
  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema),
    defaultValues,
    mode: "onBlur",
  });

  const status = form.watch("websiteStatus");
  const gaps = form.watch("digitalGaps");
  const priority = form.watch("priority");
  const isHot = status === "none";
  const score = computeGapScore(gaps);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex h-[540px] flex-col">
        <Card className="flex h-full flex-col gap-0 overflow-hidden rounded-none border-0 py-0 shadow-none">
          <CardHeader className="shrink-0 border-b py-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">SDR Lead Capture</CardTitle>
              <div className="flex items-center gap-1.5">
                <Badge variant="secondary">Outbox {pendingCount}</Badge>
                <Badge variant={isHot ? "destructive" : "outline"}>
                  {isHot ? "🔥 HOT" : `Gap ${score}/10`}
                </Badge>
              </div>
            </div>
          </CardHeader>

          <ScrollArea className="min-h-0 flex-1">
            <CardContent className="space-y-4 py-4">
              <section className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bisnis</p>
                <StringField form={form} name="companyName" label="Nama bisnis *" placeholder="Warung Steak Pak Joko" />
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="industry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Industri</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Pilih industri" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {INDUSTRIES.map((industry) => (
                              <SelectItem key={industry} value={industry}>
                                {industry}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <StringField form={form} name="category" label="Kategori Maps" placeholder="Steakhouse" />
                </div>
                <StringField form={form} name="address" label="Alamat" placeholder="Jl. Raya No. ..." />
                <div className="grid grid-cols-2 gap-3">
                  <StringField form={form} name="phone" label="Telepon" placeholder="021 / 08xx" type="tel" />
                  <StringField form={form} name="whatsapp" label="WhatsApp" placeholder="08xxxxxxxxxx" type="tel" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <StringField form={form} name="email" label="Email" placeholder="kontak@bisnis.com" type="email" />
                  <StringField form={form} name="instagram" label="Instagram" placeholder="@namaakun" />
                </div>
                <StringField form={form} name="website" label="Website" placeholder="https://..." type="url" />
              </section>

              <Separator />

              <section className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Kehadiran digital
                </p>
                <FormField
                  control={form.control}
                  name="websiteStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status website</FormLabel>
                      <FormControl>
                        <ToggleGroup
                          type="single"
                          value={field.value}
                          onValueChange={(value) => value && field.onChange(value)}
                          className="grid grid-cols-2 gap-2"
                        >
                          {WEBSITE_STATUSES.map((value) => (
                            <ToggleGroupItem
                              key={value}
                              value={value}
                              className="h-auto justify-start rounded-lg border px-3 py-2 text-left data-[state=on]:border-primary data-[state=on]:bg-primary/10"
                            >
                              <span className="text-sm font-medium">{WEBSITE_STATUS_LABELS[value]}</span>
                            </ToggleGroupItem>
                          ))}
                        </ToggleGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="digitalGaps"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Digital gaps</FormLabel>
                      <div className="grid gap-2">
                        {DIGITAL_GAPS.map((gap) => (
                          <div key={gap} className="flex items-start gap-2">
                            <Checkbox
                              id={`gap-${gap}`}
                              checked={field.value.includes(gap)}
                              onCheckedChange={(checked) =>
                                field.onChange(
                                  checked === true
                                    ? [...field.value, gap]
                                    : field.value.filter((item) => item !== gap),
                                )
                              }
                            />
                            <Label htmlFor={`gap-${gap}`} className="text-sm font-normal leading-tight">
                              {DIGITAL_GAP_LABELS[gap]}
                            </Label>
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prioritas</FormLabel>
                      <div className="flex items-center gap-3">
                        <ToggleGroup
                          type="single"
                          value={String(field.value)}
                          onValueChange={(value) => value && field.onChange(Number(value))}
                        >
                          {[1, 2, 3, 4, 5].map((value) => (
                            <ToggleGroupItem key={value} value={String(value)} aria-label={`Prioritas ${value}`}>
                              <Star className={cn("size-4", value <= priority && "fill-current")} />
                            </ToggleGroupItem>
                          ))}
                        </ToggleGroup>
                        <span className="text-xs text-muted-foreground">{PRIORITY_LABELS[priority] ?? ""}</span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </section>

              <Separator />

              <section className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Peluang
                </p>
                <FormField
                  control={form.control}
                  name="services"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Solusi yang ditawarkan</FormLabel>
                      <FormControl>
                        <ToggleGroup
                          type="multiple"
                          variant="outline"
                          value={field.value}
                          onValueChange={field.onChange}
                          className="flex flex-wrap justify-start gap-2"
                        >
                          {SERVICES.map((service) => (
                            <ToggleGroupItem key={service} value={service} size="sm" className="rounded-full px-3">
                              {SERVICE_LABELS[service]}
                            </ToggleGroupItem>
                          ))}
                        </ToggleGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dealSize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimasi deal size</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {DEAL_SIZES.map((size) => (
                            <SelectItem key={size} value={size}>
                              {DEAL_SIZE_LABELS[size]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </section>

              <Separator />

              <section className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Kontak & catatan
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <StringField form={form} name="picName" label="Nama PIC" placeholder="Owner / Manager" />
                  <StringField form={form} name="picRole" label="Jabatan PIC" placeholder="Owner" />
                </div>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Catatan</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} placeholder="Kenapa lead ini menarik..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </section>
            </CardContent>
          </ScrollArea>

          <CardFooter className="shrink-0 gap-2 border-t py-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={submitting}
              onClick={form.handleSubmit(onDraft)}
            >
              Draft
            </Button>
            <Button type="submit" className="flex-[2]" disabled={submitting}>
              {submitting ? "Menyimpan..." : "Simpan ke outbox"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
