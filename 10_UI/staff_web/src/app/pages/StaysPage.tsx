import { useState, useRef, useEffect, useCallback } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Search, Eye, Calendar, CreditCard, Bed, LogOut, X, LogIn, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { useAuth } from '../components/AuthContext';

const hotelLogoUrl = 'https://images.unsplash.com/photo-1746130702924-cecefafa9092?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBob3RlbCUyMGxvZ28lMjBpY29ufGVufDF8fHx8MTc3MjExMjQ2Mnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/api/make-server-20781d19`;

type RoomStatus = 'occupied' | 'vacant' | 'cleaning';

interface ActiveStay {
  stay_id: string;
  card_id: string;
  card_uid: string | null;
  checkin_at: string;
}

interface Room {
  id: string;        // room_id (DB UUID)
  roomNumber: string; // room_code
  roomLabel: string;
  floor: number;
  status: RoomStatus;
  capacity: number;
  stay?: {
    stayId: string;
    cardId: string;      // card_id (DB UUID)
    cardUid: string;     // card_uid (display)
    checkInDate: string;
    checkInTime: string;
  };
}

interface Card {
  id: string;          // card_id (DB UUID)
  cardNumber: string;  // card_uid (display)
  currentRoom?: {
    room_id: string;
    room_code: string;
    room_label: string;
  } | null;
}

const ItemTypes = {
  CARD: 'card',
};

function DraggableCard({ card }: { card: Card }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.CARD,
    item: card,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      className={`bg-gradient-to-br from-[#081A33] to-[#0A2240] rounded-xl p-5 cursor-grab active:cursor-grabbing transition-all hover:shadow-2xl hover:scale-105 ${
        isDragging ? 'opacity-50 scale-95 rotate-3' : 'opacity-100'
      }`}
      style={{
        boxShadow: isDragging ? '0 10px 40px rgba(8, 26, 51, 0.3)' : '0 4px 20px rgba(8, 26, 51, 0.15)',
      }}
    >
      <div className="flex items-start justify-between mb-6">
        <ImageWithFallback
          src={hotelLogoUrl}
          alt="Hotel"
          className="w-10 h-10 rounded-lg object-cover"
        />
        <div className={`text-xs font-medium tracking-wider ${card.currentRoom ? 'text-[#C9A227]' : 'text-white/60'}`}>
          {card.currentRoom ? `Room ${card.currentRoom.room_code}` : 'Unbound'}
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-xs text-white/50 tracking-wider">CARD NUMBER</div>
        <div className="text-xl font-semibold text-white tracking-widest">{card.cardNumber}</div>
      </div>
    </div>
  );
}

