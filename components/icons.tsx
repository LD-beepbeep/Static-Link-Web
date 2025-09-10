
import {
  File as FileIcon,
  Link as LinkIcon,
  NotebookText,
  Plus,
  Trash2,
  Download,
  QrCode,
  ArrowLeft,
  Copy,
  Check,
  Package,
  Upload,
  X,
  Edit,
  MoreVertical,
  ChevronUp,
  ChevronDown,
  Share2
} from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import React from 'react';

export const IconFile = (props: LucideProps) => <FileIcon {...props} />;
export const IconLink = (props: LucideProps) => <LinkIcon {...props} />;
export const IconNote = (props: LucideProps) => <NotebookText {...props} />;
export const IconPlus = (props: LucideProps) => <Plus {...props} />;
export const IconTrash = (props: LucideProps) => <Trash2 {...props} />;
export const IconDownload = (props: LucideProps) => <Download {...props} />;
export const IconQrCode = (props: LucideProps) => <QrCode {...props} />;
export const IconArrowLeft = (props: LucideProps) => <ArrowLeft {...props} />;
export const IconCopy = (props: LucideProps) => <Copy {...props} />;
export const IconCheck = (props: LucideProps) => <Check {...props} />;
export const IconPackage = (props: LucideProps) => <Package {...props} />;
export const IconUpload = (props: LucideProps) => <Upload {...props} />;
export const IconX = (props: LucideProps) => <X {...props} />;
export const IconEdit = (props: LucideProps) => <Edit {...props} />;
export const IconMoreVertical = (props: LucideProps) => <MoreVertical {...props} />;
export const IconChevronUp = (props: LucideProps) => <ChevronUp {...props} />;
export const IconChevronDown = (props: LucideProps) => <ChevronDown {...props} />;
// FIX: Add missing IconShare2 to fix import error in BundleEditorScreen.
export const IconShare2 = (props: LucideProps) => <Share2 {...props} />;