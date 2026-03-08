import { useState } from 'react';
import { Download, TrendingUp, Gift, Calendar, X } from 'lucide-react';
import pointIcon from 'figma:asset/coin.png';

type OrderStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface GiftOrder {
  id: string;
  employeeName: string;
  employeeId: string;
  giftName: string;
  pointsUsed: number;
  orderDate: string;
  status: OrderStatus;
  completedDate?: string;
}

export default function PointsGiftsPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'orders'>('orders');
  const [selectedStatus, setSelectedStatus] = useState<'all' | OrderStatus>('all');
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportDateFrom, setExportDateFrom] = useState('2026-02-01');
  const [exportDateTo, setExportDateTo] = useState('2026-02-28');
  const [dateFilterFrom, setDateFilterFrom] = useState('2026-02-01');
  const [dateFilterTo, setDateFilterTo] = useState('2026-02-28');

  const mockOrders: GiftOrder[] = [
    { id: 'O001', employeeName: 'Taro Tanaka', employeeId: 'EMP001', giftName: 'Amazon Gift Card ¥5,000', pointsUsed: 5000, orderDate: '2026-02-20', status: 'completed', completedDate: '2026-02-20' },
    { id: 'O002', employeeName: 'Hanako Sato', employeeId: 'EMP002', giftName: 'Starbucks Card ¥3,000', pointsUsed: 3000, orderDate: '2026-02-20', status: 'processing' },
    { id: 'O003', employeeName: 'Ichiro Suzuki', employeeId: 'EMP003', giftName: 'Convenience Store Voucher ¥1,000', pointsUsed: 1000, orderDate: '2026-02-19', status: 'pending' },
    { id: 'O004', employeeName: 'Misaki Takahashi', employeeId: 'EMP004', giftName: 'Travel Voucher ¥10,000', pointsUsed: 10000, orderDate: '2026-02-18', status: 'failed' },
    { id: 'O005', employeeName: 'Kenta Ito', employeeId: 'EMP005', giftName: 'Restaurant Voucher ¥2,000', pointsUsed: 2000, orderDate: '2026-02-17', status: 'completed', completedDate: '2026-02-17' },
    { id: 'O006', employeeName: 'Yuki Nakamura', employeeId: 'EMP006', giftName: 'Amazon Gift Card ¥5,000', pointsUsed: 5000, orderDate: '2026-02-16', status: 'completed', completedDate: '2026-02-16' },
    { id: 'O007', employeeName: 'Ryo Watanabe', employeeId: 'EMP007', giftName: 'Movie Ticket', pointsUsed: 1800, orderDate: '2026-02-15', status: 'completed', completedDate: '2026-02-15' },
    { id: 'O008', employeeName: 'Sakura Yamamoto', employeeId: 'EMP008', giftName: 'Amazon Gift Card ¥5,000', pointsUsed: 5000, orderDate: '2026-02-14', status: 'completed', completedDate: '2026-02-14' },
    { id: 'O009', employeeName: 'Kenji Kobayashi', employeeId: 'EMP009', giftName: 'Convenience Store Voucher ¥1,000', pointsUsed: 1000, orderDate: '2026-02-13', status: 'completed', completedDate: '2026-02-13' },
    { id: 'O010', employeeName: 'Aiko Matsumoto', employeeId: 'EMP010', giftName: 'Starbucks Card ¥3,000', pointsUsed: 3000, orderDate: '2026-02-12', status: 'processing' },
    { id: 'O011', employeeName: 'Takeshi Kimura', employeeId: 'EMP011', giftName: 'Restaurant Voucher ¥2,000', pointsUsed: 2000, orderDate: '2026-02-11', status: 'completed', completedDate: '2026-02-11' },
    { id: 'O012', employeeName: 'Yuko Hayashi', employeeId: 'EMP012', giftName: 'Movie Ticket', pointsUsed: 1800, orderDate: '2026-02-10', status: 'completed', completedDate: '2026-02-10' },
  ];

  const getStatusConfig = (status: OrderStatus) => {
    switch (status) {
      case 'completed':
        return { label: 'Completed', color: '#10B981', bgColor: '#10B981' };
      case 'processing':
        return { label: 'Processing', color: '#3B82F6', bgColor: '#3B82F6' };
      case 'pending':
        return { label: 'Pending', color: '#F59E0B', bgColor: '#F59E0B' };
      case 'failed':
        return { label: 'Failed', color: '#EF4444', bgColor: '#EF4444' };
    }
  };

  const handleExportCSV = () => {
    const filteredData = mockOrders.filter(order => {
      const orderDate = new Date(order.orderDate);
      const fromDate = new Date(exportDateFrom);
      const toDate = new Date(exportDateTo);
      return orderDate >= fromDate && orderDate <= toDate;
    });

    const headers = ['Order ID', 'Employee Name', 'Employee ID', 'Gift Name', 'Points Used', 'Order Date', 'Status', 'Completed Date'];
    const csvContent = [
      headers.join(','),
      ...filteredData.map(order => [
        order.id,
        `"${order.employeeName}"`,
        order.employeeId,
        `"${order.giftName}"`,
        order.pointsUsed,
        order.orderDate,
        order.status,
        order.completedDate || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `points-gifts-${exportDateFrom}-to-${exportDateTo}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setShowExportDialog(false);
  };

  const filteredOrders = mockOrders.filter(order => {
    const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;
    const orderDate = new Date(order.orderDate);
    const fromDate = new Date(dateFilterFrom);
    const toDate = new Date(dateFilterTo);
    const matchesDate = orderDate >= fromDate && orderDate <= toDate;
    return matchesStatus && matchesDate;
  });

  const totalPointsUsed = filteredOrders.reduce((sum, order) => sum + order.pointsUsed, 0);
  const pendingOrders = filteredOrders.filter(o => o.status === 'pending' || o.status === 'failed').length;

  return (
    <div className="h-full flex flex-col bg-[#FAFBFC]">
      <div className="bg-white border-b border-[#E5E7EB] px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-[#081A33]">Points & Gifts Management</h1>
            <p className="text-sm text-[#6B7280] mt-1">Track point usage and manage gift orders</p>
          </div>
          <button 
            onClick={() => setShowExportDialog(true)}
            className="px-4 py-2.5 bg-[#081A33] text-white rounded-lg hover:bg-[#0A2240] transition-colors flex items-center gap-2 shadow-sm"
          >
            <Download size={18} />
            Export CSV
          </button>
        </div>

        {/* Date Range Filter */}
        <div className="mb-6 bg-[#F7F8FA] rounded-lg p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-[#6B7280]" />
              <span className="text-sm font-medium text-[#081A33]">Date Range:</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFilterFrom}
                onChange={(e) => setDateFilterFrom(e.target.value)}
                className="px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A227]"
              />
              <span className="text-sm text-[#6B7280]">to</span>
              <input
                type="date"
                value={dateFilterTo}
                onChange={(e) => setDateFilterTo(e.target.value)}
                className="px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A227]"
              />
            </div>
            <button
              onClick={() => {
                setDateFilterFrom('2026-02-01');
                setDateFilterTo('2026-02-28');
              }}
              className="px-3 py-2 text-sm text-[#6B7280] hover:text-[#081A33] transition-colors"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          {['overview', 'orders'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as typeof activeTab)}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? 'bg-[#081A33] text-white shadow-sm'
                  : 'bg-white border border-[#E5E7EB] text-[#6B7280] hover:border-[#C9A227]'
              }`}
            >
              {tab === 'overview' ? 'Overview' : 'Orders'}
              {tab === 'orders' && pendingOrders > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-white/20 rounded text-xs">{pendingOrders}</span>
              )}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#C9A227]/5 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <img src={pointIcon} alt="Points" className="w-4 h-4" />
              <p className="text-xs text-[#6B7280]">Total Points Used</p>
            </div>
            <p className="text-2xl font-semibold text-[#081A33]">{totalPointsUsed.toLocaleString()}</p>
            <p className="text-xs text-[#6B7280] mt-1">Selected period</p>
          </div>
          <div className="bg-[#F7F8FA] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Gift size={16} className="text-[#6B7280]" />
              <p className="text-xs text-[#6B7280]">Total Orders</p>
            </div>
            <p className="text-2xl font-semibold text-[#081A33]">{filteredOrders.length}</p>
            <p className="text-xs text-[#6B7280] mt-1">Selected period</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col px-8 py-6">
        {activeTab === 'overview' ? (
          <div className="space-y-6">
            {/* Monthly Summary */}
            <div className="bg-white rounded-lg border border-[#E5E7EB] p-6">
              <h3 className="font-semibold text-[#081A33] mb-4 flex items-center gap-2">
                <TrendingUp size={18} />
                Period Summary
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-[#E5E7EB]">
                  <span className="text-sm text-[#6B7280]">Total Points Used</span>
                  <span className="font-semibold text-[#081A33]">{totalPointsUsed.toLocaleString()} pts</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[#E5E7EB]">
                  <span className="text-sm text-[#6B7280]">Completed Orders</span>
                  <span className="font-semibold text-[#081A33]">{filteredOrders.filter(o => o.status === 'completed').length}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[#E5E7EB]">
                  <span className="text-sm text-[#6B7280]">Processing</span>
                  <span className="font-semibold text-[#081A33]">{filteredOrders.filter(o => o.status === 'processing').length}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-[#6B7280]">Pending/Failed</span>
                  <span className="font-semibold text-[#EF4444]">{pendingOrders}</span>
                </div>
              </div>
            </div>

            {/* Popular Gifts */}
            <div className="bg-white rounded-lg border border-[#E5E7EB] p-6">
              <h3 className="font-semibold text-[#081A33] mb-4">Popular Gifts</h3>
              <div className="space-y-3">
                {[
                  { name: 'Amazon Gift Card', count: 45, points: 5000 },
                  { name: 'Starbucks Card', count: 32, points: 3000 },
                  { name: 'Convenience Store Voucher', count: 28, points: 1000 },
                  { name: 'Travel Voucher', count: 12, points: 10000 },
                ].map((gift, index) => (
                  <div key={index} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#C9A227]/10 rounded-lg flex items-center justify-center">
                        <Gift size={16} className="text-[#C9A227]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#081A33]">{gift.name}</p>
                        <p className="text-xs text-[#9CA3AF]">{gift.points.toLocaleString()} pts</p>
                      </div>
                    </div>
                    <span className="text-sm text-[#6B7280]">{gift.count} orders</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Status Filter */}
            <div className="flex gap-2 mb-4">
              {(['all', 'completed', 'processing', 'pending', 'failed'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                    selectedStatus === status
                      ? 'bg-[#081A33] text-white'
                      : 'bg-white border border-[#E5E7EB] text-[#6B7280] hover:border-[#C9A227]'
                  }`}
                >
                  {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>

            {/* Orders Table */}
            <div className="flex-1 bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
              <div className="overflow-auto h-full">
                <table className="w-full">
                  <thead className="bg-[#F7F8FA] sticky top-0">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[#6B7280]">Order ID</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[#6B7280]">Employee</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[#6B7280]">Gift</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-[#6B7280]">Points</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[#6B7280]">Order Date</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[#6B7280]">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {filteredOrders.map((order) => {
                      const statusConfig = getStatusConfig(order.status);
                      return (
                        <tr key={order.id} className="hover:bg-[#F7F8FA] transition-colors">
                          <td className="px-4 py-3 text-sm text-[#6B7280]">{order.id}</td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="text-sm font-medium text-[#081A33]">{order.employeeName}</p>
                              <p className="text-xs text-[#9CA3AF]">{order.employeeId}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-[#081A33]">{order.giftName}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <img src={pointIcon} alt="Points" className="w-4 h-4" />
                              <span className="text-sm font-semibold text-[#C9A227]">{order.pointsUsed.toLocaleString()}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-[#6B7280]">{order.orderDate}</td>
                          <td className="px-4 py-3">
                            <span 
                              className="inline-block px-2.5 py-1 rounded text-xs font-medium text-white"
                              style={{ backgroundColor: statusConfig.bgColor }}
                            >
                              {statusConfig.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Export CSV Dialog */}
      {showExportDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
            <div className="px-6 py-5 border-b border-[#E5E7EB] flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#081A33]">Export to CSV</h2>
                <p className="text-sm text-[#9CA3AF] mt-1">Select date range for export</p>
              </div>
              <button
                onClick={() => setShowExportDialog(false)}
                className="p-2 hover:bg-[#F7F8FA] rounded-lg transition-colors"
              >
                <X size={20} className="text-[#6B7280]" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#081A33] mb-2">
                  From Date
                </label>
                <input
                  type="date"
                  value={exportDateFrom}
                  onChange={(e) => setExportDateFrom(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A227]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#081A33] mb-2">
                  To Date
                </label>
                <input
                  type="date"
                  value={exportDateTo}
                  onChange={(e) => setExportDateTo(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A227]"
                />
              </div>

              <div className="bg-[#F7F8FA] rounded-lg p-4">
                <p className="text-sm text-[#6B7280]">
                  <span className="font-medium text-[#081A33]">
                    {mockOrders.filter(order => {
                      const orderDate = new Date(order.orderDate);
                      const fromDate = new Date(exportDateFrom);
                      const toDate = new Date(exportDateTo);
                      return orderDate >= fromDate && orderDate <= toDate;
                    }).length}
                  </span>
                  {' '}orders will be exported
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowExportDialog(false)}
                  className="flex-1 py-2.5 px-4 bg-white border border-[#E5E7EB] text-[#081A33] rounded-lg font-medium hover:bg-[#F7F8FA] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExportCSV}
                  className="flex-1 py-2.5 px-4 bg-[#081A33] text-white rounded-lg font-medium hover:bg-[#0A2240] transition-colors flex items-center justify-center gap-2"
                >
                  <Download size={18} />
                  Export
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
