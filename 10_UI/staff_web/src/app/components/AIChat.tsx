import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User as UserIcon, X, Minimize2, Maximize2, Sparkles } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIChatProps {
  context: 'company' | 'affiliation' | 'scout' | 'analytics';
  onClose?: () => void;
}

export function AIChat({ context, onClose }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Context-specific welcome messages and suggestions
  const getContextConfig = () => {
    switch (context) {
      case 'company':
        return {
          title: 'Company AI Assistant',
          welcomeMessage: 'Hello! I can help you with company information, policy questions, and organizational insights. What would you like to know?',
          suggestions: [
            'Show me our company policies',
            'What are our core values?',
            'Tell me about our benefits',
            'How many employees do we have?',
          ],
          mockResponses: {
            default: 'Based on your company data, I can help you with policy information, organizational structure, employee benefits, and more. Could you please be more specific about what you\'d like to know?',
            policy: 'Your company has several key policies including: Employee Code of Conduct, Remote Work Policy (implemented 2024), and Leave Management Policy. The Employee Handbook was last updated on January 15, 2026. Would you like details on any specific policy?',
            values: 'Heartel\'s core values are: 1) Exceptional Guest Experience - Every interaction matters. 2) Team Excellence - We grow together. 3) Authentic Hospitality - Traditional omotenashi with modern service. 4) Continuous Innovation - Always improving.',
            benefits: 'Employee benefits include: Health insurance (comprehensive medical and dental), Annual leave (20 days + national holidays), Professional development budget (¥200,000/year), Performance bonuses, and Staff accommodation discounts at all Heartel properties.',
            employees: 'Heartel currently has 458 employees across all properties: Grand Heartel Tokyo (245 staff), Heartel Osaka Bay (128 staff), and Heartel Kyoto Gardens (85 staff). Year-over-year growth: +12%.',
          },
        };
      case 'affiliation':
        return {
          title: 'Staff Management AI',
          welcomeMessage: 'Hi! I can assist with staff management, approval workflows, department analytics, and team insights. How can I help?',
          suggestions: [
            'Who are our top performers this month?',
            'Show pending approval requests',
            'Department staff distribution',
            'Recent team member additions',
          ],
          mockResponses: {
            default: 'I can help you with staff management tasks like viewing pending requests, analyzing department performance, and providing team insights. What specific information do you need?',
            performers: 'Top performers this month: 1) Sakura Kimura (Restaurant) - 185 Kudos, 5.0 rating. 2) Akiko Yamada (Restaurant) - 178 Kudos, 5.0 rating. 3) Daichi Mori (Restaurant) - 170 Kudos, 4.9 rating. Restaurant department is showing excellent performance overall!',
            pending: 'You have 4 pending affiliation requests: 2 for Staff roles (Front Desk, Housekeeping) and 2 for Manager positions (Management, Restaurant). The oldest request is from Taro Tanaka (3 days ago). Would you like me to summarize any specific request?',
            distribution: 'Current staff distribution: Front Desk - 28 members (18 staff, 10 managers), Housekeeping - 32 members, Restaurant - 25 members, Concierge - 18 members, Management - 12 members. Front Desk has highest staff-to-manager ratio at 1.8:1.',
            additions: 'Recent additions (last 30 days): Ryu Tanaka (Concierge, Feb 1), Hiroshi Nakamura (Housekeeping, Jan 5), Kenta Ito (Front Desk, Jan 15). All new members have completed onboarding and are performing above expectations.',
          },
        };
      case 'scout':
        return {
          title: 'Talent Scout AI',
          welcomeMessage: 'Welcome! I can help you discover talented professionals, analyze candidate profiles, and provide recruitment insights. What are you looking for?',
          suggestions: [
            'Find top-rated front desk staff',
            'Show candidates with 5+ years experience',
            'Compare Yuki vs Sakura',
            'Best performers in Tokyo area',
          ],
          mockResponses: {
            default: 'I can help you find and evaluate hospitality professionals based on ratings, experience, location, specialties, and performance metrics. What criteria are important for your search?',
            frontdesk: 'Top-rated Front Desk professionals: 1) Yuki Tanaka (Grand Heartel Tokyo) - 4.9 rating, 8 years exp. Specialties: Guest Relations, Team Leadership, Multilingual. 2) Ryu Nakamura (Heartel Osaka Bay) - 4.6 rating, 3 years exp. Excellent communication skills and problem-solving abilities.',
            experience: 'Professionals with 5+ years experience: Yuki Tanaka (8 years), Sakura Ito (6 years), Akiko Yamada (7 years), Hiroshi Sato (10 years), Mei Chen (9 years). All have demonstrated consistent performance and received industry recognition.',
            compare: 'Yuki Tanaka vs Sakura Kimura: Yuki (Front Desk, 156 Kudos, 4.9 rating) excels in communication (98/100) and team leadership. Sakura (Restaurant, 185 Kudos, 5.0 rating) leads in service (99/100) and friendliness (100/100). Both are top 2 performers in their respective departments.',
            tokyo: 'Top performers in Tokyo area: 1) Sakura Kimura (Restaurant Manager, 5.0 rating) - Perfect scores in friendliness and service. 2) Yuki Tanaka (Front Desk Manager, 4.9 rating) - Exceptional communication skills. 3) Mei Chen (Concierge Director, 4.9 rating) - Multilingual specialist with cultural expertise.',
          },
        };
      case 'analytics':
        return {
          title: 'Analytics AI',
          welcomeMessage: 'Hi! I can help you interpret analytics data, identify trends, and provide insights. What would you like to explore?',
          suggestions: [
            'Summarize this month\'s Kudos trends',
            'Which department has the most activity?',
            'Show top performing staff',
            'Compare this week vs last week',
          ],
          mockResponses: {
            default: 'I can help you analyze Kudos data, identify performance trends, and surface actionable insights. What specific metrics are you interested in?',
          },
        };
      default:
        return {
          title: 'AI Assistant',
          welcomeMessage: 'Hello! How can I help you today?',
          suggestions: [],
          mockResponses: { default: 'I\'m here to help!' },
        };
    }
  };

  const config = getContextConfig();

  // Initialize with welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: '1',
          role: 'assistant',
          content: config.welcomeMessage,
          timestamp: new Date(),
        },
      ]);
    }
  }, []);

  const generateResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();
    const responses = config.mockResponses;

    // Context-specific keyword matching
    const r = responses as Record<string, string | undefined>;
    if (context === 'company') {
      if (lowerMessage.includes('policy') || lowerMessage.includes('policies')) return r.policy ?? responses.default;
      if (lowerMessage.includes('value') || lowerMessage.includes('values')) return r.values ?? responses.default;
      if (lowerMessage.includes('benefit') || lowerMessage.includes('benefits')) return r.benefits ?? responses.default;
      if (lowerMessage.includes('employee') || lowerMessage.includes('staff') || lowerMessage.includes('how many')) return r.employees ?? responses.default;
    } else if (context === 'affiliation') {
      if (lowerMessage.includes('top') || lowerMessage.includes('performer') || lowerMessage.includes('best')) return r.performers ?? responses.default;
      if (lowerMessage.includes('pending') || lowerMessage.includes('request') || lowerMessage.includes('approval')) return r.pending ?? responses.default;
      if (lowerMessage.includes('distribution') || lowerMessage.includes('department')) return r.distribution ?? responses.default;
      if (lowerMessage.includes('recent') || lowerMessage.includes('new') || lowerMessage.includes('addition')) return r.additions ?? responses.default;
    } else if (context === 'scout') {
      if (lowerMessage.includes('front desk') || lowerMessage.includes('reception')) return r.frontdesk ?? responses.default;
      if (lowerMessage.includes('experience') || lowerMessage.includes('5 years') || lowerMessage.includes('veteran')) return r.experience ?? responses.default;
      if (lowerMessage.includes('compare') || lowerMessage.includes('vs') || lowerMessage.includes('versus')) return r.compare ?? responses.default;
      if (lowerMessage.includes('tokyo') || lowerMessage.includes('area') || lowerMessage.includes('location')) return r.tokyo ?? responses.default;
    }

    return responses.default;
  };

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    // Simulate AI response delay
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: generateResponse(input),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiResponse]);
    }, 800);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-[#C9A227] to-[#B89220] text-white rounded-full shadow-xl hover:shadow-2xl transition-all"
        >
          <Sparkles size={20} />
          <span className="font-medium">AI Assistant</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-[#E5E7EB]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#081A33] to-[#0A2240] rounded-t-2xl text-white">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#C9A227] flex items-center justify-center">
            <Bot size={18} />
          </div>
          <div>
            <h3 className="font-semibold text-sm">{config.title}</h3>
            <p className="text-xs opacity-70">Always here to help</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
          >
            <Minimize2 size={16} />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                message.role === 'user'
                  ? 'bg-[#081A33]'
                  : 'bg-[#C9A227]'
              }`}
            >
              {message.role === 'user' ? (
                <UserIcon size={16} className="text-white" />
              ) : (
                <Bot size={16} className="text-white" />
              )}
            </div>
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-[#081A33] text-white'
                  : 'bg-[#F7F8FA] text-[#081A33]'
              }`}
            >
              <p className="text-sm leading-relaxed">{message.content}</p>
              <p
                className={`text-xs mt-1 ${
                  message.role === 'user' ? 'text-white/60' : 'text-[#9CA3AF]'
                }`}
              >
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {messages.length === 1 && config.suggestions.length > 0 && (
        <div className="px-4 pb-2">
          <p className="text-xs text-[#6B7280] mb-2">Quick questions:</p>
          <div className="flex flex-wrap gap-2">
            {config.suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="px-3 py-1.5 bg-[#F7F8FA] hover:bg-[#E5E7EB] rounded-lg text-xs text-[#081A33] transition-colors border border-[#E5E7EB]"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-[#E5E7EB]">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask me anything..."
            className="flex-1 px-4 py-2.5 bg-[#F7F8FA] border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A227] focus:border-transparent"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="px-4 py-2.5 bg-[#C9A227] text-white rounded-lg hover:bg-[#B89220] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function AIChatButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-[#C9A227] to-[#B89220] text-white rounded-full shadow-xl hover:shadow-2xl transition-all flex items-center justify-center z-40 group"
    >
      <Sparkles size={24} className="group-hover:scale-110 transition-transform" />
    </button>
  );
}
