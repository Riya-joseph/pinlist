import { useState, useEffect } from 'react';

export function useNavigation() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const navigate = (path: string) => {
    window.history.pushState(null, '', path);
    setCurrentPath(path);
  };

  // Extract listId if URL is /list/xyz
  const listId = currentPath.startsWith('/list/') ? currentPath.split('/list/')[1] : null;

  return {
    currentPath,
    navigate,
    listId
  };
}
