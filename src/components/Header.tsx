import React from 'react';
import { Camera, HelpCircle, Menu, Settings, ShieldAlert, Sparkles, User, Volume2, VolumeX } from 'lucide-react';
import { KidProfile } from '../types';

interface HeaderProps {
  activeChannelName: string;
  activeChannelAvatar: string;
  activeChannelSubtitle: string;
  kidProfile: KidProfile;
  runtimeMode?: 'shared_campfire' | 'this_device_demo';
  onOpenSos: () => void;
  onOpenPantryApp: () => void;
  onOpenKidProfile: () => void;
  onOpenPhotoAlbum: () => void;
  onOpenGroupManage: () => void;
  onOpenJubileeHub?: () => void;
  onOpenOnboarding: () => void;
  onToggleSidebar: () => void;
  audioMuted: boolean;
  onToggleAudioMute: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeChannelName,
  activeChannelAvatar,
  activeChannelSubtitle,
  kidProfile,
  runtimeMode = 'this_device_demo',
  onOpenSos,
  onOpenPantryApp,
  onOpenKidProfile,
  onOpenPhotoAlbum,
  onOpenGroupManage,
  onOpenJubileeHub,
  onOpenOnboarding,
  onToggleSidebar,
  audioMuted,
  onToggleAudioMute,
}) => {
  return (
    <header className="bg-amber-100/90 border-b border-amber-200 px-3 py-2 sm:px-4 flex items-center justify-between shadow-xs sticky top-0 z-30 backdrop-blur-md">
      {/* Left section: Hamburger for mobile + Active Chat Title */}
      <div className="flex items-center space-x-2 sm:space-x-2.5 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="md:hidden p-1.5 rounded-xl text-amber-900 hover:bg-amber-200/60 transition active:scale-95"
          title="Toggle Menu"
          id="toggle-sidebar-btn"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2 min-w-0 cursor-pointer" onClick={onOpenGroupManage}>
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-amber-200 text-lg flex items-center justify-center shrink-0 border border-amber-300 shadow-2xs">
            {activeChannelAvatar}
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-amber-950 text-xs sm:text-sm leading-tight truncate flex items-center space-x-1">
              <span>{activeChannelName}</span>
            </h1>
            <p className="text-[11px] text-amber-800/80 truncate font-medium">
              {activeChannelSubtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Right section: Action Buttons */}
      <div className="flex items-center space-x-1 sm:space-x-1.5 shrink-0">
        {/* Visible Runtime Mode Badge & Jubilee Hub Button */}
        {onOpenJubileeHub && (
          <div className="flex items-center space-x-1">
            <button
              onClick={onOpenJubileeHub}
              className="p-1.5 px-2.5 rounded-xl bg-amber-900 hover:bg-amber-950 text-amber-50 font-extrabold transition flex items-center space-x-1 text-xs shadow-2xs cursor-pointer"
              title="Jubilee: Proof of Participation"
              id="header-jubilee-hub-btn"
            >
              <span className="text-sm">🌱</span>
              <span className="hidden sm:inline">Jubilee</span>
            </button>

            <span
              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg border hidden lg:inline-block ${
                runtimeMode === 'shared_campfire'
                  ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                  : 'bg-amber-200 text-amber-950 border-amber-300'
              }`}
              id="runtime-mode-badge"
            >
              {runtimeMode === 'shared_campfire' ? 'Shared Campfire' : 'This-Device Demo'}
            </span>
          </div>
        )}

        {/* Photo Album Quick Access */}
        <button
          onClick={onOpenPhotoAlbum}
          className="p-2 rounded-xl bg-amber-200/80 hover:bg-amber-300/80 text-amber-950 transition flex items-center space-x-1 text-xs font-bold"
          title="Bnana Photo Album"
          id="header-photo-album-btn"
        >
          <Camera className="w-4 h-4 text-amber-900" />
          <span className="hidden md:inline">Album</span>
        </button>

        {/* Group Settings / Members */}
        <button
          onClick={onOpenGroupManage}
          className="p-2 rounded-xl bg-amber-200/80 hover:bg-amber-300/80 text-amber-950 transition flex items-center space-x-1 text-xs font-bold"
          title="Group & Member Settings"
          id="header-group-manage-btn"
        >
          <Settings className="w-4 h-4 text-amber-900" />
          <span className="hidden lg:inline">Settings</span>
        </button>

        {/* Audio Mute/Unmute readout */}
        <button
          onClick={onToggleAudioMute}
          className={`p-2 rounded-xl transition flex items-center justify-center ${
            audioMuted
              ? 'text-amber-700 hover:bg-amber-200/50'
              : 'text-amber-900 bg-amber-200/80 hover:bg-amber-300/80'
          }`}
          title={audioMuted ? 'Voice readout disabled' : 'Voice readout active'}
          id="audio-mute-btn"
        >
          {audioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-amber-900" />}
        </button>

        {/* ⚡ Pantry Rescue Mini-App */}
        <button
          onClick={onOpenPantryApp}
          className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-2.5 py-1.5 rounded-xl shadow-xs flex items-center space-x-1 transition active:scale-95"
          id="pantry-rescue-btn"
        >
          <Sparkles className="w-3.5 h-3.5 fill-amber-200 text-white animate-pulse" />
          <span className="hidden sm:inline">⚡ Rescue</span>
        </button>

        {/* 🚨 SOS Emergency Button */}
        <button
          onClick={onOpenSos}
          className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-2.5 py-1.5 rounded-xl shadow-xs flex items-center space-x-1 transition active:scale-95 animate-bounce-subtle"
          title="Emergency Toddler Meltdown Reset"
          id="sos-emergency-btn"
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>SOS</span>
        </button>

        {/* Help / Onboarding button */}
        <button
          onClick={onOpenOnboarding}
          className="p-1.5 rounded-xl text-amber-800 hover:bg-amber-200/60 transition"
          title="Setup & Help Guide"
          id="header-onboarding-help-btn"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};

