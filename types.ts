
export enum ItemType {
  LINK = 'link',
  NOTE = 'note',
  FILE = 'file',
}

export interface BaseBundleItem {
  id: string;
  type: ItemType;
  title: string;
  createdAt: string;
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

export type BundleItem = LinkItem | NoteItem | FileItem;

export interface Bundle {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  items: BundleItem[];
}

export enum Screen {
  HOME = 'home',
  EDITOR = 'editor',
  SHARE = 'share',
}
