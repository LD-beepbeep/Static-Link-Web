export enum ItemType {
  LINK = 'link',
  NOTE = 'note',
  FILE = 'file',
  AUDIO = 'audio',
  CHECKLIST = 'checklist',
  CONTACT = 'contact',
  LOCATION = 'location',
  DRAWING = 'drawing',
  EMAIL = 'email',
  CODE = 'code',
  QR_CODE = 'qr_code',
}

export interface BaseBundleItem {
  id: string;
  type: ItemType;
  title: string;
  createdAt: string;
  color?: string;
  isPinned?: boolean;
}

export interface LinkItem extends BaseBundleItem {
  type: ItemType.LINK;
  url: string;
}

export interface NoteItem extends BaseBundleItem {
  type: ItemType.NOTE;
  text: string;
}

export interface FileItem extends BaseBundleItem {
  type: ItemType.FILE;
  filename: string;
  mimeType: string;
  size: number;
  content: string; // Base64 encoded content
  checksum: string; // SHA-256
}

export interface AudioItem extends BaseBundleItem {
  type: ItemType.AUDIO;
  filename: string;
  mimeType: string;
  size: number;
  content: string; // Base64 encoded content
  duration: number; // in seconds
}

export interface ChecklistEntry {
    id: string;
    text: string;
    checked: boolean;
    children?: ChecklistEntry[];
}
export interface ChecklistItem extends BaseBundleItem {
  type: ItemType.CHECKLIST;
  items: ChecklistEntry[];
}

export interface ContactItem extends BaseBundleItem {
  type: ItemType.CONTACT;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  organization: string;
  address: string;
}

export interface LocationItem extends BaseBundleItem {
  type: ItemType.LOCATION;
  latitude: number;
  longitude: number;
  address: string;
}

export interface DrawingItem extends BaseBundleItem {
    type: ItemType.DRAWING;
    filename: string;
    mimeType: string; // e.g., 'image/png'
    size: number;
    content: string; // Base64 encoded content
}

export interface EmailItem extends BaseBundleItem {
    type: ItemType.EMAIL;
    to: string;
    subject: string;
    body: string;
}

export interface CodeSnippetItem extends BaseBundleItem {
    type: ItemType.CODE;
    language: string;
    code: string;
}

export interface QrCodeItem extends BaseBundleItem {
  type: ItemType.QR_CODE;
  content: string; // The text/URL to encode
}

export type BundleItem = LinkItem | NoteItem | FileItem | AudioItem | ChecklistItem | ContactItem | LocationItem | DrawingItem | EmailItem | CodeSnippetItem | QrCodeItem;

export interface Bundle {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  items: BundleItem[];
  isLocked?: boolean;
  passwordHash?: string;
  isPinned?: boolean;
  isArchived?: boolean;
  isDeleted?: boolean;
  deletedAt?: string;
}

export enum Screen {
  HOME = 'home',
  EDITOR = 'editor',
  SHARE = 'share',
  BOOKMARKLET = 'bookmarklet',
}