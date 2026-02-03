'use client';

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Check, Sparkles } from 'lucide-react';

// Major Arcana cards
const MAJOR_ARCANA = [
  'The Fool', 'The Magician', 'The High Priestess', 'The Empress', 'The Emperor',
  'The Hierophant', 'The Lovers', 'The Chariot', 'Strength', 'The Hermit',
  'Wheel of Fortune', 'Justice', 'The Hanged Man', 'Death', 'Temperance',
  'The Devil', 'The Tower', 'The Star', 'The Moon', 'The Sun',
  'Judgement', 'The World'
];

// Minor Arcana ranks and suits
const RANKS = ['Ace', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Page', 'Knight', 'Queen', 'King'];
const SUITS = ['Cups', 'Swords', 'Wands', 'Pentacles'];

// Generate all Minor Arcana cards
const MINOR_ARCANA = RANKS.flatMap(rank => SUITS.map(suit => `${rank} of ${suit}`));

// All cards combined
const ALL_CARDS = [...MAJOR_ARCANA, ...MINOR_ARCANA];

interface TarotCardPickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  'data-testid'?: string;
}

const TarotCardPicker: React.FC<TarotCardPickerProps> = ({
  value,
  onChange,
  placeholder = 'Type or select a card...',
  className,
  'data-testid': testId,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredCards, setFilteredCards] = useState<string[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter cards based on input
  useEffect(() => {
    if (!value.trim()) {
      setFilteredCards([]);
      return;
    }

    const query = value.toLowerCase();
    const matches = ALL_CARDS.filter(card =>
      card.toLowerCase().includes(query)
    ).slice(0, 10); // Limit to 10 suggestions

    setFilteredCards(matches);
    setHighlightedIndex(-1);
  }, [value]);

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setIsOpen(true);
  };

  const handleSelectCard = (card: string) => {
    onChange(card);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || filteredCards.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < filteredCards.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0) {
          handleSelectCard(filteredCards[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  // Check if current value is a valid card name
  const isValidCard = ALL_CARDS.some(
    card => card.toLowerCase() === value.toLowerCase()
  );

  return (
    <div className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            'bg-slate-800/50 border-slate-700 text-white text-sm pr-8',
            isValidCard && 'border-green-500/50',
            className
          )}
          data-testid={testId}
        />
        {isValidCard && (
          <Check className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-green-400" />
        )}
      </div>

      {/* Dropdown */}
      {isOpen && filteredCards.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {filteredCards.map((card, index) => (
            <button
              key={card}
              type="button"
              onClick={() => handleSelectCard(card)}
              className={cn(
                'w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors',
                index === highlightedIndex
                  ? 'bg-purple-500/20 text-white'
                  : 'text-slate-300 hover:bg-slate-700/50'
              )}
            >
              <Sparkles className="w-3 h-3 text-purple-400 flex-shrink-0" />
              <span>{card}</span>
              {MAJOR_ARCANA.includes(card) && (
                <span className="ml-auto text-xs text-purple-400">Major</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Hint when typing a custom card */}
      {isOpen && value.trim() && filteredCards.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-md shadow-lg p-3">
          <p className="text-xs text-slate-400">
            No matching card found. You can enter a custom card name.
          </p>
          <p className="text-xs text-purple-400 mt-1">
            Tip: Standard cards like &quot;The Magician&quot; or &quot;Ace of Cups&quot; will auto-extract symbols.
          </p>
        </div>
      )}
    </div>
  );
};

export default TarotCardPicker;
