import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const LanguageChart = ({ languageStats }) => {
  const chartData = useMemo(() => {
    return Object.entries(languageStats || {})
      .map(([key, value]) => ({
        name: key.toUpperCase(),
        value,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [languageStats]);

  return (
    <div style={{ width: "100%", height: 220 }}>
      <h4 style={{ marginBottom: 10 }}>Language Breakdown</h4>

      <ResponsiveContainer>
        <BarChart data={chartData}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default LanguageChart;