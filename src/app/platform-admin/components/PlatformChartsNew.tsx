"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const data = [
  { name: "Jan", "Revenus (CFA)": 4000, "Écoles": 0 },
  { name: "Fév", "Revenus (CFA)": 4800, "Écoles": 0 },
  { name: "Mar", "Revenus (CFA)": 6200, "Écoles": 1 },
  { name: "Avr", "Revenus (CFA)": 8500, "Écoles": 1 },
  { name: "Mai", "Revenus (CFA)": 11000, "Écoles": 2 },
  { name: "Juin", "Revenus (CFA)": 14000, "Écoles": 3 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 shadow-lg p-3">
        <p className="text-xs font-black text-slate-700 mb-2">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} className="text-xs font-semibold" style={{ color: entry.color }}>
            {entry.name}: {entry.name === "Écoles" ? entry.value : `${entry.value.toLocaleString("fr-FR")} CFA`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function PlatformChartsNew() {
  return (
    <div className="h-[260px]">
      <div className="flex items-center gap-6 mb-4 text-xs font-semibold text-slate-500">
        <span className="flex items-center gap-2">
          <span className="inline-block w-6 h-[2px] bg-indigo-600 rounded-full" />
          Revenus (CFA)
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block w-6 border-t-2 border-dashed border-violet-400 rounded-full" />
          Écoles
        </span>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
        >
          <defs>
            <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.12} />
              <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="0"
            vertical={false}
            stroke="#f1f5f9"
          />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 600 }}
            dy={8}
          />
          <YAxis
            yAxisId="revenue"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 600 }}
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            domain={[0, "dataMax + 2000"]}
            width={36}
          />
          <YAxis
            yAxisId="schools"
            orientation="right"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 600 }}
            domain={[0, "dataMax + 2"]}
            width={24}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            yAxisId="revenue"
            type="monotone"
            dataKey="Revenus (CFA)"
            stroke="#4f46e5"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "#4f46e5", strokeWidth: 0 }}
            activeDot={{ r: 6, fill: "#4f46e5", strokeWidth: 0 }}
          />
          <Line
            yAxisId="schools"
            type="monotone"
            dataKey="Écoles"
            stroke="#8b5cf6"
            strokeWidth={1.5}
            strokeDasharray="5 4"
            dot={{ r: 3.5, fill: "#8b5cf6", strokeWidth: 0 }}
            activeDot={{ r: 5, fill: "#8b5cf6", strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
