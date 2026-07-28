import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ChatView } from './components/ChatView';
import { PantryRescueApp } from './components/MiniApps/PantryRescueApp';
import { KidProfileModal } from './components/MiniApps/KidProfileModal';
import { SosModal } from './components/SosModal';
import { OnboardingModal } from './components/OnboardingModal';
import { PhotoAlbumModal } from './components/PhotoAlbumModal';
import { GroupManageModal } from './components/GroupManageModal';
import { JubileeHubModal } from './components/JubileeHubModal';
import { INITIAL_CHANNELS, INITIAL_MESSAGES } from './data/presetChannels';
import { useJubilee } from './domain/jubilee/useJubilee';
import {
  BasketOffer,
  ChatChannel,
  ChatMessage,
  KidProfile,
  ParticipationSeed,
  PhotoAlbumItem,
  RecipeCard,
} from './types';

const STORAGE_KEY_PROFILE = 'bananagram_kid_profile_v1';
const STORAGE_KEY_MESSAGES = 'bananagram_messages_v1';
const STORAGE_KEY_ONBOARDED = 'bananagram_onboarded_v1';

const DEFAULT_PROFILE: KidProfile = {
  name: 'Leo',
  age: '2.5 years',
  pickiness: 'High',
  allergies: ['Peanuts 🥜'],
  preferences: 'Crunchy crackers, banana coins, cheese cubes',
  dislikes: 'Green specs, mixed casserole textures',
  favoriteDips: ['Ketchup 🥫', 'Hummus 🧆'],
};

