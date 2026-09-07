'use client';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import type { Snapshot, Profile } from '@/domain/models';
import { number } from '@/lib/client';
const tooltip = {
  background: '#202624',
  border: '1px solid #39443f',
  borderRadius: 10,
  color: '#f3f7f4',
  fontSize: 12,
};
export function GrowthChart({
  snapshots,
  metric = 'followers_count',
  color = '#a4f2ce',
  height = 270,
}: {
  snapshots: Snapshot[];
  metric?: 'followers_count' | 'following_count' | 'media_count';
  color?: string;
  height?: number;
}) {
  const data = snapshots.map((s) => ({
    date: new Date(s.retrieved_at).getTime(),
    value: s[metric],
  }));
  return (
    <div
      style={{ width: '100%', height }}
      role="img"
      aria-label={`${metric.replaceAll('_', ' ')} over ${data.length} recorded observations`}
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <AreaChart data={data} margin={{ top: 12, right: 16, bottom: 5, left: 0 }}>
          <defs>
            <linearGradient id={`fill-${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.22} />
              <stop offset="100%" stopColor={color} stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#29312e" strokeDasharray="3 5" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(v) =>
              new Date(v).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                timeZone: 'UTC',
              })
            }
            tick={{ fill: '#87948d', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            minTickGap={45}
          />
          <YAxis
            tickFormatter={(v) => number(v, true)}
            tick={{ fill: '#87948d', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            domain={['auto', 'auto']}
            width={55}
          />
          <Tooltip
            contentStyle={tooltip}
            labelFormatter={(v) =>
              new Date(Number(v)).toLocaleDateString('en-GB', { timeZone: 'UTC' })
            }
            formatter={(v) => [number(Number(v)), metric.replaceAll('_', ' ')]}
          />
          <Area
            type="linear"
            dataKey="value"
            stroke={color}
            strokeWidth={2.5}
            fill={`url(#fill-${color.slice(1)})`}
            connectNulls={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
export function MiniChart({
  values,
  color = '#a4f2ce',
}: {
  values: (number | null)[];
  color?: string;
}) {
  return (
    <span className="mini-chart">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <LineChart data={values.map((v) => ({ v }))}>
          <Line
            dataKey="v"
            stroke={color}
            strokeWidth={1.8}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </span>
  );
}
export function DistributionChart({
  data,
  x = 'day',
  y = 'posts',
  color = '#a4f2ce',
}: {
  data: Record<string, unknown>[];
  x?: string;
  y?: string;
  color?: string;
}) {
  return (
    <div style={{ height: 210, minWidth: 0 }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart data={data}>
          <CartesianGrid stroke="#29312e" vertical={false} />
          <XAxis
            dataKey={x}
            tick={{ fill: '#96a29b', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#96a29b', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={30}
          />
          <Tooltip contentStyle={tooltip} />
          <Bar dataKey={y} fill={color} radius={[4, 4, 0, 0]} maxBarSize={30} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
export function ComparisonChart({
  profiles,
  snapshots,
}: {
  profiles: Profile[];
  snapshots: Snapshot[];
}) {
  const grouped = new Map<string, Record<string, string | number | null>>();
  for (const s of snapshots) {
    const day = s.retrieved_at.slice(0, 10);
    if (!grouped.has(day)) grouped.set(day, { date: day });
    grouped.get(day)![s.profile_id] = s.followers_count;
  }
  const data = [...grouped.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  return (
    <div style={{ height: 310, minWidth: 0 }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <LineChart data={data}>
          <CartesianGrid stroke="#29312e" vertical={false} />
          <XAxis
            dataKey="date"
            minTickGap={60}
            tick={{ fill: '#96a29b', fontSize: 12 }}
            tickFormatter={(v) =>
              new Date(v).toLocaleDateString('en-GB', {
                month: 'short',
                day: 'numeric',
                timeZone: 'UTC',
              })
            }
          />
          <YAxis tickFormatter={(v) => number(v, true)} tick={{ fill: '#96a29b', fontSize: 12 }} />
          <Tooltip contentStyle={tooltip} />
          <Legend />
          {profiles.map((p) => (
            <Line
              key={p.id}
              name={p.display_name ?? p.username}
              dataKey={p.id}
              stroke={p.color}
              dot={false}
              strokeWidth={2}
              connectNulls={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
