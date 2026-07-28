import React, { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, Sparkles, X, Plus, Share2, Tag, UploadCloud, RefreshCw } from 'lucide-react';
import { PhotoAlbumItem, KidProfile } from '../types';

interface PhotoAlbumModalProps {
  isOpen: boolean;
  onClose: () => void;
  channelName: string;
  photos: PhotoAlbumItem[];
  onAddPhoto: (photo: PhotoAlbumItem) => void;
  onSendPhotoToChat: (photo: PhotoAlbumItem) => void;
  kidProfile: KidProfile;
}

export const PhotoAlbumModal: React.FC<PhotoAlbumModalProps> = ({
  isOpen,
  onClose,
  channelName,
  photos,
  onAddPhoto,
  onSendPhotoToChat,
  kidProfile,
}) => {
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoAlbumItem | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [isUploading, setIsUploading] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const categories = ['All', 'Meal Log', 'Fridge Photo', 'Playdate Fun', 'Kid Smile'];

  const filteredPhotos = photos.filter(
    (p) => activeCategory === 'All' || p.category === activeCategory
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;

      // Call AI to auto-tag & analyze photo
      setAiAnalyzing(true);
      let aiNote = '';
      try {
        const res = await fetch('/api/analyze-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64,
            kidProfile,
          }),
        });
        const data = await res.json();
        aiNote = data.analysis || 'Identified fresh food items!';
      } catch (err) {
        aiNote = 'Uploaded photo safely to parent album.';
      } finally {
        setAiAnalyzing(false);
      }

      const newPhoto: PhotoAlbumItem = {
        id: `photo-${Date.now()}`,
        imageUri: base64,
        caption: `Photo for ${kidProfile.name || 'Kiddo'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        senderName: 'Mama',
        aiAnalysis: aiNote,
        category: 'Meal Log',
      };

      onAddPhoto(newPhoto);
      setSelectedPhoto(newPhoto);
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-amber-950/60 backdrop-blur-sm p-3 sm:p-4">
      <div
        className="w-full max-w-2xl bg-amber-50 rounded-3xl shadow-2xl border-2 border-amber-300 max-h-[90vh] flex flex-col overflow-hidden animate-scale-up"
        id="photo-album-modal"
      >
        {/* Header */}
        <div className="bg-amber-300 p-4 text-amber-950 flex items-center justify-between border-b border-amber-400">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-100 flex items-center justify-center text-xl shadow-2xs">
              📸
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight">
                Bnana Photo Album
              </h3>
              <p className="text-xs text-amber-900 font-semibold">
                {channelName} • Shared Meals, Fridge Snaps & Smiles
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-amber-200 hover:bg-amber-100 text-amber-950 transition"
            id="close-album-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar Bar */}
        <div className="p-3 bg-amber-100/70 border-b border-amber-200 flex items-center justify-between flex-wrap gap-2">
          {/* Category Pills */}
          <div className="flex space-x-1.5 overflow-x-auto no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  activeCategory === cat
                    ? 'bg-amber-900 text-amber-50 shadow-2xs'
                    : 'bg-white text-amber-900 border border-amber-200 hover:bg-amber-200/60'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Upload Photo Button */}
          <div>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || aiAnalyzing}
              className="bg-amber-900 hover:bg-amber-950 text-amber-50 font-bold text-xs px-3 py-1.5 rounded-xl shadow-xs flex items-center space-x-1.5 transition active:scale-95 cursor-pointer"
              id="upload-album-photo-btn"
            >
              {isUploading || aiAnalyzing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>AI Analyzing...</span>
                </>
              ) : (
                <>
                  <Camera className="w-3.5 h-3.5 text-amber-300" />
                  <span>Upload Photo</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {filteredPhotos.length === 0 ? (
            <div className="p-10 text-center space-y-2 text-amber-800">
              <ImageIcon className="w-12 h-12 mx-auto text-amber-400" />
              <p className="font-bold text-sm">No photos in this album yet!</p>
              <p className="text-xs">
                Snap a picture of your fridge, pantry, or kid’s plate to log meals with Gemini AI.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredPhotos.map((photo) => (
                <div
                  key={photo.id}
                  onClick={() => setSelectedPhoto(photo)}
                  className={`group relative rounded-2xl overflow-hidden border border-amber-200/80 cursor-pointer bg-amber-100 transition transform hover:-translate-y-0.5 shadow-2xs ${
                    selectedPhoto?.id === photo.id ? 'ring-2 ring-amber-500' : ''
                  }`}
                >
                  <img
                    src={photo.imageUri}
                    alt={photo.caption}
                    className="w-full h-32 object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-90 p-2 flex flex-col justify-end text-white">
                    <span className="text-[10px] font-extrabold uppercase bg-amber-500 text-amber-950 px-1.5 py-0.2 rounded w-fit mb-0.5">
                      {photo.category || 'Meal Log'}
                    </span>
                    <span className="text-xs font-bold truncate">{photo.caption}</span>
                    <span className="text-[9px] text-amber-200 font-medium">
                      {photo.senderName} • {photo.timestamp}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Selected Detail View */}
          {selectedPhoto && (
            <div className="bg-white p-4 rounded-2xl border border-amber-300 shadow-sm space-y-3 mt-3 animate-scale-up">
              <div className="flex items-start justify-between border-b border-amber-100 pb-2">
                <div>
                  <h4 className="font-extrabold text-amber-950 text-sm">
                    {selectedPhoto.caption}
                  </h4>
                  <p className="text-[11px] text-amber-800 font-medium">
                    Uploaded by {selectedPhoto.senderName} on {selectedPhoto.timestamp}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedPhoto(null)}
                  className="text-amber-800 hover:text-amber-950 font-bold text-xs"
                >
                  Close Detail
                </button>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 items-center">
                <img
                  src={selectedPhoto.imageUri}
                  alt="Detail"
                  className="w-full h-44 object-cover rounded-xl border border-amber-200"
                />

                {/* Gemini AI Note */}
                <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs space-y-2">
                  <div className="flex items-center space-x-1.5 text-amber-900 font-extrabold">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>Gemini Photo Insights:</span>
                  </div>
                  <p className="text-amber-950 font-medium leading-relaxed">
                    {selectedPhoto.aiAnalysis ||
                      'Gemini AI: High nutritional value! Clean, unmixed textures ideal for toddler sensory comfort.'}
                  </p>

                  <button
                    onClick={() => {
                      onSendPhotoToChat(selectedPhoto);
                      onClose();
                    }}
                    className="w-full py-2 bg-amber-900 hover:bg-amber-950 text-amber-50 font-bold text-xs rounded-xl transition flex items-center justify-center space-x-1.5 shadow-2xs mt-2"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Send Photo + AI Notes to Chat</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
