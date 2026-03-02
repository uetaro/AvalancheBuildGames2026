import { useState } from 'react';
import { Building, Save, Globe, MapPin, Phone, Mail } from 'lucide-react';
import { AIChat, AIChatButton } from '../components/AIChat';

export default function CompanyInfoPage() {
  const [companyData, setCompanyData] = useState({
    name: 'Grand Hills Hotel',
    description: 'Welcome guests with the finest hospitality. A space where tradition and innovation merge, providing unforgettable stay experiences.',
    address: '1-2-3 Akasaka, Minato-ku, Tokyo',
    phone: '+81-3-1234-5678',
    email: 'info@grandhill.com',
    website: 'https://grandhill.com',
    publicProfile: true,
  });
  const [showAIChat, setShowAIChat] = useState(false);

  const handleChange = (field: string, value: string | boolean) => {
    setCompanyData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="h-full overflow-y-auto bg-[#FAFBFC]">
      <div className="px-8 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#081A33]">Company Information</h1>
            <p className="text-sm text-[#6B7280] mt-1">Manage your company profile and public settings</p>
          </div>
          <button className="px-4 py-2.5 bg-[#081A33] text-white rounded-lg hover:bg-[#0A2240] transition-colors flex items-center gap-2 shadow-sm">
            <Save size={18} />
            Save Changes
          </button>
        </div>

        {/* Company Logo */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-6">
          <h3 className="font-semibold text-[#081A33] mb-4">Company Logo</h3>
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 bg-gradient-to-br from-[#081A33] to-[#0A2240] rounded-xl flex items-center justify-center">
              <Building size={40} className="text-white" />
            </div>
            <div>
              <button className="px-4 py-2 bg-[#F7F8FA] text-[#081A33] rounded-lg hover:bg-[#E5E7EB] transition-colors text-sm font-medium">
                Change Image
              </button>
              <p className="text-xs text-[#9CA3AF] mt-2">Recommended size: 512x512px</p>
            </div>
          </div>
        </div>

        {/* Basic Information */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-6">
          <h3 className="font-semibold text-[#081A33] mb-4">Basic Information</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-[#6B7280] mb-2 font-medium">Company Name</label>
              <input type="text" value={companyData.name} onChange={(e) => handleChange('name', e.target.value)} className="w-full px-4 py-2.5 bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A227] focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm text-[#6B7280] mb-2 font-medium">Description</label>
              <textarea value={companyData.description} onChange={(e) => handleChange('description', e.target.value)} rows={4} className="w-full px-4 py-2.5 bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A227] focus:border-transparent resize-none" />
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-6">
          <h3 className="font-semibold text-[#081A33] mb-4">Contact Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#6B7280] mb-2 font-medium flex items-center gap-2">
                <MapPin size={16} />
                Address
              </label>
              <input type="text" value={companyData.address} onChange={(e) => handleChange('address', e.target.value)} className="w-full px-4 py-2.5 bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A227] focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm text-[#6B7280] mb-2 font-medium flex items-center gap-2">
                <Phone size={16} />
                Phone Number
              </label>
              <input type="tel" value={companyData.phone} onChange={(e) => handleChange('phone', e.target.value)} className="w-full px-4 py-2.5 bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A227] focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm text-[#6B7280] mb-2 font-medium flex items-center gap-2">
                <Mail size={16} />
                Email Address
              </label>
              <input type="email" value={companyData.email} onChange={(e) => handleChange('email', e.target.value)} className="w-full px-4 py-2.5 bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A227] focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm text-[#6B7280] mb-2 font-medium flex items-center gap-2">
                <Globe size={16} />
                Website
              </label>
              <input type="url" value={companyData.website} onChange={(e) => handleChange('website', e.target.value)} className="w-full px-4 py-2.5 bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A227] focus:border-transparent" />
            </div>
          </div>
        </div>

        {/* Privacy Settings */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-6">
          <h3 className="font-semibold text-[#081A33] mb-4">Privacy Settings</h3>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-[#081A33]">Public Profile</p>
              <p className="text-sm text-[#6B7280]">Allow other companies to discover and scout your team</p>
            </div>
            <button onClick={() => handleChange('publicProfile', !companyData.publicProfile)} className={`relative w-14 h-8 rounded-full transition-colors ${companyData.publicProfile ? 'bg-[#081A33]' : 'bg-[#D1D5DB]'}`}>
              <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ${companyData.publicProfile ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        {/* Statistics */}
        <div className="bg-[#F7F8FA] rounded-lg border border-[#E5E7EB] p-6">
          <h3 className="font-semibold text-[#081A33] mb-4">Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-[#6B7280] mb-1">Total Employees</p>
              <p className="text-2xl font-semibold text-[#081A33]">127</p>
            </div>
            <div>
              <p className="text-sm text-[#6B7280] mb-1">Active Rate</p>
              <p className="text-2xl font-semibold text-[#081A33]">94%</p>
            </div>
            <div>
              <p className="text-sm text-[#6B7280] mb-1">Avg Stay (days)</p>
              <p className="text-2xl font-semibold text-[#081A33]">8.5</p>
            </div>
            <div>
              <p className="text-sm text-[#6B7280] mb-1">Satisfaction</p>
              <p className="text-2xl font-semibold text-[#081A33]">4.8/5.0</p>
            </div>
          </div>
        </div>
      </div>
      {/* AI Chat */}
      {showAIChat ? (
        <AIChat context="company" onClose={() => setShowAIChat(false)} />
      ) : (
        <AIChatButton onClick={() => setShowAIChat(true)} />
      )}
    </div>
  );
}