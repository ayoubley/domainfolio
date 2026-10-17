import { Archive, ArchiveRestore, CalendarClock, Pencil, RotateCw, Tag } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import { Field } from "@/components/shared/Field";
import { SidePeek } from "@/components/shared/SidePeek";
import { RecommendedActionBadge, RiskBadge, StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, money, percent, signedMoney } from "@/lib/format";
import type { DerivedDomain } from "@/lib/domain-rules";
import { useArchiveDomain, useDomainActivityQuery, useRenewDomain, useRestoreDomain } from "@/features/domains/queries";
import { cn } from "@/lib/utils";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <dt className="text-2xs text-muted-foreground">{label}</dt>
      <dd className="text-2sm font-medium tabular text-foreground">{children}</dd>
    </div>
  );
}

export function DomainSidePeek({
  open,
  onOpenChange,
  domain,
  onEdit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domain: DerivedDomain | null;
  onEdit: (domain: DerivedDomain) => void;
}) {
  const { t } = useTranslation();
  const [renewOpen, setRenewOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [renewCost, setRenewCost] = useState<number | null>(domain?.renewal_cost ?? null);
  const [renewNote, setRenewNote] = useState("");
  const [archiveReason, setArchiveReason] = useState("");

  const renewMutation = useRenewDomain();
  const archiveMutation = useArchiveDomain();
  const restoreMutation = useRestoreDomain();
  const { data: activity } = useDomainActivityQuery(domain?.id ?? null);

  if (!domain) return null;

  const currency = domain.purchase_currency;

  return (
    <>
      <SidePeek
        open={open}
        onOpenChange={onOpenChange}
        label={domain.domain}
        className="sm:max-w-[460px]"
      >
        <div className="flex flex-col gap-1 border-b border-border p-5 pe-12">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-base font-semibold tabular text-foreground">{domain.domain}</h2>
            <StatusBadge status={domain.effectiveStatus} />
          </div>
          <p className="flex flex-wrap items-center gap-2 text-2xs text-muted-foreground">
            {domain.registrar ? <span>{domain.registrar}</span> : null}
            {domain.niche ? (
              <span className="inline-flex items-center gap-1">
                <Tag className="size-3" />
                {domain.niche}
              </span>
            ) : null}
            {domain.archived_at ? <span className="text-status-expiring">{t("nav.archive")}</span> : null}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-border bg-subtle/50 px-5 py-3">
          <Button size="sm" variant="outline" onClick={() => onEdit(domain)}>
            <Pencil />
            {t("domains.detail.edit")}
          </Button>
          {domain.effectiveStatus !== "sold" && !domain.archived_at ? (
            <Button
              size="sm"
              variant="subtle"
              onClick={() => {
                setRenewCost(domain.renewal_cost);
                setRenewOpen(true);
              }}
            >
              <RotateCw />
              {t("domains.detail.renewNow")}
            </Button>
          ) : null}
          {domain.archived_at ? (
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                const updated = await restoreMutation.mutateAsync({ domainId: domain.id });
                toast.success(t("domains.detail.restored", { domain: updated.domain }));
              }}
            >
              <ArchiveRestore />
              {t("domains.detail.restore")}
            </Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setArchiveOpen(true)}>
              <Archive />
              {t("domains.detail.archive")}
            </Button>
          )}
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {/* Headline metrics */}
          <div className="grid grid-cols-2 gap-3">
            <Metric
              label={t("domains.detail.daysLeft")}
              value={domain.daysLeft === null ? "—" : String(domain.daysLeft)}
              tone={domain.daysLeft !== null && domain.daysLeft < 0 ? "negative" : undefined}
            />
            <Metric
              label={t("domains.detail.profit")}
              value={domain.netProfit === null ? "—" : signedMoney(domain.netProfit, currency)}
              tone={domain.netProfit === null ? undefined : domain.netProfit >= 0 ? "positive" : "negative"}
            />
          </div>

          <div className="rounded-lg border border-border bg-subtle/40 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-2xs text-muted-foreground">{t("domains.detail.recommended")}</span>
              <RecommendedActionBadge action={domain.recommendedAction} />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <RiskBadge risk={domain.expiryRisk} />
              {domain.expiry_date ? (
                <span className="text-2xs text-muted-foreground">
                  {t("domains.detail.expiresOn", { date: formatDate(domain.expiry_date) })}
                </span>
              ) : null}
            </div>
          </div>

          {/* Overview */}
          <section>
            <h3 className="mb-1 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("domains.detail.overview")}
            </h3>
            <dl className="divide-y divide-border">
              <Row label={t("domains.columns.purchaseDate")}>
                {domain.purchase_date ? formatDate(domain.purchase_date) : "—"}
              </Row>
              <Row label={t("domains.columns.purchasePrice")}>{money(domain.purchase_price, { currency })}</Row>
              <Row label={t("domains.columns.renewalCost")}>{money(domain.renewal_cost, { currency })}</Row>
              <Row label={t("domains.columns.askingPrice")}>{money(domain.asking_price, { currency })}</Row>
              <Row label={t("domains.columns.estimatedValue")}>{money(domain.estimated_value, { currency })}</Row>
              <Row label={t("domains.columns.renewalDecision")}>{t(`decision.${domain.renewal_decision}`)}</Row>
              {domain.listed_on && domain.listed_on.length > 0 ? (
                <Row label={t("domains.columns.listedOn")}>{domain.listed_on.join(", ")}</Row>
              ) : null}
              {domain.effectiveStatus === "sold" ? (
                <>
                  <Row label={t("domains.columns.soldDate")}>
                    {domain.sold_date ? formatDate(domain.sold_date) : "—"}
                  </Row>
                  <Row label={t("domains.columns.salePrice")}>{money(domain.sale_price, { currency })}</Row>
                  <Row label={t("domains.columns.netProceeds")}>{money(domain.proceeds, { currency })}</Row>
                  <Row label={t("domains.columns.roi")}>{domain.roi === null ? "—" : percent(domain.roi)}</Row>
                </>
              ) : null}
              {domain.holdingDays !== null ? (
                <Row label={t("domains.detail.holdPeriod", { count: domain.holdingDays })}>
                  {domain.holdingDays}
                </Row>
              ) : null}
            </dl>
          </section>

          {/* Data quality */}
          <section>
            <h3 className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("domains.detail.quality")}
            </h3>
            {domain.qualityIssues.length === 0 ? (
              <p className="rounded-md bg-status-active-soft px-3 py-2 text-2xs text-status-active">
                {t("domains.detail.qualityClean")}
              </p>
            ) : (
              <ul className="flex flex-wrap gap-1.5">
                {domain.qualityIssues.map(issue => (
                  <li
                    key={issue}
                    className="rounded-full bg-status-expiring-soft px-2 py-0.5 text-2xs text-status-expiring"
                  >
                    {t(`quality.${issue}`)}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Notes */}
          {domain.notes ? (
            <section>
              <h3 className="mb-1 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("domains.detail.notes")}
              </h3>
              <p className="whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-2xs text-muted-foreground">
                {domain.notes}
              </p>
            </section>
          ) : null}

          {/* Timeline */}
          <section>
            <h3 className="mb-2 flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
              <CalendarClock className="size-3.5" />
              {t("domains.detail.timeline")}
            </h3>
            {!activity || activity.length === 0 ? (
              <p className="text-2xs text-muted-foreground">{t("dashboard.activity.empty")}</p>
            ) : (
              <ol className="space-y-3">
                {activity.map(entry => (
                  <li key={entry.id} className="relative ps-4">
                    <span className="absolute start-0 top-1.5 size-1.5 rounded-full bg-primary" aria-hidden />
                    <p className="text-2xs text-foreground">{entry.summary}</p>
                    <p className="text-2xs text-muted-foreground">
                      {t(`activityAction.${entry.action}`)} · {formatDate(entry.created_at)}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </SidePeek>

      {/* Renew */}
      <ConfirmDialog
        open={renewOpen}
        onOpenChange={setRenewOpen}
        title={t("domains.detail.renewTitle")}
        description={t("domains.detail.renewBody")}
        confirmLabel={t("domains.detail.renewConfirm")}
        onConfirm={async () => {
          const updated = await renewMutation.mutateAsync({
            domainId: domain.id,
            renewalCost: renewCost,
            note: renewNote || null,
          });
          toast.success(
            t("domains.detail.renewed", { domain: updated.domain, date: formatDate(updated.expiry_date) })
          );
        }}
      >
        <div className="space-y-3">
          <Field id="renew-cost" label={t("domains.detail.renewCost")}>
            <CurrencyInput id="renew-cost" value={renewCost} onValueChange={setRenewCost} currency={currency} />
          </Field>
          <Field id="renew-note" label={t("domains.detail.renewNote")}>
            <Textarea id="renew-note" rows={2} value={renewNote} onChange={event => setRenewNote(event.target.value)} />
          </Field>
        </div>
      </ConfirmDialog>

      {/* Archive */}
      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title={t("domains.detail.archiveTitle")}
        description={t("domains.detail.archiveBody")}
        confirmLabel={t("domains.detail.archive")}
        tone="destructive"
        onConfirm={async () => {
          const updated = await archiveMutation.mutateAsync({
            domainId: domain.id,
            reason: archiveReason || null,
          });
          toast.success(t("domains.detail.archived", { domain: updated.domain }));
          onOpenChange(false);
        }}
      >
        <Field id="archive-reason" label={t("domains.detail.archiveReason")}>
          <Textarea
            id="archive-reason"
            rows={2}
            placeholder={t("domains.detail.archiveReasonPlaceholder")}
            value={archiveReason}
            onChange={event => setArchiveReason(event.target.value)}
          />
        </Field>
      </ConfirmDialog>
    </>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "positive" | "negative" }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-2xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 text-xl font-semibold tabular",
          tone === "positive" ? "text-positive" : tone === "negative" ? "text-negative" : "text-foreground"
        )}
      >
        {value}
      </p>
    </div>
  );
}
