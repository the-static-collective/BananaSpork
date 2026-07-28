export interface KidProfile {
  name: string;
  age: string;
  pickiness: 'Low' | 'Moderate' | 'High' | 'Extreme';
  allergies: string[];
  preferences: string;
  dislikes: string;
  favoriteDips: string[];
}

export interface RecipeCard {
  id?: string;
  title: string;
  timeMins: number | string;
  ingredientsUsed: string[];
  steps: string[];
  pickyHack: string;
  meltdownRisk: 'Very Low' | 'Low' | 'Medium';
}

export interface QuickChip {
  label: string;
  icon?: string;
  textToSend: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot' | 'partner' | 'channel';
  senderName?: string;
  text: string;
  timestamp: string;
  recipeCard?: RecipeCard;
  quickChips?: QuickChip[];
  status?: 'sent' | 'delivered' | 'read';
  imageUri?: string;
  audioUri?: string;
  isSosAlert?: boolean;
}

export interface PhotoAlbumItem {
  id: string;
  imageUri: string;
  caption: string;
  timestamp: string;
  senderName: string;
  aiAnalysis?: string;
  category?: 'Meal Log' | 'Fridge Photo' | 'Playdate Fun' | 'Kid Smile';
}

export type GroupNotificationSetting = 'all' | 'sos_only' | 'quiet_hours' | 'off';

export interface GroupMember {
  id: string;
  name: string;
  role: 'Admin' | 'Co-Parent' | 'Grandparent' | 'Member';
  avatar: string;
}

export interface ChatChannel {
  id: string;
  name: string;
  avatar: string;
  badge?: string;
  subtitle: string;
  type: 'bot' | 'channel' | 'direct' | 'group';
  unreadCount?: number;
  lastMessage?: string;
  lastTime?: string;
  description?: string;
  pinnedMessage?: string;
  members?: GroupMember[];
  notificationSetting?: GroupNotificationSetting;
  inviteLink?: string;
  photos?: PhotoAlbumItem[];
}

export interface PantryIngredient {
  id: string;
  name: string;
  category: 'fruits' | 'dairy' | 'pantry' | 'veggies' | 'proteins' | 'spreads';
  icon: string;
}

// --- Jubilee Proof of Participation Ontology ---

export type BasketCategory = 'Tools' | 'Skills' | 'Time' | 'Food' | 'Transport' | 'Care' | 'Creative';

export interface BasketOffer {
  id: string;
  title: string;
  category: BasketCategory;
  contributorName: string;
  availability: string;
  boundary: string;
  icon: string;
  timestamp: string;
}

export type SeedStage = 'Seed' | 'Sprout' | 'Growing' | 'Flowering' | 'Harvest' | 'Compost';

export interface SeedNeed {
  id: string;
  title: string;
  category: BasketCategory;
  pledgedBy?: string;
  status: 'open' | 'pledged' | 'confirmed';
}

export interface ParticipationSeed {
  id: string;
  title: string;
  stage: SeedStage;
  authorName: string;
  description: string;
  needs: SeedNeed[];
  makesPossible: string[];
  graftsCount: number;
  harvestsCount: number;
  timestamp: string;
}

export interface WitnessReceipt {
  id: string;
  sequence: number;
  sha256Hash: string;
  predecessorHash: string;
  actorName: string;
  eventType: 'offer.created' | 'seed.opened' | 'pledge.submitted' | 'fulfillment.confirmed' | 'receipt.witnessed';
  title: string;
  timestamp: string;
  details: string;
}

