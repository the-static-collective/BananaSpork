import React, { useEffect, useState } from 'react';
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

  useEffect(() => {
    // 1. Configure Native Status Bar if running in Capacitor
    const setupNativeUi = async () => {
      try {
        await StatusBar.setStyle({ style: Style.Light });
        await StatusBar.setBackgroundColor({ color: '#fef3c7' }); // amber-100
      } catch (e) {
        // Ignored on web
      }

      try {
        await Keyboard.setAccessoryBarVisible({ isVisible: true });
      } catch (e) {
        // Ignored on web
      }
    };

    setupNativeUi();

    // 2. Configure Android Back Button Listener
    let backButtonListener: any = null;
    const bindBackButton = async () => {
      try {
        backButtonListener = await CapApp.addListener('backButton', () => {
          if (activeModalOpen && onCloseModal) {
            onCloseModal();
          } else if (activeTab !== 'today') {
            setActiveTab('today');
          } else {
            CapApp.minimizeApp();
          }
        });
      } catch (e) {
        // Ignored on web
      }
    };

    bindBackButton();

    // 3. Online/Offline Network Listeners
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      if (backButtonListener && typeof backButtonListener.remove === 'function') {
        backButtonListener.remove();
      }
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [activeModalOpen, onCloseModal, activeTab, setActiveTab]);

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
