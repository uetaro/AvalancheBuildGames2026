import { ArrowLeft, Search, Gift, Utensils, Film, Dumbbell, Hotel, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';

export default function ExchangeList() {
  const navigate = useNavigate();

  const exchangeItems = [
    { 
      id: 1, 
      name: 'Amazon Gift Card',
      points: 500, 
      value: '$50',
      category: 'Gift Card',
      icon: CreditCard,
      color: '#FF6B6B',
      available: true,
      image: 'https://images.unsplash.com/photo-1759563874745-47e35c0a9572?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnaWZ0JTIwY2FyZCUyMHZvdWNoZXIlMjBlbGVnYW50fGVufDF8fHx8MTc3MjEzMzU2M3ww&ixlib=rb-4.1.0&q=80&w=1080' 
    },
    { 
      id: 2, 
      name: 'Spa Day Package',
      points: 1500, 
      value: '$150',
      category: 'Experience',
      icon: Gift,
      color: '#D4A574',
      available: true,
      image: 'https://images.unsplash.com/photo-1760647422523-f532034a49ce?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBzcGElMjB3ZWxsbmVzcyUyMHRyZWF0bWVudHxlbnwxfHx8fDE3NzIyMTYxNTB8MA&ixlib=rb-4.1.0&q=80&w=1080'
    },
    { 
      id: 3, 
      name: 'Restaurant Voucher',
      points: 800, 
      value: '$80',
      category: 'Dining',
      icon: Utensils,
      color: '#5BA5A5',
      available: true,
      image: 'https://images.unsplash.com/photo-1761095596849-608b6a337c36?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmaW5lJTIwZGluaW5nJTIwcmVzdGF1cmFudCUyMGVsZWdhbnR8ZW58MXx8fHwxNzcyMTU4ODk1fDA&ixlib=rb-4.1.0&q=80&w=1080'
    },
    { 
      id: 4, 
      name: 'Movie Tickets (2x)',
      points: 300, 
      value: '$30',
      category: 'Entertainment',
      icon: Film,
      color: '#C9A227',
      available: true,
      image: 'https://images.unsplash.com/photo-1732029541807-1eede3bec4f3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb3ZpZSUyMGNpbmVtYSUyMHRpY2tldHMlMjB0aGVhdGVyfGVufDF8fHx8MTc3MjI0ODc1OXww&ixlib=rb-4.1.0&q=80&w=1080'
    },
    { 
      id: 5, 
      name: 'Fitness Class Pass',
      points: 600, 
      value: '$60',
      category: 'Wellness',
      icon: Dumbbell,
      color: '#FF6B6B',
      available: true,
      image: 'https://images.unsplash.com/photo-1609377375722-46264cf88939?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmaXRuZXNzJTIwZ3ltJTIwd29ya291dCUyMGNsYXNzfGVufDF8fHx8MTc3MjI0ODc1OXww&ixlib=rb-4.1.0&q=80&w=1080'
    },
    { 
      id: 6, 
      name: 'Premium Hotel Stay',
      points: 3000, 
      value: '$300',
      category: 'Travel',
      icon: Hotel,
      color: '#D4A574',
      available: false,
      image: 'https://images.unsplash.com/photo-1759264244726-adde4e4318fc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBob3RlbCUyMHJvb20lMjBwcmVtaXVtfGVufDF8fHx8MTc3MjI0ODc1OXww&ixlib=rb-4.1.0&q=80&w=1080'
    }
  ];

  const userPoints = 2850;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAFBFC' }}>
      {/* Header */}
      <div 
        className="px-6 pt-12 pb-6"
        style={{ backgroundColor: '#ffffff', borderBottom: '1px solid rgba(8, 26, 51, 0.08)' }}
      >
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={() => navigate('/app/point')}
            className="p-2 rounded-xl hover:bg-gray-50 transition-colors active:scale-95"
          >
            <ArrowLeft size={24} style={{ color: '#081A33' }} />
          </button>
          <div className="flex-1">
            <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#081A33' }}>
              Exchange
            </h1>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ backgroundColor: '#FFF9E6' }}>
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#C9A227' }}>
              {userPoints.toLocaleString()}
            </span>
            <span style={{ fontSize: '11px', color: '#C9A227' }}>pts</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 transform -translate-y-1/2" style={{ color: '#9CA3AF' }} />
          <input
            type="text"
            placeholder="Search rewards..."
            className="w-full pl-11 pr-4 py-3 rounded-xl border-0 focus:outline-none focus:ring-2"
            style={{ backgroundColor: '#F8F9FA', color: '#081A33' }}
          />
        </div>
      </div>

      {/* Exchange Items Grid */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-2 gap-3">
          {exchangeItems.map((item, index) => {
            const canAfford = userPoints >= item.points;
            const isAvailable = item.available;
            
            return (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => canAfford && isAvailable && navigate('/app/point/exchange', { state: { item } })}
                disabled={!canAfford || !isAvailable}
                className="bg-white rounded-2xl overflow-hidden shadow-sm border transition-all"
                style={{ 
                  borderColor: 'rgba(8, 26, 51, 0.06)',
                  opacity: (!canAfford || !isAvailable) ? 0.6 : 1,
                  cursor: (!canAfford || !isAvailable) ? 'not-allowed' : 'pointer'
                }}
              >
                {/* Image */}
                <div className="relative" style={{ height: '120px', overflow: 'hidden' }}>
                  <ImageWithFallback 
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                  <div 
                    className="absolute top-2 right-2 px-2 py-1 rounded-lg backdrop-blur-sm"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.9)' }}
                  >
                    <span style={{ fontSize: '10px', fontWeight: 600, color: item.color }}>
                      {item.category}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-3">
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#081A33', marginBottom: '4px', textAlign: 'left' }}>
                    {item.name}
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#C9A227' }}>
                        {item.points.toLocaleString()}
                      </div>
                      <div style={{ fontSize: '10px', color: '#9CA3AF' }}>
                        points
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', color: '#6B7280' }}>
                      {item.value}
                    </div>
                  </div>

                  {!isAvailable && (
                    <div 
                      className="mt-2 px-2 py-1 rounded-lg text-center"
                      style={{ 
                        fontSize: '10px',
                        fontWeight: 600,
                        backgroundColor: '#FEE',
                        color: '#FF6B6B'
                      }}
                    >
                      Out of Stock
                    </div>
                  )}
                  
                  {!canAfford && isAvailable && (
                    <div 
                      className="mt-2 px-2 py-1 rounded-lg text-center"
                      style={{ 
                        fontSize: '10px',
                        fontWeight: 600,
                        backgroundColor: '#F8F9FA',
                        color: '#9CA3AF'
                      }}
                    >
                      Not Enough Points
                    </div>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}