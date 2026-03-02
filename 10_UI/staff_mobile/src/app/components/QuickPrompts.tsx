import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface QuickPromptsProps {
  onPromptClick: (prompt: string) => void;
}

export default function QuickPrompts({ onPromptClick }: QuickPromptsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const prompts = [
    'How am I performing?',
    'Areas to improve?',
    'Industry comparison',
    'Growth suggestions'
  ];

  return (
    <div className="bg-white rounded-3xl p-4 shadow-sm">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between"
      >
        <p style={{ 
          fontSize: '12px', 
          fontWeight: 500, 
          color: '#9CA3AF', 
          textTransform: 'uppercase', 
          letterSpacing: '0.5px' 
        }}>
          Quick Questions
        </p>
        {isExpanded ? (
          <ChevronUp size={16} style={{ color: '#9CA3AF' }} />
        ) : (
          <ChevronDown size={16} style={{ color: '#9CA3AF' }} />
        )}
      </button>
      
      {isExpanded && (
        <div className="grid grid-cols-2 gap-2 mt-3">
          {prompts.map((prompt, index) => (
            <button
              key={index}
              onClick={() => onPromptClick(prompt)}
              className="rounded-xl px-3 py-3 border transition-all active:scale-[0.98] text-left"
              style={{ 
                borderColor: 'rgba(8, 26, 51, 0.06)',
                backgroundColor: '#FAFBFC'
              }}
            >
              <span style={{ fontSize: '12px', color: '#081A33' }}>
                {prompt}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}