import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import type { Bundle, BundleItem } from '../types';
import { useCallback } from 'react';

export const useBundles = () => {
  const bundles = useLiveQuery(async () => {
    const allBundles = await db.bundles.toArray();
    const nonDeleted = allBundles.filter(bundle => bundle.isDeleted !== true);
    
    // FIX: Make sorting more robust to handle items with missing or invalid dates.
    // This prevents errors if `updatedAt` is not a valid date string.
    return nonDeleted.sort((a, b) => {
        const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        
        // Treat invalid dates (which result in NaN) as 0 to ensure stable sorting.
        return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
    });
  }, []);

  const addBundle = useCallback(async (title: string): Promise<string> => {
    const newBundle: Bundle = {
      id: crypto.randomUUID(),
      title,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: [],
    };
    await db.bundles.add(newBundle);
    return newBundle.id;
  }, []);
  
  const importBundle = useCallback(async (bundleData: Omit<Bundle, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const newBundle: Bundle = {
        ...bundleData,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    }
    await db.bundles.add(newBundle);
    return newBundle.id;
  }, []);

  const duplicateBundle = useCallback(async (bundleId: string) => {
    const originalBundle = await db.bundles.get(bundleId);
    if(originalBundle) {
      const newBundle: Bundle = {
        ...JSON.parse(JSON.stringify(originalBundle)), // Deep copy
        id: crypto.randomUUID(),
        title: `${originalBundle.title} (Copy)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDeleted: false,
        deletedAt: undefined,
      };
      await db.bundles.add(newBundle);
    }
  }, []);

  const updateBundle = useCallback(async (id: string, updates: Partial<Bundle>) => {
    // FIX: The Dexie `update` method can cause a TypeScript circular reference error
    // with recursive types like `ChecklistEntry`. Using a transaction with `get` and `put`,
    // and passing the table name as a string, is a more robust approach that avoids this
    // type inference issue.
    await db.transaction('rw', 'bundles', async () => {
      const bundle = await db.bundles.get(id);
      if (bundle) {
        const updatedBundle = { ...bundle, ...updates, updatedAt: new Date().toISOString() };
        await db.bundles.put(updatedBundle);
      }
    });
  }, []);

  const deleteBundle = useCallback(async (id: string) => {
    // FIX: Refactored to use a transaction with `get` and `put`. This avoids the
    // TypeScript circular reference error that Dexie's `update` method can cause
    // with recursive types like `ChecklistEntry`.
    await db.transaction('rw', 'bundles', async () => {
      const bundle = await db.bundles.get(id);
      if (bundle) {
        await db.bundles.put({
          ...bundle,
          isDeleted: true,
          deletedAt: new Date().toISOString(),
          isPinned: false
        });
      }
    });
  }, []);

  const deleteBundles = useCallback(async (ids: Set<string>) => {
    await db.transaction('rw', 'bundles', async () => {
      const bundlesToUpdate = await db.bundles.where('id').anyOf(Array.from(ids)).toArray();
      for (const bundle of bundlesToUpdate) {
        bundle.isDeleted = true;
        bundle.deletedAt = new Date().toISOString();
        bundle.isPinned = false;
      }
      await db.bundles.bulkPut(bundlesToUpdate);
    });
  }, []);

  const archiveBundles = useCallback(async (ids: Set<string>) => {
    await db.transaction('rw', 'bundles', async () => {
      const bundlesToUpdate = await db.bundles.where('id').anyOf(Array.from(ids)).toArray();
      for (const bundle of bundlesToUpdate) {
        bundle.isArchived = true;
        bundle.isPinned = false; // Archived bundles shouldn't be pinned
      }
      await db.bundles.bulkPut(bundlesToUpdate);
    });
  }, []);

  const restoreBundle = useCallback(async (id: string) => {
    // FIX: Refactored to use a transaction with `get` and `put` to avoid the
    // same circular reference issue in Dexie's `update` method.
    await db.transaction('rw', 'bundles', async () => {
      const bundle = await db.bundles.get(id);
      if (bundle) {
        await db.bundles.put({
          ...bundle,
          isDeleted: false,
          deletedAt: undefined,
        });
      }
    });
  }, []);

  const permanentlyDeleteBundle = useCallback(async (id: string) => {
    await db.bundles.delete(id);
  }, []);
  
  const mergeBundles = useCallback(async (bundleIds: string[], newTitle: string): Promise<string> => {
    const bundlesToMerge = await db.bundles.where('id').anyOf(bundleIds).toArray();
    const allItems: BundleItem[] = bundlesToMerge.flatMap(b => b.items);
    // Deep copy items to avoid issues with object references
    const copiedItems = JSON.parse(JSON.stringify(allItems));
    
    const newBundle: Bundle = {
        id: crypto.randomUUID(),
        title: newTitle,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        items: copiedItems,
    };
    await db.bundles.add(newBundle);
    return newBundle.id;
  }, []);

  const addItemToBundle = useCallback(async (bundleId: string, item: BundleItem) => {
    await db.transaction('rw', 'bundles', async () => {
      const bundle = await db.bundles.get(bundleId);
      if (bundle) {
        bundle.items.push(item);
        bundle.updatedAt = new Date().toISOString();
        await db.bundles.put(bundle);
      }
    });
  }, []);

  const addItemsToBundle = useCallback(async (bundleId: string, items: BundleItem[]) => {
    await db.transaction('rw', 'bundles', async () => {
        const bundle = await db.bundles.get(bundleId);
        if (bundle) {
            bundle.items.push(...items);
            bundle.updatedAt = new Date().toISOString();
            await db.bundles.put(bundle);
        }
    });
  }, []);

  const updateItemInBundle = useCallback(async (bundleId: string, itemId: string, itemUpdates: Partial<BundleItem>) => {
      await db.transaction('rw', 'bundles', async () => {
          const bundle = await db.bundles.get(bundleId);
          if (bundle) {
              const itemIndex = bundle.items.findIndex(i => i.id === itemId);
              if (itemIndex > -1) {
                  bundle.items[itemIndex] = { ...bundle.items[itemIndex], ...itemUpdates } as BundleItem;
                  bundle.updatedAt = new Date().toISOString();
                  await db.bundles.put(bundle);
              }
          }
      });
  }, []);

  const duplicateItemInBundle = useCallback(async (bundleId: string, itemId: string) => {
    await db.transaction('rw', 'bundles', async () => {
      const bundle = await db.bundles.get(bundleId);
      if (bundle) {
        const itemIndex = bundle.items.findIndex(i => i.id === itemId);
        if (itemIndex > -1) {
          const originalItem = bundle.items[itemIndex];
          const newItem: BundleItem = {
            ...JSON.parse(JSON.stringify(originalItem)), // Deep copy
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            title: `${originalItem.title} (Copy)`,
            isPinned: false, // Duplicated items are not pinned by default
          };
          bundle.items.splice(itemIndex + 1, 0, newItem);
          bundle.updatedAt = new Date().toISOString();
          await db.bundles.put(bundle);
        }
      }
    });
  }, []);
  
  const removeItemFromBundle = useCallback(async (bundleId: string, itemId: string) => {
    await db.transaction('rw', 'bundles', async () => {
      const bundle = await db.bundles.get(bundleId);
      if (bundle) {
        bundle.items = bundle.items.filter((item) => item.id !== itemId);
        bundle.updatedAt = new Date().toISOString();
        await db.bundles.put(bundle);
      }
    });
  }, []);

  const removeItemsFromBundle = useCallback(async (bundleId: string, itemIds: Set<string>) => {
    await db.transaction('rw', 'bundles', async () => {
      const bundle = await db.bundles.get(bundleId);
      if (bundle) {
        bundle.items = bundle.items.filter((item) => !itemIds.has(item.id));
        bundle.updatedAt = new Date().toISOString();
        await db.bundles.put(bundle);
      }
    });
  }, []);

  const moveItemInBundle = useCallback(async (bundleId: string, fromIndex: number, toIndex: number) => {
    await db.transaction('rw', 'bundles', async () => {
      const bundle = await db.bundles.get(bundleId);
      if (bundle) {
        const [movedItem] = bundle.items.splice(fromIndex, 1);
        bundle.items.splice(toIndex, 0, movedItem);
        bundle.updatedAt = new Date().toISOString();
        await db.bundles.put(bundle);
      }
    });
  }, []);

  return {
    bundles,
    addBundle,
    importBundle,
    duplicateBundle,
    updateBundle,
    deleteBundle,
    deleteBundles,
    archiveBundles,
    restoreBundle,
    permanentlyDeleteBundle,
    mergeBundles,
    addItemToBundle,
    addItemsToBundle,
    updateItemInBundle,
    duplicateItemInBundle,
    removeItemFromBundle,
    removeItemsFromBundle,
    moveItemInBundle
  };
};
