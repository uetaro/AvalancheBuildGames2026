import { useState, useEffect, useCallback } from 'react';
import {
  Search, CreditCard, Bed, CheckCircle, XCircle, Link2, Unlink, Loader2,
  AlertCircle, RefreshCw, ChevronDown, X,
} from 'lucide-react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { useAuth } from '../components/AuthContext';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/api/make-server-20781d19`;
// SEED_COMPANY_ID removed — company_id comes from activeMembership (check-membership API)

const hotelLogoUrl = 'https://images.unsplash.com/photo-1746130702924-cecefafa9092?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBob3RlbCUyMGxvZ28lMjBpY29ufGVufDF8fHx8MTc3MjExMjQ2Mnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral';

type CardStatus = 'active' | 'issued' | 'revoked';

interface CardRoom {
  room_id: string;
  room_code: string;
  room_label: string;
}

interface CardData {
  card_id: string;
  card_uid: string;
  card_status: CardStatus;
  issued_at: string;
  revoked_at: string | null;
  created_at: string;
  current_room: CardRoom | null;
  active_stay: { stay_id: string; room_id: string; checkin_at: string } | null;
}

interface RoomData {
  room_id: string;
  room_code: string;
  room_label: string;
  is_active: boolean;
}

export default function CardMasterPage() {
  const { session, activeMembership } = useAuth();
  const companyId = activeMembership?.company_id;

  const [cards, setCards] = useState<CardData[]>([]);
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | CardStatus>('all');
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null);

  // Binding edit state
  const [editingBinding, setEditingBinding] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [bindingLoading, setBindingLoading] = useState(false);
  const [bindingError, setBindingError] = useState<string | null>(null);
  const [bindingSuccess, setBindingSuccess] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const accessToken = session?.access_token;
    if (!accessToken || !companyId) return;

    setLoading(true);
    setError(null);

    try {
      const [cardsRes, roomsRes] = await Promise.all([
        fetch(`${API_BASE}/ops-cards-all`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
          body: JSON.stringify({ access_token: accessToken, company_id: companyId }),
        }),
        fetch(`${API_BASE}/ops-rooms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
          body: JSON.stringify({ access_token: accessToken, company_id: companyId, include_inactive: false }),
        }),
      ]);

      const cardsData = await cardsRes.json();
      const roomsData = await roomsRes.json();

      if (!cardsRes.ok) {
        console.error('[card-master] Cards error:', cardsData);
        setError(cardsData.message || 'Failed to fetch cards');
        setLoading(false);
        return;
      }
      if (!roomsRes.ok) {
        console.error('[card-master] Rooms error:', roomsData);
        setError(roomsData.message || 'Failed to fetch rooms');
        setLoading(false);
        return;
      }

      setCards(cardsData.items || []);
      setRooms((roomsData.items || []).map((r: any) => ({
        room_id: r.room_id,
        room_code: r.room_code,
        room_label: r.room_label,
        is_active: r.is_active,
      })));

      console.log('[card-master] Loaded', cardsData.items?.length, 'cards,', roomsData.items?.length, 'rooms');
    } catch (err) {
      console.error('[card-master] Fetch error:', err);
      setError('Network error while loading data');
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, companyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdateBinding = async (roomId: string | null) => {
    if (!selectedCard) return;
    const accessToken = session?.access_token;
    if (!accessToken || !companyId) return;

    setBindingLoading(true);
    setBindingError(null);
    setBindingSuccess(null);

    try {
      const res = await fetch(`${API_BASE}/ops-update-card-binding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify({
          access_token: accessToken,
          company_id: companyId,
          card_id: selectedCard.card_id,
          room_id: roomId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error('[card-master] Binding error:', data);
        setBindingError(data.message || 'Failed to update binding');
        setBindingLoading(false);
        return;
      }

      console.log('[card-master] Binding updated:', data);
      setBindingSuccess(roomId ? 'Card bound to room successfully' : 'Card unbound successfully');
      setEditingBinding(false);

      // Refresh data
      await fetchData();

      // Update selected card from refreshed data
      // (will be updated on next render via effect)
    } catch (err) {
      console.error('[card-master] Binding network error:', err);
      setBindingError('Network error');
    } finally {
      setBindingLoading(false);
    }
  };

  // Keep selectedCard in sync with fetched data
  useEffect(() => {
    if (selectedCard) {
      const updated = cards.find((c) => c.card_id === selectedCard.card_id);
      if (updated) setSelectedCard(updated);
    }
  }, [cards]);

  // Clear success message after 3s
  useEffect(() => {
    if (bindingSuccess) {
      const t = setTimeout(() => setBindingSuccess(null), 3000);
      return () => clearTimeout(t);
    }
  }, [bindingSuccess]);

  const filteredCards = cards.filter((card) => {
    const matchesSearch =
      card.card_uid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.current_room?.room_code.includes(searchQuery);
    const matchesFilter = filterStatus === 'all' || card.card_status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: cards.length,
    active: cards.filter((c) => c.card_status === 'active').length,
    issued: cards.filter((c) => c.card_status === 'issued').length,
    bound: cards.filter((c) => c.current_room !== null).length,
    inUse: cards.filter((c) => c.active_stay !== null).length,
  };

  // Rooms already bound by OTHER cards (for dropdown filtering)
  const boundRoomIds = new Set(
    cards
      .filter((c) => c.current_room && c.card_id !== selectedCard?.card_id)
      .map((c) => c.current_room!.room_id)
  );

  if (loading && cards.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-[#FAFBFC]">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-[#C9A227] mx-auto mb-4" />
          <p className="text-sm text-[#6B7280]">Loading cards and rooms...</p>
        </div>
      </div>
    );
  }

  if (error && cards.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-[#FAFBFC]">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-[#FF6B6B]/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} className="text-[#FF6B6B]" />
          </div>
          <p className="text-lg font-semibold text-[#081A33] mb-2">Failed to load data</p>
          <p className="text-sm text-[#6B7280] mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-[#081A33] text-white rounded-lg text-sm font-medium hover:bg-[#0A2240] transition-colors flex items-center gap-2 mx-auto"
          >
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-[#FAFBFC]">
      {/* Left Panel - Card List */}
      <div className="w-96 bg-white border-r border-[#E5E7EB] flex flex-col">
        <div className="p-6 border-b border-[#E5E7EB]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-[#081A33]">Card Master</h2>
              <p className="text-xs text-[#6B7280] mt-1">
                {stats.active} active · {stats.bound} bound · {stats.inUse} in use
              </p>
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F7F8FA] transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
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
              {(['all', 'active', 'issued', 'revoked'] as const).map((status) => (
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
            {filteredCards.map((card) => (
              <button
                key={card.card_id}
                onClick={() => {
                  setSelectedCard(card);
                  setEditingBinding(false);
                  setBindingError(null);
                  setBindingSuccess(null);
                }}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  selectedCard?.card_id === card.card_id
                    ? 'border-[#C9A227] bg-[#C9A227]/5'
                    : 'border-[#E5E7EB] hover:border-[#C9A227]/50 bg-white'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-sm font-semibold text-[#081A33] mb-1">
                      {card.card_uid}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {card.current_room ? (
                        <span className="inline-flex items-center gap-1 text-xs text-[#C9A227]">
                          <Link2 size={10} />
                          Room {card.current_room.room_code}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-[#9CA3AF]">
                          <Unlink size={10} />
                          Unbound
                        </span>
                      )}
                      {card.active_stay && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#081A33]/10 text-[#081A33] text-xs rounded">
                          <Bed size={10} />
                          In use
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    className={`px-2 py-1 rounded text-xs font-medium flex-shrink-0 ml-2 ${
                      card.card_status === 'active'
                        ? 'bg-[#10B981]/10 text-[#10B981]'
                        : card.card_status === 'issued'
                        ? 'bg-[#C9A227]/10 text-[#C9A227]'
                        : 'bg-[#9CA3AF]/10 text-[#9CA3AF]'
                    }`}
                  >
                    {card.card_status}
                  </div>
                </div>
              </button>
            ))}

            {filteredCards.length === 0 && (
              <div className="text-center py-12">
                <CreditCard size={32} className="mx-auto text-[#9CA3AF] mb-2" />
                <p className="text-sm text-[#9CA3AF]">No cards found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Panel - Card Details */}
      <div className="flex-1 flex flex-col">
        {selectedCard ? (
          <>
            <div className="bg-white border-b border-[#E5E7EB] px-8 py-6">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-semibold text-[#081A33]">Card Details</h1>
                  <p className="text-sm text-[#6B7280] mt-1">Manage card binding and status</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-6">
              <div className="max-w-2xl space-y-6">
                {/* Success Message */}
                {bindingSuccess && (
                  <div className="flex items-center gap-2 p-3 bg-[#10B981]/10 border border-[#10B981]/30 rounded-lg">
                    <CheckCircle size={16} className="text-[#10B981] flex-shrink-0" />
                    <p className="text-sm text-[#10B981] font-medium">{bindingSuccess}</p>
                  </div>
                )}

                {/* Card Preview */}
                <div>
                  <h3 className="text-sm font-semibold text-[#081A33] mb-3">Card Information</h3>
                  <div className="bg-gradient-to-br from-[#081A33] to-[#0A2240] rounded-xl p-6 max-w-sm">
                    <div className="flex items-start justify-between mb-8">
                      <ImageWithFallback src={hotelLogoUrl} alt="Hotel" className="w-12 h-12 rounded-lg object-cover" />
                      <div className="text-xs font-medium text-white/60 tracking-wider">Heartel</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-white/50 tracking-wider">CARD NUMBER</div>
                      <div className="text-2xl font-semibold text-white tracking-widest">{selectedCard.card_uid}</div>
                    </div>
                    <div className="mt-6 flex items-center justify-between">
                      <div>
                        <div className="text-xs text-white/50">Status</div>
                        <div className={`text-sm font-medium ${
                          selectedCard.card_status === 'active' ? 'text-[#10B981]' :
                          selectedCard.card_status === 'issued' ? 'text-[#C9A227]' : 'text-[#9CA3AF]'
                        }`}>
                          {selectedCard.card_status.charAt(0).toUpperCase() + selectedCard.card_status.slice(1)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-white/50">Issued</div>
                        <div className="text-sm text-white font-medium">
                          {new Date(selectedCard.issued_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Room Binding */}
                <div>
                  <h3 className="text-sm font-semibold text-[#081A33] mb-3 flex items-center gap-2">
                    <Link2 size={16} />
                    Room Binding
                  </h3>
                  <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
                    {/* Current binding */}
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-xs text-[#9CA3AF] mb-1">Current Binding</p>
                        {selectedCard.current_room ? (
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-[#C9A227]/10 flex items-center justify-center">
                              <Bed size={16} className="text-[#C9A227]" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-[#081A33]">
                                Room {selectedCard.current_room.room_code}
                              </p>
                              <p className="text-xs text-[#6B7280]">{selectedCard.current_room.room_label}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-[#9CA3AF]">
                            <Unlink size={16} />
                            <span className="text-sm">Not bound to any room</span>
                          </div>
                        )}
                      </div>

                      {selectedCard.active_stay ? (
                        <div className="px-3 py-1.5 bg-[#081A33]/5 text-[#081A33] rounded-lg text-xs font-medium flex items-center gap-1.5">
                          <Bed size={14} />
                          Active stay — cannot edit
                        </div>
                      ) : !editingBinding ? (
                        <button
                          onClick={() => {
                            setEditingBinding(true);
                            setSelectedRoomId(selectedCard.current_room?.room_id || '');
                            setBindingError(null);
                          }}
                          className="px-4 py-2 bg-[#081A33] text-white rounded-lg text-sm font-medium hover:bg-[#0A2240] transition-colors"
                        >
                          Change Binding
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingBinding(false);
                            setBindingError(null);
                          }}
                          className="p-2 hover:bg-[#F7F8FA] rounded-lg transition-colors"
                        >
                          <X size={18} className="text-[#6B7280]" />
                        </button>
                      )}
                    </div>

                    {/* Binding editor */}
                    {editingBinding && !selectedCard.active_stay && (
                      <div className="pt-4 border-t border-[#E5E7EB] space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-[#081A33] mb-2">
                            Assign to Room
                          </label>
                          <div className="relative">
                            <select
                              value={selectedRoomId}
                              onChange={(e) => setSelectedRoomId(e.target.value)}
                              className="w-full px-4 py-2.5 bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A227] appearance-none text-sm"
                            >
                              <option value="">No room (unbind)</option>
                              {rooms.map((room) => {
                                const isBound = boundRoomIds.has(room.room_id);
                                const isCurrentBinding = selectedCard.current_room?.room_id === room.room_id;
                                return (
                                  <option
                                    key={room.room_id}
                                    value={room.room_id}
                                    disabled={isBound}
                                  >
                                    Room {room.room_code}
                                    {isCurrentBinding ? ' (current)' : ''}
                                    {isBound ? ' (another card bound)' : ''}
                                  </option>
                                );
                              })}
                            </select>
                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
                          </div>
                        </div>

                        {bindingError && (
                          <div className="flex items-start gap-2 p-3 bg-[#FF6B6B]/10 border border-[#FF6B6B]/30 rounded-lg">
                            <AlertCircle size={16} className="text-[#FF6B6B] flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-[#FF6B6B]">{bindingError}</p>
                          </div>
                        )}

                        <div className="flex gap-3">
                          <button
                            onClick={() => {
                              setEditingBinding(false);
                              setBindingError(null);
                            }}
                            disabled={bindingLoading}
                            className="flex-1 py-2.5 px-4 bg-white border border-[#E5E7EB] text-[#081A33] rounded-lg font-medium hover:bg-[#F7F8FA] transition-colors disabled:opacity-50"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleUpdateBinding(selectedRoomId || null)}
                            disabled={bindingLoading || (selectedRoomId === (selectedCard.current_room?.room_id || ''))}
                            className="flex-1 py-2.5 px-4 bg-[#081A33] text-white rounded-lg font-medium hover:bg-[#0A2240] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {bindingLoading ? (
                              <>
                                <Loader2 size={16} className="animate-spin" />
                                Updating...
                              </>
                            ) : selectedRoomId ? (
                              <>
                                <Link2 size={16} />
                                Bind to Room
                              </>
                            ) : (
                              <>
                                <Unlink size={16} />
                                Unbind Card
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Status */}
                <div>
                  <h3 className="text-sm font-semibold text-[#081A33] mb-3 flex items-center gap-2">
                    <CreditCard size={16} />
                    Status
                  </h3>
                  <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-[#9CA3AF] mb-1">Card Status</p>
                        <div
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-sm ${
                            selectedCard.card_status === 'active'
                              ? 'bg-[#10B981]/10 text-[#10B981]'
                              : selectedCard.card_status === 'issued'
                              ? 'bg-[#C9A227]/10 text-[#C9A227]'
                              : 'bg-[#9CA3AF]/10 text-[#9CA3AF]'
                          }`}
                        >
                          {selectedCard.card_status === 'active' ? <CheckCircle size={14} /> :
                           selectedCard.card_status === 'revoked' ? <XCircle size={14} /> :
                           <CreditCard size={14} />}
                          {selectedCard.card_status.charAt(0).toUpperCase() + selectedCard.card_status.slice(1)}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-[#9CA3AF] mb-1">Active Stay</p>
                        {selectedCard.active_stay ? (
                          <div className="text-sm font-medium text-[#081A33]">
                            Yes — since {new Date(selectedCard.active_stay.checkin_at).toLocaleDateString()}
                          </div>
                        ) : (
                          <div className="text-sm text-[#9CA3AF]">No active stay</div>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-[#9CA3AF] mb-1">Issued At</p>
                        <p className="text-sm font-medium text-[#081A33]">
                          {new Date(selectedCard.issued_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[#9CA3AF] mb-1">Created At</p>
                        <p className="text-sm font-medium text-[#081A33]">
                          {new Date(selectedCard.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      {selectedCard.revoked_at && (
                        <div className="col-span-2">
                          <p className="text-xs text-[#9CA3AF] mb-1">Revoked At</p>
                          <p className="text-sm font-medium text-[#FF6B6B]">
                            {new Date(selectedCard.revoked_at).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Binding Summary Table */}
                <div>
                  <h3 className="text-sm font-semibold text-[#081A33] mb-3">All Card Bindings Overview</h3>
                  <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-[#F7F8FA] border-b border-[#E5E7EB]">
                          <th className="text-left px-4 py-3 text-xs font-semibold text-[#6B7280]">Card</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-[#6B7280]">Status</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-[#6B7280]">Bound Room</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-[#6B7280]">In Use</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cards.map((card) => (
                          <tr
                            key={card.card_id}
                            className={`border-b border-[#E5E7EB] last:border-b-0 hover:bg-[#FAFBFC] cursor-pointer transition-colors ${
                              selectedCard?.card_id === card.card_id ? 'bg-[#C9A227]/5' : ''
                            }`}
                            onClick={() => {
                              setSelectedCard(card);
                              setEditingBinding(false);
                              setBindingError(null);
                            }}
                          >
                            <td className="px-4 py-3 font-mono text-sm text-[#081A33]">{card.card_uid}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                card.card_status === 'active' ? 'bg-[#10B981]/10 text-[#10B981]' :
                                card.card_status === 'issued' ? 'bg-[#C9A227]/10 text-[#C9A227]' :
                                'bg-[#9CA3AF]/10 text-[#9CA3AF]'
                              }`}>
                                {card.card_status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {card.current_room ? (
                                <span className="text-[#C9A227] font-medium">Room {card.current_room.room_code}</span>
                              ) : (
                                <span className="text-[#9CA3AF]">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {card.active_stay ? (
                                <span className="inline-flex items-center gap-1 text-[#081A33]">
                                  <Bed size={12} /> Yes
                                </span>
                              ) : (
                                <span className="text-[#9CA3AF]">No</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <CreditCard size={48} className="mx-auto text-[#9CA3AF] mb-4" />
              <h3 className="text-lg font-semibold text-[#081A33] mb-1">Select a card</h3>
              <p className="text-sm text-[#9CA3AF]">Choose a card from the list to view details and manage binding</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}