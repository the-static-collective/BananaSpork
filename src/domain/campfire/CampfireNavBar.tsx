import React from 'react';
import { Home, MessageSquare, ShoppingBag, Sprout, Scroll, Plus } from 'lucide-react';
import { CampfireTab } from './types';

interface CampfireNavBarProps {
  activeTab: CampfireTab;
  onTabChange: (tab: CampfireTab) => void;
  onOpenUniversalComposer: () => void;
  unreadChatCount?: number;
}

export const CampfireNavBar: React.FC<CampfireNavBarProps> = ({
  activeTab,
  onTabChange,
  onOpenUniversalComposer,
  unreadChatCount = 0,
}) => {
  const tabs: { id: CampfireTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'today', label: 'Garden', icon: <Home className="w-5 h-5" /> },
    {
      id: 'porch',
      label: 'Porch',
      icon: <MessageSquare className="w-5 h-5" />,
      badge: unreadChatCount,
    },
    { id: 'basket', label: 'Basket', icon: <ShoppingBag className="w-5 h-5" /> },
    { id: 'grow', label: 'Grow', icon: <Sprout className="w-5 h-5" /> },
    { id: 'remember', label: 'Remember', icon: <Scroll className="w-5 h-5" /> },
  ];

  return (
    <>
      {/* Desktop Navigation Top Tabs (Hidden on small screens) */}
      <nav
        className="hidden md:flex items-center space-x-1 bg-amber-900/90 text-amber-100 px-4 py-1.5 border-b border-amber-800 shrink-0"
        aria-label="Campfire Main Navigation"
      >
        <div className="flex items-center space-x-1 flex-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl font-extrabold text-xs transition flex items-center space-x-2 min-h-[44px] cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-amber-100 text-amber-950 shadow-2xs'
                  : 'text-amber-200 hover:bg-amber-800/80 hover:text-white'
              }`}
              id={`desktop-tab-${tab.id}`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge && tab.badge > 0 ? (
                <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                  {tab.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {/* Desktop Universal Create Button */}
        <button
          onClick={onOpenUniversalComposer}
          className="bg-amber-400 hover:bg-amber-300 text-amber-950 font-black text-xs px-3.5 py-1.5 rounded-xl transition flex items-center space-x-1.5 shadow-xs cursor-pointer min-h-[44px]"
          id="desktop-universal-create-btn"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Universal Create</span>
        </button>
      </nav>

      {/* Mobile Navigation Bottom Bar (Fixed to bottom on small screens) */}
      <div className="native-bottom-nav md:hidden fixed bottom-0 left-0 right-0 bg-amber-950 text-amber-100 border-t border-amber-800 z-40 px-2 py-1 flex items-center justify-around shadow-lg">
        {tabs.slice(0, 2).map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center justify-center p-1.5 rounded-2xl transition min-h-[48px] min-w-[56px] relative cursor-pointer ${
              activeTab === tab.id ? 'text-amber-300 font-extrabold' : 'text-amber-300/60 hover:text-amber-200'
            }`}
            id={`mobile-tab-${tab.id}`}
          >
            {tab.icon}
            <span className="text-[10px] mt-0.5">{tab.label}</span>
            {tab.badge && tab.badge > 0 ? (
              <span className="absolute top-1 right-2 bg-red-500 text-white text-[9px] font-black px-1 rounded-full">
                {tab.badge}
              </span>
            ) : null}
          </button>
        ))}

        {/* Center Floating Universal Create Button */}
        <button
          onClick={onOpenUniversalComposer}
          className="bg-amber-400 hover:bg-amber-300 text-amber-950 p-3 rounded-full transition shadow-lg transform -translate-y-2 border-2 border-amber-950 min-h-[48px] min-w-[48px] flex items-center justify-center cursor-pointer active:scale-95"
          title="Universal Create (+ Need, Offer, Task, Event, Remember)"
          id="mobile-universal-create-btn"
        >
          <Plus className="w-6 h-6 stroke-[3]" />
        </button>

        {tabs.slice(2).map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center justify-center p-1.5 rounded-2xl transition min-h-[48px] min-w-[56px] relative cursor-pointer ${
              activeTab === tab.id ? 'text-amber-300 font-extrabold' : 'text-amber-300/60 hover:text-amber-200'
            }`}
            id={`mobile-tab-${tab.id}`}
          >
            {tab.icon}
            <span className="text-[10px] mt-0.5">{tab.label}</span>
          </button>
        ))}
      </div>
    </>
  );
};
