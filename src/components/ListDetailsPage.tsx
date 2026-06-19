import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  getDocs,
  orderBy,
  limit,
  setDoc
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { List, ListItem, ActivityLog, UserPresence, ColorType, PublicAccessType, CategoryType } from '../types';
import { ShareModal } from './ShareModal';
import { ListFormModal } from './ListFormModal';
import { 
  ArrowLeft, 
  Pin, 
  Share2, 
  Plus, 
  Check, 
  Trash2, 
  CornerDownRight, 
  Activity, 
  Users, 
  Lock, 
  Unlock, 
  Printer, 
  Copy, 
  Settings, 
  Link2,
  ListFilter,
  Eye,
  Edit,
  Sliders
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ListDetailsPageProps {
  listId: string;
  onBack: () => void;
}

const ACCENT_COLORS: { [key in ColorType]: { border: string; bg: string; text: string; ring: string; lightBg: string } } = {
  slate: { border: 'border-slate-200', bg: 'bg-slate-50', text: 'text-slate-700', ring: 'ring-slate-200', lightBg: 'bg-white' },
  indigo: { border: 'border-indigo-100', bg: 'bg-indigo-50/40', text: 'text-indigo-600', ring: 'ring-indigo-100', lightBg: 'bg-white' },
  blue: { border: 'border-blue-100', bg: 'bg-blue-50/40', text: 'text-blue-600', ring: 'ring-blue-100', lightBg: 'bg-white' },
  purple: { border: 'border-purple-100', bg: 'bg-purple-50/40', text: 'text-purple-600', ring: 'ring-purple-100', lightBg: 'bg-white' },
  pink: { border: 'border-pink-100', bg: 'bg-pink-50/40', text: 'text-pink-600', ring: 'ring-pink-100', lightBg: 'bg-white' },
  red: { border: 'border-red-100', bg: 'bg-red-50/40', text: 'text-red-600', ring: 'ring-red-100', lightBg: 'bg-white' },
  orange: { border: 'border-orange-100', bg: 'bg-orange-50/40', text: 'text-orange-600', ring: 'ring-orange-100', lightBg: 'bg-white' },
  amber: { border: 'border-amber-100', bg: 'bg-amber-50/40', text: 'text-amber-600', ring: 'ring-amber-100', lightBg: 'bg-white' },
  green: { border: 'border-emerald-100', bg: 'bg-emerald-50/40', text: 'text-emerald-600', ring: 'ring-emerald-100', lightBg: 'bg-white' },
};

export function ListDetailsPage({ listId, onBack }: ListDetailsPageProps) {
  const [list, setList] = useState<List | null>(null);
  const [listDocId, setListDocId] = useState<string | null>(null);
  const [items, setItems] = useState<ListItem[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [presences, setPresences] = useState<UserPresence[]>([]);
  
  // Local state for adding items
  const [inputTitle, setInputTitle] = useState('');
  const [inputNote, setInputNote] = useState('');
  const [inputQty, setInputQty] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [isExpandAdd, setIsExpandAdd] = useState(false);

  // Locked List support
  const [passwordState, setPasswordState] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  // Modals state
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'items' | 'activity'>('items');

  // Search/filter items
  const [itemFilter, setItemFilter] = useState<'all' | 'active' | 'completed'>('all');

  const dragItemRef = useRef<number | null>(null);
  const myPresenceIdRef = useRef<string>(Math.random().toString(36).substring(2, 11));

  const currentUser = auth.currentUser;
  const userNick = currentUser?.displayName || currentUser?.email || 'Guest Visitor';
  const userEmail = currentUser?.email || 'anonymous@visitor.com';

  // Deduplicate active presences by email so if a single user has multiple tabs,
  // stale heartbeat records, or multiple session IDs, they are only counted/shown once.
  const uniquePresences = useMemo(() => {
    const seen = new Set<string>();
    return presences.filter((p) => {
      if (!p.email) return false;
      const key = p.email.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [presences]);

  // 1. Subscribe to List Document
  useEffect(() => {
    const docRef = doc(db, 'lists', listId);
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (!snapshot.exists()) {
        setList(null);
        setListDocId(null);
        return;
      }
      const docData = snapshot.data() as List;
      setList(docData);
      setListDocId(snapshot.id);

      // Lock status management
      if (!docData.password || docData.ownerId === currentUser?.uid || sessionStorage.getItem(`unlocked_${listId}`) === 'true') {
        setIsUnlocked(true);
      }
    }, (error) => {
      console.error("Error listening to list doc details:", error);
    });

    return () => unsubscribe();
  }, [listId, currentUser]);

  // 2. Subscribe to subcollections (items, activity, presence) once listDocId is retrieved
  useEffect(() => {
    if (!listDocId || !isUnlocked) return;

    // A. Subscriptions for items
    const itemsQuery = query(collection(db, 'lists', listDocId, 'items'), orderBy('order', 'asc'));
    const unsubItems = onSnapshot(itemsQuery, (snapshot) => {
      const dbItems = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as ListItem[];
      setItems(dbItems);
    }, (error) => {
      console.error("Error listening to items:", error);
    });

    // B. Subscriptions for activities (limit to 40 most recent logs)
    const logsQuery = query(collection(db, 'lists', listDocId, 'activities'), orderBy('timestamp', 'desc'), limit(40));
    const unsubLogs = onSnapshot(logsQuery, (snapshot) => {
      const dbLogs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as ActivityLog[];
      setActivities(dbLogs);
    }, (error) => {
      console.error("Error listening to activities:", error);
    });

    // C. Subscriptions for active visitor presences
    const presenceQuery = query(collection(db, 'lists', listDocId, 'presences'));
    const unsubPresence = onSnapshot(presenceQuery, (snapshot) => {
      const dbPresence = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as UserPresence[];
      
      // Filter out stale presences on client (older than 40 seconds)
      const now = Date.now();
      const activePresences = dbPresence.filter((p) => {
        if (!p.lastActive) return true;
        const ts = p.lastActive.toMillis ? p.lastActive.toMillis() : new Date(p.lastActive).getTime();
        return now - ts < 40000;
      });
      setPresences(activePresences);
    }, (error) => {
      console.error("Error listening to presence:", error);
    });

    // D. Heartbeat loop to keep visitor presence alive in list
    const sessionPresenceId = myPresenceIdRef.current;
    const writePresence = async () => {
      try {
        await setDoc(doc(db, 'lists', listDocId, 'presences', sessionPresenceId), {
          id: sessionPresenceId,
          email: userNick,
          lastActive: serverTimestamp()
        });
      } catch (e) {
        console.warn("Presence registration notice (common on public load):", e);
      }
    };

    writePresence();
    const interval = setInterval(writePresence, 20000);

    return () => {
      unsubItems();
      unsubLogs();
      unsubPresence();
      clearInterval(interval);
      // Clean up presence on unmount
      try {
        deleteDoc(doc(db, 'lists', listDocId, 'presences', sessionPresenceId));
      } catch (e) {}
    };
  }, [listDocId, isUnlocked, userNick]);

  const hasEditAccess = () => {
    if (!list) return false;
    if (list.ownerId === currentUser?.uid) return true;
    if (list.publicAccess === 'edit') return true;
    if (currentUser?.email && list.sharedWith[currentUser.email.toLowerCase()] === 'edit') return true;
    return false;
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (list && passwordState.trim() === list.password) {
      setIsUnlocked(true);
      setPasswordError(false);
      sessionStorage.setItem(`unlocked_${listId}`, 'true');
    } else {
      setPasswordError(true);
    }
  };

  // Log action to activity subcollection
  const logActivity = async (action: string, details: string) => {
    if (!listDocId) return;
    try {
      const actId = doc(collection(db, 'lists', listDocId, 'activities')).id;
      await setDoc(doc(db, 'lists', listDocId, 'activities', actId), {
        id: actId,
        userId: currentUser?.uid || 'anonymous',
        userEmail: userNick,
        action,
        details,
        timestamp: serverTimestamp()
      });
    } catch (e) {
      console.warn("Log activity restricted by rules", e);
    }
  };

  // ADD ITEM
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasEditAccess() || !listDocId) return;
    if (!inputTitle.trim()) return;

    try {
      const nextOrder = items.length > 0 ? Math.max(...items.map((i) => i.order || 0)) + 1 : 1;
      const itemId = doc(collection(db, 'lists', listDocId, 'items')).id;
      const newItem: Omit<ListItem, 'createdAt'> = {
        id: itemId,
        title: inputTitle.trim(),
        completed: false,
        order: nextOrder,
        updatedBy: userNick
      };

      if (inputNote.trim()) {
        newItem.note = inputNote.trim();
      }
      if (inputQty.trim()) {
        newItem.quantity = inputQty.trim();
      }
      if (inputUrl.trim()) {
        newItem.url = inputUrl.trim();
      }

      await setDoc(doc(db, 'lists', listDocId, 'items', itemId), {
        ...newItem,
        createdAt: serverTimestamp()
      });

      // Clear input fields
      setInputTitle('');
      setInputNote('');
      setInputQty('');
      setInputUrl('');
      setIsExpandAdd(false);

      logActivity('add', `Added checklist item: "${newItem.title}"`);
    } catch (err) {
      console.error("Error adding item:", err);
    }
  };

  // TOGGLE COMPLETED
  const handleToggleCompleted = async (item: ListItem) => {
    if (!hasEditAccess() || !listDocId) return;
    try {
      await updateDoc(doc(db, 'lists', listDocId, 'items', item.id), {
        completed: !item.completed,
        completedBy: !item.completed ? userNick : null,
        completedAt: !item.completed ? serverTimestamp() : null
      });

      logActivity(
        !item.completed ? 'complete' : 'uncomplete',
        `${!item.completed ? 'Checked off' : 'Reopened'} item: "${item.title}"`
      );
    } catch (e) {
      console.error(e);
    }
  };

  // DELETE CHECKLIST ITEM
  const handleDeleteItem = async (itemId: string, titleStr: string) => {
    if (!hasEditAccess() || !listDocId) return;
    try {
      await deleteDoc(doc(db, 'lists', listDocId, 'items', itemId));
      logActivity('delete', `Erased item: "${titleStr}"`);
    } catch (e) {
      console.error(e);
    }
  };

  // HTML5 Drag and Drop Handlers for Reordering
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!hasEditAccess()) {
      e.preventDefault();
      return;
    }
    dragItemRef.current = index;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    const sourceIndex = dragItemRef.current;
    if (sourceIndex === null || sourceIndex === targetIndex || !listDocId || !hasEditAccess()) return;

    // Create a copy of the items list and reorder locally
    const reordered = [...items];
    const [movedItem] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, movedItem);

    // Reset ref
    dragItemRef.current = null;

    // Update orders in the array to resolve overlapping bounds
    try {
      for (let i = 0; i < reordered.length; i++) {
        const itemToUpdate = reordered[i];
        const newOrder = i + 1;
        if (itemToUpdate.order !== newOrder) {
          await updateDoc(doc(db, 'lists', listDocId, 'items', itemToUpdate.id), {
            order: newOrder
          });
        }
      }
      logActivity('reorder', `Reordered the checklist layout`);
    } catch (err) {
      console.error('Error saving reordered item orders:', err);
    }
  };

  // UPDATE LIST SETTINGS
  const handleUpdateSettings = async (settings: {
    publicAccess: PublicAccessType;
    password?: string;
  }) => {
    if (!listDocId || !list || list.ownerId !== currentUser?.uid) return;
    try {
      await updateDoc(doc(db, 'lists', listDocId), {
        publicAccess: settings.publicAccess,
        password: settings.password || null,
        updatedAt: serverTimestamp()
      });
      logActivity('update_settings', `Updated sharing authorization structure`);
    } catch (err) {
      console.error(err);
    }
  };

  // INVITE USER
  const handleInviteUser = async (email: string, role: 'view' | 'edit') => {
    if (!listDocId || !list || list.ownerId !== currentUser?.uid) return;
    try {
      const cleanEmail = email.trim().toLowerCase();
      const updatedShared = { ...list.sharedWith, [cleanEmail]: role };
      await updateDoc(doc(db, 'lists', listDocId), {
        sharedWith: updatedShared,
        updatedAt: serverTimestamp()
      });
      logActivity('update_settings', `Shared access to workspace member: ${cleanEmail}`);
    } catch (err) {
      console.error(err);
    }
  };

  // REVOKE USER
  const handleRevokeUser = async (email: string) => {
    if (!listDocId || !list || list.ownerId !== currentUser?.uid) return;
    try {
      const cleanEmail = email.trim().toLowerCase();
      const updatedShared = { ...list.sharedWith };
      delete updatedShared[cleanEmail];
      await updateDoc(doc(db, 'lists', listDocId), {
        sharedWith: updatedShared,
        updatedAt: serverTimestamp()
      });
      logActivity('update_settings', `Revoked access of team member: ${cleanEmail}`);
    } catch (err) {
      console.error(err);
    }
  };

  // UPDATE MAIN DETAILS (FROM EDIT FORM)
  const handleUpdateListDetails = async (data: {
    title: string;
    description: string;
    category: CategoryType;
    emoji: string;
    color: ColorType;
  }) => {
    if (!listDocId || !list || list.ownerId !== currentUser?.uid) return;
    try {
      await updateDoc(doc(db, 'lists', listDocId), {
        title: data.title,
        description: data.description,
        category: data.category,
        emoji: data.emoji,
        color: data.color,
        updatedAt: serverTimestamp()
      });
      logActivity('update_settings', `Amended list profile details to: "${data.title}"`);
    } catch (e) {
      console.error(e);
    }
  };

  // EXPORT TO PLAIN TEXT
  const handleExportText = () => {
    if (!list) return;
    const completedCount = items.filter((i) => i.completed).length;
    const itemsHeader = `🧾 PINLIST: ${list.emoji} ${list.title}\nDescription: ${list.description || 'No description'}\nCreated by: ${list.ownerEmail}\nCompleted: ${completedCount}/${items.length} items\n` + '─'.repeat(40) + '\n\n';
    
    const itemsListStrs = items.map((i) => {
      const box = i.completed ? '[X]' : '[ ]';
      const qtyStr = i.quantity ? ` (Qty: ${i.quantity})` : '';
      const noteStr = i.note ? `\n    Note: ${i.note}` : '';
      const urlStr = i.url ? `\n    Link: ${i.url}` : '';
      return `${box} ${i.title}${qtyStr}${noteStr}${urlStr}`;
    }).join('\n\n');

    const combinedBlob = new Blob([itemsHeader + itemsListStrs], { type: 'text/plain;charset=utf-8' });
    const dynamicUrl = URL.createObjectURL(combinedBlob);
    const linkEl = document.createElement('a');
    linkEl.href = dynamicUrl;
    linkEl.download = `${list.title.replace(/\s+/g, '_')}_list.txt`;
    linkEl.click();
    URL.revokeObjectURL(dynamicUrl);
  };

  // EXPORT TO PDF VIA PRINT
  const handlePrint = () => {
    window.print();
  };

  // LOADING PREVIEW
  if (!list) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center text-slate-600 p-6">
        <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
        <p className="text-xs font-sans font-medium text-slate-500">Connecting to secure share portal...</p>
        <button
          onClick={onBack}
          className="mt-6 text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
        >
          Go Back Dashboard
        </button>
      </div>
    );
  }

  // PASS LOCKED SCREEN
  if (list && !isUnlocked) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm p-8 bg-white border border-slate-200 rounded-2xl shadow-xl text-center flex flex-col items-center"
        >
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mb-4 border border-emerald-100">
            <Lock className="w-5 h-5 animate-pulse" />
          </div>
          <h2 className="text-lg font-display font-semibold text-slate-800">Password Shield Enabled</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xs">
            The owner has secured this collaborative list. Provide the key to access checklist items.
          </p>

          <form onSubmit={handlePasswordSubmit} className="mt-6 w-full space-y-3.5">
            <input
              type="password"
              placeholder="Enter secure passcode..."
              value={passwordState}
              onChange={(e) => setPasswordState(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl py-3 px-4 text-xs focus:ring-2 focus:ring-emerald-500 text-slate-800 placeholder-slate-400 text-center focus:outline-none"
            />
            {passwordError && (
              <p className="text-[10px] text-red-600 font-bold uppercase tracking-wider animate-bounce">
                ❌ Wrong passcode token
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onBack}
                className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold rounded-xl text-slate-600 cursor-pointer"
              >
                Exit Portal
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold rounded-xl text-white cursor-pointer"
              >
                Access Portal
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    );
  }

  // Active theme style
  const theme = ACCENT_COLORS[list.color] || ACCENT_COLORS.slate;
  const filteredItems = items.filter((item) => {
    if (itemFilter === 'active') return !item.completed;
    if (itemFilter === 'completed') return item.completed;
    return true;
  });

  const activeCount = items.filter((i) => !i.completed).length;
  const compCount = items.filter((i) => i.completed).length;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-850 pb-20 print:bg-white print:text-black">
      {/* Header bar and info bar */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40 px-6 py-4 print:hidden">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer bg-slate-50 py-1.5 px-3 rounded-lg hover:bg-slate-100 border border-slate-200 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          <div className="flex items-center gap-2">
            {/* Live presence count bubble */}
            <div className="bg-slate-50 border border-slate-200 px-2 sm:px-3 py-1.5 rounded-lg flex items-center gap-1 sm:gap-1.5" title={`${uniquePresences.length} online`}>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block shadow-sm" />
              <span className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider font-mono">
                {uniquePresences.length} <span className="hidden sm:inline">{uniquePresences.length === 1 ? 'viewer' : 'viewers'} online</span>
                <span className="sm:hidden">live</span>
              </span>
            </div>

            {list.ownerId === currentUser?.uid && (
              <>
                <button
                  onClick={() => setIsEditOpen(true)}
                  className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-700 transition-colors cursor-pointer border border-slate-200"
                  title="List Settings"
                >
                  <Sliders className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsShareOpen(true)}
                  className="p-2 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-lg text-indigo-700 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer shadow-sm"
                  title="Share portal"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Contents */}
      <main className="max-w-4xl mx-auto px-6 mt-8 space-y-6">
        
        {/* Printable/PDF custom header */}
        <div className="hidden print:block mb-8">
          <h1 className="text-3xl font-bold">{list.emoji} {list.title}</h1>
          <p className="text-sm text-gray-600 mt-1">{list.description}</p>
          <div className="text-xs text-gray-500 mt-4 flex justify-between">
            <span>List URL: {window.location.origin}/list/{list.id}</span>
            <span>Unfinished: {activeCount} | Completed: {compCount}</span>
          </div>
        </div>

        {/* List card profile widget */}
        <div className={`p-6 sm:p-8 rounded-2xl border ${theme.border} bg-white shadow-lg shadow-slate-100/50 relative overflow-hidden transition-all print:hidden`}>
          {/* Top Emoji badge */}
          <div className="absolute right-6 top-6 text-5xl opacity-35 select-none select-all-none">
            {list.emoji || '📋'}
          </div>

          <div className="flex flex-col gap-2 relative z-10">
            <span className={`text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full border ${theme.border} w-fit ${theme.text} bg-slate-50`}>
              {list.category}
            </span>
            <div className="flex items-center gap-2.5 mt-2">
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-800 uppercase tracking-tight">
                {list.title}
              </h1>
              {!hasEditAccess() ? (
                <span className="bg-red-50 text-red-600 shrink-0 border border-red-100 rounded-full px-2 py-0.5 text-[9px] uppercase tracking-widest font-semibold flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> View Only
                </span>
              ) : (
                <span className="bg-emerald-50 text-emerald-600 shrink-0 border border-emerald-100 rounded-full px-2 py-0.5 text-[9px] uppercase tracking-widest font-semibold flex items-center gap-1">
                  <Eye className="w-2.5 h-2.5" /> Collab Access
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 max-w-xl">
              {list.description || 'Welcome to this checklist space. Add items and watch updates stream in.'}
            </p>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6 pt-5 border-t border-slate-100 text-xs text-slate-400 font-mono">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-slate-500">
                <span className="flex items-center gap-1">
                  Owner: <span className="text-slate-700 font-semibold truncate max-w-[130px] sm:max-w-xs">{list.ownerEmail}</span>
                </span>
                <span className="text-slate-350 shrink-0">•</span>
                <span className="text-indigo-600 font-semibold shrink-0">
                  {activeCount} active 
                </span>
                <span className="text-slate-350 shrink-0">•</span>
                <span className="text-emerald-600 font-semibold shrink-0">
                  {compCount} done
                </span>
              </div>
              
              <div className="flex gap-1.5 font-sans justify-end">
                <button
                  onClick={handleExportText}
                  className="p-1 px-2.5 hover:bg-slate-100 bg-slate-50 border border-slate-200 rounded-lg text-[10px] uppercase font-bold tracking-wider text-slate-600 hover:text-slate-850 transition cursor-pointer shadow-sm flex items-center gap-1 whitespace-nowrap"
                  title="Plain Text Export"
                >
                  <Copy className="w-3 h-3" /> Plain Text
                </button>
                <button
                  onClick={handlePrint}
                  className="p-1 px-2.5 hover:bg-slate-100 bg-slate-50 border border-slate-200 rounded-lg text-[10px] uppercase font-bold tracking-wider text-slate-600 hover:text-slate-850 transition cursor-pointer shadow-sm flex items-center gap-1 whitespace-nowrap"
                  title="PDF Print layout"
                >
                  <Printer className="w-3 h-3" /> Export PDF
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 print:hidden pb-1 sm:pb-px gap-3">
          <div className="flex">
            <button
              onClick={() => setActiveTab('items')}
              className={`pb-3 px-3 sm:px-5 text-xs sm:text-sm font-semibold relative transition ${
                activeTab === 'items' ? 'text-indigo-600 font-bold' : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              Checklist Items
              {activeTab === 'items' && (
                <motion.div layoutId="activeTabBr" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`pb-3 px-3 sm:px-5 text-xs sm:text-sm font-semibold relative transition flex items-center gap-1 ${
                activeTab === 'activity' ? 'text-indigo-600 font-bold' : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Activity Log</span>
              {activeTab === 'activity' && (
                <motion.div layoutId="activeTabBr" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
              )}
            </button>
          </div>

          {/* Active Present Users Icons on right */}
          {uniquePresences.length > 0 && (
            <div className="flex items-center gap-1.5 mb-2 sm:mb-0 mr-2 self-end sm:self-auto">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mr-1 sm:block hidden">Active Viewers:</span>
              <div className="flex -space-x-2 overflow-hidden">
                {uniquePresences.slice(0, 4).map((p) => (
                  <div
                    key={p.id}
                    className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-indigo-600 border-2 border-white flex items-center justify-center text-[8px] sm:text-[10px] font-bold text-white uppercase"
                    title={p.email}
                  >
                    {p.email.substring(0, 2)}
                  </div>
                ))}
                {uniquePresences.length > 4 && (
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[7px] sm:text-[8px] font-bold text-slate-500">
                    +{uniquePresences.length - 4}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Tab Cont: CHECKLIST ITEMS */}
        {activeTab === 'items' && (
          <div className="space-y-4">
            
            {/* Quick add input block (only if editor) */}
            {hasEditAccess() ? (
              <form onSubmit={handleAddItem} className="space-y-2 bg-white p-4 rounded-xl border border-slate-200 shadow-sm print:hidden">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <input
                      type="text"
                      required
                      placeholder="⚡ Fast add item name (e.g. Apples) or link..."
                      value={inputTitle}
                      onChange={(e) => setInputTitle(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 text-slate-850 placeholder-slate-400 focus:outline-none min-w-0"
                    />
                    <button
                      type="button"
                      onClick={() => setIsExpandAdd(!isExpandAdd)}
                      className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer shrink-0 ${
                        isExpandAdd ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {isExpandAdd ? 'Close' : '+ Details'}
                    </button>
                  </div>
                  <button
                    type="submit"
                    className="py-2.5 sm:py-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-white font-bold flex items-center justify-center cursor-pointer transition-all active:scale-95 px-4 text-xs shrink-0 whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add Item
                  </button>
                </div>

                <AnimatePresence>
                  {isExpandAdd && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden pt-2 grid grid-cols-1 sm:grid-cols-3 gap-2.5"
                    >
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wider">Item note</label>
                        <input
                          type="text"
                          placeholder="e.g. Organic, Fuji preferred"
                          value={inputNote}
                          onChange={(e) => setInputNote(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs focus:ring-1 focus:ring-indigo-500 text-slate-800 focus:outline-none placeholder-slate-400"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wider">Qty / Amount</label>
                        <input
                          type="text"
                          placeholder="e.g. 1 bag, 3 lbs"
                          value={inputQty}
                          onChange={(e) => setInputQty(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs focus:ring-1 focus:ring-indigo-500 text-slate-800 focus:outline-none placeholder-slate-400"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wider">Optional link to article/item</label>
                        <input
                          type="text"
                          placeholder="https://example.com"
                          value={inputUrl}
                          onChange={(e) => setInputUrl(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs focus:ring-1 focus:ring-indigo-500 text-slate-800 focus:outline-none placeholder-slate-400"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </form>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-xs flex items-center justify-center gap-2 print:hidden select-none select-all-none">
                <Lock className="w-3.5 h-3.5 text-indigo-600" />
                <span>You are in view-only portal mode. Request edit rights to edit this check board.</span>
              </div>
            )}

            {/* Checklist items filter */}
            <div className="flex items-center justify-between py-1 print:hidden">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest select-none select-all-none">Show items:</span>
                {(['all', 'active', 'completed'] as const).map((filterVal) => (
                  <button
                    key={filterVal}
                    onClick={() => setItemFilter(filterVal)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold tracking-wider uppercase cursor-pointer ${
                      itemFilter === filterVal ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {filterVal === 'all' && `All (${items.length})`}
                    {filterVal === 'active' && `Active (${activeCount})`}
                    {filterVal === 'completed' && `Collected (${compCount})`}
                  </button>
                ))}
              </div>

              {hasEditAccess() && (
                <span className="text-[10px] text-slate-400 select-none select-all-none italic hidden sm:block">
                  💡 Drag & drop items vertically to adjust list priority ordering
                </span>
              )}
            </div>

            {/* List rendered */}
            {filteredItems.length === 0 ? (
              <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 border-dashed shadow-sm">
                <p className="text-sm font-semibold text-slate-700">Empty Checklist</p>
                <p className="text-xs text-slate-500 mt-0.5">There are no items currently matching this view scope.</p>
              </div>
            ) : (
              <div className="space-y-3 print:space-y-1">
                {filteredItems.map((item, index) => (
                  <div
                    key={item.id}
                    draggable={hasEditAccess()}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, index)}
                    className={`flex items-start justify-between p-4 rounded-xl border border-slate-200 bg-white shadow-sm group select-none select-all-none hover:border-slate-300 transition-all cursor-${hasEditAccess() ? 'grab active:grabbing' : 'default'} print:border-none print:py-1 print:p-0`}
                  >
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      {/* Checkbox */}
                      <button
                        type="button"
                        disabled={!hasEditAccess()}
                        onClick={() => handleToggleCompleted(item)}
                        className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 cursor-pointer disabled:cursor-not-allowed transition-all ${
                          item.completed 
                            ? 'bg-indigo-600 border-indigo-600 text-white' 
                            : 'border-slate-300 hover:border-slate-400 bg-slate-50'
                        }`}
                      >
                        {item.completed && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                      </button>

                      {/* Content block */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className={`text-sm font-semibold flex-1 focus:outline-none min-w-[120px] ${
                            item.completed ? 'line-through text-slate-400 font-normal' : 'text-slate-850'
                          }`}>
                            {item.title}
                          </p>

                          {item.quantity && (
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-full text-indigo-700 font-mono tracking-wide">
                              Qty: {item.quantity}
                            </span>
                          )}

                          {item.url && (
                            <a
                              href={item.url.startsWith('http') ? item.url : `https://${item.url}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1 px-1.5 rounded bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                              title={item.url}
                            >
                              <Link2 className="w-3 h-3" /> Visit Site
                            </a>
                          )}
                        </div>

                        {item.note && (
                          <p className={`text-xs mt-1 block max-w-xl font-medium ${item.completed ? 'text-slate-400 line-through' : 'text-slate-500'}`}>
                            ↳ {item.note}
                          </p>
                        )}

                        {/* Completed info line */}
                        {item.completed && item.completedBy && (
                          <span className="text-[9px] text-indigo-700 font-mono select-none block mt-1.5 uppercase font-bold">
                            Collected by: {item.completedBy}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Delete item button (only if editor) */}
                    {hasEditAccess() && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id, item.title); }}
                        className="p-1.5 ml-2 text-slate-400 hover:text-red-650 hover:bg-red-50 rounded-lg lg:opacity-0 group-hover:opacity-100 transition-all duration-150 cursor-pointer print:hidden shrink-0 opacity-100"
                        title="Delete checklist item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab Cont: ACTIVITY LOGS */}
        {activeTab === 'activity' && (
          <div className="space-y-4 print:hidden animate-fadeIn">
            {activities.length === 0 ? (
              <div className="p-12 text-center text-slate-500 bg-white border border-slate-200 border-dashed rounded-2xl shadow-sm select-none select-all-none">
                <p className="text-sm font-semibold text-slate-700">No actions logged yet</p>
                <p className="text-xs text-slate-500 mt-0.5">Interaction records will stream in here as actions are performed.</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[60vh] overflow-y-auto scrollbar-thin pr-1 pb-4">
                {activities.map((act) => (
                  <div
                    key={act.id}
                    className="p-3 bg-white border border-slate-200 rounded-xl flex items-start gap-3 text-xs shadow-sm"
                  >
                    <div className="w-6 h-6 rounded-full bg-slate-100 text-indigo-700 shrink-0 flex items-center justify-center font-bold font-mono">
                      {act.userEmail.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 text-slate-500 font-medium">
                        <span className="text-slate-750 font-bold truncate max-w-sm">{act.userEmail}</span>
                        <span className="text-[10px] font-mono shrink-0">
                          {act.timestamp ? new Date(act.timestamp.toMillis ? act.timestamp.toMillis() : act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Just now'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 flex items-center gap-1.5">
                        <span className="bg-slate-55 border border-slate-200 text-slate-500 px-1.5 py-0.5 text-[9px] rounded font-bold uppercase shrink-0 font-mono">
                          {act.action}
                        </span>
                        <span className="truncate">{act.details}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      {/* Share Modal Dialog with public/email access settings */}
      {list.ownerId === currentUser?.uid && (
        <ShareModal
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          listId={list.id}
          publicAccess={list.publicAccess}
          sharedWith={list.sharedWith}
          password={list.password}
          onUpdateSettings={handleUpdateSettings}
          onInviteUser={handleInviteUser}
          onRevokeUser={handleRevokeUser}
        />
      )}

      {/* Edit List Settings metadata (emoji, category, color, etc) */}
      {list.ownerId === currentUser?.uid && (
        <ListFormModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          onSubmit={handleUpdateListDetails}
          initialData={{
            title: list.title,
            description: list.description,
            category: list.category,
            emoji: list.emoji,
            color: list.color,
          }}
          title="Edit Collection Settings"
        />
      )}
    </div>
  );
}
