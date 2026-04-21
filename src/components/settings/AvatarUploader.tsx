'use client';

import { useState, useRef } from 'react';

import Image from 'next/image';

import { User, Loader2, Upload, Trash2 } from 'lucide-react';

import { uploadAvatar, deleteAvatar } from '@/lib/supabase/auth';

interface AvatarUploaderProps {
  currentAvatarUrl?: string | null;
  userId: string;
  onAvatarUpdate: (url: string) => Promise<void>;
  onError: (errorMsg: string) => void;
  onSuccess: (message: string) => void;
}

export function AvatarUploader({
  currentAvatarUrl,
  userId,
  onAvatarUpdate,
  onError,
  onSuccess,
}: AvatarUploaderProps) {
  const [imgError, setImgError] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      onError('File size must be less than 2MB');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      onError('Invalid file type');
      return;
    }

    setIsUploading(true);
    setImgError(false);

    try {
      const result = await uploadAvatar(userId, file);

      if (result.error) {
        onError(result.error.message);
      } else if (result.url) {
        await onAvatarUpdate(result.url);
        onSuccess('Avatar updated successfully');
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to upload avatar');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteAvatar = async () => {
    setIsUploading(true);

    try {
      const result = await deleteAvatar(userId);

      if (result.error) {
        onError(result.error.message);
      } else {
        await onAvatarUpdate('');
        onSuccess('Avatar removed successfully');
        setImgError(false);
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to delete avatar');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
      <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden relative">
        {currentAvatarUrl && !imgError ? (
          <Image
            src={currentAvatarUrl}
            alt="Avatar"
            fill
            className="object-cover"
            onError={() => setImgError(true)}
            unoptimized
          />
        ) : (
          <User className="w-10 h-10 text-gray-500" />
        )}
      </div>
      <div className="flex flex-col gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />
        <div className="flex gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {isUploading ? 'Uploading...' : 'Upload Avatar'}
          </button>
          {currentAvatarUrl && (
            <button
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 border border-red-600 rounded-md hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleDeleteAvatar}
              disabled={isUploading}
            >
              <Trash2 className="w-4 h-4" />
              Remove
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500">JPG, PNG, WebP or GIF. Max 2MB.</p>
      </div>
    </div>
  );
}
