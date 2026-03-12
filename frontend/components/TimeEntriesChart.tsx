'use client';

import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface TimeEntry {
  author: string;
  spentHours: number;
  spentAt: Date;
}

interface TimeEntriesChartProps {
  timeEntries: TimeEntry[];
}

const COLORS = [
  '#667eea', '#764ba2', '#f093fb', '#4facfe',
  '#43e97b', '#fa709a', '#fee140', '#30cfd0',
  '#a8edea', '#fed6e3', '#c471ed', '#f64f59'
];

export function TimeEntriesChart({ timeEntries }: TimeEntriesChartProps) {
  const chartData = useMemo(() => {
    if (!timeEntries || timeEntries.length === 0) {
      return { dates: [], series: [] };
    }

    // Sort entries by date
    const sorted = [...timeEntries].sort(
      (a, b) => new Date(a.spentAt).getTime() - new Date(b.spentAt).getTime()
    );

    // Get unique dates
    const dates = [...new Set(sorted.map((e) => new Date(e.spentAt).toISOString().split('T')[0]))];

    // Get unique authors
    const authors = [...new Set(sorted.map((e) => e.author))];

    // Build cumulative data
    const authorData: Record<string, Record<string, number>> = {};

    authors.forEach((author) => {
      authorData[author] = {};
      let cumulative = 0;

      dates.forEach((date) => {
        const dayEntries = sorted.filter(
          (e) =>
            e.author === author &&
            new Date(e.spentAt).toISOString().split('T')[0] === date
        );
        const dayHours = dayEntries.reduce((sum, e) => sum + e.spentHours, 0);
        cumulative += dayHours;
        authorData[author][date] = cumulative;
      });
    });

    // Transform for Recharts
    const data = dates.map((date) => {
      const point: any = { date };
      authors.forEach((author) => {
        point[author] = authorData[author][date];
      });
      return point;
    });

    return { dates, series: authors, data };
  }, [timeEntries]);

  if (!chartData.data || chartData.data.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center text-gray-500">
        No time entries to display
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={chartData.data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
        <Tooltip />
        <Legend />
        {chartData.series.map((author, index) => (
          <Line
            key={author}
            type="monotone"
            dataKey={author}
            stroke={COLORS[index % COLORS.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 6 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
