import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/shared/EmptyState";
import { BarChart3 } from "lucide-react";
import type { MonthDatum } from "@/lib/analytics";
import { statusDistribution, riskDistribution } from "@/lib/analytics";
import type { DerivedDomain } from "@/lib/domain-rules";
import { money } from "@/lib/format";

const AXIS = {
  stroke: "var(--color-muted-foreground)",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

function ChartTooltip({
  active,
  payload,
  label,
  currency,
}: {
  active?: boolean;
  payload?: { value?: number | string }[];
  label?: string | number;
  currency?: string | null;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const value = Number(payload[0]?.value ?? 0);
  return (
    <div className="rounded-md border border-border bg-popover px-2.5 py-1.5 text-2xs shadow-md">
      {label ? <p className="font-medium text-foreground">{String(label)}</p> : null}
      <p className="tabular text-muted-foreground">{money(value, { currency })}</p>
    </div>
  );
}

function ChartFrame({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
      <div className="mb-3">
        <h3 className="text-2sm font-semibold text-foreground">{title}</h3>
        {hint ? <p className="text-2xs text-muted-foreground">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}

export function RenewalForecastChart({ data, currency }: { data: MonthDatum[]; currency?: string | null }) {
  const { t } = useTranslation();
  const hasData = data.some(item => item.value > 0);
  return (
    <ChartFrame title={t("dashboard.charts.renewalForecast")} hint={t("dashboard.charts.renewalForecastHint")}>
      {!hasData ? (
        <EmptyState compact icon={BarChart3} title={t("dashboard.charts.noData")} description={t("dashboard.charts.noDataHint")} />
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 3" />
            <XAxis dataKey="label" {...AXIS} />
            <YAxis {...AXIS} width={44} tickFormatter={value => money(Number(value), { currency, compact: true, showSymbol: false })} />
            <Tooltip content={<ChartTooltip currency={currency} />} cursor={{ fill: "var(--color-muted)" }} />
            <Bar dataKey="value" fill="var(--color-primary)" radius={[4, 4, 0, 0]} maxBarSize={22} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartFrame>
  );
}

export function ProfitChart({ data, currency }: { data: MonthDatum[]; currency?: string | null }) {
  const { t } = useTranslation();
  const hasData = data.length > 0;
  return (
    <ChartFrame title={t("dashboard.charts.profitOverTime")} hint={t("dashboard.charts.profitOverTimeHint")}>
      {!hasData ? (
        <EmptyState compact icon={BarChart3} title={t("dashboard.charts.noData")} description={t("dashboard.charts.noDataHint")} />
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 3" />
            <XAxis dataKey="label" {...AXIS} />
            <YAxis {...AXIS} width={44} tickFormatter={value => money(Number(value), { currency, compact: true, showSymbol: false })} />
            <Tooltip content={<ChartTooltip currency={currency} />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--color-primary)"
              strokeWidth={2}
              fill="url(#profitFill)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </ChartFrame>
  );
}

const STATUS_COLORS: Record<string, string> = {
  active: "var(--color-status-active)",
  listed: "var(--color-status-listed)",
  sold: "var(--color-status-sold)",
  expired: "var(--color-status-expired)",
};

export function StatusMixChart({ records }: { records: DerivedDomain[] }) {
  const { t } = useTranslation();
  const data = statusDistribution(records).filter(item => item.value > 0);
  return (
    <ChartFrame title={t("dashboard.charts.statusMix")}>
      {data.length === 0 ? (
        <EmptyState compact icon={BarChart3} title={t("dashboard.charts.noData")} description={t("dashboard.charts.noDataHint")} />
      ) : (
        <div className="flex items-center gap-4">
          <ResponsiveContainer width="50%" height={150}>
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }} barCategoryGap={6}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="status" hide />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--color-muted)" }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={16}>
                {data.map(item => (
                  <Cell key={item.status} fill={STATUS_COLORS[item.status]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <ul className="flex-1 space-y-1.5">
            {data.map(item => (
              <li key={item.status} className="flex items-center gap-2 text-2sm">
                <span className="size-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[item.status] }} aria-hidden />
                <span className="flex-1 text-muted-foreground">{t(`status.${item.status}`)}</span>
                <span className="tabular font-medium text-foreground">{item.value}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </ChartFrame>
  );
}

export function RiskMixChart({ records }: { records: DerivedDomain[] }) {
  const { t } = useTranslation();
  const data = riskDistribution(records);
  return (
    <ChartFrame title={t("dashboard.charts.riskMix")}>
      {data.length === 0 ? (
        <EmptyState compact icon={BarChart3} title={t("dashboard.charts.noData")} description={t("dashboard.charts.noDataHint")} />
      ) : (
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={data} margin={{ top: 4, right: 6, left: -22, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 3" />
            <XAxis dataKey="risk" {...AXIS} tickFormatter={value => t(`risk.${value}`)} interval={0} />
            <YAxis {...AXIS} width={28} allowDecimals={false} />
            <Tooltip content={<ChartTooltip />} labelFormatter={value => t(`risk.${String(value)}`)} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--color-primary)"
              strokeWidth={2}
              dot={{ r: 3, fill: "var(--color-primary)", strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartFrame>
  );
}

