import { useState } from 'react';
import { Search, CreditCard, AlertTriangle, CheckCircle, Edit } from 'lucide-react';

type CardStatus = 'active' | 'inactive' | 'lost_reported';

interface Card {
  id: string;
  cardNumber: string;
  room: string;
  status: CardStatus;
  lastUsed: string;
  issueDate: string;
}

export default function CardManagementPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const mockCards: Card[] = [
    {
      id: 'C001',
      cardNumber: '1234-5678-9012',
      room: '305',
      status: 'active',
      lastUsed: '2026-02-20 14:30',
      issueDate: '2026-02-15',
    },
    {
      id: 'C002',
      cardNumber: '2345-6789-0123',
      room: '412',
      status: 'active',
      lastUsed: '2026-02-20 09:15',
      issueDate: '2026-02-10',
    },
    {
      id: 'C003',
      cardNumber: '3456-7890-1234',
      room: '201',
      status: 'lost_reported',
      lastUsed: '2026-02-18 16:45',
      issueDate: '2026-02-18',
    },
    {
      id: 'C004',
      cardNumber: '4567-8901-2345',
      room: '508',
      status: 'active',
      lastUsed: '2026-02-20 11:20',
      issueDate: '2026-02-12',
    },
  ];

  const getStatusConfig = (status: CardStatus) => {
    switch (status) {
      case 'active':
        return { label: 'Active', color: '#10B981', icon: CheckCircle };
      case 'inactive':
        return { label: 'Inactive', color: '#6B7280', icon: CheckCircle };
      case 'lost_reported':
        return { label: 'Lost Reported', color: '#EF4444', icon: AlertTriangle };
    }
  };

  const filteredCards = mockCards.filter(card => 
    card.cardNumber.includes(searchQuery) ||
    card.room.includes(searchQuery)
  );

  return (
    <div className="h-full flex flex-col bg-[#FAFBFC]">
      {/* Header */}
      <div className="bg-white border-b border-[#E5E7EB] px-8 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[#081A33]">Card Management</h1>
          <p className="text-sm text-[#6B7280] mt-1">Manage card assignments and monitor card status</p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder="Search by card number or room..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A227] focus:border-transparent"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#F7F8FA] rounded-lg p-4">
            <p className="text-xs text-[#6B7280] mb-1">Active Cards</p>
            <p className="text-2xl font-semibold text-[#081A33]">
              {mockCards.filter(c => c.status === 'active').length}
            </p>
          </div>
          <div className="bg-[#EF4444]/5 rounded-lg p-4">
            <p className="text-xs text-[#6B7280] mb-1">Lost Reports</p>
            <p className="text-2xl font-semibold text-[#EF4444]">
              {mockCards.filter(c => c.status === 'lost_reported').length}
            </p>
          </div>
          <div className="bg-[#F7F8FA] rounded-lg p-4">
            <p className="text-xs text-[#6B7280] mb-1">Total Cards</p>
            <p className="text-2xl font-semibold text-[#081A33]">{mockCards.length}</p>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filteredCards.map((card) => {
            const statusConfig = getStatusConfig(card.status);
            const StatusIcon = statusConfig.icon;

            return (
              <div
                key={card.id}
                className="bg-white rounded-lg border border-[#E5E7EB] p-6 hover:shadow-lg hover:border-[#C9A227] transition-all"
              >
                {/* Header */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-3 bg-[#F7F8FA] rounded-lg">
                    <CreditCard size={24} className="text-[#081A33]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-[#081A33] mb-1">{card.cardNumber}</h3>
                    <p className="text-sm text-[#6B7280]">Room {card.room}</p>
                  </div>
                  <button className="p-2 hover:bg-[#F7F8FA] rounded-lg transition-colors">
                    <Edit size={18} className="text-[#6B7280]" />
                  </button>
                </div>

                {/* Status Badge */}
                <div className="flex items-center gap-2 mb-4">
                  <StatusIcon size={16} style={{ color: statusConfig.color }} />
                  <span className="text-sm font-medium" style={{ color: statusConfig.color }}>
                    {statusConfig.label}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#9CA3AF]">Issue Date</span>
                    <span className="text-[#6B7280]">{card.issueDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#9CA3AF]">Last Used</span>
                    <span className="text-[#6B7280]">{card.lastUsed}</span>
                  </div>
                </div>

                {/* Actions */}
                {card.status === 'lost_reported' && (
                  <div className="mt-4 pt-4 border-t border-[#E5E7EB]">
                    <button className="w-full py-2 bg-[#EF4444] text-white rounded-lg text-sm font-medium hover:bg-[#DC2626] transition-colors">
                      Report to Manager
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
