export default function DashboardCard({
    title,
    value,
    trend,
    icon: Icon
}: {
    title: string;
    value: string;
    trend?: string;
    icon?: any
}) {
    return (
        <div className="glass-card p-6 rounded-2xl border border-purple-100/50">
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-muted-foreground text-sm font-medium">{title}</h3>
                {Icon && <div className="p-2 bg-purple-50 rounded-lg text-primary"><Icon size={20} /></div>}
            </div>
            <div className="flex items-end gap-2">
                <span className="text-3xl font-bold tracking-tight text-foreground">{value}</span>
                {trend && (
                    <span className={`text-sm mb-1 font-medium ${trend.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                        {trend}
                    </span>
                )}
            </div>
        </div>
    );
}
