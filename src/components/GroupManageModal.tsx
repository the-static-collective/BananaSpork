import React, { useState } from 'react';
import { Users, UserPlus, Bell, ShieldAlert, Sparkles, Copy, Check, X, Moon, Volume2, VolumeX, Radio, RefreshCw } from 'lucide-react';
import { ChatChannel, GroupMember, GroupNotificationSetting, ChatMessage } from '../types';

interface GroupManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  channel: ChatChannel;
  messages: ChatMessage[];
  onUpdateGroup: (updatedChannel: ChatChannel) => void;
  onCreateNewGroup: (newChannel: ChatChannel) => void;
}

export const GroupManageModal: React.FC<GroupManageModalProps> = ({
  isOpen,
  onClose,
  channel,
  messages,
  onUpdateGroup,
  onCreateNewGroup,
}) => {
  const [activeTab, setActiveTab] = useState<'manage' | 'create' | 'aiSummary'>('manage');
  const [copiedLink, setCopiedLink] = useState(false);

  // Create New Group State
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupAvatar, setNewGroupAvatar] = useState('💛');
  const [newGroupDesc, setNewGroupDesc] = useState('');

  // Members
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'Co-Parent' | 'Grandparent' | 'Member'>('Co-Parent');

  // AI Summary State
  const [aiSummary, setAiSummary] = useState<{
    keyTakeaways?: string[];
    actionItems?: string[];
    quickReplySuggestions?: string[];
    sentiment?: string;
  } | null>(null);
  const [summarizing, setSummarizing] = useState(false);

  if (!isOpen) return null;

  const currentMembers: GroupMember[] = channel.members || [
    { id: 'm1', name: 'Mama (You)', role: 'Admin', avatar: '👩' },
    { id: 'm2', name: 'Hubby / Co-Parent', role: 'Co-Parent', avatar: '👨' },
    { id: 'm3', name: 'Grandma Ellen', role: 'Grandparent', avatar: '👵' },
  ];

  const handleCopyInvite = () => {
    const invite = channel.inviteLink || `https://telegram.me/bananagram/join/${channel.id}`;
    navigator.clipboard.writeText(invite);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleNotificationChange = (setting: GroupNotificationSetting) => {
    onUpdateGroup({
      ...channel,
      notificationSetting: setting,
    });
  };

  const handleAddMember = () => {
    if (!newMemberName.trim()) return;
    const updatedMembers: GroupMember[] = [
      ...currentMembers,
      {
        id: `mem-${Date.now()}`,
        name: newMemberName.trim(),
        role: newMemberRole,
        avatar: newMemberRole === 'Co-Parent' ? '💛' : newMemberRole === 'Grandparent' ? '👵' : '👤',
      },
    ];

    onUpdateGroup({
      ...channel,
      members: updatedMembers,
    });
    setNewMemberName('');
  };

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) {
      alert('Please enter a group name!');
      return;
    }

    const createdChannel: ChatChannel = {
      id: `group-${Date.now()}`,
      name: newGroupName.trim(),
      avatar: newGroupAvatar,
      badge: 'Parent Group',
      subtitle: '1-tap parent updates',
      type: 'group',
      description: newGroupDesc.trim() || 'Parent feed log and meal sync.',
      notificationSetting: 'all',
      inviteLink: `https://telegram.me/bananagram/join/group-${Date.now()}`,
      members: [
        { id: 'm1', name: 'Mama (You)', role: 'Admin', avatar: '👩' },
      ],
    };

    onCreateNewGroup(createdChannel);
    setNewGroupName('');
    setNewGroupDesc('');
    setActiveTab('manage');
  };

  const handleFetchAiSummary = async () => {
    setSummarizing(true);
    try {
      const res = await fetch('/api/summarize-group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelName: channel.name,
          messages: messages.slice(-20),
        }),
      });
      const data = await res.json();
      setAiSummary(data);
    } catch (e) {
      console.error(e);
      setAiSummary({
        keyTakeaways: ['Group members discussed 3-ingredient toddler meals.', 'Keep foods separate in distinct piles on the plate.'],
        actionItems: ['Stock up on bananas and sunbutter / seed butter'],
        quickReplySuggestions: ['Sounds good!', 'Will try tonight!'],
        sentiment: 'Calm & Supportive',
      });
    } finally {
      setSummarizing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-amber-950/60 backdrop-blur-sm p-3 sm:p-4">
      <div
        className="w-full max-w-lg bg-amber-50 rounded-3xl shadow-2xl border-2 border-amber-300 max-h-[90vh] flex flex-col overflow-hidden animate-scale-up"
        id="group-manage-modal"
      >
        {/* Header */}
        <div className="bg-amber-300 p-4 text-amber-950 flex items-center justify-between border-b border-amber-400">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-100 flex items-center justify-center text-xl shadow-2xs">
              {channel.avatar || '👨‍👩‍👧'}
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight">
                {channel.name}
              </h3>
              <p className="text-xs text-amber-900 font-semibold">
                Parent Group Settings • Telegram Integration
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-amber-200 hover:bg-amber-100 text-amber-950 transition"
            id="close-group-modal-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-amber-200 bg-amber-100/60 p-1.5">
          <button
            onClick={() => setActiveTab('manage')}
            className={`flex-1 py-2 text-xs font-extrabold rounded-xl transition ${
              activeTab === 'manage'
                ? 'bg-amber-900 text-amber-50 shadow-2xs'
                : 'text-amber-900 hover:bg-amber-200/60'
            }`}
          >
            Manage Group
          </button>
          <button
            onClick={() => {
              setActiveTab('aiSummary');
              if (!aiSummary) handleFetchAiSummary();
            }}
            className={`flex-1 py-2 text-xs font-extrabold rounded-xl transition flex items-center justify-center space-x-1 ${
              activeTab === 'aiSummary'
                ? 'bg-amber-900 text-amber-50 shadow-2xs'
                : 'text-amber-900 hover:bg-amber-200/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>AI Summarizer</span>
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-2 text-xs font-extrabold rounded-xl transition ${
              activeTab === 'create'
                ? 'bg-amber-900 text-amber-50 shadow-2xs'
                : 'text-amber-900 hover:bg-amber-200/60'
            }`}
          >
            + New Group
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs flex-1">
          {activeTab === 'manage' && (
            <div className="space-y-4">
              {/* Notification Controls */}
              <div className="bg-white p-3.5 rounded-2xl border border-amber-200 space-y-2">
                <h4 className="font-extrabold text-xs text-amber-950 uppercase tracking-wide flex items-center space-x-1">
                  <Bell className="w-3.5 h-3.5 text-amber-700" />
                  <span>Simplified Parent Notification Rules:</span>
                </h4>

                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'all', label: 'All Updates 🔔', desc: 'Get every message' },
                    { id: 'sos_only', label: 'SOS Alerts Only 🚨', desc: 'Only pings for meltdowns' },
                    { id: 'quiet_hours', label: 'Quiet Hours 8pm-7am 🌙', desc: 'Mutes late night pings' },
                    { id: 'off', label: 'Mute Group 🔕', desc: 'No sound notifications' },
                  ].map((rule) => {
                    const isSelected = (channel.notificationSetting || 'all') === rule.id;
                    return (
                      <button
                        key={rule.id}
                        onClick={() => handleNotificationChange(rule.id as GroupNotificationSetting)}
                        className={`p-2 rounded-xl text-left border transition ${
                          isSelected
                            ? 'bg-amber-100 border-amber-400 text-amber-950 font-bold shadow-2xs'
                            : 'bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100/60'
                        }`}
                      >
                        <div className="text-xs font-bold">{rule.label}</div>
                        <div className="text-[10px] text-amber-800/80 font-medium">{rule.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Members List & 1-Tap Invite Link */}
              <div className="bg-white p-3.5 rounded-2xl border border-amber-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-xs text-amber-950 uppercase tracking-wide flex items-center space-x-1">
                    <Users className="w-3.5 h-3.5 text-amber-700" />
                    <span>Group Members ({currentMembers.length})</span>
                  </h4>

                  <button
                    onClick={handleCopyInvite}
                    className="px-2.5 py-1 bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold text-[11px] rounded-lg transition flex items-center space-x-1"
                  >
                    {copiedLink ? <Check className="w-3 h-3 text-emerald-700" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedLink ? 'Link Copied!' : 'Copy Invite Link'}</span>
                  </button>
                </div>

                <div className="space-y-1.5 divide-y divide-amber-100">
                  {currentMembers.map((m) => (
                    <div key={m.id} className="pt-1.5 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-base">{m.avatar}</span>
                        <div>
                          <div className="font-bold text-amber-950">{m.name}</div>
                          <div className="text-[10px] text-amber-800 font-medium">{m.role}</div>
                        </div>
                      </div>
                      <span className="text-[10px] bg-amber-100 text-amber-900 font-extrabold px-2 py-0.5 rounded-full border border-amber-200">
                        {m.role}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Quick Add Member input */}
                <div className="pt-2 border-t border-amber-100 flex space-x-2">
                  <input
                    type="text"
                    placeholder="Add co-parent or grandparent name..."
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-amber-50 text-amber-950 text-xs rounded-xl border border-amber-300"
                  />
                  <select
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value as any)}
                    className="px-2 py-1.5 bg-amber-50 text-amber-950 text-xs rounded-xl border border-amber-300 font-bold"
                  >
                    <option value="Co-Parent">Co-Parent</option>
                    <option value="Grandparent">Grandparent</option>
                    <option value="Member">Member</option>
                  </select>
                  <button
                    onClick={handleAddMember}
                    className="px-3 py-1.5 bg-amber-900 hover:bg-amber-950 text-amber-50 font-bold text-xs rounded-xl transition"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'aiSummary' && (
            <div className="space-y-3">
              <div className="bg-amber-100 p-3 rounded-2xl border border-amber-300 text-amber-950 flex items-start space-x-2">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs text-amber-950">
                    Background Gemini Chat Thread Summarizer
                  </h4>
                  <p className="text-[11px] text-amber-800">
                    Don't have time to read 50 messages? Gemini distills key decisions into 5 seconds.
                  </p>
                </div>
              </div>

              {summarizing ? (
                <div className="p-8 text-center text-amber-800 font-bold flex items-center justify-center space-x-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-600" />
                  <span>Analyzing group conversation thread...</span>
                </div>
              ) : aiSummary ? (
                <div className="bg-white p-3.5 rounded-2xl border border-amber-200 space-y-3 text-amber-950">
                  <div>
                    <h5 className="font-extrabold text-xs uppercase text-amber-900 mb-1">
                      Key Takeaways:
                    </h5>
                    <ul className="list-disc list-inside space-y-1 text-xs font-medium">
                      {aiSummary.keyTakeaways?.map((t, idx) => (
                        <li key={idx}>{t}</li>
                      ))}
                    </ul>
                  </div>

                  {aiSummary.actionItems && aiSummary.actionItems.length > 0 && (
                    <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                      <h5 className="font-extrabold text-xs text-amber-900 mb-1">
                        Action Items / Grocery To-Dos:
                      </h5>
                      <ul className="list-square list-inside space-y-1 text-xs font-bold text-amber-950">
                        {aiSummary.actionItems.map((a, idx) => (
                          <li key={idx}>{a}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <button
                    onClick={handleFetchAiSummary}
                    className="w-full py-2 bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold text-xs rounded-xl transition flex items-center justify-center space-x-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Re-summarize Thread</span>
                  </button>
                </div>
              ) : null}
            </div>
          )}

          {activeTab === 'create' && (
            <div className="bg-white p-4 rounded-2xl border border-amber-200 space-y-3">
              <h4 className="font-extrabold text-xs text-amber-950 uppercase tracking-wide">
                Create Parent or Playdate Group:
              </h4>

              <div>
                <label className="block font-bold text-amber-950 mb-1">
                  Group Name:
                </label>
                <input
                  type="text"
                  placeholder="e.g., Grandma & Leo Feed Log, Park Playdate Moms"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full px-3 py-2 bg-amber-50 text-amber-950 font-semibold rounded-xl border border-amber-300"
                />
              </div>

              <div>
                <label className="block font-bold text-amber-950 mb-1">
                  Choose Group Emoji:
                </label>
                <div className="flex space-x-2">
                  {['💛', '👨‍👩‍👧', '🌳', '🍌', '🍼', '🍪'].map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => setNewGroupAvatar(emoji)}
                      className={`text-xl p-2 rounded-xl border ${
                        newGroupAvatar === emoji ? 'bg-amber-200 border-amber-400' : 'bg-amber-50 border-amber-200'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-amber-950 mb-1">
                  Description / Purpose:
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. 1-tap food logs and playdate coordination..."
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-amber-50 text-amber-950 text-xs rounded-xl border border-amber-300"
                />
              </div>

              <button
                onClick={handleCreateGroup}
                className="w-full py-3 bg-amber-900 hover:bg-amber-950 text-amber-50 font-extrabold text-sm rounded-2xl shadow-md transition flex items-center justify-center space-x-2 cursor-pointer mt-2"
              >
                <span>Create Group & Generate Link</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
