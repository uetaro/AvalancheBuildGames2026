import { useState } from 'react';
import { Search, Plus, CreditCard, AlertCircle, CheckCircle, XCircle, Clock, X, MessageSquare } from 'lucide-react';

const hotelLogoUrl = 'https://images.unsplash.com/photo-1746130702924-cecefafa9092?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBob3RlbCUyMGxvZ28lMjBpY29ufGVufDF8fHx8MTc3MjExMjQ2Mnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral';

type CardStatus = 'active' | 'lost' | 'inactive';
type InquiryType = 'lost' | 'new_room' | 'damaged' | 'other';
type InquiryStatus = 'pending' | 'resolved';

interface Card {
  id: string;
  cardNumber: string;
  status: CardStatus;
  assignedRoom?: string;
  issueDate: string;
  lastUsed?: string;
}

interface Inquiry {
  id: string;
  cardId: string;
  type: InquiryType;
  message: string;
  date: string;
  status: InquiryStatus;
}

export default function CardLossResponsePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | CardStatus>('all');
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showInquiryDialog, setShowInquiryDialog] = useState(false);
  const [newCardNumber, setNewCardNumber] = useState('');
  const [assignedRoom, setAssignedRoom] = useState('');
  const [inquiryType, setInquiryType] = useState<InquiryType>('lost');
  const [inquiryMessage, setInquiryMessage] = useState('');

  const [cards, setCards] = useState<Card[]>([
    { id: 'C001', cardNumber: '4532 7712 3344', status: 'active', assignedRoom: '201', issueDate: '2026-02-20', lastUsed: '2026-02-28' },
    { id: 'C002', cardNumber: '4532 8856 9921', status: 'active', assignedRoom: '301', issueDate: '2026-02-22', lastUsed: '2026-02-28' },
    { id: 'C003', cardNumber: '4532 8821 9043', status: 'active', issueDate: '2026-02-15', lastUsed: '2026-02-27' },
    { id: 'C004', cardNumber: '4532 1156 7732', status: 'lost', assignedRoom: '405', issueDate: '2026-02-10', lastUsed: '2026-02-25' },
    { id: 'C005', cardNumber: '4532 9944 2381', status: 'active', issueDate: '2026-02-18', lastUsed: '2026-02-28' },
    { id: 'C006', cardNumber: '4532 6677 4429', status: 'inactive', issueDate: '2026-01-05' },
  ]);

  const [inquiries, setInquiries] = useState<Inquiry[]>([
    { id: 'I001', cardId: 'C004', type: 'lost', message: 'Guest reported card lost in lobby area', date: '2026-02-25', status: 'pending' },
    { id: 'I002', cardId: 'C001', type: 'new_room', message: 'Guest moved to suite 501, need new card', date: '2026-02-27', status: 'resolved' },
  ]);

  const handleAddCard = () => {
    if (newCardNumber) {
      const newCard: Card = {
        id: `C${Date.now()}`,
        cardNumber: newCardNumber,
        status: 'active',
        assignedRoom: assignedRoom || undefined,
        issueDate: new Date().toISOString().split('T')[0],
      };
      setCards(prev => [...prev, newCard]);
      setNewCardNumber('');
      setAssignedRoom('');
      setShowAddDialog(false);
      setSelectedCard(newCard);
    }
  };

  const handleSubmitInquiry = () => {
    if (selectedCard && inquiryMessage) {
      const newInquiry: Inquiry = {
        id: `I${Date.now()}`,
        cardId: selectedCard.id,
        type: inquiryType,
        message: inquiryMessage,
        date: new Date().toISOString().split('T')[0],
        status: 'pending',
      };
      setInquiries(prev => [...prev, newInquiry]);

      if (inquiryType === 'lost') {
        setCards(prev => prev.map(c => c.id === selectedCard.id ? { ...c, status: 'lost' as CardStatus } : c));
      }

      setInquiryMessage('');
      setShowInquiryDialog(false);
    }
  };

  const handleResolveInquiry = (inquiryId: string) => {
    setInquiries(prev => prev.map(inq => inq.id === inquiryId ? { ...inq, status: 'resolved' as InquiryStatus } : inq));
  };

  const handleMarkActive = (cardId: string) => {
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, status: 'active' as CardStatus } : c));
  };

  const filteredCards = cards.filter(card => {
    const matchesSearch = card.cardNumber.includes(searchQuery) || card.assignedRoom?.includes(searchQuery);
    const matchesFilter = filterStatus === 'all' || card.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const cardInquiries = selectedCard ? inquiries.filter(inq => inq.cardId === selectedCard.id) : [];
  const pendingInquiries = inquiries.filter(inq => inq.status === 'pending');

  const stats = {
    total: cards.length,
    active: cards.filter(c => c.status === 'active').length,
    lost: cards.filter(c => c.status === 'lost').length,
    pending: pendingInquiries.length,
  };

  return (
    <div className="h-full flex bg-[#FAFBFC]">
      {/* Left Panel - Card List */}
      <div className="w-96 bg-white border-r border-[#E5E7EB] flex flex-col">
        <div className="p-6 border-b border-[#E5E7EB]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-[#081A33]">Card Management</h2>
              <p className="text-xs text-[#6B7280] mt-1">{stats.active} active · {stats.lost} lost</p>
            </div>
            <button
              onClick={() => {
                setNewCardNumber('');
                setAssignedRoom('');
                setShowAddDialog(true);
              }}
              className="p-2.5 bg-[#081A33] text-white rounded-lg hover:bg-[#0A2240] transition-colors"
            >
              <Plus size={18} />
            </button>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                type="text"
                placeholder="Search card or room..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-[#F7F8FA] border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A227]"
              />
            </div>

            <div className="flex gap-2">
              {(['all', 'active', 'lost', 'inactive'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                    filterStatus === status
                      ? 'bg-[#081A33] text-white'
                      : 'bg-[#F7F8FA] text-[#6B7280] hover:bg-[#E5E7EB]'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {filteredCards.map((card) => {
              const cardPendingInquiries = inquiries.filter(inq => inq.cardId === card.id && inq.status === 'pending').length;
              return (
                <button
                  key={card.id}
                  onClick={() => setSelectedCard(card)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    selectedCard?.id === card.id
                      ? 'border-[#C9A227] bg-[#C9A227]/5'
                      : 'border-[#E5E7EB] hover:border-[#C9A227]/50 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-sm font-semibold text-[#081A33] mb-1">
                        {card.cardNumber}
                      </div>
                      {card.assignedRoom && (
                        <div className="text-xs text-[#6B7280]">Room {card.assignedRoom}</div>
                      )}
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-medium flex-shrink-0 ml-2 ${
                      card.status === 'active'
                        ? 'bg-[#10B981]/10 text-[#10B981]'
                        : card.status === 'lost'
                        ? 'bg-[#FF6B6B]/10 text-[#FF6B6B]'
                        : 'bg-[#9CA3AF]/10 text-[#9CA3AF]'
                    }`}>
                      {card.status}
                    </div>
                  </div>
                  {cardPendingInquiries > 0 && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-[#FF6B6B]">
                      <AlertCircle size={12} />
                      {cardPendingInquiries} pending {cardPendingInquiries === 1 ? 'inquiry' : 'inquiries'}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {pendingInquiries.length > 0 && (
          <div className="p-4 border-t border-[#E5E7EB] bg-[#FEF3F2]">
            <div className="flex items-center gap-2 text-sm">
              <AlertCircle size={16} className="text-[#FF6B6B]" />
              <span className="font-medium text-[#FF6B6B]">{pendingInquiries.length} pending inquiries</span>
            </div>
          </div>
        )}
      </div>

      {/* Right Panel - Card Details */}
      <div className="flex-1 flex flex-col">
        {selectedCard ? (
          <>
            <div className="bg-white border-b border-[#E5E7EB] px-8 py-6">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-semibold text-[#081A33]">Card Details</h1>
                  <p className="text-sm text-[#6B7280] mt-1">Manage card information and inquiries</p>
                </div>
                <button
                  onClick={() => setShowInquiryDialog(true)}
                  className="px-4 py-2.5 bg-[#FF6B6B] text-white rounded-lg hover:bg-[#FF5555] transition-colors flex items-center gap-2"
                >
                  <AlertCircle size={18} />
                  Report Issue
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-6">
              <div className="space-y-6">
                {/* Card Preview */}
                <div>
                  <h3 className="text-sm font-semibold text-[#081A33] mb-3">Card Information</h3>
                  <div className="bg-gradient-to-br from-[#081A33] to-[#0A2240] rounded-xl p-6 max-w-sm">
                    <div className="flex items-start justify-between mb-8">
                      <img 
                        src={hotelLogoUrl} 
                        alt="Hotel" 
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                      <div className="text-xs font-medium text-white/60 tracking-wider">Heartel</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-white/50 tracking-wider">CARD NUMBER</div>
                      <div className="text-2xl font-semibold text-white tracking-widest">{selectedCard.cardNumber}</div>
                    </div>
                    <div className="mt-6 flex items-center justify-between">
                      <div>
                        <div className="text-xs text-white/50">Issued</div>
                        <div className="text-sm text-white font-medium">{selectedCard.issueDate}</div>
                      </div>
                      {selectedCard.assignedRoom && (
                        <div className="text-right">
                          <div className="text-xs text-white/50">Room</div>
                          <div className="text-sm text-white font-medium">{selectedCard.assignedRoom}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Status & Actions */}
                <div>
                  <h3 className="text-sm font-semibold text-[#081A33] mb-3">Status & Actions</h3>
                  <div className="bg-white border border-[#E5E7EB] rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-[#6B7280] mb-1">Current Status</p>
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium ${
                          selectedCard.status === 'active'
                            ? 'bg-[#10B981]/10 text-[#10B981]'
                            : selectedCard.status === 'lost'
                            ? 'bg-[#FF6B6B]/10 text-[#FF6B6B]'
                            : 'bg-[#9CA3AF]/10 text-[#9CA3AF]'
                        }`}>
                          {selectedCard.status === 'active' ? <CheckCircle size={16} /> : 
                           selectedCard.status === 'lost' ? <AlertCircle size={16} /> : 
                           <XCircle size={16} />}
                          {selectedCard.status.charAt(0).toUpperCase() + selectedCard.status.slice(1)}
                        </div>
                      </div>
                      {selectedCard.status === 'lost' && (
                        <button
                          onClick={() => handleMarkActive(selectedCard.id)}
                          className="px-4 py-2 bg-[#10B981] text-white rounded-lg hover:bg-[#059669] transition-colors text-sm font-medium"
                        >
                          Mark as Found
                        </button>
                      )}
                    </div>
                    {selectedCard.lastUsed && (
                      <div className="mt-4 pt-4 border-t border-[#E5E7EB]">
                        <p className="text-xs text-[#9CA3AF]">Last used</p>
                        <p className="text-sm font-medium text-[#081A33]">{selectedCard.lastUsed}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Inquiries */}
                <div>
                  <h3 className="text-sm font-semibold text-[#081A33] mb-3">
                    Inquiries {cardInquiries.length > 0 && `(${cardInquiries.length})`}
                  </h3>
                  {cardInquiries.length > 0 ? (
                    <div className="space-y-3">
                      {cardInquiries.map((inquiry) => (
                        <div
                          key={inquiry.id}
                          className={`bg-white border rounded-lg p-4 ${
                            inquiry.status === 'pending' ? 'border-[#FF6B6B]/30' : 'border-[#E5E7EB]'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className={`px-2 py-1 rounded text-xs font-medium ${
                                inquiry.type === 'lost' ? 'bg-[#FF6B6B]/10 text-[#FF6B6B]' :
                                inquiry.type === 'new_room' ? 'bg-[#C9A227]/10 text-[#C9A227]' :
                                inquiry.type === 'damaged' ? 'bg-[#F59E0B]/10 text-[#F59E0B]' :
                                'bg-[#9CA3AF]/10 text-[#9CA3AF]'
                              }`}>
                                {inquiry.type === 'lost' ? 'Lost' :
                                 inquiry.type === 'new_room' ? 'New Room' :
                                 inquiry.type === 'damaged' ? 'Damaged' : 'Other'}
                              </div>
                              <span className="text-xs text-[#9CA3AF]">{inquiry.date}</span>
                            </div>
                            {inquiry.status === 'pending' ? (
                              <button
                                onClick={() => handleResolveInquiry(inquiry.id)}
                                className="px-3 py-1 bg-[#081A33] text-white rounded text-xs font-medium hover:bg-[#0A2240] transition-colors"
                              >
                                Resolve
                              </button>
                            ) : (
                              <span className="text-xs text-[#10B981] font-medium">Resolved</span>
                            )}
                          </div>
                          <p className="text-sm text-[#6B7280]">{inquiry.message}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white border border-[#E5E7EB] rounded-lg p-8 text-center">
                      <MessageSquare size={32} className="mx-auto text-[#9CA3AF] mb-2" />
                      <p className="text-sm text-[#9CA3AF]">No inquiries for this card</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <CreditCard size={48} className="mx-auto text-[#9CA3AF] mb-4" />
              <h3 className="text-lg font-semibold text-[#081A33] mb-1">Select a card</h3>
              <p className="text-sm text-[#9CA3AF]">Choose a card from the list to view details</p>
            </div>
          </div>
        )}
      </div>

      {/* Add Card Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
            <div className="px-6 py-5 border-b border-[#E5E7EB] flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#081A33]">Add New Card</h2>
                <p className="text-sm text-[#9CA3AF] mt-1">Register a new guest card</p>
              </div>
              <button
                onClick={() => setShowAddDialog(false)}
                className="p-2 hover:bg-[#F7F8FA] rounded-lg transition-colors"
              >
                <X size={20} className="text-[#6B7280]" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gradient-to-br from-[#081A33] to-[#0A2240] rounded-xl p-5">
                <div className="flex items-start justify-between mb-6">
                  <img 
                    src={hotelLogoUrl} 
                    alt="Hotel" 
                    className="w-10 h-10 rounded-lg object-cover"
                  />
                  <div className="text-xs font-medium text-white/60 tracking-wider">Heartel</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-white/50 tracking-wider">CARD NUMBER</div>
                  <div className="text-xl font-semibold text-white tracking-widest">
                    {newCardNumber || '0000 0000 0000'}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#081A33] mb-2">
                  Card Number
                </label>
                <input
                  type="text"
                  value={newCardNumber}
                  onChange={(e) => setNewCardNumber(e.target.value)}
                  placeholder="Enter card number (e.g., 4532 8821 9043)"
                  className="w-full px-4 py-2.5 bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A227]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#081A33] mb-2">
                  Assigned Room (Optional)
                </label>
                <input
                  type="text"
                  value={assignedRoom}
                  onChange={(e) => setAssignedRoom(e.target.value)}
                  placeholder="e.g., 305"
                  className="w-full px-4 py-2.5 bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A227]"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowAddDialog(false)}
                  className="flex-1 py-2.5 px-4 bg-white border border-[#E5E7EB] text-[#081A33] rounded-lg font-medium hover:bg-[#F7F8FA] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCard}
                  disabled={!newCardNumber}
                  className="flex-1 py-2.5 px-4 bg-[#081A33] text-white rounded-lg font-medium hover:bg-[#0A2240] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Card
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Issue Dialog */}
      {showInquiryDialog && selectedCard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
            <div className="px-6 py-5 border-b border-[#E5E7EB] flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#081A33]">Report Issue</h2>
                <p className="text-sm text-[#9CA3AF] mt-1">Card {selectedCard.cardNumber}</p>
              </div>
              <button
                onClick={() => {
                  setShowInquiryDialog(false);
                  setInquiryMessage('');
                }}
                className="p-2 hover:bg-[#F7F8FA] rounded-lg transition-colors"
              >
                <X size={20} className="text-[#6B7280]" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#081A33] mb-2">
                  Issue Type
                </label>
                <select
                  value={inquiryType}
                  onChange={(e) => setInquiryType(e.target.value as InquiryType)}
                  className="w-full px-4 py-2.5 bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A227]"
                >
                  <option value="lost">Lost Card</option>
                  <option value="new_room">New Room Request</option>
                  <option value="damaged">Damaged Card</option>
                  <option value="other">Other Issue</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#081A33] mb-2">
                  Description
                </label>
                <textarea
                  value={inquiryMessage}
                  onChange={(e) => setInquiryMessage(e.target.value)}
                  placeholder="Describe the issue..."
                  rows={4}
                  className="w-full px-4 py-2.5 bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A227] resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowInquiryDialog(false);
                    setInquiryMessage('');
                  }}
                  className="flex-1 py-2.5 px-4 bg-white border border-[#E5E7EB] text-[#081A33] rounded-lg font-medium hover:bg-[#F7F8FA] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitInquiry}
                  disabled={!inquiryMessage}
                  className="flex-1 py-2.5 px-4 bg-[#FF6B6B] text-white rounded-lg font-medium hover:bg-[#FF5555] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
