import { Search, MapPin, Building, Mail, Briefcase, X, TrendingUp, Award, Users, Calendar, MessageSquare, ArrowLeft, Sparkles } from 'lucide-react';
import { LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import kudosIcon from 'figma:asset/kudos.png';
import { AIChat, AIChatButton } from '../components/AIChat';
import { useState } from 'react';

interface Person {
  id: string;
  name: string;
  position: string;
  company: string;
  location: string;
  bio: string;
  yearsExperience: number;
  rating: number;
  specialties: string[];
  department: string;
}

interface KudosHistory {
  id: string;
  date: string;
  guest: string;
  category: string;
  comment: string;
}

export default function ScoutPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [showAIChat, setShowAIChat] = useState(false);

  const mockPeople: Person[] = [
    {
      id: 'P001',
      name: 'Yuki Tanaka',
      position: 'Front Desk Manager',
      company: 'Grand Heartel Tokyo',
      department: 'Front Desk',
      location: 'Tokyo',
      bio: 'Experienced in luxury hospitality with a focus on guest experience and team leadership',
      yearsExperience: 8,
      rating: 4.9,
      specialties: ['Guest Relations', 'Team Leadership', 'Multilingual'],
    },
    {
      id: 'P002',
      name: 'Kenji Yamamoto',
      position: 'Senior Concierge',
      company: 'Heartel Osaka Bay',
      department: 'Concierge',
      location: 'Osaka',
      bio: 'Specialist in creating memorable guest experiences and VIP services',
      yearsExperience: 5,
      rating: 4.7,
      specialties: ['Local Knowledge', 'VIP Services', 'Event Planning'],
    },
    {
      id: 'P003',
      name: 'Sakura Kimura',
      position: 'Restaurant Manager',
      company: 'Grand Heartel Tokyo',
      department: 'Restaurant',
      location: 'Tokyo',
      bio: 'Expert in fine dining service and creating exceptional culinary experiences',
      yearsExperience: 6,
      rating: 5.0,
      specialties: ['Fine Dining', 'Wine Pairing', 'Guest Experience'],
    },
    {
      id: 'P004',
      name: 'Hiroshi Sato',
      position: 'Housekeeping Supervisor',
      company: 'Heartel Kyoto Gardens',
      department: 'Housekeeping',
      location: 'Kyoto',
      bio: 'Passionate about maintaining the highest standards of cleanliness and attention to detail',
      yearsExperience: 10,
      rating: 4.8,
      specialties: ['Quality Control', 'Training', 'Efficiency'],
    },
    {
      id: 'P005',
      name: 'Akiko Yamada',
      position: 'Restaurant Supervisor',
      company: 'Heartel Kyoto Gardens',
      department: 'Restaurant',
      location: 'Kyoto',
      bio: 'Dedicated to delivering authentic Japanese hospitality with modern service excellence',
      yearsExperience: 7,
      rating: 4.9,
      specialties: ['Omotenashi', 'Service Excellence', 'Staff Training'],
    },
    {
      id: 'P006',
      name: 'Takeshi Ito',
      position: 'Housekeeping Lead',
      company: 'Grand Heartel Tokyo',
      department: 'Housekeeping',
      location: 'Tokyo',
      bio: 'Expert in sustainable cleaning practices and team coordination',
      yearsExperience: 5,
      rating: 4.7,
      specialties: ['Eco-Friendly', 'Team Management', 'Quality Assurance'],
    },
    {
      id: 'P007',
      name: 'Mei Chen',
      position: 'Concierge Director',
      company: 'Grand Heartel Tokyo',
      department: 'Concierge',
      location: 'Tokyo',
      bio: 'Multilingual professional specializing in luxury guest services and cultural experiences',
      yearsExperience: 9,
      rating: 4.9,
      specialties: ['Cultural Tours', 'Luxury Services', 'Multilingual'],
    },
    {
      id: 'P008',
      name: 'Ryu Nakamura',
      position: 'Front Desk Associate',
      company: 'Heartel Osaka Bay',
      department: 'Front Desk',
      location: 'Osaka',
      bio: 'Rising talent with excellent communication skills and guest service mindset',
      yearsExperience: 3,
      rating: 4.6,
      specialties: ['Check-in Excellence', 'Problem Solving', 'Guest Communication'],
    },
  ];

  // Performance data for selected person
  const getPersonAnalytics = (personId: string) => {
    const performanceData: Record<string, any> = {
      'P001': {
        totalKudos: 156,
        monthlyKudos: 52,
        weekGrowth: 15.3,
        satisfactionScore: 4.9,
        companyRank: 2,
        totalStaffInCompany: 45,
        departmentRank: 1,
        totalStaffInDepartment: 8,
        categoryPerformance: [
          { category: 'Service', score: 95, deptAvg: 85, companyAvg: 82 },
          { category: 'Professionalism', score: 92, deptAvg: 88, companyAvg: 85 },
          { category: 'Communication', score: 98, deptAvg: 82, companyAvg: 80 },
          { category: 'Problem Solving', score: 88, deptAvg: 80, companyAvg: 78 },
          { category: 'Efficiency', score: 90, deptAvg: 85, companyAvg: 83 },
          { category: 'Friendliness', score: 97, deptAvg: 90, companyAvg: 88 },
        ],
        monthlyTrend: [
          { month: 'Aug', kudos: 38 },
          { month: 'Sep', kudos: 42 },
          { month: 'Oct', kudos: 45 },
          { month: 'Nov', kudos: 48 },
          { month: 'Dec', kudos: 51 },
          { month: 'Jan', kudos: 52 },
        ],
        kudosHistory: [
          { id: 'K1', date: '2025-02-24', guest: 'Sarah Johnson', category: 'Service', comment: 'Exceptional check-in experience! Yuki made us feel welcome immediately.', rating: 5 },
          { id: 'K2', date: '2025-02-22', guest: 'Michael Chen', category: 'Communication', comment: 'Excellent multilingual support. Made our stay so much easier!', rating: 5 },
          { id: 'K3', date: '2025-02-20', guest: 'Emma Wilson', category: 'Problem Solving', comment: 'Resolved our room issue quickly and professionally. Outstanding service!', rating: 5 },
          { id: 'K4', date: '2025-02-18', guest: 'David Lee', category: 'Friendliness', comment: 'Always greeting guests with a warm smile. Such a positive presence!', rating: 5 },
          { id: 'K5', date: '2025-02-15', guest: 'Sophie Martin', category: 'Service', comment: 'Went above and beyond to arrange our dinner reservations. Thank you!', rating: 5 },
          { id: 'K6', date: '2025-02-12', guest: 'James Brown', category: 'Professionalism', comment: 'Handled a difficult situation with grace and professionalism.', rating: 5 },
          { id: 'K7', date: '2025-02-10', guest: 'Lisa Anderson', category: 'Communication', comment: 'Clear communication and helpful recommendations for local attractions.', rating: 5 },
          { id: 'K8', date: '2025-02-08', guest: 'Robert Taylor', category: 'Efficiency', comment: 'Check-in was incredibly smooth and efficient. Well done!', rating: 5 },
        ],
        categoryDistribution: [
          { category: 'Service', count: 45 },
          { category: 'Communication', count: 38 },
          { category: 'Friendliness', count: 32 },
          { category: 'Professionalism', count: 25 },
          { category: 'Problem Solving', count: 16 },
        ],
      },
      'P003': {
        totalKudos: 185,
        monthlyKudos: 62,
        weekGrowth: 23.1,
        satisfactionScore: 5.0,
        companyRank: 1,
        totalStaffInCompany: 45,
        departmentRank: 1,
        totalStaffInDepartment: 12,
        categoryPerformance: [
          { category: 'Service', score: 99, deptAvg: 88, companyAvg: 82 },
          { category: 'Professionalism', score: 97, deptAvg: 90, companyAvg: 85 },
          { category: 'Communication', score: 96, deptAvg: 85, companyAvg: 80 },
          { category: 'Problem Solving', score: 94, deptAvg: 82, companyAvg: 78 },
          { category: 'Efficiency', score: 98, deptAvg: 90, companyAvg: 83 },
          { category: 'Friendliness', score: 100, deptAvg: 92, companyAvg: 88 },
        ],
        monthlyTrend: [
          { month: 'Aug', kudos: 45 },
          { month: 'Sep', kudos: 48 },
          { month: 'Oct', kudos: 52 },
          { month: 'Nov', kudos: 56 },
          { month: 'Dec', kudos: 60 },
          { month: 'Jan', kudos: 62 },
        ],
        kudosHistory: [
          { id: 'K1', date: '2025-02-25', guest: 'Oliver Smith', category: 'Friendliness', comment: 'Sakura\'s warm personality made our dinner unforgettable!', rating: 5 },
          { id: 'K2', date: '2025-02-24', guest: 'Isabella Garcia', category: 'Service', comment: 'Best restaurant service I\'ve experienced in years. Impeccable!', rating: 5 },
          { id: 'K3', date: '2025-02-22', guest: 'William Martinez', category: 'Professionalism', comment: 'Handled our large party with perfect coordination and grace.', rating: 5 },
          { id: 'K4', date: '2025-02-20', guest: 'Ava Rodriguez', category: 'Communication', comment: 'Excellent wine recommendations and knowledgeable about the menu.', rating: 5 },
          { id: 'K5', date: '2025-02-18', guest: 'Noah Hernandez', category: 'Efficiency', comment: 'Service was prompt without feeling rushed. Perfect timing!', rating: 5 },
          { id: 'K6', date: '2025-02-16', guest: 'Mia Lopez', category: 'Service', comment: 'Anticipated our needs before we even asked. Outstanding!', rating: 5 },
        ],
        categoryDistribution: [
          { category: 'Service', count: 58 },
          { category: 'Friendliness', count: 48 },
          { category: 'Professionalism', count: 35 },
          { category: 'Communication', count: 28 },
          { category: 'Efficiency', count: 16 },
        ],
      },
    };

    // Default data for other persons
    return performanceData[personId] || {
      totalKudos: 120,
      monthlyKudos: 40,
      weekGrowth: 10.0,
      satisfactionScore: 4.7,
      companyRank: 5,
      totalStaffInCompany: 45,
      departmentRank: 2,
      totalStaffInDepartment: 10,
      categoryPerformance: [
        { category: 'Service', score: 85, deptAvg: 80, companyAvg: 82 },
        { category: 'Professionalism', score: 88, deptAvg: 82, companyAvg: 85 },
        { category: 'Communication', score: 82, deptAvg: 78, companyAvg: 80 },
        { category: 'Problem Solving', score: 86, deptAvg: 80, companyAvg: 78 },
        { category: 'Efficiency', score: 90, deptAvg: 85, companyAvg: 83 },
        { category: 'Friendliness', score: 87, deptAvg: 85, companyAvg: 88 },
      ],
      monthlyTrend: [
        { month: 'Aug', kudos: 32 },
        { month: 'Sep', kudos: 35 },
        { month: 'Oct', kudos: 36 },
        { month: 'Nov', kudos: 38 },
        { month: 'Dec', kudos: 39 },
        { month: 'Jan', kudos: 40 },
      ],
      kudosHistory: [
        { id: 'K1', date: '2025-02-24', guest: 'Guest A', category: 'Service', comment: 'Great service and attention to detail.', rating: 5 },
        { id: 'K2', date: '2025-02-20', guest: 'Guest B', category: 'Professionalism', comment: 'Very professional and courteous.', rating: 5 },
        { id: 'K3', date: '2025-02-18', guest: 'Guest C', category: 'Friendliness', comment: 'Friendly and helpful throughout our stay.', rating: 5 },
      ],
      categoryDistribution: [
        { category: 'Service', count: 35 },
        { category: 'Professionalism', count: 28 },
        { category: 'Friendliness', count: 25 },
        { category: 'Communication', count: 20 },
        { category: 'Efficiency', count: 12 },
      ],
    };
  };

  const filteredPeople = mockPeople.filter(person =>
    person.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    person.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
    person.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
    person.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (selectedPerson) {
    const analytics = getPersonAnalytics(selectedPerson.id);
    const companyRankPercentile = ((analytics.totalStaffInCompany - analytics.companyRank) / analytics.totalStaffInCompany * 100).toFixed(0);
    const departmentRankPercentile = ((analytics.totalStaffInDepartment - analytics.departmentRank) / analytics.totalStaffInDepartment * 100).toFixed(0);

    return (
      <div className="h-full overflow-y-auto bg-white">
        <div className="px-8 py-6 space-y-6">
          {/* Back Button */}
          <button
            onClick={() => setSelectedPerson(null)}
            className="flex items-center gap-2 text-[#6B7280] hover:text-[#081A33] transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Back to Scout</span>
          </button>

          {/* Profile Header */}
          <div className="bg-gradient-to-br from-[#081A33] to-[#0A2240] rounded-lg p-8 text-white">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-6">
                <div className="w-24 h-24 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center text-3xl font-semibold border-2 border-white/20">
                  {selectedPerson.name.charAt(0)}
                </div>
                <div>
                  <h1 className="text-3xl font-semibold mb-2">{selectedPerson.name}</h1>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <Briefcase size={16} />
                      <span className="text-white/90">{selectedPerson.position}</span>
                    </div>
                    <span className="text-white/50">•</span>
                    <div className="flex items-center gap-2">
                      <Building size={16} />
                      <span className="text-white/90">{selectedPerson.company}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <MapPin size={16} />
                      <span className="text-white/90">{selectedPerson.location}</span>
                    </div>
                    <span className="text-white/50">•</span>
                    <span className="text-white/90">{selectedPerson.yearsExperience} years experience</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedPerson.specialties.map((specialty, index) => (
                      <span key={index} className="px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-sm border border-white/20">
                        {specialty}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Key Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg border-2 border-[#FF6B6B] p-5">
              <div className="flex items-center gap-2 mb-3">
                <img src={kudosIcon} alt="Kudos" className="w-5 h-5" />
                <span className="text-sm text-[#6B7280]">Total Kudos</span>
              </div>
              <p className="text-3xl font-semibold text-[#081A33] mb-2">{analytics.totalKudos}</p>
              <div className="flex items-center gap-1 text-xs text-[#10B981]">
                <TrendingUp size={12} />
                <span>+{analytics.weekGrowth}% this week</span>
              </div>
            </div>

            <div className="bg-white rounded-lg border-2 border-[#C9A227] p-5">
              <div className="flex items-center gap-2 mb-3">
                <Award size={18} className="text-[#6B7280]" />
                <span className="text-sm text-[#6B7280]">Company Rank</span>
              </div>
              <p className="text-3xl font-semibold text-[#081A33] mb-2">#{analytics.companyRank}</p>
              <p className="text-xs text-[#6B7280]">
                Top {companyRankPercentile}% of {analytics.totalStaffInCompany} staff
              </p>
            </div>

            <div className="bg-white rounded-lg border-2 border-[#081A33] p-5">
              <div className="flex items-center gap-2 mb-3">
                <Users size={18} className="text-[#6B7280]" />
                <span className="text-sm text-[#6B7280]">Department Rank</span>
              </div>
              <p className="text-3xl font-semibold text-[#081A33] mb-2">#{analytics.departmentRank}</p>
              <p className="text-xs text-[#6B7280]">
                Top {departmentRankPercentile}% in {selectedPerson.department}
              </p>
            </div>
          </div>

          {/* Performance Trends */}
          <div className="bg-white rounded-lg border border-[#E5E7EB] p-6">
            <div className="mb-6">
              <h3 className="font-semibold text-[#081A33] mb-1">Kudos Trend (Last 6 Months)</h3>
              <p className="text-sm text-[#6B7280]">Monthly performance progression</p>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={analytics.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="kudos"
                  stroke="#FF6B6B"
                  strokeWidth={3}
                  dot={{ fill: '#FF6B6B', r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Performance Comparison */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Radar Chart */}
            <div className="bg-white rounded-lg border border-[#E5E7EB] p-6">
              <div className="mb-6">
                <h3 className="font-semibold text-[#081A33] mb-1">Performance vs Averages</h3>
                <p className="text-sm text-[#6B7280]">Comparison with department and company averages</p>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <RadarChart data={analytics.categoryPerformance}>
                  <PolarGrid stroke="#E5E7EB" />
                  <PolarAngleAxis dataKey="category" style={{ fontSize: '11px', fill: '#6B7280' }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} style={{ fontSize: '10px', fill: '#9CA3AF' }} />
                  <Radar
                    name={selectedPerson.name}
                    dataKey="score"
                    stroke="#FF6B6B"
                    fill="#FF6B6B"
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                  <Radar
                    name="Department Avg"
                    dataKey="deptAvg"
                    stroke="#C9A227"
                    fill="#C9A227"
                    fillOpacity={0.15}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                  />
                  <Radar
                    name="Company Avg"
                    dataKey="companyAvg"
                    stroke="#9CA3AF"
                    fill="#9CA3AF"
                    fillOpacity={0.1}
                    strokeWidth={2}
                    strokeDasharray="3 3"
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Category Distribution */}
            <div className="bg-white rounded-lg border border-[#E5E7EB] p-6">
              <div className="mb-6">
                <h3 className="font-semibold text-[#081A33] mb-1">Kudos by Category</h3>
                <p className="text-sm text-[#6B7280]">Distribution of received kudos</p>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={analytics.categoryDistribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis type="number" stroke="#9CA3AF" style={{ fontSize: '11px' }} />
                  <YAxis dataKey="category" type="category" width={120} stroke="#9CA3AF" style={{ fontSize: '11px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="count" fill="#FF6B6B" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* AI Insights */}
          <div className="bg-white rounded-lg border border-[#E5E7EB] p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={20} className="text-[#C9A227]" />
              <h3 className="font-semibold text-[#081A33]">AI Performance Insights</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-[#10B981]/10 to-[#10B981]/5 rounded-lg p-4 border-l-4 border-[#10B981]">
                <h4 className="font-semibold text-[#081A33] mb-2">Top Strength</h4>
                <p className="text-sm text-[#6B7280]">
                  {selectedPerson.name} excels in <span className="font-semibold text-[#10B981]">Communication</span>, scoring {analytics.categoryPerformance.find((c: any) => c.category === 'Communication')?.score || 95}/100 - significantly above both department and company averages.
                </p>
              </div>
              <div className="bg-gradient-to-br from-[#C9A227]/10 to-[#C9A227]/5 rounded-lg p-4 border-l-4 border-[#C9A227]">
                <h4 className="font-semibold text-[#081A33] mb-2">Growth Opportunity</h4>
                <p className="text-sm text-[#6B7280]">
                  Focus on <span className="font-semibold text-[#C9A227]">Problem Solving</span> skills to reach top-tier performance. Current score is {analytics.categoryPerformance.find((c: any) => c.category === 'Problem Solving')?.score || 88}/100.
                </p>
              </div>
            </div>
          </div>

          {/* Kudos History */}
          <div className="bg-white rounded-lg border border-[#E5E7EB] p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-[#081A33] mb-1">Kudos History</h3>
                <p className="text-sm text-[#6B7280]">Recent feedback from guests</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#FF6B6B]/10 rounded-lg">
                <MessageSquare size={16} className="text-[#FF6B6B]" />
                <span className="text-sm font-medium text-[#081A33]">{analytics.kudosHistory.length} Reviews</span>
              </div>
            </div>
            <div className="space-y-4">
              {analytics.kudosHistory.map((kudos: KudosHistory) => (
                <div key={kudos.id} className="bg-[#FAFBFC] rounded-lg p-4 border border-[#E5E7EB] hover:border-[#FF6B6B] transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF6B6B] to-[#FF8585] flex items-center justify-center text-white font-semibold text-sm">
                        {kudos.guest.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#081A33]">{kudos.guest}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#9CA3AF]">{kudos.date}</span>
                          <span className="text-xs text-[#9CA3AF]">•</span>
                          <span className="text-xs font-medium text-[#FF6B6B]">{kudos.category}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-[#6B7280]">{kudos.comment}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Contact Section */}
          <div className="bg-gradient-to-br from-[#081A33] to-[#0A2240] rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">Interested in {selectedPerson.name}?</h3>
                <p className="text-sm text-white/80">Reach out to discuss potential opportunities</p>
              </div>
              <div className="flex gap-3">
                <button className="px-6 py-2.5 bg-white/10 backdrop-blur-sm text-white rounded-lg font-medium hover:bg-white/20 transition-colors flex items-center gap-2 border border-white/20">
                  <Mail size={18} />
                  Contact
                </button>
                <button className="px-6 py-2.5 bg-[#C9A227] text-white rounded-lg font-medium hover:bg-[#B89220] transition-colors">
                  Send Offer
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* AI Chat */}
        {showAIChat ? (
          <AIChat context="scout" onClose={() => setShowAIChat(false)} />
        ) : (
          <AIChatButton onClick={() => setShowAIChat(true)} />
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="bg-white border-b border-[#E5E7EB] px-8 py-6">
        <h1 className="text-2xl font-semibold text-[#081A33] mb-1">Scout</h1>
        <p className="text-sm text-[#6B7280] mb-6">Discover talented hospitality professionals</p>

        <div className="relative mb-4">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder="Search by name, position, company, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A227] focus:border-transparent"
          />
        </div>

        <div className="bg-[#F7F8FA] rounded-lg p-4">
          <p className="text-sm text-[#6B7280]">
            Browse professionals with public profiles. <span className="font-medium text-[#081A33]">{filteredPeople.length} professionals</span> found.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filteredPeople.map((person) => (
            <div key={person.id} className="bg-white rounded-lg border border-[#E5E7EB] p-6 hover:shadow-lg hover:border-[#C9A227] transition-all">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-[#081A33] to-[#0A2240] rounded-full flex items-center justify-center flex-shrink-0 text-white text-xl font-semibold">
                  {person.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[#081A33] mb-1">{person.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-[#6B7280] mb-2">
                    <Briefcase size={14} />
                    <span>{person.position}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[#6B7280]">
                    <Building size={14} />
                    <span>{person.company}</span>
                  </div>
                </div>
              </div>

              <p className="text-sm text-[#6B7280] mb-4 line-clamp-2">{person.bio}</p>

              <div className="flex items-center gap-4 mb-4 text-sm">
                <div className="flex items-center gap-1.5 text-[#6B7280]">
                  <MapPin size={14} />
                  <span>{person.location}</span>
                </div>
                <div className="text-[#6B7280]">
                  {person.yearsExperience} years exp.
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {person.specialties.map((specialty, index) => (
                  <span key={index} className="px-3 py-1 bg-[#081A33]/5 text-[#081A33] rounded text-xs font-medium">
                    {specialty}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-4 border-t border-[#E5E7EB]">
                <button className="py-2 px-3 bg-[#F7F8FA] text-[#081A33] rounded-lg text-sm font-medium hover:bg-[#E5E7EB] transition-colors flex items-center justify-center gap-2">
                  <Mail size={16} />
                  Contact
                </button>
                <button
                  onClick={() => setSelectedPerson(person)}
                  className="py-2 px-3 bg-[#081A33] text-white rounded-lg text-sm font-medium hover:bg-[#0A2240] transition-colors"
                >
                  View Analytics
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Chat */}
      {showAIChat ? (
        <AIChat context="scout" onClose={() => setShowAIChat(false)} />
      ) : (
        <AIChatButton onClick={() => setShowAIChat(true)} />
      )}
    </div>
  );
}