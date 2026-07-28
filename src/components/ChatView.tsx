import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Camera,
  Mic,
  MicOff,
  Volume2,
  Share2,
  Bookmark,
  Pin,
  CheckCheck,
  AlertTriangle,
  Clock,
  ChevronRight,
  Smile,
  X,
} from 'lucide-react';
import { ChatChannel, ChatMessage, KidProfile, RecipeCard } from '../types';
import { DonkeyModal } from '../domain/donkey/DonkeyModal';

interface ChatViewProps {
  channel: ChatChannel;
  messages: ChatMessage[];
  onSendMessage: (text: string, imageUri?: string) => void;
  onOpenPantryApp: () => void;
  onOpenSos: () => void;
  onOpenPhotoAlbum?: () => void;
  onOpenGroupManage?: () => void;
  onOpenJubileeHub?: () => void;
  onShareToPartner: (text: string, recipeCard?: RecipeCard) => void;
  kidProfile: KidProfile;
  audioMuted: boolean;
}

export const ChatView: React.FC<ChatViewProps> = ({
  channel,
  messages,
  onSendMessage,
  onOpenPantryApp,
  onOpenSos,
  onOpenPhotoAlbum,
  onOpenGroupManage,
  onOpenJubileeHub,
  onShareToPartner,
  kidProfile,
  audioMuted,
}) => {
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [savedRecipes, setSavedRecipes] = useState<Record<string, boolean>>({});
  const [donkeyModalOpen, setDonkeyModalOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Speech Recognition Setup
  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInputText(transcript);
      };

      rec.onerror = (err: any) => {
        console.error('Speech recognition error', err);
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. You can type your message!');
      return;
    }
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Image Upload Handler
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Text-To-Speech Readout
  const speakText = (msgId: string, text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.replace(/[*#_]/g, ''));
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);

    setSpeakingMsgId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  const handleSend = () => {
    if (!inputText.trim() && !selectedImage) return;
    onSendMessage(inputText.trim(), selectedImage || undefined);
    setInputText('');
    setSelectedImage(null);
  };

  const toggleSaveRecipe = (title: string) => {
    setSavedRecipes((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-57px)] bg-amber-50/40 relative overflow-hidden">
      {/* Pinned Message Banner */}
      {channel.pinnedMessage && (
        <div className="bg-amber-200/80 border-b border-amber-300/80 px-3 py-2 flex items-center justify-between text-xs text-amber-950 font-semibold shadow-2xs">
          <div className="flex items-center space-x-2 min-w-0">
            <Pin className="w-3.5 h-3.5 text-amber-800 shrink-0 transform -rotate-45" />
            <span className="truncate">{channel.pinnedMessage}</span>
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3.5">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          const isBot = msg.sender === 'bot';
          const isChannel = msg.sender === 'channel';

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-2xl mx-auto`}
            >
              {/* Sender label for channels or bot */}
              {!isUser && msg.senderName && (
                <span className="text-[11px] font-bold text-amber-800/80 mb-1 ml-1">
                  {msg.senderName}
                </span>
              )}

              {/* Message Bubble Container */}
              <div
                className={`relative group rounded-2xl px-4 py-3 text-sm shadow-2xs transition-all ${
                  isUser
                    ? 'bg-amber-900 text-amber-50 rounded-br-2xs'
                    : isBot
                    ? 'bg-amber-100 text-amber-950 border border-amber-200/90 rounded-bl-2xs'
                    : 'bg-white text-slate-900 border border-amber-200/80 rounded-bl-2xs'
                }`}
                id={`msg-bubble-${msg.id}`}
              >
                {/* Image payload if attached */}
                {msg.imageUri && (
                  <div className="mb-2.5 rounded-xl overflow-hidden border border-amber-300/50 max-h-64 bg-black/10">
                    <img
                      src={msg.imageUri}
                      alt="Attachment"
                      className="w-full object-cover max-h-64"
                    />
                  </div>
                )}

                {/* Main Message Text */}
                <div className="whitespace-pre-wrap leading-relaxed font-normal">
                  {msg.text}
                </div>

                {/* Recipe Card Component if present */}
                {msg.recipeCard && (
                  <div className="mt-3 bg-amber-50/90 border border-amber-300 rounded-xl p-3 text-amber-950 shadow-xs">
                    <div className="flex items-center justify-between border-b border-amber-200/80 pb-2 mb-2">
                      <h4 className="font-bold text-amber-950 text-sm flex items-center space-x-1.5">
                        <span>{msg.recipeCard.title}</span>
                      </h4>
                      <span className="text-[11px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{msg.recipeCard.timeMins} min</span>
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="font-bold text-amber-900">Ingredients: </span>
                        <span className="text-amber-800">
                          {msg.recipeCard.ingredientsUsed.join(', ')}
                        </span>
                      </div>

                      <div>
                        <span className="font-bold text-amber-900">3-Step Prep:</span>
                        <ol className="list-decimal list-inside space-y-1 mt-1 text-amber-900">
                          {msg.recipeCard.steps.map((step, idx) => (
                            <li key={idx} className="leading-snug">
                              {step}
                            </li>
                          ))}
                        </ol>
                      </div>

                      <div className="bg-amber-100/90 p-2 rounded-lg border border-amber-200/90 text-amber-900 flex items-start space-x-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-amber-950">Picky Eater Hack: </strong>
                          {msg.recipeCard.pickyHack}
                        </div>
                      </div>

                      {/* Recipe Actions */}
                      <div className="flex items-center justify-between pt-1.5 border-t border-amber-200/60 text-[11px]">
                        <span className="text-emerald-700 font-bold flex items-center space-x-1">
                          <CheckCheck className="w-3.5 h-3.5" />
                          <span>Meltdown Risk: {msg.recipeCard.meltdownRisk}</span>
                        </span>

                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => toggleSaveRecipe(msg.recipeCard!.title)}
                            className={`px-2 py-1 rounded-lg border transition flex items-center space-x-1 font-semibold ${
                              savedRecipes[msg.recipeCard.title]
                                ? 'bg-amber-300 border-amber-400 text-amber-950'
                                : 'bg-white border-amber-200 text-amber-900 hover:bg-amber-100'
                            }`}
                          >
                            <Bookmark className={`w-3 h-3 ${savedRecipes[msg.recipeCard.title] ? 'fill-amber-900' : ''}`} />
                            <span>{savedRecipes[msg.recipeCard.title] ? 'Saved' : 'Save'}</span>
                          </button>

                          <button
                            onClick={() =>
                              onShareToPartner(
                                `Hey! Here is a great 2-min meal idea for ${kidProfile.name || 'the kid'}: ${msg.recipeCard?.title}`,
                                msg.recipeCard
                              )
                            }
                            className="px-2 py-1 rounded-lg bg-amber-200 hover:bg-amber-300 text-amber-950 border border-amber-300 font-semibold transition flex items-center space-x-1"
                          >
                            <Share2 className="w-3 h-3" />
                            <span>Send to Co-Parent</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer timestamp & Speech readout button */}
                <div
                  className={`flex items-center justify-end space-x-2 mt-1.5 text-[10px] ${
                    isUser ? 'text-amber-200/80' : 'text-amber-800/70'
                  }`}
                >
                  <span>{msg.timestamp}</span>
                  {!audioMuted && (
                    <button
                      onClick={() => speakText(msg.id, msg.text)}
                      className="p-1 rounded hover:bg-black/10 transition"
                      title="Read out loud"
                    >
                      <Volume2 className={`w-3 h-3 ${speakingMsgId === msg.id ? 'animate-pulse text-amber-600' : ''}`} />
                    </button>
                  )}
                  {isUser && <CheckCheck className="w-3 h-3 text-amber-200" />}
                </div>
              </div>

              {/* Quick Reply Chips if attached */}
              {msg.quickChips && msg.quickChips.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2 max-w-full">
                  {msg.quickChips.map((chip, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        if (chip.label.includes('Pantry')) {
                          onOpenPantryApp();
                        } else if (chip.label.includes('SOS')) {
                          onOpenSos();
                        } else {
                          onSendMessage(chip.textToSend);
                        }
                      }}
                      className="bg-amber-100 hover:bg-amber-200 border border-amber-300/80 text-amber-950 font-bold text-xs px-2.5 py-1 rounded-full shadow-2xs transition active:scale-95 flex items-center space-x-1"
                    >
                      <span>{chip.label}</span>
                      <ChevronRight className="w-3 h-3 text-amber-700" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Selected Image Preview before sending */}
      {selectedImage && (
        <div className="bg-amber-100/90 border-t border-amber-200 p-2 px-4 flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0">
            <img
              src={selectedImage}
              alt="Preview"
              className="w-12 h-12 object-cover rounded-lg border border-amber-300"
            />
            <span className="text-xs text-amber-950 font-semibold truncate">
              Photo attached. BananaBot will analyze your fridge/pantry!
            </span>
          </div>
          <button
            onClick={() => setSelectedImage(null)}
            className="p-1 rounded-full bg-amber-200 hover:bg-amber-300 text-amber-900 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Special Quick Action Row for Co-Parent Chat */}
      {channel.type === 'direct' && (
        <div className="bg-amber-100/80 border-t border-amber-200/80 px-3 py-2 flex items-center space-x-2 overflow-x-auto no-scrollbar">
          <span className="text-[11px] font-bold text-amber-900 shrink-0">1-Tap Status:</span>
          <button
            onClick={() => onSendMessage(`🍏 ${kidProfile.name || 'Kid'} ate well!`)}
            className="bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 text-emerald-950 font-bold text-xs px-2.5 py-1 rounded-full shrink-0 transition cursor-pointer"
          >
            🍏 Ate Well
          </button>
          <button
            onClick={() => onSendMessage(`😤 ${kidProfile.name || 'Kid'} skipped dinner/fussy.`)}
            className="bg-orange-100 hover:bg-orange-200 border border-orange-300 text-orange-950 font-bold text-xs px-2.5 py-1 rounded-full shrink-0 transition cursor-pointer"
          >
            😤 Refused Meal
          </button>
          <button
            onClick={() => onSendMessage(`🥛 Snack given at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`)}
            className="bg-sky-100 hover:bg-sky-200 border border-sky-300 text-sky-950 font-bold text-xs px-2.5 py-1 rounded-full shrink-0 transition cursor-pointer"
          >
            🥛 Snack Sent
          </button>
          <button
            onClick={() => onSendMessage(`🚨 Meltdown in progress! Need backup!`)}
            className="bg-red-100 hover:bg-red-200 border border-red-300 text-red-950 font-bold text-xs px-2.5 py-1 rounded-full shrink-0 transition cursor-pointer"
          >
            🚨 Panic Mode
          </button>
        </div>
      )}

      {/* Jubilee Participation Quick Bar */}
      <div className="bg-amber-200/50 border-t border-amber-300/60 px-3 py-1.5 flex items-center space-x-2 overflow-x-auto no-scrollbar">
        <span className="text-[10px] font-extrabold text-amber-900 uppercase tracking-wider shrink-0 flex items-center space-x-1">
          <span>🌱 Jubilee:</span>
        </span>

        {onOpenJubileeHub && (
          <button
            onClick={onOpenJubileeHub}
            className="bg-amber-900 hover:bg-amber-950 text-amber-50 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full shrink-0 transition flex items-center space-x-1 cursor-pointer"
            id="chat-open-jubilee-btn"
          >
            <span>Participation Hub</span>
          </button>
        )}

        <button
          onClick={() => {
            setInputText('/offer ');
          }}
          className="bg-white hover:bg-amber-50 border border-amber-300 text-amber-950 font-bold text-[10px] px-2 py-0.5 rounded-full shrink-0 transition cursor-pointer"
        >
          🌱 /offer
        </button>

        <button
          onClick={() => {
            setInputText('/need ');
          }}
          className="bg-white hover:bg-amber-50 border border-amber-300 text-amber-950 font-bold text-[10px] px-2 py-0.5 rounded-full shrink-0 transition cursor-pointer"
        >
          🌿 /need
        </button>

        <button
          onClick={() => {
            setInputText('/remember ');
          }}
          className="bg-white hover:bg-amber-50 border border-amber-300 text-amber-950 font-bold text-[10px] px-2 py-0.5 rounded-full shrink-0 transition cursor-pointer"
        >
          📜 /remember
        </button>

        <button
          onClick={() => {
            onSendMessage('🤖 @jubilee create seed: "Toddler Food Exchange" -> Makes possible: "Zero-guilt neighborhood dinners"');
          }}
          className="bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-950 font-bold text-[10px] px-2 py-0.5 rounded-full shrink-0 transition cursor-pointer"
        >
          🤖 @jubilee
        </button>
      </div>

      {/* Input Toolbar & Area */}
      <div className="p-2.5 sm:p-3 bg-amber-100/90 border-t border-amber-200/90 shadow-lg">
        <div className="max-w-3xl mx-auto flex items-center space-x-2">
          {/* File input hidden */}
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageSelect}
            className="hidden"
            id="chat-file-input"
          />

          {/* 📸 Attach Image Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-xl bg-amber-200/70 hover:bg-amber-300/80 text-amber-900 transition shrink-0 active:scale-95"
            title="Snap or attach fridge/pantry photo"
            id="attach-photo-btn"
          >
            <Camera className="w-5 h-5 text-amber-900" />
          </button>

          {/* ⚡ Open Pantry Rescue Mini-App */}
          <button
            onClick={onOpenPantryApp}
            className="p-2.5 rounded-xl bg-amber-300/80 hover:bg-amber-400 text-amber-950 font-bold transition shrink-0 active:scale-95"
            title="Open Pantry Rescue Mini-App"
            id="pantry-app-trigger-btn"
          >
            <Sparkles className="w-5 h-5 text-amber-950" />
          </button>

          {/* Main Text Input */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={
                channel.type === 'bot'
                  ? 'Ask BananaBot or type ingredients (e.g., eggs, bread, banana)...'
                  : 'Type a message...'
              }
              className="w-full pl-3.5 pr-10 py-2.5 bg-white text-amber-950 text-sm rounded-2xl border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder-amber-800/50 font-medium shadow-2xs"
              id="chat-message-input"
            />

            {/* 🎙️ Voice Mic Button */}
            <button
              onClick={toggleRecording}
              className={`absolute right-2 top-2 p-1 rounded-xl transition ${
                isRecording
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'text-amber-800 hover:bg-amber-100'
              }`}
              title={isRecording ? 'Listening... click to stop' : 'Tap to speak hands-free'}
              id="voice-input-btn"
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>

          {/* 🫏 Donkey Pause & Reframing Button */}
          <button
            onClick={() => setDonkeyModalOpen(true)}
            className="p-2.5 px-3 rounded-2xl bg-amber-200/90 hover:bg-amber-300 text-amber-950 font-extrabold text-xs transition flex items-center space-x-1 shrink-0 border border-amber-300 cursor-pointer shadow-2xs active:scale-95"
            title="🫏 Donkey: Pause & Translate Tense Draft"
            id="donkey-composer-trigger-btn"
          >
            <span className="text-base">🫏</span>
            <span className="hidden sm:inline">Donkey</span>
          </button>

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={!inputText.trim() && !selectedImage}
            className={`p-2.5 rounded-2xl transition flex items-center justify-center shrink-0 shadow-xs active:scale-95 ${
              inputText.trim() || selectedImage
                ? 'bg-amber-900 hover:bg-amber-950 text-amber-50 cursor-pointer'
                : 'bg-amber-300/50 text-amber-700/50 cursor-not-allowed'
            }`}
            id="send-message-btn"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 🫏 Donkey Composer Bottom Sheet / Modal */}
      <DonkeyModal
        isOpen={donkeyModalOpen}
        initialDraft={inputText}
        contextMessages={messages.map((m) => ({
          sender: m.senderName || (m.sender === 'user' ? 'You' : m.sender),
          text: m.text,
        }))}
        channelId={channel.id}
        onClose={() => setDonkeyModalOpen(false)}
        onSendOriginal={(draft) => {
          onSendMessage(draft);
          setInputText('');
          setSelectedImage(null);
        }}
        onApplyVersion={(versionText) => {
          setInputText(versionText);
        }}
        onHoldPrivate={() => {
          setInputText('');
        }}
      />
    </div>
  );
};
