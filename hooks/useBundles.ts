import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import type { Bundle, BundleItem } from '../types';
import { useCallback } from 'react';

export const useBundles = () => {
  const bundles = useLiveQuery(() => db.bundles.orderBy('updatedAt').reverse().toArray(), []);

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
      };
      await db.bundles.add(newBundle);
    }
  }, []);

  const getBundle = (id: string | undefined): Bundle | undefined => {
    const bundle = useLiveQuery(() => id ? db.bundles.get(id) : undefined, [id]);
    return bundle;
  };

  const updateBundle = useCallback(async (id: string, updates: Partial<Bundle>) => {
    await db.bundles.update(id, { ...updates, updatedAt: new Date().toISOString() });
  }, []);

  const deleteBundle = useCallback(async (id: string) => {
    await db.bundles.delete(id);
  }, []);

  const addItemToBundle = useCallback(async (bundleId: string, item: BundleItem) => {
    await db.transaction('rw', db.bundles, async () => {
      const bundle = await db.bundles.get(bundleId);
      if (bundle) {
        bundle.items.push(item);
        bundle.updatedAt = new Date().toISOString();
        await db.bundles.put(bundle);
      }
    });
  }, []);

  const updateItemInBundle = useCallback(async (bundleId: string, itemId: string, itemUpdates: Partial<BundleItem>) => {
      await db.transaction('rw', db.bundles, async () => {
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
  
  const removeItemFromBundle = useCallback(async (bundleId: string, itemId: string) => {
    await db.transaction('rw', db.bundles, async () => {
      const bundle = await db.bundles.get(bundleId);
      if (bundle) {
        bundle.items = bundle.items.filter((item) => item.id !== itemId);
        bundle.updatedAt = new Date().toISOString();
        await db.bundles.put(bundle);
      }
    });
  }, []);

  const moveItemInBundle = useCallback(async (bundleId: string, fromIndex: number, toIndex: number) => {
    await db.transaction('rw', db.bundles, async () => {
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
    getBundle,
    updateBundle,
    deleteBundle,
    addItemToBundle,
    updateItemInBundle,
    removeItemFromBundle,
    moveItemInBundle
  };
};