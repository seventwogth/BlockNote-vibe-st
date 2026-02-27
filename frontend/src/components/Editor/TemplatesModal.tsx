import { useState } from 'react';

export interface Template {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: string;
  blocks: {
    type: string;
    content: string;
  }[];
}

export const DEFAULT_TEMPLATES: Template[] = [
  {
    id: 'blank',
    name: 'Blank',
    icon: '📄',
    description: 'Start from scratch',
    category: 'Basic',
    blocks: [{ type: 'text', content: '' }],
  },
  {
    id: 'meeting-notes',
    name: 'Meeting Notes',
    icon: '📝',
    description: 'Capture meeting notes and action items',
    category: 'Work',
    blocks: [
      { type: 'heading1', content: 'Meeting Notes' },
      { type: 'text', content: '' },
      { type: 'heading2', content: 'Attendees' },
      { type: 'bullet', content: '' },
      { type: 'heading2', content: 'Agenda' },
      { type: 'numbered', content: '' },
      { type: 'heading2', content: 'Discussion Points' },
      { type: 'text', content: '' },
      { type: 'heading2', content: 'Action Items' },
      { type: 'todo', content: '' },
      { type: 'todo', content: '' },
    ],
  },
  {
    id: 'project-plan',
    name: 'Project Plan',
    icon: '📋',
    description: 'Track project milestones and tasks',
    category: 'Work',
    blocks: [
      { type: 'heading1', content: 'Project Plan' },
      { type: 'text', content: '' },
      { type: 'heading2', content: 'Overview' },
      { type: 'text', content: 'Project description...' },
      { type: 'heading2', content: 'Goals' },
      { type: 'bullet', content: '' },
      { type: 'heading2', content: 'Timeline' },
      { type: 'text', content: '' },
      { type: 'heading2', content: 'Milestones' },
      { type: 'todo', content: 'Milestone 1' },
      { type: 'todo', content: 'Milestone 2' },
      { type: 'todo', content: 'Milestone 3' },
    ],
  },
  {
    id: 'daily-journal',
    name: 'Daily Journal',
    icon: '📔',
    description: 'Daily reflection and journaling',
    category: 'Personal',
    blocks: [
      { type: 'heading1', content: 'Daily Journal' },
      { type: 'text', content: '' },
      { type: 'heading2', content: 'Date' },
      { type: 'text', content: '' },
      { type: 'heading2', content: 'Gratitude' },
      { type: 'bullet', content: '' },
      { type: 'heading2', content: 'Highlights' },
      { type: 'text', content: '' },
      { type: 'heading2', content: 'Tomorrow Goals' },
      { type: 'todo', content: '' },
    ],
  },
  {
    id: 'book-notes',
    name: 'Book Notes',
    icon: '📚',
    description: 'Take notes while reading',
    category: 'Learning',
    blocks: [
      { type: 'heading1', content: 'Book Notes' },
      { type: 'heading2', content: 'Book Title' },
      { type: 'text', content: '' },
      { type: 'heading2', content: 'Author' },
      { type: 'text', content: '' },
      { type: 'heading2', content: 'Key Takeaways' },
      { type: 'bullet', content: '' },
      { type: 'heading2', content: 'Favorite Quotes' },
      { type: 'quote', content: '' },
      { type: 'heading2', content: 'Notes' },
      { type: 'text', content: '' },
    ],
  },
  {
    id: 'wiki-page',
    name: 'Wiki Page',
    icon: '🌐',
    description: 'Documentation or knowledge base',
    category: 'Work',
    blocks: [
      { type: 'heading1', content: 'Page Title' },
      { type: 'text', content: 'Brief description...' },
      { type: 'heading2', content: 'Overview' },
      { type: 'text', content: '' },
      { type: 'heading2', content: 'Details' },
      { type: 'text', content: '' },
      { type: 'heading2', content: 'Related Pages' },
      { type: 'bullet', content: '' },
    ],
  },
  {
    id: 'weekly-review',
    name: 'Weekly Review',
    icon: '📊',
    description: 'Weekly productivity review',
    category: 'Personal',
    blocks: [
      { type: 'heading1', content: 'Weekly Review' },
      { type: 'heading2', content: 'Week of...' },
      { type: 'text', content: '' },
      { type: 'heading2', content: 'Accomplishments' },
      { type: 'bullet', content: '' },
      { type: 'heading2', content: 'Challenges' },
      { type: 'text', content: '' },
      { type: 'heading2', content: 'Lessons Learned' },
      { type: 'text', content: '' },
      { type: 'heading2', content: 'Next Week Goals' },
      { type: 'todo', content: '' },
    ],
  },
];

interface TemplatesModalProps {
  onSelect: (template: Template) => void;
  onClose: () => void;
}

export function TemplatesModal({ onSelect, onClose }: TemplatesModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = [...new Set(DEFAULT_TEMPLATES.map(t => t.category))];
  const filteredTemplates = selectedCategory
    ? DEFAULT_TEMPLATES.filter(t => t.category === selectedCategory)
    : DEFAULT_TEMPLATES;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-surface rounded-xl shadow-2xl w-[600px] max-h-[80vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-border">
          <h2 className="text-xl font-semibold">Choose a template</h2>
          <p className="text-sm text-text-secondary mt-1">Start with a template to get started quickly</p>
        </div>

        <div className="p-4 border-b border-border">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1.5 text-sm rounded-full ${
                !selectedCategory ? 'bg-primary text-white' : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-sm rounded-full ${
                  selectedCategory === cat ? 'bg-primary text-white' : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 overflow-y-auto max-h-[400px]">
          <div className="grid grid-cols-2 gap-3">
            {filteredTemplates.map(template => (
              <button
                key={template.id}
                onClick={() => onSelect(template)}
                className="text-left p-4 border border-border rounded-lg hover:bg-hover hover:border-primary transition-colors group"
              >
                <div className="text-2xl mb-2">{template.icon}</div>
                <div className="font-medium text-sm">{template.name}</div>
                <div className="text-xs text-text-secondary mt-1">{template.description}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-border flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
