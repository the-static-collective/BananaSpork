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
import { CapacitorNativeHandler } from './components/CapacitorNativeHandler';
import { CampfireConnectionPanel } from './components/CampfireConnectionPanel';
import {
  createActionProposal,
  confirmActionProposal,
  getLocalProposals,
} from './domain/campfire/campfireService';
import { apiJson } from './lib/api';
import { useCampfireSession } from './integrations/supabase/useCampfireSession';

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

  const campfireConnection = useCampfireSession();

  // Jubilee Domain Gateway Connection
  const currentUserName = campfireConnection.currentUser?.name || 'Local Member (You)';
  const currentUserObj = React.useMemo(
    () =>
      campfireConnection.currentUser || {
        id: 'usr-local',
        name: 'Local Member (You)',
        role: 'Member' as const,
      },
    [campfireConnection.currentUser]
  );
  const {
    runtimeMode,
    offers,
    seeds,
    receipts,
    addOffer,
    addSeed,
    pledgeNeed,
    acceptPledgedOffer,
    reportFulfillment,
    confirmFulfillment,
    refreshing: refreshingCampfire,
    refreshError,
  } = useJubilee(
    currentUserObj,
    campfireConnection.status === 'ready' ? campfireConnection.activeCircleId : undefined
  );

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
  const [actionNotice, setActionNotice] = useState<{
    kind: 'success' | 'error' | 'local';
    text: string;
  }>();

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
    const proposal = getLocalProposals().find((item) => item.id === proposalId);
    if (!proposal) return;

    let result: { success: boolean; error?: string } = { success: true };

    // Execute only the authority action actually supported for this proposal.
    if (proposal.verb === 'need') {
      result = await addSeed({
        title: proposal.title,
        stage: 'Seed',
        authorName: currentUserName,
        description: proposal.description,
        needs: [
          {
            id: `n-${Date.now()}`,
            title: proposal.title,
            category: proposal.details?.category || 'Care',
            status: 'open',
          },
        ],
        makesPossible: ['Household care'],
        graftsCount: 1,
        harvestsCount: 0,
      });
    } else if (proposal.verb === 'offer') {
      result = await addOffer({
        title: proposal.title,
        category: proposal.details?.category || 'Care',
        contributorName: currentUserName,
        availability: 'Available now',
        boundary: 'Household / Neighborhood circle',
        icon: '🌱',
      });
    } else if (proposal.verb === 'remember') {
      result = await addOffer({
        title: `Remember: ${proposal.title}`,
        category: 'Skills',
        contributorName: currentUserName,
        availability: 'Recorded',
        boundary: 'Memory',
        icon: '📜',
      });
    }

    if (!result.success) {
      setActionNotice({
        kind: 'error',
        text:
          result.error ||
          'This proposal remains local because the requested shared authority command failed.',
      });
      return;
    }

    const confirmed = confirmActionProposal(proposalId);
    if (!confirmed) return;
    setProposals(getLocalProposals());
    const acceptedLocallyOnly = confirmed.verb === 'task' || confirmed.verb === 'event';
    setActionNotice({
      kind:
        runtimeMode === 'shared_campfire' && !acceptedLocallyOnly ? 'success' : 'local',
      text: acceptedLocallyOnly
        ? 'Proposal accepted on this device. Task and event authority commands do not exist yet.'
        : runtimeMode === 'shared_campfire'
          ? 'The authority command succeeded and the shared Campfire was refreshed.'
          : 'Accepted on this device. This is not shared or chain-verified history.',
    });

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

  const handlePledgeNeed = async (seedId: string, needId: string, pledgedBy: string) => {
    const result = await pledgeNeed(seedId, needId, pledgedBy);
    setActionNotice({
      kind: result.success ? (runtimeMode === 'shared_campfire' ? 'success' : 'local') : 'error',
      text: result.success
        ? runtimeMode === 'shared_campfire'
          ? 'Offer pledged through the authenticated authority command.'
          : 'Pledge recorded on this device only.'
        : result.error || 'The pledge was not recorded.',
    });
  };

  const handleAcceptOffer = async (offerId: string) => {
    const result = await acceptPledgedOffer(offerId);
    setActionNotice({
      kind: result.success ? 'success' : 'error',
      text: result.success
        ? 'Offer accepted through household authority.'
        : result.error || 'The offer was not accepted.',
    });
  };

  const handleReportFulfillment = async (offerId: string) => {
    const result = await reportFulfillment(offerId, 'Reported fulfilled via NanaSpork');
    setActionNotice({
      kind: result.success ? 'success' : 'error',
      text: result.success
        ? 'Fulfillment reported. A household witness must still confirm it.'
        : result.error || 'Fulfillment was not reported.',
    });
  };

  const handleConfirmFulfillment = async (seedId: string, offerId: string) => {
    const result = await confirmFulfillment(seedId, offerId);
    setActionNotice({
      kind: result.success ? (runtimeMode === 'shared_campfire' ? 'success' : 'local') : 'error',
      text: result.success
        ? runtimeMode === 'shared_campfire'
          ? 'Fulfillment confirmed by household authority.'
          : 'Fulfillment marked on this device only.'
        : result.error || 'Fulfillment was not confirmed.',
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
          const data = await apiJson<{ analysis?: string }>('/api/analyze-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: imageUri, kidProfile }),
          });
          botText = data.analysis || "I see some great ingredients! Let's make something toddler-approved!";
        } else {
          const data = await apiJson<{ reply?: string; fallbackReply?: string }>('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text, history: currentHistory, kidProfile }),
          });
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
        setActionNotice({
          kind: 'error',
          text:
            err instanceof Error
              ? `BananaBot is unavailable: ${err.message}`
              : 'BananaBot could not reach the configured AI service.',
        });
        const botMsg: ChatMessage = {
          id: `bot-err-${Date.now()}`,
          sender: 'bot',
          senderName: 'BananaBot 🍌',
          text: "🍌 I couldn't reach the AI service. Your message remains on this device. A built-in fallback: try a small deconstructed plate using only foods already known to be safe for your child, and check every label against their allergy plan.",
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

  const isAnyModalOpen =
    universalComposerOpen ||
    onboardingOpen ||
    photoAlbumOpen ||
    groupManageOpen ||
    pantryAppOpen ||
    kidProfileModalOpen ||
    sosModalOpen ||
    jubileeHubOpen ||
    sidebarOpen;

  const handleCloseAllModals = () => {
    setUniversalComposerOpen(false);
    setOnboardingOpen(false);
    setPhotoAlbumOpen(false);
    setGroupManageOpen(false);
    setPantryAppOpen(false);
    setKidProfileModalOpen(false);
    setSosModalOpen(false);
    setJubileeHubOpen(false);
    setSidebarOpen(false);
  };

  return (
    <div className="app-shell flex flex-col w-screen overflow-hidden bg-amber-50 font-sans antialiased selection:bg-amber-300">
      <CapacitorNativeHandler
        activeModalOpen={isAnyModalOpen}
        onCloseModal={handleCloseAllModals}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

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

      {activeTab !== 'today' && (refreshError || actionNotice) && (
        <div
          className={`shrink-0 border-b px-4 py-2 text-[11px] font-semibold ${
            refreshError || actionNotice?.kind === 'error'
              ? 'border-red-300 bg-red-50 text-red-800'
              : actionNotice?.kind === 'local'
                ? 'border-amber-300 bg-amber-100 text-amber-900'
                : 'border-emerald-300 bg-emerald-50 text-emerald-800'
          }`}
          role={refreshError || actionNotice?.kind === 'error' ? 'alert' : 'status'}
        >
          {refreshError || actionNotice?.text}
        </div>
      )}

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
            currentUser={currentUserObj}
            connectionPanel={
              <div className="space-y-2">
                <CampfireConnectionPanel connection={campfireConnection} />
                {(refreshingCampfire || refreshError || actionNotice) && (
                  <div
                    className={`rounded-xl border px-3 py-2 text-[11px] font-semibold ${
                      refreshError || actionNotice?.kind === 'error'
                        ? 'border-red-300 bg-red-50 text-red-800'
                        : actionNotice?.kind === 'local'
                          ? 'border-amber-300 bg-amber-100 text-amber-900'
                          : 'border-emerald-300 bg-emerald-50 text-emerald-800'
                    }`}
                    role={refreshError || actionNotice?.kind === 'error' ? 'alert' : 'status'}
                  >
                    {refreshError ||
                      actionNotice?.text ||
                      (refreshingCampfire ? 'Refreshing shared Campfire history…' : '')}
                  </div>
                )}
              </div>
            }
            onPledgeNeed={(seedId, needId, pledgedBy) =>
              void handlePledgeNeed(seedId, needId, pledgedBy)
            }
            onAcceptOffer={(offerId) => void handleAcceptOffer(offerId)}
            onReportFulfillment={(offerId) => void handleReportFulfillment(offerId)}
            onConfirmFulfillment={(seedId, offerId) =>
              void handleConfirmFulfillment(seedId, offerId)
            }
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
            runtimeMode={runtimeMode}
            currentUserRole={currentUserObj.role}
            onOpenUniversalComposer={() => setUniversalComposerOpen(true)}
            onPledgeNeed={(seedId, needId, pledgedBy) =>
              void handlePledgeNeed(seedId, needId, pledgedBy)
            }
          />
        )}

        {/* TAB 4: GROW */}
        {activeTab === 'grow' && (
          <GrowView
            seeds={seeds}
            currentUser={currentUserObj}
            onOpenUniversalComposer={() => setUniversalComposerOpen(true)}
            onPledgeNeed={(seedId, needId, pledgedBy) =>
              void handlePledgeNeed(seedId, needId, pledgedBy)
            }
            onAcceptOffer={(offerId) => void handleAcceptOffer(offerId)}
            onReportFulfillment={(offerId) => void handleReportFulfillment(offerId)}
            onConfirmFulfillment={(seedId, offerId) =>
              void handleConfirmFulfillment(seedId, offerId)
            }
          />
        )}

        {/* TAB 5: REMEMBER */}
        {activeTab === 'remember' && (
          <RememberView
            receipts={receipts}
            photos={activeChannel.photos || []}
            runtimeMode={runtimeMode}
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
