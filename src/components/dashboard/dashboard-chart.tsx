"use client";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, Cell } from "recharts";

type DashboardChartProps = {
    data: { name: string; value: number }[];
    chartConfig: ChartConfig;
}

export function DashboardChart({ data, chartConfig }: DashboardChartProps) {
    return (
        <ChartContainer config={chartConfig} className="h-64 w-full">
            <BarChart accessibilityLayer data={data}>
                <CartesianGrid vertical={false} />
                <XAxis
                    dataKey="name"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    tickFormatter={(value) => value.slice(0, 15)}
                />
                <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                />
                <Bar
                    dataKey="value"
                    radius={8}
                    barSize={40}
                >
                    {data.map((entry) => (
                        <Cell key={entry.name} fill={chartConfig[entry.name as keyof typeof chartConfig]?.color || 'hsl(var(--primary))'} />
                    ))}
                </Bar>
            </BarChart>
        </ChartContainer>
    );
}
