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
import { CampfireTab, ActionVerb, ActionProposal } from './domain/campfire/types';
import { CampfireNavBar } from './domain/campfire/CampfireNavBar';
import { TodayView } from './domain/campfire/TodayView';
import { BasketView } from './domain/campfire/BasketView';
import { GrowView } from './domain/campfire/GrowView';
import { RememberView } from './domain/campfire/RememberView';
import { UniversalComposerModal } from './domain/campfire/UniversalComposerModal';
import {
  createActionProposal,
  confirmActionProposal,
  getLocalProposals,
} from './domain/campfire/campfireService';

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
  // Navigation Shell State (Default signed-in view = 'today')
  const [activeTab, setActiveTab] = useState<CampfireTab>('today');
  const [universalComposerOpen, setUniversalComposerOpen] = useState<boolean>(false);
  const [proposals, setProposals] = useState<ActionProposal[]>(() => getLocalProposals());

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
  const currentUserObj = React.useMemo(
    () => ({
      id: 'usr-local',
      name: currentUserName,
      role: 'Member' as const,
    }),
    [currentUserName]
  );
  const {
    runtimeMode,
    offers,
    seeds,
    receipts,
    addOffer,
    addSeed,
    pledgeNeed,
    confirmFulfillment,
  } = useJubilee(currentUserObj);

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

  // Create Universal Action Proposal (Message-to-Action)
  const handleCreateProposal = async (
    verb: ActionVerb,
    title: string,
    description: string,
    details?: { category?: any; dateOrTime?: string }
  ) => {
    const prop = createActionProposal(
      verb,
      title,
      currentUserName,
      description,
      details
    );

    setProposals(getLocalProposals());

    // Post proposal card into Porch active chat channel
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msg: ChatMessage = {
      id: `prop-msg-${Date.now()}`,
      sender: 'user',
      senderName: currentUserName,
      text: `Proposal created: ${verb.toUpperCase()} "${title}"`,
      timestamp: timeNow,
      proposal: prop,
    };

    addMessageToChannel(activeChannelId, msg);
  };

  // Review & Confirm Action Proposal
  const handleConfirmProposal = async (proposalId: string) => {
    const confirmed = confirmActionProposal(proposalId);
    if (!confirmed) return;

    setProposals(getLocalProposals());

    // Execute domain side effects depending on verb
    if (confirmed.verb === 'need') {
      await addSeed({
        title: confirmed.title,
        stage: 'Seed',
        authorName: currentUserName,
        description: confirmed.description,
        needs: [
          {
            id: `n-${Date.now()}`,
            title: confirmed.title,
            category: confirmed.details?.category || 'Care',
            status: 'open',
          },
        ],
        makesPossible: ['Household care'],
        graftsCount: 1,
        harvestsCount: 0,
      });
    } else if (confirmed.verb === 'offer') {
      await addOffer({
        title: confirmed.title,
        category: confirmed.details?.category || 'Care',
        contributorName: currentUserName,
        availability: 'Available now',
        boundary: 'Household / Neighborhood circle',
        icon: '🌱',
      });
    } else if (confirmed.verb === 'remember') {
      await addOffer({
        title: `Remember: ${confirmed.title}`,
        category: 'Skills',
        contributorName: currentUserName,
        availability: 'Recorded',
        boundary: 'Memory',
        icon: '📜',
      });
    }

    // Update messages containing this proposal to show confirmed status
    setMessagesByChannel((prev) => {
      const updated: Record<string, ChatMessage[]> = {};
      Object.keys(prev).forEach((chId) => {
        updated[chId] = prev[chId].map((m) => {
          if (m.proposal && m.proposal.id === proposalId) {
            return {
              ...m,
              proposal: {
                ...m.proposal,
                status: 'confirmed',
              },
            };
          }
          return m;
        });
      });
      return updated;
    });
  };

  // Main Send Message Handler
  const handleSendMessage = async (text: string, imageUri?: string, proposal?: ActionProposal) => {
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: timeNow,
      imageUri,
      proposal,
      status: 'sent',
    };

    addMessageToChannel(activeChannelId, userMsg);

    if (proposal) {
      setProposals(getLocalProposals());
    }

    // AI Assistant response for BananaBot
    if (activeChannelId === 'bananabot' && !proposal) {
      try {
        let botText = '';
        const currentHistory = (messagesByChannel['bananabot'] || []).slice(-6);

        if (imageUri) {
          const res = await fetch('/api/analyze-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: imageUri, kidProfile }),
          });
          const data = await res.json();
          botText = data.analysis || "I see some great ingredients! Let's make something toddler-approved!";
        } else {
          const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text, history: currentHistory, kidProfile }),
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
          text: "🍌 *Quick Rescue Tip*: When in doubt, a 'Deconstructed Snack Plate' with crackers, cheese coins, and banana slices is 100% toddler safe!",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        addMessageToChannel('bananabot', botMsg);
      }
    }
  };

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
    setActiveTab('porch');
  };

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
    setActiveTab('porch');
  };

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
    setActiveTab('porch');
  };

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

  const unreadChatTotal = channels.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-amber-50 font-sans antialiased selection:bg-amber-300">
      {/* Campfire Header */}
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

      {/* Campfire Household Navigation Bar */}
      <CampfireNavBar
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        onOpenUniversalComposer={() => setUniversalComposerOpen(true)}
        unreadChatCount={unreadChatTotal}
      />

      {/* Primary Tab Views */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* TAB 1: TODAY (Default Signed-In View) */}
        {activeTab === 'today' && (
          <TodayView
            seeds={seeds}
            offers={offers}
            receipts={receipts}
            kidProfile={kidProfile}
            proposals={proposals}
            runtimeMode={runtimeMode}
            onPledgeNeed={(seedId, needId, pledgedBy) => pledgeNeed(seedId, needId, pledgedBy)}
            onConfirmFulfillment={(seedId, needId) => confirmFulfillment(seedId, needId)}
            onConfirmProposal={handleConfirmProposal}
            onOpenPantryRescue={() => setPantryAppOpen(true)}
            onOpenUniversalComposer={() => setUniversalComposerOpen(true)}
            onNavigateToTab={(tab) => setActiveTab(tab)}
          />
        )}

        {/* TAB 2: PORCH (Conversation Shell / Chat) */}
        {activeTab === 'porch' && (
          <div className="flex-1 flex w-full h-full overflow-hidden">
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

            <ChatView
              channel={activeChannel}
              messages={activeMessages}
              onSendMessage={handleSendMessage}
              onConfirmProposal={handleConfirmProposal}
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
        )}

        {/* TAB 3: BASKET */}
        {activeTab === 'basket' && (
          <BasketView
            offers={offers}
            seeds={seeds}
            onOpenUniversalComposer={() => setUniversalComposerOpen(true)}
            onPledgeNeed={(seedId, needId, pledgedBy) => pledgeNeed(seedId, needId, pledgedBy)}
          />
        )}

        {/* TAB 4: GROW */}
        {activeTab === 'grow' && (
          <GrowView
            seeds={seeds}
            onOpenUniversalComposer={() => setUniversalComposerOpen(true)}
            onPledgeNeed={(seedId, needId, pledgedBy) => pledgeNeed(seedId, needId, pledgedBy)}
            onConfirmFulfillment={(seedId, needId) => confirmFulfillment(seedId, needId)}
          />
        )}

        {/* TAB 5: REMEMBER */}
        {activeTab === 'remember' && (
          <RememberView
            receipts={receipts}
            photos={activeChannel.photos || []}
            onOpenUniversalComposer={() => setUniversalComposerOpen(true)}
            onOpenPhotoAlbum={() => setPhotoAlbumOpen(true)}
            onOpenJubileeHub={() => setJubileeHubOpen(true)}
          />
        )}
      </div>

      {/* Universal Create Composer Modal */}
      <UniversalComposerModal
        isOpen={universalComposerOpen}
        onClose={() => setUniversalComposerOpen(false)}
        onSubmitProposal={handleCreateProposal}
      />

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
