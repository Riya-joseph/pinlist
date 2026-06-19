import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  doc, 
  setDoc,
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { List, CategoryType, ColorType, PublicAccessType } from '../types';
import { ListFormModal } from './ListFormModal';
import { 
  Pin, 
  Trash2, 
  Archive, 
  ArchiveRestore,
  Copy, 
  FolderPlus, 
  Search, 
  Filter, 
  ExternalLink, 
  Lock, 
  Unlock, 
  LogOut,
  SlidersHorizontal,
  ChevronRight,
  PinOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DashboardProps {
  onSelectList: (id: string) => void;
}

const BG_COLOR_ACCENTS: { [key in ColorType]: string } = {
  slate: 'border-slate-200 hover:border-slate-400 bg-white shadow-sm hover:shadow-md transition-shadow duration-200',
  indigo: 'border-slate-200 hover:border-indigo-400 bg-white shadow-sm hover:shadow-md transition-shadow duration-200',
  blue: 'border-slate-200 hover:border-blue-400 bg-white shadow-sm hover:shadow-md transition-shadow duration-200',
  purple: 'border-slate-200 hover:border-purple-400 bg-white shadow-sm hover:shadow-md transition-shadow duration-200',
  pink: 'border-slate-200 hover:border-pink-400 bg-white shadow-sm hover:shadow-md transition-shadow duration-200',
  red: 'border-slate-200 hover:border-red-400 bg-white shadow-sm hover:shadow-md transition-shadow duration-200',
  orange: 'border-slate-200 hover:border-orange-400 bg-white shadow-sm hover:shadow-md transition-shadow duration-200',
  amber: 'border-slate-200 hover:border-amber-400 bg-white shadow-sm hover:shadow-md transition-shadow duration-200',
  green: 'border-slate-200 hover:border-emerald-400 bg-white shadow-sm hover:shadow-md transition-shadow duration-200',
};

const TEXT_COLOR_ACCENTS: { [key in ColorType]: string } = {
  slate: 'text-slate-600',
  indigo: 'text-indigo-600',
  blue: 'text-blue-600',
  purple: 'text-purple-600',
  pink: 'text-pink-600',
  red: 'text-red-600',
  orange: 'text-orange-600',
  amber: 'text-amber-600',
  green: 'text-emerald-600',
};

const EMBED_DOT_COLORS: { [key in ColorType]: string } = {
  slate: 'bg-slate-400',
  indigo: 'bg-indigo-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  pink: 'bg-pink-500',
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  amber: 'bg-amber-500',
  green: 'bg-emerald-500',
};

export function Dashboard({ onSelectList }: DashboardProps) {
  const [lists, setLists] = useState<List[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | CategoryType>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(auth.currentUser);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsub();
  }, []);

  // Fetch / Subscribe to lists
  useEffect(() => {
    if (!currentUser) {
      setLists([]);
      return;
    }

    // Since we want lists owned by me or shared with me by email,
    // let's fetch owned lists and lists where I am invited.
    const ownedQuery = query(
      collection(db, 'lists'),
      where('ownerId', '==', currentUser.uid)
    );

    // Subscribe to owned queries
    const unsubscribeOwned = onSnapshot(ownedQuery, (snapshot) => {
      const ownedLists = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as List[];

      // Now query shared lists. Because composite queries can require simple fields,
      // let's do a simple dynamic query or fetch lists with ownerId != currentUserId from firestore list and aggregate them.
      // Alternatively, we can let Firestore filter shared lists.
      // But a simple loop of owned + shared is perfect.
      setLists((prev) => {
        // Keep those not owned
        const shared = prev.filter((l) => l.ownerId !== currentUser.uid);
        const merged = [...ownedLists, ...shared];
        // Remove duplicates just in case
        const unique = merged.filter((item, index, self) =>
          self.findIndex((t) => t.id === item.id) === index
        );
        return unique;
      });
    }, (error) => {
      console.error("Error fetching owned lists:", error);
    });

    // Query Lists shared with user's email
    let unsubscribeShared = () => {};
    if (currentUser.email) {
      const emailPathStr = currentUser.email.toLowerCase();
      // Using a simpler client query to check lists that are sharedWith this email
      // To bypass simple filter bounds we can query collection lists and filter on client, Or query direct.
      // Let's execute a subscriber for lists where publicAccess == 'edit' or email is in sharedWith
      // But query lists and filter on client is scalable if lists collections is modest.
      // Let's subscribe to shared lists where ownerId is not me by polling or querying.
      // A query:lists with ownerId != user.uid
      // However Firestore rules only allow fetching listed documents.
      // To allow fetching shared documents securely, we can do a query:
      const sharedQuery = query(
        collection(db, 'lists'),
        where(`sharedWith.${emailPathStr}`, 'in', ['view', 'edit'])
      );

      unsubscribeShared = onSnapshot(sharedQuery, (snapshot) => {
        const sharedLists = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        })) as List[];

        setLists((prev) => {
          const owned = prev.filter((l) => l.ownerId === currentUser?.uid);
          const merged = [...owned, ...sharedLists];
          const unique = merged.filter((item, index, self) =>
            self.findIndex((t) => t.id === item.id) === index
          );
          return unique;
        });
      }, (error) => {
        console.warn("Shared lists query notice (common if empty):", error);
      });
    }

    return () => {
      unsubscribeOwned();
      unsubscribeShared();
    };
  }, [currentUser]);

  const handleCreateList = async (data: {
    title: string;
    description: string;
    category: CategoryType;
    emoji: string;
    color: ColorType;
  }) => {
    if (!currentUser) return;
    try {
      const id = doc(collection(db, 'lists')).id;
      const newList: Omit<List, 'createdAt' | 'updatedAt'> = {
        id,
        ownerId: currentUser.uid,
        ownerEmail: currentUser.email || 'anonymous',
        title: data.title,
        description: data.description,
        category: data.category,
        emoji: data.emoji,
        color: data.color,
        pinnedBy: [],
        sharedWith: {},
        publicAccess: 'none',
        isArchived: false,
      };

      await setDoc(doc(db, 'lists', id), {
        ...newList,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Automatically select and direct the user to the newly created list so they can add items/contents
      onSelectList(id);
    } catch (err) {
      console.error("Error creating list:", err);
    }
  };

  const handleTogglePin = async (e: React.MouseEvent, list: List) => {
    e.stopPropagation();
    if (!currentUser) return;
    
    try {
      const pinList = list.pinnedBy || [];
      let updatedPin: string[];
      if (pinList.includes(currentUser.uid)) {
        updatedPin = pinList.filter((uid) => uid !== currentUser.uid);
      } else {
        updatedPin = [...pinList, currentUser.uid];
      }

      const docRef = doc(db, 'lists', list.id);
      await updateDoc(docRef, {
        pinnedBy: updatedPin,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error toggling pin:', error);
    }
  };

  const handleArchiveList = async (e: React.MouseEvent, list: List) => {
    e.stopPropagation();
    try {
      const docRef = doc(db, 'lists', list.id);
      await updateDoc(docRef, {
        isArchived: !list.isArchived,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error archiving:', error);
    }
  };

  const handleDeleteList = async (e: React.MouseEvent, listId: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you absolutely sure you want to delete this list? All contents will be permanently erased.')) return;
    try {
      const docRef = doc(db, 'lists', listId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting list:', error);
    }
  };

  const handleDuplicateList = async (e: React.MouseEvent, list: List) => {
    e.stopPropagation();
    if (!currentUser) return;
    try {
      const id = doc(collection(db, 'lists')).id;
      const newList = {
        id,
        ownerId: currentUser.uid,
        ownerEmail: currentUser.email || 'anonymous',
        title: `${list.title} (Copy)`,
        description: list.description,
        category: list.category,
        emoji: list.emoji,
        color: list.color,
        pinnedBy: [],
        sharedWith: {},
        publicAccess: 'none',
        isArchived: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(doc(db, 'lists', id), newList);

      // Now copy the list's items
      const itemsSnap = await getDocs(collection(db, 'lists', list.id, 'items'));
      for (const itemDoc of itemsSnap.docs) {
        const itemData = itemDoc.data();
        const itemId = doc(collection(db, 'lists', id, 'items')).id;
        await setDoc(doc(db, 'lists', id, 'items', itemId), {
          ...itemData,
          id: itemId,
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error duplicating list:', error);
    }
  };

  const handleLogOut = () => {
    auth.signOut();
  };

  // Filter & Search Logic
  const processedLists = lists.filter((list) => {
    if (!list) return false;

    // Search query match (safe string guards to prevent TypeError)
    const titleVal = list.title || '';
    const descVal = list.description || '';
    const matchesSearch = 
      titleVal.toLowerCase().includes(searchQuery.toLowerCase()) ||
      descVal.toLowerCase().includes(searchQuery.toLowerCase());

    // Category match
    const matchesCategory = selectedFilter === 'all' || list.category === selectedFilter;

    // Archive match
    const matchesArchive = (list.isArchived || false) === showArchived;

    return matchesSearch && matchesCategory && matchesArchive;
  });

  const pinnedLists = processedLists.filter((l) => currentUser && l.pinnedBy?.includes(currentUser.uid));
  const unpinnedLists = processedLists.filter((l) => !currentUser || !l.pinnedBy?.includes(currentUser.uid));

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-800 flex flex-col pb-20">
      {/* Upper Navigation Bar */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-100 rotate-3 animate-none">
              <span className="text-xl">📍</span>
            </div>
            <div>
              <h1 className="text-xl font-display font-bold leading-tight text-slate-800">PinList</h1>
              <span className="text-[10px] text-slate-400 tracking-wider uppercase font-bold">
                Logged in as: <span className="text-indigo-600 font-mono">{currentUser?.email || (currentUser?.isAnonymous ? 'Anonymous Guest' : 'Guest')}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCreateOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-550 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-100 hover:shadow-lg hover:shadow-indigo-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all"
            >
              <FolderPlus className="w-4 h-4 text-indigo-100" />
              <span>Create List</span>
            </button>

            <button
              onClick={handleLogOut}
              className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-red-650 transition-colors cursor-pointer border border-slate-200"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full px-6 pt-8 space-y-8 flex-1">
        {/* Welcome Section / Activity Summary */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div>
            <h2 className="text-lg font-display font-semibold text-slate-800">
              Welcome back, <span className="text-indigo-600">{currentUser?.displayName || 'Friend'}</span>!
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Organize, pin, and collaborate onto your collections in real-time. Share list portals with editors or viewers securely.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-slate-500">
            <div className="flex flex-col">
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Total Lists</span>
              <span className="text-lg font-bold text-indigo-600">{lists.length}</span>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div className="flex flex-col">
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Pinned active</span>
              <span className="text-lg font-bold text-amber-500">
                {lists.filter((l) => currentUser && l.pinnedBy?.includes(currentUser.uid)).length}
              </span>
            </div>
          </div>
        </div>

        {/* Searching & Filter Bar */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Search Input bar */}
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search collection titles or descriptions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-full py-2 px-3 pl-9 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 placeholder-slate-400"
              />
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            </div>

            {/* Category selection */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
              {([
                { value: 'all', label: 'All lists' },
                { value: 'grocery', label: '🛒 Grocery' },
                { value: 'wishlist', label: '✨ Wishlist' },
                { value: 'articles', label: '📚 Articles' },
                { value: 'custom', label: '📦 Custom' }
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSelectedFilter(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all whitespace-nowrap border ${
                    selectedFilter === opt.value
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Archive Toggle */}
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border flex items-center gap-1.5 transition-all ${
                showArchived
                  ? 'bg-amber-50 border-amber-300 text-amber-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              <span>{showArchived ? 'View Active' : 'View Archived'}</span>
            </button>
          </div>
        </div>

        {/* Collections Rendering */}
        <div className="space-y-8">
          {/* Pinned / Favorites Section */}
          {pinnedLists.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Pin className="w-4 h-4 text-amber-500" />
                <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-slate-550">
                  Pinned Collections
                </h3>
                <div className="flex-1 border-t border-dashed border-slate-200" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence mode="popLayout">
                  {pinnedLists.map((list) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      key={list.id}
                      onClick={() => onSelectList(list.id)}
                      className="group p-5 rounded-xl border-2 border-indigo-500 shadow-xl shadow-indigo-100/50 bg-white cursor-pointer hover:shadow-2xl transition-all relative"
                    >
                      {/* Top Bar with Emoji & Icons */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-3xl p-1.5 bg-slate-50 border border-slate-100 rounded-xl">{list.emoji || '📝'}</span>
                          <span className={`w-2.5 h-2.5 rounded-full ${EMBED_DOT_COLORS[list.color] || 'bg-slate-400'}`} />
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => handleTogglePin(e, list)}
                            className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-amber-500 transition-all cursor-pointer border border-slate-200"
                            title="Unpin list"
                          >
                            <PinOff className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDuplicateList(e, list)}
                            className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-all cursor-pointer border border-slate-200"
                            title="Duplicate list"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          {list.ownerId === currentUser?.uid && (
                            <button
                              onClick={(e) => handleArchiveList(e, list)}
                              className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-all cursor-pointer border border-slate-200"
                              title="Archive list"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Content */}
                      <div>
                        <h4 className="font-display font-bold text-base text-slate-800 group-hover:text-indigo-600 transition-colors flex items-center gap-2">
                          <span>{list.title}</span>
                          {list.publicAccess !== 'none' && (
                            <span className="text-[10px] bg-indigo-550 border border-indigo-200 text-indigo-700 font-bold px-1.5 py-0.5 rounded-full uppercase">
                              Shared
                            </span>
                          )}
                          {list.password && <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                        </h4>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 h-8">
                          {list.description || 'No description provided.'}
                        </p>
                      </div>

                      {/* Footer Info */}
                      <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-medium text-slate-500 font-sans">
                        <span className="bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full uppercase text-[9px] font-bold tracking-wider text-slate-500">
                          {list.category}
                        </span>
                        <span className="flex items-center gap-1 text-slate-600 group-hover:text-indigo-600 font-semibold transition-colors">
                          Open Portal <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Active Lists Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-slate-500">
                {showArchived ? 'Archived Collections' : 'Active Collections'}
              </h3>
              <div className="flex-1 border-t border-dashed border-slate-200" />
            </div>

             {processedLists.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 bg-white border border-slate-200 rounded-3xl text-center shadow-sm">
                <span className="text-4xl mb-4 animate-bounce">📭</span>
                <h4 className="text-base font-semibold text-slate-700">No collections found</h4>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  We couldn't search up any lists matching your constraints. Create a brand new list or adjust your query filter!
                </p>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(true)}
                  className="mt-5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm rounded-xl flex items-center gap-2 shadow-md shadow-indigo-100 hover:shadow-lg hover:shadow-indigo-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all cursor-pointer"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span>Create Your First List</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence mode="popLayout">
                  {unpinnedLists.map((list) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      key={list.id}
                      onClick={() => onSelectList(list.id)}
                      className="group p-5 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative cursor-pointer"
                    >
                      {/* Top Bar with Emoji & Icons */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-3xl p-1.5 bg-slate-50 border border-slate-100 rounded-xl">{list.emoji || '📝'}</span>
                          <span className={`w-2.5 h-2.5 rounded-full ${EMBED_DOT_COLORS[list.color] || 'bg-slate-400'}`} />
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => handleTogglePin(e, list)}
                            className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-amber-500 transition-all cursor-pointer border border-slate-200"
                            title="Pin list to top"
                          >
                            <Pin className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDuplicateList(e, list)}
                            className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-all cursor-pointer border border-slate-200"
                            title="Duplicate list"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          {list.ownerId === currentUser?.uid && (
                            <>
                              <button
                                onClick={(e) => handleArchiveList(e, list)}
                                className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-all cursor-pointer border border-slate-200"
                                title={list.isArchived ? 'Restore from Archive' : 'Archive list'}
                              >
                                {list.isArchived ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                              </button>
                              {list.isArchived && (
                                <button
                                  onClick={(e) => handleDeleteList(e, list.id)}
                                  className="p-1.5 rounded-lg bg-slate-50 hover:bg-red-50 text-red-500 transition-all cursor-pointer border border-slate-200"
                                  title="Delete list forever"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Content */}
                      <div>
                        <h4 className="font-display font-bold text-base text-slate-800 group-hover:text-indigo-600 transition-colors flex items-center gap-2">
                          <span>{list.title}</span>
                          {list.publicAccess !== 'none' && (
                            <span className="text-[10px] bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold px-1.5 py-0.5 rounded-full uppercase">
                              Shared
                            </span>
                          )}
                          {list.password && <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                        </h4>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 h-8">
                          {list.description || 'No description provided.'}
                        </p>
                      </div>

                      {/* Footer Info */}
                      <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-medium text-slate-500 font-sans">
                        <span className="bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full uppercase text-[9px] font-bold tracking-wider text-slate-500">
                          {list.category}
                        </span>
                        <span className="flex items-center gap-1 text-slate-600 group-hover:text-indigo-600 font-semibold transition-colors">
                          Open Portal <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* List Creation Dialog Modal */}
      <ListFormModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateList}
        title="Create New Share Space"
      />
    </div>
  );
}