export default function App() {
  const [channels, setChannels] = useState<ChatChannel[]>(INITIAL_CHANNELS);
  const [activeChannelId, setActiveChannelId] = useState<string>('bananabot');

  // Load state from local storage or use defaults
  const [kidProfile, setKidProfile] = useState<KidProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PROFILE);
      return saved ? JSON.parse(saved) : DEFAULT_PROFILE;
    } catch (e) {
      return DEFAULT_PROFILE;
    }
  });

  const [messagesByChannel, setMessagesByChannel] = useState<Record<string, ChatMessage[]>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MESSAGES);
      return saved ? JSON.parse(saved) : INITIAL_MESSAGES;
    } catch (e) {
      return INITIAL_MESSAGES;
    }
  });

  // Jubilee Domain Gateway Connection
  const currentUserName = 'Local Member (You)';
  const {
    runtimeMode,
    offers,
    seeds,
    receipts,
    addOffer,
    addSeed,
    pledgeNeed,
    confirmFulfillment,
  } = useJubilee({
    id: 'usr-local',
    name: currentUserName,
    role: 'Member',
  });

  // UI Modals
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [pantryAppOpen, setPantryAppOpen] = useState<boolean>(false);
  const [sosModalOpen, setSosModalOpen] = useState<boolean>(false);
  const [kidProfileModalOpen, setKidProfileModalOpen] = useState<boolean>(false);
  const [jubileeHubOpen, setJubileeHubOpen] = useState<boolean>(false);
  const [onboardingOpen, setOnboardingOpen] = useState<boolean>(() => {
    try {
      return !localStorage.getItem(STORAGE_KEY_ONBOARDED);
    } catch (e) {
      return true;
    }
  });
  const [photoAlbumOpen, setPhotoAlbumOpen] = useState<boolean>(false);
  const [groupManageOpen, setGroupManageOpen] = useState<boolean>(false);
  const [audioMuted, setAudioMuted] = useState<boolean>(false);

  // Save to local storage on updates
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(kidProfile));
    } catch (e) {
      console.error(e);
    }
  }, [kidProfile]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messagesByChannel));
    } catch (e) {
      console.error(e);
    }
  }, [messagesByChannel]);

  const activeChannel = channels.find((c) => c.id === activeChannelId) || channels[0];
  const activeMessages = messagesByChannel[activeChannelId] || [];

  // Helper to append message to active channel
  const addMessageToChannel = (channelId: string, message: ChatMessage) => {
    setMessagesByChannel((prev) => {
      const existing = prev[channelId] || [];
      return {
        ...prev,
        [channelId]: [...existing, message],
      };
    });

    // Update channel list last message summary
    setChannels((prev) =>
      prev.map((c) =>
        c.id === channelId
          ? {
              ...c,
              lastMessage: message.text || (message.recipeCard ? message.recipeCard.title : 'Attachment'),
              lastTime: message.timestamp,
            }
          : c
      )
    );
  };

  // Main Send Message Handler with Telegram Bot Commands / Jubilee triggers
  const handleSendMessage = async (text: string, imageUri?: string) => {
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: timeNow,
      imageUri,
      status: 'sent',
    };

    addMessageToChannel(activeChannelId, userMsg);

    // Inline Command Triggers for Jubilee Proof of Participation
    if (text.startsWith('/offer ')) {
      const offerText = text.replace('/offer ', '').trim();
      const res = await addOffer({
        title: offerText,
        category: 'Care',
        contributorName: currentUserName,
        availability: 'Immediate',
        boundary: 'First Campfire local radius',
        icon: '🌱',
      });

      const sysReply: ChatMessage = {
        id: `sys-offer-${Date.now()}`,
        sender: 'bot',
        senderName: 'Jubilee Bot 🤖',
        text: res.success
          ? `🌱 **Offer Saved to Shared Basket**: "${offerText}"\n\nYour offer is now active in the neighborhood basket! (${runtimeMode === 'shared_campfire' ? 'Shared Campfire' : 'This-Device Demo'})`
          : `⚠️ **Offer Error**: ${res.error}`,
        timestamp: timeNow,
      };
      addMessageToChannel(activeChannelId, sysReply);
      return;
    }

    if (text.startsWith('/need ')) {
      const needText = text.replace('/need ', '').trim();
      const res = await addSeed({
        title: needText,
        stage: 'Seed',
        authorName: currentUserName,
        description: `Community need created via ${activeChannel.name}`,
        needs: [{ id: `n-${Date.now()}`, title: needText, category: 'Tools', status: 'open' }],
        makesPossible: ['Enhanced neighborhood resilience'],
        graftsCount: 1,
        harvestsCount: 0,
      });

      // Check matching basket offers in current state
      const matchingOffers = offers.filter(
        (off) =>
          off.title.toLowerCase().includes(needText.toLowerCase()) ||
          needText.toLowerCase().includes(off.category.toLowerCase())
      );

      const matchNotice =
        matchingOffers.length > 0
          ? `\n\n🔍 **Matching Shared Basket Offers Found**:\n${matchingOffers
              .map((o) => `• ${o.icon} ${o.title} (${o.contributorName})`)
              .join('\n')}`
          : '\n\nNo exact basket match found yet. Notified local neighborhood circle!';

      const sysReply: ChatMessage = {
        id: `sys-need-${Date.now()}`,
        sender: 'bot',
        senderName: 'Jubilee Bot 🤖',
        text: res.success
          ? `🌿 **Possibility Seed Created**: "${needText}"${matchNotice}\n\nCheck the **Jubilee Participation Hub** to manage pledges and grafts.`
          : `⚠️ **Seed Error**: ${res.error}`,
        timestamp: timeNow,
      };
      addMessageToChannel(activeChannelId, sysReply);
      return;
    }

    if (text.startsWith('/remember ')) {
      const memText = text.replace('/remember ', '').trim();
      const res = await addOffer({
        title: `Remember: ${memText}`,
        category: 'Skills',
        contributorName: currentUserName,
        availability: 'Recorded',
        boundary: 'Memory',
        icon: '📜',
      });

      const sysReply: ChatMessage = {
        id: `sys-rem-${Date.now()}`,
        sender: 'bot',
        senderName: 'Jubilee Bot 🤖',
        text: res.success
          ? `📜 **Participation Recorded**: "${memText}"\n\nRecorded in ${runtimeMode === 'shared_campfire' ? 'Shared Campfire Witness Ledger' : 'This-Device Demo Activity Log'}.`
          : `⚠️ **Record Error**: ${res.error}`,
        timestamp: timeNow,
      };
      addMessageToChannel(activeChannelId, sysReply);
      return;
    }

    // If active channel is BananaBot, invoke backend API
    if (activeChannelId === 'bananabot') {
      try {
        let botText = '';
        const currentHistory = (messagesByChannel['bananabot'] || []).slice(-6);

        if (imageUri) {
          // Multimodal image analysis
          const res = await fetch('/api/analyze-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageBase64: imageUri,
              kidProfile,
            }),
          });
          const data = await res.json();
          botText = data.analysis || "I see some great ingredients! Let's make something toddler-approved!";
        } else {
          // Standard text chat
          const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: text,
              history: currentHistory,
              kidProfile,
            }),
          });
          const data = await res.json();
          botText = data.reply || data.fallbackReply;
        }

        const botMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          senderName: 'BananaBot 🍌',
          text: botText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        addMessageToChannel('bananabot', botMsg);
      } catch (err) {
        console.error(err);
        const botMsg: ChatMessage = {
          id: `bot-err-${Date.now()}`,
          sender: 'bot',
          senderName: 'BananaBot 🍌',
          text: "🍌 *Quick Rescue Tip*: When in doubt, a 'Deconstructed Snack Plate' with crackers, cheese coins, and banana slices is 100% toddler safe! You're doing an amazing job, mom!",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        addMessageToChannel('bananabot', botMsg);
      }
    }
  };

  // Send recipe directly to Co-Parent / Partner chat
  const handleShareToPartner = (text: string, recipeCard?: RecipeCard) => {
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const shareMsg: ChatMessage = {
      id: `share-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: timeNow,
      recipeCard,
    };

    addMessageToChannel('partner', shareMsg);
    setActiveChannelId('partner');
  };

  // Send recipe card generated from Pantry Rescue Mini-App into active thread
  const handleSendRecipeFromApp = (recipeCard: RecipeCard) => {
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const msg: ChatMessage = {
      id: `pantry-recipe-${Date.now()}`,
      sender: 'bot',
      senderName: 'BananaBot 🍌 (Mini-App)',
      text: `⚡ Here is a 3-step Pantry Rescue recipe for ${kidProfile.name || 'Kiddo'}:`,
      timestamp: timeNow,
      recipeCard,
    };

    addMessageToChannel(activeChannelId, msg);
  };

  // Photo Album handlers
  const handleAddPhotoToChannel = (photo: PhotoAlbumItem) => {
    setChannels((prev) =>
      prev.map((c) =>
        c.id === activeChannelId
          ? {
              ...c,
              photos: [photo, ...(c.photos || [])],
            }
          : c
      )
    );
  };

  const handleSendPhotoToChat = (photo: PhotoAlbumItem) => {
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const msg: ChatMessage = {
      id: `photo-msg-${Date.now()}`,
      sender: 'user',
      text: `📸 **Shared Photo from Album**: ${photo.caption}\n\n✨ *Gemini AI Note*: ${photo.aiAnalysis || 'Nutritious & toddler safe!'}`,
      imageUri: photo.imageUri,
      timestamp: timeNow,
    };

    addMessageToChannel(activeChannelId, msg);
  };

  // Group Management Handlers
  const handleUpdateGroup = (updatedChannel: ChatChannel) => {
    setChannels((prev) => prev.map((c) => (c.id === updatedChannel.id ? updatedChannel : c)));
  };

  const handleCreateNewGroup = (newChannel: ChatChannel) => {
    setChannels((prev) => [newChannel, ...prev]);
    setActiveChannelId(newChannel.id);
  };

  const handleCloseOnboarding = () => {
    setOnboardingOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY_ONBOARDED, 'true');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-amber-50 font-sans antialiased selection:bg-amber-300">
      {/* Sidebar Navigation */}
      <Sidebar
        channels={channels}
        activeChannelId={activeChannelId}
        onSelectChannel={(id) => setActiveChannelId(id)}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenPantryApp={() => setPantryAppOpen(true)}
        onOpenKidProfile={() => setKidProfileModalOpen(true)}
        onOpenGroupManage={() => setGroupManageOpen(true)}
        onOpenPhotoAlbum={() => setPhotoAlbumOpen(true)}
        onOpenJubileeHub={() => setJubileeHubOpen(true)}
        kidProfile={kidProfile}
        runtimeMode={runtimeMode}
      />

      {/* Main App Canvas */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        <Header
          activeChannelName={activeChannel.name}
          activeChannelAvatar={activeChannel.avatar}
          activeChannelSubtitle={activeChannel.subtitle}
          kidProfile={kidProfile}
          runtimeMode={runtimeMode}
          onOpenSos={() => setSosModalOpen(true)}
          onOpenPantryApp={() => setPantryAppOpen(true)}
          onOpenKidProfile={() => setKidProfileModalOpen(true)}
          onOpenPhotoAlbum={() => setPhotoAlbumOpen(true)}
          onOpenGroupManage={() => setGroupManageOpen(true)}
          onOpenJubileeHub={() => setJubileeHubOpen(true)}
          onOpenOnboarding={() => setOnboardingOpen(true)}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          audioMuted={audioMuted}
          onToggleAudioMute={() => setAudioMuted(!audioMuted)}
        />

        <ChatView
          channel={activeChannel}
          messages={activeMessages}
          onSendMessage={handleSendMessage}
          onOpenPantryApp={() => setPantryAppOpen(true)}
          onOpenSos={() => setSosModalOpen(true)}
          onOpenPhotoAlbum={() => setPhotoAlbumOpen(true)}
          onOpenGroupManage={() => setGroupManageOpen(true)}
          onOpenJubileeHub={() => setJubileeHubOpen(true)}
          onShareToPartner={handleShareToPartner}
          kidProfile={kidProfile}
          audioMuted={audioMuted}
        />
      </div>

      {/* Mini-Apps & Overlays */}
      <OnboardingModal
        isOpen={onboardingOpen}
        onClose={handleCloseOnboarding}
        kidProfile={kidProfile}
        onSaveProfile={(updated) => setKidProfile(updated)}
      />

      <PhotoAlbumModal
        isOpen={photoAlbumOpen}
        onClose={() => setPhotoAlbumOpen(false)}
        channelName={activeChannel.name}
        photos={activeChannel.photos || []}
        onAddPhoto={handleAddPhotoToChannel}
        onSendPhotoToChat={handleSendPhotoToChat}
        kidProfile={kidProfile}
      />

      <GroupManageModal
        isOpen={groupManageOpen}
        onClose={() => setGroupManageOpen(false)}
        channel={activeChannel}
        messages={activeMessages}
        onUpdateGroup={handleUpdateGroup}
        onCreateNewGroup={handleCreateNewGroup}
      />

      <PantryRescueApp
        isOpen={pantryAppOpen}
        onClose={() => setPantryAppOpen(false)}
        kidProfile={kidProfile}
        onSendRecipeToChat={handleSendRecipeFromApp}
      />

      <KidProfileModal
        isOpen={kidProfileModalOpen}
        onClose={() => setKidProfileModalOpen(false)}
        kidProfile={kidProfile}
        onSaveProfile={(updated) => setKidProfile(updated)}
      />

      <SosModal
        isOpen={sosModalOpen}
        onClose={() => setSosModalOpen(false)}
        kidProfile={kidProfile}
        audioMuted={audioMuted}
      />

      <JubileeHubModal
        isOpen={jubileeHubOpen}
        onClose={() => setJubileeHubOpen(false)}
        offers={offers}
        seeds={seeds}
        receipts={receipts}
        runtimeMode={runtimeMode}
        currentUserName={currentUserName}
        onAddOffer={(off) => addOffer(off)}
        onAddSeed={(sd) => addSeed(sd)}
        onPledgeNeed={(seedId, needId, pledgedBy) => pledgeNeed(seedId, needId, pledgedBy)}
        onConfirmFulfillment={(seedId, needId) => confirmFulfillment(seedId, needId)}
        onSendToChatChannel={(text) => handleSendMessage(text)}
      />
    </div>
  );
}


