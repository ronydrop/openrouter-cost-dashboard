import { useState, useEffect, useRef, useCallback } from 'react';
import { apiService } from '../services/api';

const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes
const INITIAL_SYNC_DELAY = 2000; // 2 seconds after mount
const VISIBILITY_POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes when tab is visible

interface SyncNeededResponse {
  needsSync: boolean;
  reason: string;
  lastSyncAt: string | null;
  nextSyncAt: string | null;
  activityCount?: number;
}

interface UseAutoSyncOptions {
  enabled?: boolean;
  onSyncStart?: () => void;
  onSyncComplete?: (success: boolean, recordsSynced?: number) => void;
  onSyncError?: (error: string) => void;
}

export function useAutoSync(range: string, options: UseAutoSyncOptions = {}) {
  const { enabled = true, onSyncStart, onSyncComplete, onSyncError } = options;
  
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [nextSyncAt, setNextSyncAt] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isInitialSync, setIsInitialSync] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const performSync = useCallback(async (isAutomatic = true) => {
    if (isSyncing) return;
    if (isAutomatic && !autoSyncEnabled) return;
    
    setIsSyncing(true);
    onSyncStart?.();
    
    try {
      const result = await apiService.syncData(range);
      if (result.success) {
        setLastSyncAt(new Date().toISOString());
        const nextSync = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        setNextSyncAt(nextSync);
        onSyncComplete?.(true, result.records_synced);
      } else {
        onSyncComplete?.(false);
      }
    } catch (error: any) {
      onSyncError?.(error.message || 'Sync failed');
      onSyncComplete?.(false);
    } finally {
      setIsSyncing(false);
    }
  }, [range, autoSyncEnabled, isSyncing, onSyncStart, onSyncComplete, onSyncError]);

  const checkAndSync = useCallback(async () => {
    if (!autoSyncEnabled) return;
    
    try {
      const syncStatus: SyncNeededResponse = await apiService.getSyncNeeded();
      setLastSyncAt(syncStatus.lastSyncAt);
      setNextSyncAt(syncStatus.nextSyncAt);
      
      if (syncStatus.needsSync && !isSyncing) {
        performSync(true);
      }
    } catch (error) {
      console.error('[AutoSync] Failed to check sync status:', error);
    }
  }, [autoSyncEnabled, isSyncing, performSync]);

  const toggleAutoSync = useCallback(() => {
    setAutoSyncEnabled(prev => !prev);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    
    const initTimer = setTimeout(async () => {
      setIsInitialSync(true);
      try {
        await checkAndSync();
      } catch (error) {
        console.error('[AutoSync] Initial sync check failed:', error);
      } finally {
        setIsInitialSync(false);
      }
    }, INITIAL_SYNC_DELAY);
    
    // Safety timeout - ensure badge doesn't stay stuck
    const safetyTimer = setTimeout(() => {
      setIsInitialSync(false);
    }, INITIAL_SYNC_DELAY + 30000);
    
    return () => {
      clearTimeout(initTimer);
      clearTimeout(safetyTimer);
      setIsInitialSync(false);
    };
  }, [enabled, range]);

  useEffect(() => {
    if (!enabled || !autoSyncEnabled) return;
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAndSync();
        
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
        
        pollIntervalRef.current = setInterval(() => {
          if (document.visibilityState === 'visible') {
            checkAndSync();
          }
        }, VISIBILITY_POLL_INTERVAL);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    pollIntervalRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') {
        checkAndSync();
      }
    }, POLL_INTERVAL);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [enabled, autoSyncEnabled, checkAndSync]);

  return {
    lastSyncAt,
    nextSyncAt,
    isSyncing,
    isInitialSync,
    autoSyncEnabled,
    toggleAutoSync,
    triggerSync: () => performSync(false),
  };
}