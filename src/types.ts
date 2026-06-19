export type CategoryType = 'grocery' | 'wishlist' | 'articles' | 'custom';
export type ColorType = 'red' | 'blue' | 'green' | 'slate' | 'amber' | 'purple' | 'orange' | 'pink' | 'indigo';
export type PublicAccessType = 'none' | 'view' | 'edit';

export interface List {
  id: string;
  ownerId: string;
  ownerEmail: string;
  title: string;
  description: string;
  category: CategoryType;
  emoji: string;
  color: ColorType;
  pinnedBy: string[]; // List of user IDs who pinned this
  sharedWith: { [email: string]: 'view' | 'edit' }; // Collab shared map
  publicAccess: PublicAccessType;
  password?: string;
  isArchived: boolean;
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
}

export interface ListItem {
  id: string;
  title: string;
  note?: string;
  quantity?: string;
  url?: string;
  completed: boolean;
  order: number;
  createdAt: any;
  updatedBy?: string; // User email or 'Anonymous'
  completedAt?: any;
  completedBy?: string; // User email or 'Anonymous'
}

export interface ActivityLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  details: string;
  timestamp: any;
}

export interface UserPresence {
  id: string; // Session / UID
  email: string;
  lastActive: any;
}
