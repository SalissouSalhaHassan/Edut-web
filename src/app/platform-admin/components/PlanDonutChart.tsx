"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

type PlanItem = {
  name: string;
  value: number;
  color: string;
  percent: number;
};

export function PlanDonutChart({
  data,
  totalSchools,
}: {
  data: PlanItem[];
  totalSchools: number;
}) {
  const hasData = data.some((d) => d.value > 0);

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Donut */}
      <div className="relative w-[180px] h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={hasData ? data.filter((d) => d.value > 0) : [{ name: "Vide", value: 1, color: "#e2e8f0", percent: 100 }]}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={82}
              paddingAngle={hasData ? 3 : 0}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
              stroke="none"
            >
              {(hasData ? data.filter((d) => d.value > 0) : [{ color: "#e2e8f0" }]).map(
                (entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                )
              )}
            </Pie>
            {hasData && (
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "none",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
                  padding: "8px 12px",
                  fontSize: "12px",
                  fontWeight: 700,
                }}
                formatter={(value: any, name: any) => [`${value} école(s)`, name]}
              />
            )}
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-black text-slate-900 leading-none">{totalSchools}</span>
          <span className="text-[11px] font-semibold text-slate-400 mt-0.5">Écoles</span>
        </div>
      </div>

      {/* Legend */}
      <div className="w-full space-y-2.5">
        {data.map((item) => (
          <div key={item.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm font-semibold text-slate-700">{item.name}</span>
            </div>
            <span className="text-sm font-black text-slate-500">
              {item.value} ({item.percent}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
