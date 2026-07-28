import React from 'react';
import { Scroll, Plus, ShieldCheck, Image, Camera } from 'lucide-react';
import { PhotoAlbumItem, WitnessReceipt } from '../../types';

interface RememberViewProps {
  receipts: WitnessReceipt[];
  photos?: PhotoAlbumItem[];
  onOpenUniversalComposer: () => void;
  onOpenPhotoAlbum: () => void;
  onOpenJubileeHub: () => void;
}

export const RememberView: React.FC<RememberViewProps> = ({
  receipts,
  photos = [],
  onOpenUniversalComposer,
  onOpenPhotoAlbum,
  onOpenJubileeHub,
}) => {
  return (
    <div className="flex-1 bg-amber-50/60 overflow-y-auto p-3 sm:p-6 pb-24 md:pb-8 space-y-6 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-900 to-amber-950 text-amber-50 p-4 sm:p-6 rounded-3xl border border-amber-800 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Scroll className="w-6 h-6 text-amber-300" />
            <h2 className="font-extrabold text-xl sm:text-2xl text-amber-100">
              Remember: Confirmed History & Memories
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-amber-200 mt-1 font-medium">
            Jubilee Witness Ledger receipts and photo moments — authority built on confirmed acts.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={onOpenPhotoAlbum}
            className="bg-amber-800 hover:bg-amber-700 text-amber-100 font-bold text-xs px-3 py-2.5 rounded-2xl transition flex items-center space-x-1.5 border border-amber-700 min-h-[44px] cursor-pointer"
          >
            <Camera className="w-4 h-4 text-amber-300" />
            <span>Photo Album</span>
          </button>
          <button
            onClick={onOpenUniversalComposer}
            className="bg-amber-400 hover:bg-amber-300 text-amber-950 font-black text-xs px-4 py-2.5 rounded-2xl transition flex items-center space-x-1.5 shadow-xs min-h-[44px] cursor-pointer"
            id="remember-log-moment-btn"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Log Memory</span>
          </button>
        </div>
      </div>

      {/* Witness Ledger Receipts */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-amber-950 text-sm flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-amber-700" />
            <span>Confirmed Witness Receipts ({receipts.length})</span>
          </h3>
          <button
            onClick={onOpenJubileeHub}
            className="text-xs font-bold text-amber-800 hover:text-amber-950 underline min-h-[36px] cursor-pointer"
          >
            Open Jubilee Ledger Hub →
          </button>
        </div>

        <div className="bg-white rounded-3xl border border-amber-200 p-4 divide-y divide-amber-100 shadow-2xs">
          {receipts.map((rcpt) => (
            <div key={rcpt.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-amber-950">{rcpt.title}</span>
                <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                  Seq #{rcpt.sequence}
                </span>
              </div>
              <p className="text-xs text-amber-800 font-medium">{rcpt.details}</p>
              <div className="flex items-center justify-between text-[10px] text-amber-700 font-mono pt-1">
                <span>By {rcpt.actorName} • {rcpt.timestamp}</span>
                <span className="truncate max-w-[150px]">{rcpt.sha256Hash}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
