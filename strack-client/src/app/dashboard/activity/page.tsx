'use client';

import HeaderSearch from '@/lib/components/HeaderSearch';
import {
  Activity,
  Download,
  Filter,
  LogIn,
  LogOut,
  Settings,
  Shield,
  UserPlus,
} from 'lucide-react';
import { useState } from 'react';

type ActivityType = 'login' | 'logout' | 'settings' | 'security' | 'account';

interface ActivityEntry {
  id: string;
  type: ActivityType;
  description: string;
  ip: string;
  device: string;
  timestamp: string;
}

const activityLog: ActivityEntry[] = [];

const activityIcons: Record<ActivityType, React.ElementType> = {
  login: LogIn,
  logout: LogOut,
  settings: Settings,
  security: Shield,
  account: UserPlus,
};

const activityColors: Record<ActivityType, string> = {
  login: '#036B26',
  logout: '#525866',
  settings: '#AD6F10',
  security: '#9E0A05',
  account: '#020C14',
};

export default function ActivityPage() {
  const [filter, setFilter] = useState<'all' | ActivityType>('all');

  const filtered =
    filter === 'all' ? activityLog : activityLog.filter((a) => a.type === filter);

  return (
    <main>
      <HeaderSearch
        headerText="Activity Log"
        headerDescription="Track all account activities and security events"
      />

      <section className="mt-8 border border-[#E1E4EA] rounded-xl bg-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 gap-4 border-b border-[#E1E4EA]">
          <div className="flex gap-1 bg-[#F7F9FC] rounded-lg p-1">
            {(['all', 'login', 'security', 'settings'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
                  filter === tab
                    ? 'bg-white text-[#0E121B] shadow-sm'
                    : 'text-[#525866] hover:text-[#0E121B]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-2 px-3 py-2 border border-[#E1E4EA] rounded-lg text-sm text-[#525866] hover:bg-[#F7F9FC]">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>

        {filtered.length > 0 ? (
          <div className="divide-y divide-[#E1E4EA]">
            {filtered.map((entry) => {
              const Icon = activityIcons[entry.type];
              const color = activityColors[entry.type];
              return (
                <div
                  key={entry.id}
                  className="p-5 flex items-start gap-4 hover:bg-[#F7F9FC] transition-colors"
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${color}10` }}
                  >
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#0E121B]">{entry.description}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-[#99A0AE]">{entry.ip}</span>
                      <span className="text-xs text-[#E1E4EA]">|</span>
                      <span className="text-xs text-[#99A0AE]">{entry.device}</span>
                    </div>
                  </div>
                  <span className="text-xs text-[#99A0AE] shrink-0">{entry.timestamp}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-16 text-center">
            <Activity className="w-10 h-10 text-[#E1E4EA] mx-auto mb-3" />
            <p className="text-sm font-medium text-[#0E121B]">No activity yet</p>
            <p className="text-xs text-[#99A0AE] mt-1">
              Your account activities will be recorded here
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