function RoomDropZone({
  room,
  onCheckIn,
  onCheckOut,
  onViewDetails,
  isCheckingOut,
}: {
  room: Room;
  onCheckIn: (card: Card, roomId: string) => void;
  onCheckOut: (roomId: string) => void;
  onViewDetails: (room: Room) => void;
  isCheckingOut: boolean;
}) {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ItemTypes.CARD,
    drop: (item: Card) => onCheckIn(item, room.id),
    canDrop: (item: Card) => room.status === 'vacant' && item.currentRoom?.room_id === room.id,
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }));

  const isActive = isOver && canDrop;
  const isOccupied = room.status === 'occupied' && room.stay;
  const isWrongRoom = isOver && !canDrop;

  return (
    <div
      ref={drop}
      className={`rounded-lg border-2 p-5 transition-all ${
        isOccupied
          ? 'bg-white border-[#E5E7EB] hover:border-[#C9A227] hover:shadow-md'
          : canDrop
          ? isActive
            ? 'bg-[#C9A227]/10 border-[#C9A227] border-solid shadow-lg scale-105'
            : 'bg-white border-dashed border-[#C9A227]/50 hover:border-[#C9A227]'
          : isWrongRoom
          ? 'bg-[#FF6B6B]/5 border-[#FF6B6B]/40 border-dashed'
          : 'bg-white border-dashed border-[#9CA3AF]/30 hover:border-[#9CA3AF]'
      }`}
    >
      {/* Room Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              isOccupied ? 'bg-[#081A33] text-white' : isActive ? 'bg-[#C9A227] text-white' : 'bg-[#F7F8FA] text-[#6B7280]'
            }`}
          >
            <Bed size={22} />
          </div>
          <div>
            <h4 className="font-semibold text-[#081A33] text-lg">Room {room.roomNumber}</h4>
            <p className="text-xs text-[#9CA3AF]">
              Floor {room.floor}
            </p>
          </div>
        </div>
      </div>

      {/* Card Info if Occupied */}
      {isOccupied && room.stay ? (
        <div className="space-y-3">
          {/* Card Display */}
          <div className="bg-gradient-to-br from-[#081A33] to-[#0A2240] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard size={16} className="text-[#C9A227]" />
              <span className="text-xs text-white/60">Checked-in Card</span>
            </div>
            <div className="text-lg font-semibold text-white tracking-widest">{room.stay.cardUid}</div>
          </div>

          {/* Stay Info */}
          <div className="bg-[#FAFBFC] rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm">
              <Calendar size={14} className="text-[#9CA3AF]" />
              <span className="text-[#6B7280]">Check-in:</span>
              <span className="font-medium text-[#081A33]">
                {room.stay.checkInDate} {room.stay.checkInTime}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => onViewDetails(room)}
              className="flex-1 py-2 px-3 bg-white border border-[#E5E7EB] text-[#081A33] rounded-lg text-sm font-medium hover:bg-[#F7F8FA] transition-colors flex items-center justify-center gap-2"
            >
              <Eye size={16} />
              Details
            </button>
            <button
              onClick={() => onCheckOut(room.id)}
              disabled={isCheckingOut}
              className={`flex-1 py-2 px-3 bg-[#FF6B6B] text-white rounded-lg text-sm font-medium hover:bg-[#FF5555] transition-colors flex items-center justify-center gap-2 ${isCheckingOut ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isCheckingOut ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Checking Out...
                </>
              ) : (
                <>
                  <LogOut size={16} />
                  Check Out
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="h-40 flex items-center justify-center border-2 border-dashed border-[#E5E7EB] rounded-lg">
          {isWrongRoom ? (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center bg-[#FF6B6B]/10">
                <X size={24} className="text-[#FF6B6B]" />
              </div>
              <p className="text-sm font-medium text-[#FF6B6B]">Card not bound here</p>
              <p className="text-xs text-[#9CA3AF] mt-1">Rebind in Card Master first</p>
            </div>
          ) : canDrop ? (
            <div className="text-center">
              <div
                className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center transition-all ${
                  isActive ? 'bg-[#C9A227] scale-110' : 'bg-[#C9A227]/10'
                }`}
              >
                <CreditCard size={24} className={isActive ? 'text-white' : 'text-[#C9A227]'} />
              </div>
              <p
                className={`text-sm font-medium transition-colors ${
                  isActive ? 'text-[#C9A227]' : 'text-[#9CA3AF]'
                }`}
              >
                {isActive ? 'Drop card to check in' : 'Assigned card — drop here'}
              </p>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center bg-[#F7F8FA]">
                <Bed size={24} className="text-[#9CA3AF]" />
              </div>
              <p className="text-sm text-[#9CA3AF]">Vacant</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Helper: derive floor from room_code (first digit(s) before last 2 digits)
function deriveFloor(roomCode: string): number {
  const num = parseInt(roomCode, 10);
  if (isNaN(num)) return 1;
  return Math.floor(num / 100);
}

function StaysPageContent() {
  const { session, activeMembership } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [cardSearchQuery, setCardSearchQuery] = useState('');
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [pendingCheckIn, setPendingCheckIn] = useState<{ card: Card; roomId: string } | null>(null);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkInError, setCheckInError] = useState<string | null>(null);
  const [checkOutLoading, setCheckOutLoading] = useState<string | null>(null); // room_id being checked out (null = idle)
  const roomsContainerRef = useRef<HTMLDivElement>(null);

  const [availableCards, setAvailableCards] = useState<Card[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const companyId = activeMembership?.company_id;

  // Fetch rooms and cards from API
  const fetchData = useCallback(async () => {
    const accessToken = session?.access_token;
    if (!accessToken || !companyId) return;

    setDataLoading(true);
    setDataError(null);

    try {
      // Fetch rooms
      const roomsRes = await fetch(`${API_BASE}/ops-rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ access_token: accessToken, company_id: companyId }),
      });
      const roomsData = await roomsRes.json();

      if (!roomsRes.ok) {
        console.error('[fetchData] ops-rooms error:', roomsData);
        setDataError(roomsData.message || 'Failed to fetch rooms');
        setDataLoading(false);
        return;
      }

      // Fetch available cards
      const cardsRes = await fetch(`${API_BASE}/ops-cards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ access_token: accessToken, company_id: companyId }),
      });
      const cardsData = await cardsRes.json();

      if (!cardsRes.ok) {
        console.error('[fetchData] ops-cards error:', cardsData);
        setDataError(cardsData.message || 'Failed to fetch cards');
        setDataLoading(false);
        return;
      }

      // Transform rooms
      const transformedRooms: Room[] = (roomsData.items || []).map((r: any) => {
        const hasStay = !!r.active_stay;
        const checkinDate = r.active_stay?.checkin_at ? new Date(r.active_stay.checkin_at) : null;
        return {
          id: r.room_id,
          roomNumber: r.room_code,
          roomLabel: r.room_label,
          floor: deriveFloor(r.room_code),
          status: hasStay ? 'occupied' as RoomStatus : 'vacant' as RoomStatus,
          capacity: 2,
          stay: hasStay ? {
            stayId: r.active_stay.stay_id,
            cardId: r.active_stay.card_id,
            cardUid: r.active_stay.card_uid || 'Unknown',
            checkInDate: checkinDate ? checkinDate.toLocaleDateString() : '',
            checkInTime: checkinDate ? checkinDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
          } : undefined,
        };
      });

      // Transform cards
      const transformedCards: Card[] = (cardsData.items || []).map((cd: any) => ({
        id: cd.card_id,
        cardNumber: cd.card_uid,
        currentRoom: cd.current_room || null,
      }));

      setRooms(transformedRooms);
      setAvailableCards(transformedCards);
      console.log('[fetchData] Loaded', transformedRooms.length, 'rooms,', transformedCards.length, 'cards');
    } catch (err) {
      console.error('[fetchData] Network error:', err);
      setDataError('Network error while fetching data');
    } finally {
      setDataLoading(false);
    }
  }, [session?.access_token, companyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-scroll during drag
  useEffect(() => {
    let animationFrameId: number;
    let isDragging = false;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !roomsContainerRef.current) return;

      const container = roomsContainerRef.current;
      const rect = container.getBoundingClientRect();
      const scrollThreshold = 100;
      const scrollSpeed = 15;

      const distanceFromTop = e.clientY - rect.top;
      const distanceFromBottom = rect.bottom - e.clientY;

      const scroll = () => {
        if (!container) return;

        if (distanceFromTop < scrollThreshold && distanceFromTop > 0) {
          const intensity = 1 - distanceFromTop / scrollThreshold;
          container.scrollTop -= scrollSpeed * intensity;
          animationFrameId = requestAnimationFrame(scroll);
        } else if (distanceFromBottom < scrollThreshold && distanceFromBottom > 0) {
          const intensity = 1 - distanceFromBottom / scrollThreshold;
          container.scrollTop += scrollSpeed * intensity;
          animationFrameId = requestAnimationFrame(scroll);
        }
      };

      scroll();
    };

    const handleDragStart = () => {
      isDragging = true;
    };

    const handleDragEnd = () => {
      isDragging = false;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('dragend', handleDragEnd);
    document.addEventListener('mouseup', handleDragEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('dragend', handleDragEnd);
      document.removeEventListener('mouseup', handleDragEnd);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  const handleCardDrop = (card: Card, roomId: string) => {
    setPendingCheckIn({ card, roomId });
    setCheckInError(null);
  };

  const confirmCheckIn = async () => {
    if (!pendingCheckIn) return;

    setCheckInLoading(true);
    setCheckInError(null);

    try {
      const accessToken = session?.access_token;

      if (!accessToken) {
        console.log('[ops-checkin] No active session');
        setCheckInError('No active session. Please log in again.');
        setCheckInLoading(false);
        return;
      }

      const clientRequestId = `ui-req-${Date.now()}`;

      // Use real DB UUIDs directly (room.id = room_id, card.id = card_id)
      const dbRoomId = pendingCheckIn.roomId;
      const dbCardId = pendingCheckIn.card.id;

      const res = await fetch(`${API_BASE}/ops-checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          access_token: accessToken,
          company_id: companyId,
          room_id: dbRoomId,
          card_id: dbCardId,
          client_request_id: clientRequestId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error('[ops-checkin] API error:', data);
        const errorMessage = data.message || `Check-in failed (${data.error_code || res.status})`;
        setCheckInError(errorMessage);
        setCheckInLoading(false);
        return;
      }

      console.log('[ops-checkin] Success:', data);

      // Refresh data from server to get accurate state
      setPendingCheckIn(null);
      await fetchData();
    } catch (err) {
      console.error('[ops-checkin] Network error:', err);
      setCheckInError('Network error. Please check your connection and try again.');
    } finally {
      setCheckInLoading(false);
    }
  };

  const cancelCheckIn = () => {
    setPendingCheckIn(null);
    setCheckInError(null);
  };

  const handleCheckOut = async (roomId: string) => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room || !room.stay) return;

    // Prevent double-click / concurrent checkout
    if (checkOutLoading) return;
    setCheckOutLoading(roomId);

    try {
      const accessToken = session?.access_token;
      if (!accessToken) {
        console.log('[ops-checkout] No active session');
        setCheckOutLoading(null);
        return;
      }

      const clientRequestId = `ui-req-${Date.now()}`;
      const res = await fetch(`${API_BASE}/ops-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          access_token: accessToken,
          company_id: companyId,
          stay_id: room.stay.stayId,
          room_id: roomId,
          client_request_id: clientRequestId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Treat CONFLICT_ALREADY_CLOSED as idempotent success — the desired outcome (stay closed) is achieved
        if (data.error_code === 'CONFLICT_ALREADY_CLOSED') {
          console.log('[ops-checkout] Stay already closed (idempotent) — refreshing UI');
        } else {
          console.error('[ops-checkout] API error:', data);
          setCheckOutLoading(null);
          return;
        }
      } else {
        console.log('[ops-checkout] Success:', data);
        if (data.finalized) {
          console.log('[ops-checkout] Finalized kudos — confirmed:', data.finalized.confirmed_count,
            'rejected:', data.finalized.rejected_count, 'queued receipts:', data.finalized.queued_receipt_count);
        }
      }

      // Always refresh data from server (both on success and idempotent already-closed)
      await fetchData();
    } catch (err) {
      console.error('[ops-checkout] Network error:', err);
    } finally {
      setCheckOutLoading(null);
    }
  };

  const handleViewDetails = (room: Room) => {
    setSelectedRoom(room);
    setShowDetailsDialog(true);
  };

  const filteredRooms = rooms.filter(
    (room) =>
      room.roomNumber.includes(searchQuery) || room.stay?.cardUid.includes(searchQuery)
  );

  const filteredCards = availableCards.filter((card) =>
    card.cardNumber.includes(cardSearchQuery)
  );

  const vacantRooms = rooms.filter((r) => r.status === 'vacant').length;
  const occupiedRooms = rooms.filter((r) => r.status === 'occupied').length;

  // Loading state
  if (dataLoading && rooms.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-[#FAFBFC]">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-[#C9A227] mx-auto mb-4" />
          <p className="text-sm text-[#6B7280]">Loading rooms and cards...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (dataError && rooms.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-[#FAFBFC]">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-[#FF6B6B]/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} className="text-[#FF6B6B]" />
          </div>
          <p className="text-lg font-semibold text-[#081A33] mb-2">Failed to load data</p>
          <p className="text-sm text-[#6B7280] mb-4">{dataError}</p>
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
      {/* Left Panel - Cards */}
      <div className="w-80 bg-gradient-to-b from-[#F7F8FA] to-[#FFFFFF] border-r-2 border-[#E5E7EB] flex flex-col">
        <div className="p-6 border-b border-[#E5E7EB] bg-white">
          <div className="flex items-center gap-2 mb-4">
            
            <div>
              <h2 className="font-semibold text-[#081A33]">Guest Cards</h2>
              <p className="text-xs text-[#6B7280]">{availableCards.length} cards available</p>
            </div>
          </div>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              type="text"
              placeholder="Search card number..."
              value={cardSearchQuery}
              onChange={(e) => setCardSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-[#F7F8FA] border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A227] focus:border-transparent transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {filteredCards.length > 0 ? (
              filteredCards.map((card) => <DraggableCard key={card.id} card={card} />)
            ) : (
              <div className="bg-white rounded-lg border-2 border-dashed border-[#E5E7EB] p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-[#10B981]/10 flex items-center justify-center mx-auto mb-3">
                  <CreditCard size={28} className="text-[#10B981]" />
                </div>
                <p className="text-sm font-medium text-[#081A33]">
                  {cardSearchQuery ? 'No cards found' : 'All cards in use'}
                </p>
                <p className="text-xs text-[#9CA3AF] mt-1">
                  {cardSearchQuery ? 'Try different search' : 'Check out guests to free up cards'}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-[#E5E7EB] bg-white">
          <p className="text-xs text-[#9CA3AF] text-center">Drag cards to rooms to check in guests</p>
        </div>
      </div>

      {/* Right Panel - Rooms */}
      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b border-[#E5E7EB] px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-[#081A33]">Room Management</h1>
              <p className="text-sm text-[#6B7280] mt-1">Manage check-ins and checkouts</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchData}
                disabled={dataLoading}
                className="p-2 rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F7F8FA] transition-colors disabled:opacity-50"
                title="Refresh data"
              >
                <RefreshCw size={18} className={dataLoading ? 'animate-spin' : ''} />
              </button>
              <div className="flex gap-4 px-5 py-3 bg-[#FAFBFC] rounded-lg border border-[#E5E7EB]">
                <div className="text-center">
                  <p className="text-xs text-[#9CA3AF] mb-1">Vacant</p>
                  <p className="text-xl font-semibold text-[#10B981]">{vacantRooms}</p>
                </div>
                <div className="w-px bg-[#E5E7EB]"></div>
                <div className="text-center">
                  <p className="text-xs text-[#9CA3AF] mb-1">Occupied</p>
                  <p className="text-xl font-semibold text-[#081A33]">{occupiedRooms}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              type="text"
              placeholder="Search by room number or card number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A227] focus:border-transparent transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6" ref={roomsContainerRef}>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredRooms.map((room) => (
              <RoomDropZone
                key={room.id}
                room={room}
                onCheckIn={handleCardDrop}
                onCheckOut={handleCheckOut}
                onViewDetails={handleViewDetails}
                isCheckingOut={checkOutLoading === room.id}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Check-In Confirmation Dialog */}
      {pendingCheckIn &&
        (() => {
          const targetRoom = rooms.find((r) => r.id === pendingCheckIn.roomId);
          return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-[#081A33] to-[#0A2240] px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                      <LogIn size={20} className="text-[#C9A227]" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-white">Confirm Check-In</h2>
                      <p className="text-sm text-white/70">Assign card to room</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-5">
                  {/* Card Preview */}
                  <div className="bg-gradient-to-br from-[#081A33] to-[#0A2240] rounded-xl p-5">
                    <div className="flex items-start justify-between mb-4">
                      <ImageWithFallback src={hotelLogoUrl} alt="Hotel" className="w-8 h-8 rounded-lg object-cover" />
                      <div className="text-xs font-medium text-white/60 tracking-wider">Heartel</div>
                    </div>
                    <div>
                      <div className="text-xs text-white/50 tracking-wider mb-1">CARD NUMBER</div>
                      <div className="text-lg font-semibold text-white tracking-widest">
                        {pendingCheckIn.card.cardNumber}
                      </div>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-[#C9A227]/10 flex items-center justify-center">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path
                          d="M10 4V16M10 16L6 12M10 16L14 12"
                          stroke="#C9A227"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  </div>

                  {/* Room Info */}
                  <div className="bg-[#F7F8FA] rounded-xl p-5 border border-[#E5E7EB]">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-[#081A33] flex items-center justify-center">
                        <Bed size={22} className="text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-[#081A33] text-lg">Room {targetRoom?.roomNumber}</p>
                        <p className="text-sm text-[#6B7280]">
                          Floor {targetRoom?.floor}
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-[#6B7280] text-center">
                    Would you like to check in this card to{' '}
                    <span className="font-semibold text-[#081A33]">Room {targetRoom?.roomNumber}</span>?
                  </p>

                  {/* Error Message */}
                  {checkInError && (
                    <div className="flex items-start gap-2 p-3 bg-[#FF6B6B]/10 border border-[#FF6B6B]/30 rounded-lg">
                      <AlertCircle size={16} className="text-[#FF6B6B] flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-[#FF6B6B]">{checkInError}</p>
                    </div>
                  )}
                </div>

                <div className="px-6 pb-6 flex gap-3">
                  <button
                    onClick={cancelCheckIn}
                    disabled={checkInLoading}
                    className="flex-1 py-2.5 px-4 bg-[#F7F8FA] text-[#081A33] rounded-lg font-medium hover:bg-[#E5E7EB] transition-colors border border-[#E5E7EB] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmCheckIn}
                    disabled={checkInLoading}
                    className="flex-1 py-2.5 px-4 bg-[#081A33] text-white rounded-lg font-medium hover:bg-[#0A2240] transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {checkInLoading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Checking In...
                      </>
                    ) : (
                      <>
                        <LogIn size={18} />
                        Check In
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {/* Details Dialog */}
      {showDetailsDialog && selectedRoom && selectedRoom.stay && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-gradient-to-r from-[#081A33] to-[#0A2240] px-6 py-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Stay Details - Room {selectedRoom.roomNumber}
                </h2>
                <p className="text-sm text-white/70 mt-1">Room and stay information</p>
              </div>
              <button
                onClick={() => {
                  setShowDetailsDialog(false);
                  setSelectedRoom(null);
                }}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={20} className="text-white" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h3 className="font-semibold text-[#081A33] mb-3 flex items-center gap-2">
                  <Bed size={18} />
                  Room Information
                </h3>
                <div className="bg-[#F7F8FA] rounded-lg p-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-[#9CA3AF] mb-1">Room Number</p>
                    <p className="font-semibold text-[#081A33]">{selectedRoom.roomNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#9CA3AF] mb-1">Floor</p>
                    <p className="font-semibold text-[#081A33]">{selectedRoom.floor}F</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#9CA3AF] mb-1">Label</p>
                    <p className="font-semibold text-[#081A33]">{selectedRoom.roomLabel}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#9CA3AF] mb-1">Status</p>
                    <span className="inline-block px-3 py-1 bg-[#10B981] text-white text-xs font-medium rounded">
                      {selectedRoom.status}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-[#081A33] mb-3 flex items-center gap-2">
                  <CreditCard size={18} />
                  Card Information
                </h3>
                <div className="bg-gradient-to-br from-[#081A33] to-[#0A2240] rounded-lg p-5">
                  <div className="flex items-start justify-between mb-4">
                    <ImageWithFallback src={hotelLogoUrl} alt="Hotel" className="w-12 h-12 rounded-lg object-cover" />
                    <div className="text-xs font-medium text-white/60 tracking-wider">Heartel</div>
                  </div>
                  <div>
                    <div className="text-xs text-white/50 tracking-wider mb-2">CARD NUMBER</div>
                    <div className="text-2xl font-semibold text-white tracking-widest">
                      {selectedRoom.stay.cardUid}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-[#081A33] mb-3 flex items-center gap-2">
                  <Calendar size={18} />
                  Stay Information
                </h3>
                <div className="bg-[#F7F8FA] rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
                    <span className="text-sm text-[#6B7280]">Check-in Date</span>
                    <span className="font-semibold text-[#081A33]">{selectedRoom.stay.checkInDate}</span>
                  </div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
                    <span className="text-sm text-[#6B7280]">Check-in Time</span>
                    <span className="font-semibold text-[#081A33]">{selectedRoom.stay.checkInTime}</span>
                  </div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
                    <span className="text-sm text-[#6B7280]">Stay ID</span>
                    <span className="font-mono text-xs text-[#6B7280]">{selectedRoom.stay.stayId}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#6B7280]">Duration</span>
                    <span className="font-semibold text-[#081A33]">
                      {Math.max(
                        0,
                        Math.floor(
                          (new Date().getTime() - new Date(selectedRoom.stay.checkInDate).getTime()) /
                            (1000 * 60 * 60 * 24)
                        )
                      )}{' '}
                      days
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-[#E5E7EB]">
                <button
                  onClick={() => {
                    setShowDetailsDialog(false);
                    setSelectedRoom(null);
                  }}
                  className="flex-1 py-2.5 px-4 bg-[#F7F8FA] text-[#081A33] rounded-lg font-medium hover:bg-[#E5E7EB] transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    handleCheckOut(selectedRoom.id);
                    setShowDetailsDialog(false);
                    setSelectedRoom(null);
                  }}
                  disabled={!!checkOutLoading}
                  className={`flex-1 py-2.5 px-4 bg-[#FF6B6B] text-white rounded-lg font-medium hover:bg-[#FF5555] transition-colors flex items-center justify-center gap-2 ${checkOutLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {checkOutLoading === selectedRoom.id ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Checking Out...
                    </>
                  ) : (
                    <>
                      <LogOut size={18} />
                      Check Out
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StaysPage() {
  return (
    <DndProvider backend={HTML5Backend}>
      <StaysPageContent />
    </DndProvider>
  );
}