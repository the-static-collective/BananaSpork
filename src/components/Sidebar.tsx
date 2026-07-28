import React, { useState } from 'react';
import { Bot, MessageSquare, Radio, Search, ShieldAlert, Sparkles, User, X } from 'lucide-react';
import { ChatChannel, KidProfile } from '../types';

interface SidebarProps {
  channels: ChatChannel[];
  activeChannelId: string;
  onSelectChannel: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
  onOpenPantryApp: () => void;
  onOpenKidProfile: () => void;
  onOpenGroupManage: () => void;
  onOpenPhotoAlbum: () => void;
  onOpenJubileeHub?: () => void;
  kidProfile: KidProfile;
  runtimeMode?: 'shared_campfire' | 'this_device_demo';
}

export const Sidebar: React.FC<SidebarProps> = ({
  channels,
  activeChannelId,
  onSelectChannel,
  isOpen,
  onClose,
  onOpenPantryApp,
  onOpenKidProfile,
  onOpenGroupManage,
  onOpenPhotoAlbum,
  onOpenJubileeHub,
  kidProfile,
  runtimeMode = 'this_device_demo',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'bot' | 'direct' | 'channel'>('all');

  const filteredChannels = channels.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' || c.type === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <>
      {/* Mobile overlay background */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-xs transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar drawer container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-80 bg-amber-50/95 border-r border-amber-200/90 flex flex-col transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0 shadow-2xl md:shadow-none' : '-translate-x-full md:translate-x-0'
        }`}
        id="sidebar-container"
      >
        {/* Top Branding Bar */}
        <div className="p-3.5 sm:p-4 border-b border-amber-200/80 bg-amber-100/70 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 bg-amber-400 text-2xl rounded-2xl flex items-center justify-center shadow-xs border border-amber-500/30">
              🍌
            </div>
            <div>
              <h2 className="font-extrabold text-amber-950 text-base leading-tight tracking-tight">
                BananaGram
              </h2>
              <p className="text-xs font-semibold text-amber-800">
                Nourish Kids • Mom Simplified
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg text-amber-800 hover:bg-amber-200 transition"
            id="close-sidebar-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-amber-200/60 bg-amber-50/50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase text-amber-900 tracking-wider">
              Parent Telegram Channels
            </span>
            <button
              onClick={() => {
                onOpenGroupManage();
                onClose();
              }}
              className="text-[11px] font-extrabold text-amber-900 bg-amber-200 hover:bg-amber-300 px-2 py-0.5 rounded-lg transition"
              id="sidebar-create-group-btn"
            >
              + New Group
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-amber-700/60 pointer-events-none" />
            <input
              type="text"
              placeholder="Search chats, hacks, meals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-amber-100/60 text-amber-950 text-xs rounded-xl border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder-amber-800/50 font-medium"
              id="sidebar-search-input"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex space-x-1 mt-2.5 overflow-x-auto no-scrollbar pb-0.5">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition whitespace-nowrap ${
                filter === 'all'
                  ? 'bg-amber-900 text-amber-50 shadow-2xs'
                  : 'bg-amber-100/80 text-amber-900 hover:bg-amber-200/60'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('bot')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition whitespace-nowrap flex items-center space-x-1 ${
                filter === 'bot'
                  ? 'bg-amber-900 text-amber-50 shadow-2xs'
                  : 'bg-amber-100/80 text-amber-900 hover:bg-amber-200/60'
              }`}
            >
              <Bot className="w-3 h-3" />
              <span>AI Bot</span>
            </button>
            <button
              onClick={() => setFilter('direct')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition whitespace-nowrap flex items-center space-x-1 ${
                filter === 'direct'
                  ? 'bg-amber-900 text-amber-50 shadow-2xs'
                  : 'bg-amber-100/80 text-amber-900 hover:bg-amber-200/60'
              }`}
            >
              <MessageSquare className="w-3 h-3" />
              <span>Co-Parent</span>
            </button>
            <button
              onClick={() => setFilter('channel')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition whitespace-nowrap flex items-center space-x-1 ${
                filter === 'channel'
                  ? 'bg-amber-900 text-amber-50 shadow-2xs'
                  : 'bg-amber-100/80 text-amber-900 hover:bg-amber-200/60'
              }`}
            >
              <Radio className="w-3 h-3" />
              <span>Channels</span>
            </button>
          </div>
        </div>

        {/* Channel List */}
        <div className="flex-1 overflow-y-auto divide-y divide-amber-200/40 px-2 py-1">
          {filteredChannels.length === 0 ? (
            <div className="p-6 text-center text-amber-800/60 text-xs">
              No chats found. Try another search!
            </div>
          ) : (
            filteredChannels.map((channel) => {
              const isActive = channel.id === activeChannelId;
              return (
                <button
                  key={channel.id}
                  onClick={() => {
                    onSelectChannel(channel.id);
                    onClose();
                  }}
                  className={`w-full text-left p-2.5 my-1 rounded-2xl flex items-start space-x-3 transition group ${
                    isActive
                      ? 'bg-amber-200/90 text-amber-950 shadow-xs border border-amber-300'
                      : 'hover:bg-amber-100/70 text-amber-900'
                  }`}
                  id={`channel-item-${channel.id}`}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-200/80 flex items-center justify-center text-xl shadow-2xs">
                      {channel.avatar}
                    </div>
                    {channel.type === 'bot' && (
                      <span className="absolute -bottom-1 -right-1 bg-amber-500 text-white p-0.5 rounded-full border border-white">
                        <Sparkles className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>

                  {/* Text details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h3 className="font-bold text-xs sm:text-sm text-amber-950 truncate">
                        {channel.name}
                      </h3>
                      {channel.lastTime && (
                        <span className="text-[10px] text-amber-800/70 shrink-0 ml-1 font-medium">
                          {channel.lastTime}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-amber-800/80 truncate line-clamp-1 font-medium">
                      {channel.lastMessage || channel.subtitle}
                    </p>

                    {channel.badge && (
                      <span className="inline-block mt-1 text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.2 rounded bg-amber-200/80 text-amber-900 border border-amber-300/50">
                        {channel.badge}
                      </span>
                    )}
                  </div>

                  {/* Unread badge */}
                  {channel.unreadCount && channel.unreadCount > 0 ? (
                    <span className="bg-amber-600 text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-1 shadow-xs">
                      {channel.unreadCount}
                    </span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>

        {/* Bottom Kid Profile & Shortcut Bar */}
        <div className="p-3 border-t border-amber-200/80 bg-amber-100/60 space-y-2">
          {/* Jubilee Proof of Participation Hub */}
          {onOpenJubileeHub && (
            <div className="space-y-1">
              <button
                onClick={() => {
                  onOpenJubileeHub();
                  onClose();
                }}
                className="w-full bg-amber-900 hover:bg-amber-950 text-amber-50 font-bold text-xs py-2 px-3 rounded-xl shadow-xs flex items-center justify-center space-x-2 transition active:scale-98 border border-amber-950/20 cursor-pointer"
                id="sidebar-jubilee-hub-btn"
              >
                <span className="text-sm">🌱</span>
                <span>Jubilee: Proof of Participation</span>
              </button>
              <div className="text-center">
                <span
                  className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md border ${
                    runtimeMode === 'shared_campfire'
                      ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                      : 'bg-amber-200/90 text-amber-950 border-amber-300'
                  }`}
                  id="sidebar-runtime-mode-badge"
                >
                  Runtime Mode: {runtimeMode === 'shared_campfire' ? 'Shared Campfire' : 'This-Device Demo'}
                </span>
              </div>
            </div>
          )}

          {/* ⚡ Quick Mini App launch */}
          <button
            onClick={() => {
              onOpenPantryApp();
              onClose();
            }}
            className="w-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-amber-950 font-bold text-xs py-2 px-3 rounded-xl shadow-xs flex items-center justify-center space-x-2 transition active:scale-98 border border-amber-500/20"
            id="sidebar-pantry-rescue-btn"
          >
            <Sparkles className="w-4 h-4 fill-amber-100 text-amber-900" />
            <span>Open ⚡ Pantry Rescue Mini-App</span>
          </button>

          {/* Child profile bar */}
          <div
            onClick={() => {
              onOpenKidProfile();
              onClose();
            }}
            className="bg-amber-200/50 hover:bg-amber-200/80 p-2.5 rounded-xl border border-amber-300/60 cursor-pointer flex items-center justify-between transition"
            id="sidebar-kid-profile-card"
          >
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-amber-300 flex items-center justify-center text-amber-950 font-bold text-xs shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-amber-950 truncate">
                  {kidProfile.name || 'Child Profile'} ({kidProfile.age || 'Toddler'})
                </div>
                <div className="text-[10px] text-amber-800 font-medium truncate">
                  Picky: {kidProfile.pickiness} • {kidProfile.allergies.length ? `${kidProfile.allergies.length} allergies` : 'No allergies'}
                </div>
              </div>
            </div>
            <span className="text-xs text-amber-800 font-bold hover:underline shrink-0 ml-1">
              Edit
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
