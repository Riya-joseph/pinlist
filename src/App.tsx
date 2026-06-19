import { useState, useEffect } from 'react';
import { signInAnonymously } from 'firebase/auth';
import { useNavigation } from './hooks/useNavigation';
import { AuthPage } from './components/AuthPage';
import { Dashboard } from './components/Dashboard';
import { ListDetailsPage } from './components/ListDetailsPage';
import { auth } from './firebase';
import { Pin, ArrowLeft, LogIn } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const { currentPath, navigate, listId } = useNavigation();
  const [user, setUser] = useState(auth.currentUser);
  const [loading, setLoading] = useState(true);
  const [viewOverride, setViewOverride] = useState<'auth' | 'app' | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSelect = (id: string) => {
    navigate(`/list/${id}`);
  };

  const handleBack = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center text-slate-500 font-sans">
        <div className="relative mb-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center rotate-6 shadow-md animate-pulse">
            <span className="text-xl text-white">📍</span>
          </div>
        </div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 font-display animate-pulse">
          Opening PinList Portal...
        </h2>
      </div>
    );
  }

  // Deep Link Route: /list/:listId
  if (listId) {
    return (
      <ListDetailsPage
        listId={listId}
        onBack={handleBack}
      />
    );
  }

  // Default Route: Dashboard or Login screen
  const shouldShowAuth = !user && viewOverride !== 'app';

  return (
    <AnimatePresence mode="wait">
      {shouldShowAuth ? (
        <AuthPage 
          onSuccess={() => {
            setViewOverride('app');
          }}
          onContinueAsGuest={async () => {
            try {
              await signInAnonymously(auth);
              setViewOverride('app');
            } catch (err) {
              console.error("Anonymous authentication failed:", err);
              setViewOverride('app');
            }
          }}
        />
      ) : (
        <motion.div
          key="dashboard-view"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col"
        >
          {/* Guest User Header Alert if browsing without account */}
          {(user?.isAnonymous || !user) && (
            <div className="bg-amber-50 border-b border-amber-200 text-amber-800 py-3 px-6 text-center text-xs flex items-center justify-center gap-2 select-none">
              <span>🚀 You are browsing public spaces as an anonymous guest. Your changes are saved, but sign up to create and secure personal lists!</span>
              <button
                onClick={() => setViewOverride('auth')}
                className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1 font-bold uppercase rounded-lg text-[10px] tracking-wider cursor-pointer"
              >
                Sign up free
              </button>
            </div>
          )}

          <Dashboard onSelectList={handleSelect} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
