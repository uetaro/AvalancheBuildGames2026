import { useNavigate } from "react-router";
import { ArrowLeft, Calendar, Sparkles, Briefcase, HandHeart, Zap, Smile, Star, Search } from "lucide-react";
import { useState } from "react";
import kudosIcon from "figma:asset/f4bf621b3ae64967e30c73582c7e028cfa4590e9.png";

interface KudosRecord {
  id: string;
  staffName: string;
  staffRole: string;
  category: string;
  categoryIcon: typeof Sparkles;
  message: string;
  date: string;
  imageUrl: string;
}

const mockKudosHistory: KudosRecord[] = [
  {
    id: "1",
    staffName: "Michael Johnson",
    staffRole: "Concierge",
    category: "Hospitality",
    categoryIcon: Sparkles,
    message: "The tour guidance was incredibly detailed and thoughtful. Thanks to your help, we had a wonderful trip. Thank you so much!",
    date: "February 19, 2026",
    imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
  },
  {
    id: "2",
    staffName: "Sarah Williams",
    staffRole: "Room Attendant",
    category: "Kindness",
    categoryIcon: HandHeart,
    message: "The room cleaning was always so thorough and meticulous. I really appreciate the thoughtful attention to detail.",
    date: "February 19, 2026",
    imageUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
  },
  {
    id: "3",
    staffName: "David Brown",
    staffRole: "Bellboy",
    category: "Smile",
    categoryIcon: Smile,
    message: "Always greeted with a warm smile, which made my stay so pleasant.",
    date: "February 18, 2026",
    imageUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop",
  },
  {
    id: "4",
    staffName: "James Anderson",
    staffRole: "Chef",
    category: "Professionalism",
    categoryIcon: Briefcase,
    message: "The cuisine was outstanding. You made our evening truly special.",
    date: "December 25, 2025",
    imageUrl: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=400&h=400&fit=crop",
  },
  {
    id: "5",
    staffName: "Emily Martinez",
    staffRole: "Bartender",
    category: "Hospitality",
    categoryIcon: Sparkles,
    message: "Your detailed explanation of the cocktails made the experience so enjoyable. Had a great time!",
    date: "December 24, 2025",
    imageUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop",
  },
];

export function KudosHistoryPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  // Filter kudos based on search query
  const filteredKudos = mockKudosHistory.filter((kudos) => {
    const query = searchQuery.toLowerCase();
    return (
      kudos.staffName.toLowerCase().includes(query) ||
      kudos.staffRole.toLowerCase().includes(query) ||
      kudos.category.toLowerCase().includes(query) ||
      kudos.message.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="relative bg-primary text-primary-foreground">
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }} />
        
        <div className="relative max-w-md mx-auto">
          <div className="flex items-center gap-3 p-6">
            <button
              onClick={() => navigate("/my-page")}
              className="p-2 -ml-2 hover:bg-white/10 rounded-none transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-light">Kudos History</h1>
              <p className="text-xs opacity-90 mt-0.5 font-light">
                {mockKudosHistory.length} Kudos • Grand Hotel
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 max-w-md mx-auto w-full">
        {/* Search Bar */}
        {mockKudosHistory.length > 0 && (
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by staff, role, or category..."
                className="w-full bg-white border border-border rounded-none pl-12 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-accent font-light text-sm shadow-sm"
              />
            </div>
            {searchQuery && (
              <p className="text-xs text-muted-foreground mt-2 font-light">
                {filteredKudos.length} result{filteredKudos.length !== 1 ? "s" : ""} found
              </p>
            )}
          </div>
        )}

        {/* History List */}
        <div className="space-y-4">
          {filteredKudos.map((kudos) => {
            const IconComponent = kudos.categoryIcon;
            return (
              <div
                key={kudos.id}
                className="bg-white rounded-none p-5 shadow-sm border border-border"
              >
                {/* Header */}
                <div className="flex gap-3 mb-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-none overflow-hidden bg-muted">
                    <img
                      src={kudos.imageUrl}
                      alt={kudos.staffName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base text-foreground mb-0.5 font-light">
                      {kudos.staffName}
                    </h3>
                    <p className="text-xs text-muted-foreground font-light">
                      {kudos.staffRole}
                    </p>
                    <p className="text-xs text-muted-foreground/60 font-light mt-0.5">
                      Grand Hotel
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <IconComponent className="w-5 h-5 text-accent" />
                  </div>
                </div>

                {/* Category */}
                <div className="mb-3">
                  <span className="inline-block text-xs bg-[#FF6B6B]/10 text-[#FF6B6B] px-3 py-1 rounded-none font-light">
                    {kudos.category}
                  </span>
                </div>

                {/* Message */}
                <p className="text-sm text-foreground leading-relaxed mb-4 font-light">
                  {kudos.message}
                </p>

                {/* Date */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-3 border-t border-border font-light">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{kudos.date}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* No Results State */}
        {searchQuery && filteredKudos.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-muted rounded-none mb-4">
              <Search className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-base text-foreground mb-2 font-light">
              No results found
            </h3>
            <p className="text-sm text-muted-foreground font-light">
              Try searching with different keywords
            </p>
          </div>
        )}

        {/* Empty State (if no history) */}
        {!searchQuery && mockKudosHistory.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-muted rounded-none mb-4">
              <img src={kudosIcon} alt="Kudos" className="w-10 h-10 object-contain" />
            </div>
            <h3 className="text-base text-foreground mb-2 font-light">
              No Kudos sent yet
            </h3>
            <p className="text-sm text-muted-foreground mb-6 font-light">
              Send your appreciation to the staff
            </p>
            <button
              onClick={() => navigate("/staff")}
              className="bg-accent text-accent-foreground px-6 py-3 rounded-none hover:shadow-md transition-all font-light"
            >
              Select Staff
            </button>
          </div>
        )}
      </main>
    </div>
  );
}