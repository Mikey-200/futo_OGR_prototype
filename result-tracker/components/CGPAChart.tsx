"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function CGPAChart({ data }: { data: { name: string, gpa: number, cgpa: number }[] }) {
  return (
    <div className="h-72 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 5, right: 20, left: -20, bottom: 5 }}
        >
          <defs>
            <linearGradient id="colorCgpa" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0d5c2e" stopOpacity={0.15}/>
              <stop offset="95%" stopColor="#0d5c2e" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.8} />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{fill: '#64748b', fontSize: 10, fontWeight: 600, letterSpacing: '0.05em'}} 
            dy={10} 
          />
          <YAxis 
            domain={[0, 5]} 
            axisLine={false} 
            tickLine={false} 
            tick={{fill: '#64748b', fontSize: 10, fontWeight: 600}} 
            dx={-10} 
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.95)', 
              borderRadius: '8px', 
              border: '1px solid #e2e8f0', 
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              color: '#0f172a'
            }}
            itemStyle={{ color: '#0d5c2e', fontWeight: 'bold' }}
            cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
          />
          <Area 
            type="monotone" 
            dataKey="cgpa" 
            name="Cumulative GPA"
            stroke="#0d5c2e" 
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorCgpa)"
            dot={{ r: 4, strokeWidth: 2, fill: '#ffffff', stroke: '#0d5c2e' }} 
            activeDot={{ r: 6, stroke: '#0d5c2e', strokeWidth: 2, fill: '#e6f2eb' }} 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
