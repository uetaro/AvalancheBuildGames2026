import { Outlet, useNavigate, useLocation } from 'react-router';
import { Home, CreditCard, Building2, Users, Building, BarChart3, Search, Gift, LogOut, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import TodaysOverview from '../components/TodaysOverview';
import RectangleVectorized from '../../imports/RectangleVectorized';
import { useAuth } from '../components/AuthContext';

interface NavGroup {
  id: string;
  title: string;
  items: {
    id: string;
    label: string;
    icon: any;
    path: string;
  }[];
}

export default function ManagerLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['operations', 'management', 'insights']);

  const navGroups: NavGroup[] = [
    {
      id: 'operations',
      title: 'OPERATIONS',
      items: [
        { id: 'stays', label: 'Stays', icon: Home, path: '/manager/stays' },
        { id: 'rooms', label: 'Room Master', icon: Building2, path: '/manager/rooms' },
      ],
    },
    {
      id: 'management',
      title: 'MANAGEMENT',
      items: [
        { id: 'company', label: 'Company Info', icon: Building, path: '/manager/company' },
        { id: 'affiliation', label: 'Affiliation', icon: Users, path: '/manager/affiliation' },
        { id: 'card-master', label: 'Card Master', icon: CreditCard, path: '/manager/card-master' },
        { id: 'points-gifts', label: 'Point & Gift', icon: Gift, path: '/manager/points-gifts' },
      ],
    },
    {
      id: 'insights',
      title: 'INSIGHTS',
      items: [
        { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/manager/analytics' },
        { id: 'scout', label: 'Scout', icon: Search, path: '/manager/scout' },
      ],
    },
  ];

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="h-screen flex bg-[#FAFBFC]">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-[#E5E7EB] flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10">
              <RectangleVectorized />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-[#081A33]">Heartel</h1>
              <p className="text-xs text-[#6B7280]">Manager Portal</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <div className="space-y-6">
            {navGroups.map((group) => {
              const isExpanded = expandedGroups.includes(group.id);
              
              return (
                <div key={group.id}>
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className="w-full flex items-center justify-between px-2 py-2 text-xs font-semibold text-[#9CA3AF] hover:text-[#081A33] transition-colors"
                  >
                    <span className="tracking-wider">{group.title}</span>
                    <ChevronDown
                      size={16}
                      className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>
                  
                  {isExpanded && (
                    <div className="mt-2 space-y-1">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const isActive =
                          location.pathname === item.path ||
                          (location.pathname === '/manager' && item.path === '/manager/stays');

                        return (
                          <button
                            key={item.id}
                            onClick={() => navigate(item.path)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                              isActive
                                ? 'bg-[#081A33] text-white shadow-sm'
                                : 'text-[#6B7280] hover:bg-[#F7F8FA] hover:text-[#081A33]'
                            }`}
                          >
                            <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
                            <span className="text-sm font-medium">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        {/* Today's Overview */}
        <TodaysOverview role="manager" />

        {/* Logout */}
        <div className="p-4 border-t border-[#E5E7EB]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#EF4444] hover:bg-[#EF4444]/5 transition-all"
          >
            <LogOut size={20} />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <Outlet context={{ role: 'manager' }} />
      </main>
    </div>
  );
}