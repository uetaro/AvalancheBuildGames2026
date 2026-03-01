import { useState } from 'react';
import { useOutletContext } from 'react-router';
import { Search, Plus, Edit, X, Bed, Users } from 'lucide-react';
import heartelCoin from 'figma:asset/2bae1d84c0ac1bf4d7a1c7d94a03e85fe11d4ea6.png';

type RoomStatus = 'available' | 'occupied' | 'inactive';

interface Room {
  id: string;
  roomNumber: string;
  floor: number;
  capacity: number;
  status: RoomStatus;
  label: string;
}

export default function RoomMasterPage() {
  const { role } = useOutletContext<{ role: 'staff' | 'manager' }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | RoomStatus>('all');
  const [pointsPerKudos, setPointsPerKudos] = useState(250);
  const [isEditingPoints, setIsEditingPoints] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [roomForm, setRoomForm] = useState({
    roomNumber: '',
    floor: 1,
    capacity: 2,
    status: 'available' as RoomStatus,
    label: 'Standard',
  });

  const [mockRooms, setMockRooms] = useState<Room[]>([
    { id: 'R001', roomNumber: '305', floor: 3, capacity: 2, status: 'occupied', label: 'Standard' },
    { id: 'R002', roomNumber: '412', floor: 4, capacity: 2, status: 'occupied', label: 'Deluxe' },
    { id: 'R003', roomNumber: '201', floor: 2, capacity: 1, status: 'occupied', label: 'Single' },
    { id: 'R004', roomNumber: '508', floor: 5, capacity: 3, status: 'occupied', label: 'Suite' },
    { id: 'R005', roomNumber: '310', floor: 3, capacity: 2, status: 'available', label: 'Standard' },
    { id: 'R006', roomNumber: '215', floor: 2, capacity: 1, status: 'available', label: 'Single' },
    { id: 'R007', roomNumber: '415', floor: 4, capacity: 2, status: 'available', label: 'Deluxe' },
    { id: 'R008', roomNumber: '509', floor: 5, capacity: 3, status: 'available', label: 'Suite' },
    { id: 'R009', roomNumber: '302', floor: 3, capacity: 2, status: 'available', label: 'Standard' },
    { id: 'R010', roomNumber: '303', floor: 3, capacity: 2, status: 'available', label: 'Standard' },
  ]);

  const filteredRooms = mockRooms.filter(room => {
    const matchesSearch = room.roomNumber.includes(searchQuery) || room.label.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || room.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const roomsByFloor = filteredRooms.reduce((acc, room) => {
    if (!acc[room.floor]) acc[room.floor] = [];
    acc[room.floor].push(room);
    return acc;
  }, {} as Record<number, Room[]>);

  const handleSavePoints = () => {
    setIsEditingPoints(false);
  };

  const handleAddRoom = () => {
    const newRoom: Room = {
      id: `R${Date.now()}`,
      ...roomForm,
    };
    setMockRooms(prev => [...prev, newRoom]);
    setShowAddDialog(false);
    setRoomForm({ roomNumber: '', floor: 1, capacity: 2, status: 'available', label: 'Standard' });
  };

  const handleEditRoom = () => {
    if (selectedRoom) {
      setMockRooms(prev => prev.map(r => r.id === selectedRoom.id ? { ...r, ...roomForm } : r));
    }
    setShowEditDialog(false);
    setSelectedRoom(null);
  };

  const stats = {
    total: mockRooms.length,
    available: mockRooms.filter(r => r.status === 'available').length,
    occupied: mockRooms.filter(r => r.status === 'occupied').length,
  };

  return (
    <div className="h-full flex flex-col bg-[#FAFBFC]">
      <div className="bg-white border-b border-[#E5E7EB] px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-[#081A33]">Room Master</h1>
            <p className="text-sm text-[#6B7280] mt-1">
              {stats.available} available · {stats.occupied} occupied · {stats.total} total
            </p>
          </div>
          {role === 'manager' && (
            <button 
              onClick={() => {
                setRoomForm({ roomNumber: '', floor: 1, capacity: 2, status: 'available', label: 'Standard' });
                setShowAddDialog(true);
              }} 
              className="px-4 py-2.5 bg-[#081A33] text-white rounded-lg hover:bg-[#0A2240] transition-colors flex items-center gap-2"
            >
              <Plus size={18} />
              Add Room
            </button>
          )}
        </div>

        {/* Points per Kudos Setting - Manager Only */}
        {role === 'manager' && (
          <div className="bg-white border border-[#E5E7EB] rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#C9A227]/10 flex items-center justify-center overflow-hidden">
                  <img src={heartelCoin} alt="Heartel Coin" className="w-8 h-8 object-contain" />
                </div>
                <div>
                  <h3 className="font-medium text-[#081A33]">Points per Kudos</h3>
                  <p className="text-xs text-[#9CA3AF] mt-0.5">Conversion rate for guest rewards</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {isEditingPoints ? (
                  <>
                    <input
                      type="number"
                      value={pointsPerKudos}
                      onChange={(e) => setPointsPerKudos(Number(e.target.value))}
                      className="w-24 px-3 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A227] text-center font-semibold"
                    />
                    <button
                      onClick={handleSavePoints}
                      className="px-4 py-2 bg-[#081A33] text-white rounded-lg hover:bg-[#0A2240] transition-colors text-sm font-medium"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setIsEditingPoints(false)}
                      className="px-4 py-2 bg-white border border-[#E5E7EB] text-[#6B7280] rounded-lg hover:bg-[#F7F8FA] transition-colors text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <div className="text-right">
                      <span className="text-2xl font-semibold text-[#081A33]">{pointsPerKudos}</span>
                      <span className="text-sm text-[#9CA3AF] ml-2">points</span>
                    </div>
                    <button
                      onClick={() => setIsEditingPoints(true)}
                      className="p-2 hover:bg-[#F7F8FA] rounded-lg transition-colors"
                    >
                      <Edit size={18} className="text-[#6B7280]" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Search & Filter */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              type="text"
              placeholder="Search rooms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A227] focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'available', 'occupied'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === status
                    ? 'bg-[#081A33] text-white'
                    : 'bg-white border border-[#E5E7EB] text-[#6B7280] hover:border-[#081A33]'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="space-y-6">
          {Object.entries(roomsByFloor)
            .sort(([a], [b]) => Number(b) - Number(a))
            .map(([floor, rooms]) => (
              <div key={floor}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-medium text-[#081A33]">Floor {floor}</span>
                  <span className="text-xs text-[#9CA3AF]">({rooms.length} rooms)</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                  {rooms.map((room) => (
                    <button
                      key={room.id}
                      onClick={() => {
                        if (role === 'manager') {
                          setSelectedRoom(room);
                          setRoomForm({
                            roomNumber: room.roomNumber,
                            floor: room.floor,
                            capacity: room.capacity,
                            status: room.status,
                            label: room.label,
                          });
                          setShowEditDialog(true);
                        }
                      }}
                      className={`group relative bg-white rounded-lg p-4 text-left transition-all ${
                        room.status === 'available'
                          ? 'border-2 border-[#E5E7EB] hover:border-[#081A33] hover:shadow-sm'
                          : 'border-2 border-[#E5E7EB] opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="text-lg font-semibold text-[#081A33]">{room.roomNumber}</div>
                          <div className="text-xs text-[#9CA3AF] mt-0.5">{room.label}</div>
                        </div>
                        {role === 'manager' && room.status === 'available' && (
                          <Edit size={14} className="text-[#9CA3AF] opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1.5 text-sm text-[#6B7280]">
                        <Users size={14} />
                        <span>{room.capacity}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Add Room Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
            <div className="px-6 py-5 border-b border-[#E5E7EB] flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#081A33]">Add New Room</h2>
                <p className="text-sm text-[#9CA3AF] mt-1">Register a new room</p>
              </div>
              <button
                onClick={() => {
                  setShowAddDialog(false);
                  setRoomForm({ roomNumber: '', floor: 1, capacity: 2, status: 'available', label: 'Standard' });
                }}
                className="p-2 hover:bg-[#F7F8FA] rounded-lg transition-colors"
              >
                <X size={20} className="text-[#6B7280]" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#081A33] mb-2">
                    Room Number
                  </label>
                  <input
                    type="text"
                    value={roomForm.roomNumber}
                    onChange={(e) => setRoomForm({ ...roomForm, roomNumber: e.target.value })}
                    placeholder="e.g., 305"
                    className="w-full px-4 py-2.5 bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A227]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#081A33] mb-2">
                    Floor
                  </label>
                  <input
                    type="number"
                    value={roomForm.floor}
                    onChange={(e) => setRoomForm({ ...roomForm, floor: Number(e.target.value) })}
                    min="1"
                    className="w-full px-4 py-2.5 bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A227]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#081A33] mb-2">
                  Room Type
                </label>
                <select
                  value={roomForm.label}
                  onChange={(e) => setRoomForm({ ...roomForm, label: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A227]"
                >
                  <option value="Single">Single</option>
                  <option value="Standard">Standard</option>
                  <option value="Deluxe">Deluxe</option>
                  <option value="Suite">Suite</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#081A33] mb-2">
                    Capacity
                  </label>
                  <input
                    type="number"
                    value={roomForm.capacity}
                    onChange={(e) => setRoomForm({ ...roomForm, capacity: Number(e.target.value) })}
                    min="1"
                    max="10"
                    className="w-full px-4 py-2.5 bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A227]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#081A33] mb-2">
                    Status
                  </label>
                  <select
                    value={roomForm.status}
                    onChange={(e) => setRoomForm({ ...roomForm, status: e.target.value as RoomStatus })}
                    className="w-full px-4 py-2.5 bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A227]"
                  >
                    <option value="available">Available</option>
                    <option value="occupied">Occupied</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowAddDialog(false);
                    setRoomForm({ roomNumber: '', floor: 1, capacity: 2, status: 'available', label: 'Standard' });
                  }}
                  className="flex-1 py-2.5 px-4 bg-white border border-[#E5E7EB] text-[#081A33] rounded-lg font-medium hover:bg-[#F7F8FA] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddRoom}
                  disabled={!roomForm.roomNumber}
                  className="flex-1 py-2.5 px-4 bg-[#081A33] text-white rounded-lg font-medium hover:bg-[#0A2240] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Room
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Room Dialog */}
      {showEditDialog && selectedRoom && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
            <div className="px-6 py-5 border-b border-[#E5E7EB] flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#081A33]">Edit Room {selectedRoom.roomNumber}</h2>
                <p className="text-sm text-[#9CA3AF] mt-1">Update room information</p>
              </div>
              <button
                onClick={() => {
                  setShowEditDialog(false);
                  setSelectedRoom(null);
                }}
                className="p-2 hover:bg-[#F7F8FA] rounded-lg transition-colors"
              >
                <X size={20} className="text-[#6B7280]" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#081A33] mb-2">
                    Room Number
                  </label>
                  <input
                    type="text"
                    value={roomForm.roomNumber}
                    onChange={(e) => setRoomForm({ ...roomForm, roomNumber: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A227]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#081A33] mb-2">
                    Floor
                  </label>
                  <input
                    type="number"
                    value={roomForm.floor}
                    onChange={(e) => setRoomForm({ ...roomForm, floor: Number(e.target.value) })}
                    min="1"
                    className="w-full px-4 py-2.5 bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A227]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#081A33] mb-2">
                  Room Type
                </label>
                <select
                  value={roomForm.label}
                  onChange={(e) => setRoomForm({ ...roomForm, label: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A227]"
                >
                  <option value="Single">Single</option>
                  <option value="Standard">Standard</option>
                  <option value="Deluxe">Deluxe</option>
                  <option value="Suite">Suite</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#081A33] mb-2">
                    Capacity
                  </label>
                  <input
                    type="number"
                    value={roomForm.capacity}
                    onChange={(e) => setRoomForm({ ...roomForm, capacity: Number(e.target.value) })}
                    min="1"
                    max="10"
                    className="w-full px-4 py-2.5 bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A227]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#081A33] mb-2">
                    Status
                  </label>
                  <select
                    value={roomForm.status}
                    onChange={(e) => setRoomForm({ ...roomForm, status: e.target.value as RoomStatus })}
                    className="w-full px-4 py-2.5 bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A227]"
                  >
                    <option value="available">Available</option>
                    <option value="occupied">Occupied</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowEditDialog(false);
                    setSelectedRoom(null);
                  }}
                  className="flex-1 py-2.5 px-4 bg-white border border-[#E5E7EB] text-[#081A33] rounded-lg font-medium hover:bg-[#F7F8FA] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditRoom}
                  className="flex-1 py-2.5 px-4 bg-[#081A33] text-white rounded-lg font-medium hover:bg-[#0A2240] transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}