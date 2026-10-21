"use client";

import { Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardHeader } from "@/components/ui";

const MARK = "#23406F"; // navy-600: single-series charts need no categorical palette
const GRID = "#E3DED4";
const TICK = { fill: "#4B5565", fontSize: 12 };

export interface Datum {
  label: string;
  value: number;
}

/** Every chart ships with its numbers as a table, so nothing depends on seeing the chart. */
function DataTable({ data, unit, labels }: { data: Datum[]; unit: string; labels: { show: string; item: string; value: string } }) {
  return (
    <details className="mt-2 text-sm">
      <summary className="cursor-pointer text-navy-700">{labels.show}</summary>
      <table className="mt-2 w-full text-left">
        <thead>
          <tr className="text-xs text-ink-muted">
            <th scope="col" className="py-1">{labels.item}</th>
            <th scope="col" className="py-1 text-right">{labels.value}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.label} className="border-t border-line">
              <td className="py-1">{d.label}</td>
              <td className="py-1 text-right tabular-nums">
                {d.value}
                {unit}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

export interface ChartLabels {
  show: string;
  item: string;
  value: string;
  empty: string;
}

/** Horizontal bars: one measure per category, direct-labelled. */
export function BarRateChart({ title, description, data, unit = "%", max, labels }: { title: string; description?: string; data: Datum[]; unit?: string; max?: number; labels: ChartLabels }) {
  const height = Math.max(160, data.length * 36 + 40);
  return (
    <Card>
      <CardHeader title={title} description={description} level={3} />
      {data.length === 0 ? (
        <p className="text-sm text-ink-muted">{labels.empty}</p>
      ) : (
        <div role="img" aria-label={`${title}: ${data.map((d) => `${d.label} ${d.value}${unit}`).join(", ")}`}>
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 48, bottom: 4, left: 8 }} barCategoryGap={8}>
              <CartesianGrid horizontal={false} stroke={GRID} />
              <XAxis type="number" domain={[0, max ?? (unit === "%" ? 100 : "auto")]} tick={TICK} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="label" width={150} tick={TICK} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "#EEF2F8" }} formatter={(v) => [`${String(v)}${unit}`, labels.value]} />
              <Bar dataKey="value" fill={MARK} radius={[0, 4, 4, 0]} maxBarSize={22} isAnimationActive={false}>
                <LabelList dataKey="value" position="right" formatter={(v) => `${String(v)}${unit}`} style={{ fill: "#1B2333", fontSize: 12 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      <DataTable data={data} unit={unit} labels={labels} />
    </Card>
  );
}

/** Single-series trend over time with a hover tooltip. */
export function TrendChart({ title, description, data, unit = "", labels }: { title: string; description?: string; data: Datum[]; unit?: string; labels: ChartLabels }) {
  return (
    <Card>
      <CardHeader title={title} description={description} level={3} />
      {data.length === 0 ? (
        <p className="text-sm text-ink-muted">{labels.empty}</p>
      ) : (
        <div role="img" aria-label={`${title}: ${data.map((d) => `${d.label} ${d.value}${unit}`).join(", ")}`}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="label" tick={TICK} axisLine={{ stroke: GRID }} tickLine={false} />
              <YAxis tick={TICK} axisLine={false} tickLine={false} width={36} allowDecimals={false} domain={unit === "%" ? [0, 100] : [0, "auto"]} />
              <Tooltip formatter={(v) => [`${String(v)}${unit}`, labels.value]} />
              <Line type="linear" dataKey="value" stroke={MARK} strokeWidth={2} dot={{ r: 4, fill: MARK, stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 6 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <DataTable data={data} unit={unit} labels={labels} />
    </Card>
  );
}
