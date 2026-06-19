import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Copy, Check, Users, ShieldAlert, Trash2, MailPlus, Eye, Edit2, Lock, Unlock } from 'lucide-react';
import { PublicAccessType } from '../types';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  listId: string;
  publicAccess: PublicAccessType;
  sharedWith: { [email: string]: 'view' | 'edit' };
  password?: string;
  onUpdateSettings: (settings: {
    publicAccess: PublicAccessType;
    password?: string;
  }) => void;
  onInviteUser: (email: string, role: 'view' | 'edit') => void;
  onRevokeUser: (email: string) => void;
}

export function ShareModal({
  isOpen,
  onClose,
  listId,
  publicAccess,
  sharedWith,
  password,
  onUpdateSettings,
  onInviteUser,
  onRevokeUser,
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [inviteRole, setInviteRole] = useState<'view' | 'edit'>('view');
  const [passwordInput, setPasswordInput] = useState(password || '');
  const [isPasswordProtected, setIsPasswordProtected] = useState(!!password);

  const shareUrl = `${window.location.origin}/list/${listId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail) return;
    onInviteUser(cleanEmail, inviteRole);
    setEmailInput('');
  };

  const handlePublicAccessChange = (access: PublicAccessType) => {
    onUpdateSettings({
      publicAccess: access,
      password: isPasswordProtected ? passwordInput.trim() : undefined,
    });
  };

  const handlePasswordToggle = () => {
    const newVal = !isPasswordProtected;
    setIsPasswordProtected(newVal);
    onUpdateSettings({
      publicAccess,
      password: newVal ? passwordInput.trim() || 'pinlist123' : undefined,
    });
    if (newVal && !passwordInput) {
      setPasswordInput('pinlist123');
    }
  };

  const handlePasswordSave = () => {
    onUpdateSettings({
      publicAccess,
      password: isPasswordProtected ? passwordInput.trim() : undefined,
    });
  };

  const hasCollabs = Object.keys(sharedWith).length > 0;

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

          {/* Modal */}
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

            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-800">
              <Users className="w-5 h-5 text-indigo-600" />
              <span>Share this PinList</span>
            </h2>

            {/* Link Sharing Status */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">
                  Link Authorization Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['none', 'view', 'edit'] as const).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => handlePublicAccessChange(level)}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border cursor-pointer transition-all ${
                        publicAccess === level
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {level === 'none' && '🔒 Private'}
                      {level === 'view' && '👁️ View Only'}
                      {level === 'edit' && '✏️ Can Edit'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Shareable Link Input */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                  Shareable Link
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs text-slate-700 focus:outline-none"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    onClick={handleCopy}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer text-white"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" /> Copy Link
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Invite by Email */}
            <div className="border-t border-slate-100 pt-5 mb-6">
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">
                Invite Team Member by Email
              </label>
              <form onSubmit={handleInviteSubmit} className="flex gap-2">
                <input
                  type="email"
                  required
                  placeholder="collaborator@example.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 placeholder-slate-400"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'view' | 'edit')}
                  className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none cursor-pointer text-slate-600 font-medium"
                >
                  <option value="view">Viewer</option>
                  <option value="edit">Editor</option>
                </select>
                <button
                  type="submit"
                  className="p-2.5 bg-slate-100 hover:bg-slate-200 transition-colors rounded-xl text-slate-600 flex items-center justify-center cursor-pointer"
                  title="Invite User"
                >
                  <MailPlus className="w-4 h-4" />
                </button>
              </form>
            </div>

            {/* Shared With List */}
            {hasCollabs && (
              <div className="space-y-2 mb-6 max-h-40 overflow-y-auto scrollbar-thin">
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                  Shared with access list
                </label>
                <div className="space-y-1.5">
                  {Object.entries(sharedWith).map(([email, role]) => (
                    <div
                      key={email}
                      className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold uppercase text-slate-700">
                          {email.substring(0, 2)}
                        </div>
                        <span className="text-xs font-bold text-slate-700">{email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 tracking-wider">
                          {role === 'edit' ? '✏️ Editor' : '👁️ Viewer'}
                        </span>
                        <button
                          onClick={() => onRevokeUser(email)}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Revoke access"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Password Protection */}
            <div className="border-t border-slate-100 pt-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isPasswordProtected ? (
                    <Lock className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Unlock className="w-4 h-4 text-slate-400" />
                  )}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Shield Shared List</h4>
                    <p className="text-[10px] text-slate-500 font-medium">Visitors must input password to enter</p>
                  </div>
                </div>
                <button
                  onClick={handlePasswordToggle}
                  className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                    isPasswordProtected ? 'bg-emerald-500 justify-end' : 'bg-slate-200 justify-start'
                  }`}
                >
                  <motion.div layout className="w-4 h-4 bg-white rounded-full shadow-md" />
                </button>
              </div>

              {isPasswordProtected && (
                <div className="flex gap-2 animate-fadeIn">
                  <input
                    type="text"
                    placeholder="Enter security password..."
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="flex-1 bg-slate-55 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
                  />
                  <button
                    onClick={handlePasswordSave}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-xs font-bold rounded-xl text-white transition-colors cursor-pointer"
                  >
                    Save Key
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-5 mt-6 border-t border-slate-100">
              <button
                onClick={onClose}
                className="px-5 py-2 font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs rounded-xl cursor-pointer transition"
              >
                Close Panel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
