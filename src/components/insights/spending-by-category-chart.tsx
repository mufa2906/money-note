"use client"

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { formatCurrency } from "@/lib/utils"

interface ChartEntry {
  name: string
  value: number
  color: string
}

interface Props {
  data: ChartEntry[]
  showAll?: boolean
}

export function SpendingByCategoryChart({ data }: Props) {
  if (data.length === 0) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Belum ada data pengeluaran</div>
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(v: unknown) => formatCurrency(v as number)} />
          <Legend formatter={(value) => <span className="text-xs">{value}</span>} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
