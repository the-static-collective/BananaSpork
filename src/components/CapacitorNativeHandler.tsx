import React, { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { WifiOff, AlertCircle } from 'lucide-react';

interface CapacitorNativeHandlerProps {
  activeModalOpen: boolean;
  onCloseModal?: () => void;
  activeTab: string;
  setActiveTab: (tab: any) => void;
}

export const CapacitorNativeHandler: React.FC<CapacitorNativeHandlerProps> = ({
  activeModalOpen,
  onCloseModal,
  activeTab,
  setActiveTab,
}) => {
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const navigationRef = useRef({ activeModalOpen, onCloseModal, activeTab, setActiveTab });

  useEffect(() => {
    navigationRef.current = { activeModalOpen, onCloseModal, activeTab, setActiveTab };
  }, [activeModalOpen, onCloseModal, activeTab, setActiveTab]);

  useEffect(() => {
    let active = true;
    let removeBackListener: (() => Promise<void>) | undefined;

    const setupNativeUi = async () => {
      if (!Capacitor.isNativePlatform()) return;

      try {
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#fef3c7' });
      } catch (error) {
        console.warn('[NanaSpork] Status bar setup failed:', error);
      }

      try {
        await Keyboard.setAccessoryBarVisible({ isVisible: true });
      } catch (error) {
        console.warn('[NanaSpork] Keyboard setup failed:', error);
      }

      try {
        const listener = await CapApp.addListener('backButton', () => {
          const navigation = navigationRef.current;
          if (navigation.activeModalOpen && navigation.onCloseModal) {
            navigation.onCloseModal();
          } else if (navigation.activeTab !== 'today') {
            navigation.setActiveTab('today');
          } else {
            void CapApp.minimizeApp();
          }
        });
        if (active) {
          removeBackListener = listener.remove;
        } else {
          await listener.remove();
        }
      } catch (error) {
        console.warn('[NanaSpork] Back-button setup failed:', error);
      }
    };

    void setupNativeUi();

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      active = false;
      if (removeBackListener) void removeBackListener();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="bg-amber-900 text-amber-50 px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-inner sticky top-0 z-[100] border-b border-amber-800">
      <div className="flex items-center space-x-2">
        <WifiOff className="w-4 h-4 text-amber-300 animate-pulse" />
        <span>
          <strong>Offline Mode Active:</strong> Device storage enabled. Shared authority actions require connection.
        </span>
      </div>
      <span className="text-[10px] bg-amber-800 text-amber-200 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
        Local State
      </span>
    </div>
  );
};
