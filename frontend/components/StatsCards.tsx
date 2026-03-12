'use client';

interface StatsCardsProps {
  totalHours: number;
  totalPbis: number;
  totalMembers: number;
  avgHoursPerMember: number;
}

export function StatsCards({
  totalHours,
  totalPbis,
  totalMembers,
  avgHoursPerMember,
}: StatsCardsProps) {
  const stats = [
    {
      label: 'Total Hours',
      value: totalHours.toFixed(1) + 'h',
      icon: '⏱️',
      color: 'from-blue-500 to-blue-600',
    },
    {
      label: 'Active PBIs',
      value: totalPbis,
      icon: '📋',
      color: 'from-purple-500 to-purple-600',
    },
    {
      label: 'Team Members',
      value: totalMembers,
      icon: '👥',
      color: 'from-pink-500 to-pink-600',
    },
    {
      label: 'Avg Hours/Member',
      value: avgHoursPerMember.toFixed(1) + 'h',
      icon: '📊',
      color: 'from-indigo-500 to-indigo-600',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <div
          key={index}
          className={`rounded-lg bg-gradient-to-br ${stat.color} p-6 text-white shadow-lg`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">{stat.label}</p>
              <p className="mt-2 text-3xl font-bold">{stat.value}</p>
            </div>
            <div className="text-4xl opacity-80">{stat.icon}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
