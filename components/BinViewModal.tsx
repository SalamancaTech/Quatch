import React from 'react';
import { Card as CardType } from '../types';
import Card from './Card';

interface BinViewModalProps {
  cards: CardType[];
  onClose: () => void;
}

const BinViewModal: React.FC<BinViewModalProps> = ({ cards, onClose }) => {
  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[250]"
      onClick={onClose}
    >
      <div 
        className="bg-green-900/90 border-2 border-yellow-500/50 rounded-xl shadow-2xl p-4 md:p-6 w-11/12 max-w-4xl max-h-[80vh] flex flex-col animate-prompt-fade-in"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl md:text-3xl font-bold text-yellow-300">Cards in the Bin ({cards.length})</h2>
          <button 
            onClick={onClose}
            className="text-3xl font-bold text-white hover:text-yellow-400 transition-colors"
            aria-label="Close bin view"
          >
            &times;
          </button>
        </div>
        
        {cards.length === 0 ? (
          <p className="text-center text-lg text-gray-300 py-8">The bin is empty.</p>
        ) : (
          <div className="flex-grow overflow-y-auto pr-2 -mr-2">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 md:gap-4">
              {cards.slice().reverse().map(card => (
                <Card key={card.id} card={card} isFaceUp={true} className="w-full h-auto aspect-[5/7]" />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BinViewModal;
