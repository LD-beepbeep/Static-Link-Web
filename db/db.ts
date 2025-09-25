import Dexie, { type Table } from 'dexie';
import type { Bundle } from '../types';

// FIX: The original class-based approach for Dexie was causing TypeScript errors where
// methods like `version()` and `transaction()` were not found on the database instance.
// Refactoring to directly instantiate Dexie and cast the type is a more robust pattern
// that correctly resolves the types and fixes the errors across the application.
/**
 * Defines the database structure by directly instantiating Dexie and casting its type.
 * This pattern ensures that all of Dexie's methods are correctly typed and available,
 * providing a stable and type-safe database instance.
 */
export const db = new Dexie('StaticLinkDB') as Dexie & {
  // 'bundles' is a table in the database. Dexie-react-hooks will use this for live queries.
  bundles: Table<Bundle, string>; 
};

db.version(1).stores({
  // 'id' is the primary key. The other fields are indexed for faster queries.
  bundles: 'id, title, createdAt, updatedAt',
});

// Added version 2 for the new isArchived index
db.version(2).stores({
    bundles: 'id, title, createdAt, updatedAt, isArchived'
});

// Added version 3 for the new isDeleted index
db.version(3).stores({
    bundles: 'id, title, createdAt, updatedAt, isArchived, isDeleted'
});