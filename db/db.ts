import Dexie, { type Table } from 'dexie';
import type { Bundle } from '../types';

// FIX: The original class-based approach was causing TypeScript errors where Dexie methods
// were not found. This direct instantiation approach is a common and robust pattern that
// avoids potential subclassing issues. We type the instance to include our tables.
export const db = new Dexie('StaticLinkDB') as Dexie & {
  bundles: Table<Bundle>;
};

db.version(1).stores({
  bundles: 'id, title, createdAt, updatedAt', // Primary key and indexed properties
});
