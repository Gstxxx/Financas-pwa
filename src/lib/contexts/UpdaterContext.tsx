'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { fetchChangelog } from '@/lib/services/updaterApi';
import type { UpdateStatus } from '@/types/electron';

interface UpdaterContextValue {
  status: UpdateStatus;
  /** Target version once known. Empty string until the updater reports it. */
  version: string;
  changelog: string | null;
  loadingChangelog: boolean;
  modalOpen: boolean;
  /** Manual open/close — auto-opens on 'available' (unless previously
   * dismissed for this version), stays open until install. */
  openModal: () => void;
  closeModal: () => void;
  /** Force a check now. Resolves when the IPC roundtrip ends. */
  check: () => Promise<void>;
  /** Triggers quitAndInstall in main. App will close immediately, NSIS
   * silently installs, app relaunches. */
  install: () => Promise<void>;
  /** True only inside Electron. PWA renders nothing for updater UI. */
  available: boolean;
}

const UpdaterContext = createContext<UpdaterContextValue | null>(null);

export function UpdaterProvider({ children }: { children: React.ReactNode }) {
  const [available, setAvailable] = useState(false);
  const [status, setStatus] = useState<UpdateStatus>({ state: 'idle' });
  const [changelog, setChangelog] = useState<string | null>(null);
  const [loadingChangelog, setLoadingChangelog] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const dismissedVersionRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const updater = window.electron?.updater;
    if (!updater) return;
    setAvailable(true);
    updater.getStatus().then(setStatus).catch(() => {});
    const off = updater.onStatus((s) => {
      setStatus(s);
    });
    return off;
  }, []);

  const version = useMemo(() => {
    if ('version' in status) return status.version ?? '';
    return '';
  }, [status]);

  // Fetch changelog whenever we know a target version and don't have it
  // cached. The service handles its own session+memory cache so this is
  // cheap to re-call.
  useEffect(() => {
    if (!version) return;
    let cancelled = false;
    setLoadingChangelog(true);
    fetchChangelog(version)
      .then((body) => {
        if (cancelled) return;
        setChangelog(body);
      })
      .finally(() => {
        if (!cancelled) setLoadingChangelog(false);
      });
    return () => {
      cancelled = true;
    };
  }, [version]);

  // Auto-open the modal once an update becomes available, unless the user
  // already dismissed it for this exact version (don't pester per state
  // transition during downloading).
  useEffect(() => {
    const visibleState =
      status.state === 'available' ||
      status.state === 'downloading' ||
      status.state === 'downloaded';
    if (!visibleState) return;
    if (dismissedVersionRef.current === version) return;
    setModalOpen(true);
  }, [status, version]);

  const openModal = useCallback(() => setModalOpen(true), []);
  const closeModal = useCallback(() => {
    setModalOpen(false);
    if (version) dismissedVersionRef.current = version;
  }, [version]);

  const check = useCallback(async () => {
    const updater = window.electron?.updater;
    if (!updater) return;
    await updater.check();
  }, []);

  const install = useCallback(async () => {
    const updater = window.electron?.updater;
    if (!updater) return;
    await updater.install();
  }, []);

  const value: UpdaterContextValue = {
    status,
    version,
    changelog,
    loadingChangelog,
    modalOpen,
    openModal,
    closeModal,
    check,
    install,
    available,
  };

  return <UpdaterContext.Provider value={value}>{children}</UpdaterContext.Provider>;
}

export function useUpdater(): UpdaterContextValue {
  const ctx = useContext(UpdaterContext);
  if (!ctx) {
    throw new Error('useUpdater must be used within an UpdaterProvider');
  }
  return ctx;
}
