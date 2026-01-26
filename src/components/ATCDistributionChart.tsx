
"use client";

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Activity } from 'lucide-react';

interface ATCData {
    code: string;
    name: string;
    count: number;
    percentage: string;
}

export default function ATCDistributionChart() {
    const [data, setData] = useState<ATCData[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch('/api/analytics/atc-distribution');
                const json = await res.json();
                if (json.success) {
                    setData(json.data);
                }
            } catch (error) {
                console.error("Failed to fetch ATC data", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    if (isLoading) {
        return (
            <div className="glass-panel w-full h-[60px] animate-pulse rounded-2xl mt-6 flex items-center justify-center">
                <span className="text-slate-400 text-xs tracking-widest uppercase">Cargando Análisis Terapéutico...</span>
            </div>
        );
    }

    if (data.length === 0) return null;

    // Custom Tooltip
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white/90 backdrop-blur-md border border-slate-200 p-4 rounded-xl shadow-xl">
                    <p className="font-bold text-slate-800 text-sm mb-1">{payload[0].payload.name}</p>
                    <p className="text-blue-600 font-mono text-lg font-bold">
                        {payload[0].value} <span className="text-xs text-slate-400 font-normal">productos</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                        Representa el {payload[0].payload.percentage}% del catálogo
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="glass-panel mt-6 p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                    <Activity size={20} />
                </div>
                <div>
                    <h3 className="font-bold text-slate-700 text-lg">Distribución Terapéutica (ATC)</h3>
                    <p className="text-xs text-slate-400">Clasificación por sistema anatómico principal</p>
                </div>
            </div>

            <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.slice(0, 10)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                            dataKey="code"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#cbd5e1', fontSize: 10 }}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                        <Bar dataKey="count" radius={[6, 6, 6, 6]} barSize={40}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={`hsl(226, 70%, ${55 + (index * 4)}%)`} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 justify-center">
                {data.slice(0, 5).map((d) => (
                    <span key={d.code} className="px-2 py-1 bg-slate-50 border border-slate-100 rounded-lg text-[10px] text-slate-500 font-medium">
                        <strong className="text-indigo-500">{d.code}</strong> {d.name.split(' ')[0]}... ({d.percentage}%)
                    </span>
                ))}
            </div>
        </div>
    );
}
