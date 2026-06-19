import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check } from 'lucide-react';
import { CategoryType, ColorType } from '../types';

interface ListFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description: string;
    category: CategoryType;
    emoji: string;
    color: ColorType;
  }) => void;
  initialData?: {
    title: string;
    description: string;
    category: CategoryType;
    emoji: string;
    color: ColorType;
  };
  title: string;
}

const CATEGORIES: { value: CategoryType; label: string }[] = [
  { value: 'grocery', label: '🛒 Grocery List' },
  { value: 'wishlist', label: '✨ Wishlist' },
  { value: 'articles', label: '📚 Articles & Readings' },
  { value: 'custom', label: '📦 Custom Collection' },
];

const COLORS: { value: ColorType; bg: string; hover: string; border: string; text: string }[] = [
  { value: 'slate', bg: 'bg-slate-500', hover: 'hover:bg-slate-600', border: 'border-slate-500', text: 'text-slate-400' },
  { value: 'indigo', bg: 'bg-indigo-500', hover: 'hover:bg-indigo-600', border: 'border-indigo-500', text: 'text-indigo-400' },
  { value: 'blue', bg: 'bg-blue-500', hover: 'hover:bg-blue-600', border: 'border-blue-500', text: 'text-blue-400' },
  { value: 'purple', bg: 'bg-purple-500', hover: 'hover:bg-purple-600', border: 'border-purple-500', text: 'text-purple-400' },
  { value: 'pink', bg: 'bg-pink-500', hover: 'hover:bg-pink-600', border: 'border-pink-500', text: 'text-pink-400' },
  { value: 'red', bg: 'bg-red-500', hover: 'hover:bg-red-600', border: 'border-red-500', text: 'text-red-400' },
  { value: 'orange', bg: 'bg-orange-500', hover: 'hover:bg-orange-600', border: 'border-orange-500', text: 'text-orange-400' },
  { value: 'amber', bg: 'bg-amber-500', hover: 'hover:bg-amber-600', border: 'border-amber-500', text: 'text-amber-400' },
  { value: 'green', bg: 'bg-green-500', hover: 'hover:bg-green-600', border: 'border-green-500', text: 'text-green-400' },
];

const EMOJIS = ['📝', '🛒', '🛍️', '📚', '🎯', '✈️', '💻', '🍕', '🎉', '💡', '🎵', '🍿', '🏋️', '🏠', '🍀', '🌟', '🚀', '🔥'];

export function ListFormModal({ isOpen, onClose, onSubmit, initialData, title }: ListFormModalProps) {
  const [listTitle, setListTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<CategoryType>('custom');
  const [emoji, setEmoji] = useState('📝');
  const [color, setColor] = useState<ColorType>('slate');

  useEffect(() => {
    if (initialData) {
      setListTitle(initialData.title);
      setDescription(initialData.description);
      setCategory(initialData.category);
      setEmoji(initialData.emoji);
      setColor(initialData.color);
    } else {
      setListTitle('');
      setDescription('');
      setCategory('custom');
      setEmoji('📝');
      setColor('slate');
    }
  }, [initialData, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!listTitle.trim()) return;
    onSubmit({
      title: listTitle.trim(),
      description: description.trim(),
      category,
      emoji,
      color,
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl z-10 text-slate-800 max-h-[90vh] overflow-y-auto scrollbar-thin"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold mb-5 flex items-center gap-2 text-slate-800">
              <span>{title}</span>
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                  List Title *
                </label>
                <div className="flex gap-2">
                  {/* Emoji Picker Dropdown Trigger inside input style */}
                  <div className="relative">
                    <select
                      value={emoji}
                      onChange={(e) => setEmoji(e.target.value)}
                      className="appearance-none bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl py-3 px-4 text-xl cursor-pointer text-center w-15 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {EMOJIS.map((em) => (
                        <option key={em} value={em}>
                          {em}
                        </option>
                      ))}
                    </select>
                  </div>

                  <input
                    type="text"
                    required
                    maxLength={100}
                    placeholder="e.g. Weekly Groceries"
                    value={listTitle}
                    onChange={(e) => setListTitle(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 placeholder-slate-400"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  maxLength={300}
                  placeholder="What is this list for? (optional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 h-20 resize-none placeholder-slate-400"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                  Category
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setCategory(cat.value)}
                      className={`py-2 px-3 text-xs text-left font-bold rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                        category === cat.value
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      <span>{cat.label}</span>
                      {category === cat.value && <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color label */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                  Theme Accent Color
                </label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map((col) => (
                    <button
                      key={col.value}
                      type="button"
                      onClick={() => setColor(col.value)}
                      className={`w-8 h-8 rounded-full ${col.bg} ${col.hover} flex items-center justify-center cursor-pointer transition-all ${
                        color === col.value ? 'ring-2 ring-indigo-600 ring-offset-2 scale-110' : 'opacity-85 hover:scale-105'
                      }`}
                      title={col.value}
                    >
                      {color === col.value && <Check className="w-4 h-4 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl cursor-pointer transition px-5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!listTitle.trim()}
                  className="px-4 py-2 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl cursor-pointer transition px-5"
                >
                  {initialData ? 'Save Changes' : 'Create List'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
