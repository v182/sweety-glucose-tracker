import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { SLOTS } from '../../../shared/slots.js';
import { addDays, formatDate } from '../../../shared/dates.js';
import { EmptyState } from './UI.jsx';

export default function TrendChart({ readings, range }) {
  if (!readings?.length)
    return (
      <EmptyState
        title="Your pattern starts with a reading"
        description="Readings from this period will appear on your chart."
      />
    );
  const byDate = new Map();
  // Keep unrecorded days on the axis; a missing day must break each slot's line.
  for (let date = range.from; date <= range.to; date = addDays(date, 1)) {
    byDate.set(date, { date });
  }
  readings.forEach((reading) => {
    if (!byDate.has(reading.date)) byDate.set(reading.date, { date: reading.date });
    byDate.get(reading.date)[reading.slot] = reading.value;
  });
  const points = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  return (
    <div
      className="chart-wrap"
      role="img"
      aria-label={`Glucose readings from ${range.from} to ${range.to}, separated by time slot. The reports and history tables provide the exact values.`}
    >
      <span className="chart-unit">mg/dl</span>
      <ResponsiveContainer width="100%" height={265} minWidth={0}>
        <LineChart
          data={points}
          margin={{ top: 14, right: 15, left: -23, bottom: 0 }}
          accessibilityLayer
        >
          <CartesianGrid vertical={false} stroke="#e8eeeb" strokeDasharray="4 5" />
          <XAxis
            dataKey="date"
            tickFormatter={(date) =>
              formatDate(date, { day: 'numeric', month: 'short', year: undefined })
            }
            axisLine={false}
            tickLine={false}
            minTickGap={32}
            tick={{ fill: '#7d8b85', fontSize: 11 }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#7d8b85', fontSize: 11 }}
            domain={['auto', 'auto']}
            allowDecimals={false}
          />
          <Tooltip
            labelFormatter={(date) => formatDate(date)}
            formatter={(value, name) => [`${value} mg/dl`, name]}
            contentStyle={{
              border: '1px solid #e5ebe7',
              borderRadius: 12,
              boxShadow: '0 8px 25px #203c3310',
              fontSize: 12,
            }}
          />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            iconSize={7}
            wrapperStyle={{ paddingTop: 24, fontSize: 11 }}
          />
          {SLOTS.map((slot) => (
            <Line
              key={slot.value}
              dataKey={slot.value}
              name={slot.label}
              type="linear"
              stroke={slot.color}
              strokeWidth={2.2}
              dot={{ r: points.length > 15 ? 1.8 : 3, strokeWidth: 2, fill: '#fff' }}
              activeDot={{ r: 5 }}
              connectNulls={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
