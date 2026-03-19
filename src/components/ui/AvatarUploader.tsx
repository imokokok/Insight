'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Upload, Trash2, Loader2, Check, X, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase/client';
import { updateUserProfile } from '@/lib/supabase/auth';
import { motion, AnimatePresence } from 'framer-motion';

interface AvatarUploaderProps {
  currentAvatarUrl?: string | null;
  userId: string;
  onAvatarUpdate: (url: string) => void;
  onError: (error: string) => void;
  onSuccess: (message: string) => void;
}

interface CropArea {
  x: number;
  y: number;
  size: number;
}

export function AvatarUploader({
  currentAvatarUrl,
  userId,
  onAvatarUpdate,
  onError,
  onSuccess,
}: AvatarUploaderProps) {
  const t = useTranslations();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, size: 100 });
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const maxSize = 5 * 1024 * 1024;

  const resetCropState = useCallback(() => {
    setCropArea({ x: 0, y: 0, size: 100 });
    setScale(1);
    setRotation(0);
    setSelectedFile(null);
    setPreviewUrl('');
    setShowCropModal(false);
  }, []);

  const validateFile = useCallback(
    (file: File): boolean => {
      if (!validTypes.includes(file.type)) {
        onError(t('settings.profile.avatar.invalidType'));
        return false;
      }
      if (file.size > maxSize) {
        onError(t('settings.profile.avatar.sizeExceeded'));
        return false;
      }
      return true;
    },
    [onError, t]
  );

  const handleFileSelect = useCallback(
    (file: File) => {
      if (!validateFile(file)) return;

      const url = URL.createObjectURL(file);
      setSelectedFile(file);
      setPreviewUrl(url);
      setShowCropModal(true);

      const img = new Image();
      img.onload = () => {
        const minDimension = Math.min(img.width, img.height);
        setImageDimensions({ width: img.width, height: img.height });
        setCropArea({
          x: (img.width - minDimension) / 2,
          y: (img.height - minDimension) / 2,
          size: minDimension,
        });
      };
      img.src = url;
    },
    [validateFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleCropComplete = async () => {
    if (!selectedFile || !previewUrl) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      console.log('Starting avatar upload...');
      console.log('UserId:', userId);
      console.log('PreviewUrl:', previewUrl);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      const outputSize = 256;
      canvas.width = outputSize;
      canvas.height = outputSize;

      const img = new Image();
      img.crossOrigin = 'anonymous';

      console.log('Loading image...');
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          console.log('Image loaded successfully');
          resolve();
        };
        img.onerror = (e) => {
          console.error('Image load error:', e);
          reject(new Error('Failed to load image'));
        };
        img.src = previewUrl;
      });

      console.log('Drawing to canvas...');
      ctx.save();
      ctx.translate(outputSize / 2, outputSize / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(scale, scale);

      const scaledCrop = {
        x: cropArea.x * (img.width / imageDimensions.width),
        y: cropArea.y * (img.height / imageDimensions.height),
        size: cropArea.size * (img.width / imageDimensions.width),
      };

      ctx.drawImage(
        img,
        scaledCrop.x,
        scaledCrop.y,
        scaledCrop.size,
        scaledCrop.size,
        -outputSize / 2,
        -outputSize / 2,
        outputSize,
        outputSize
      );
      ctx.restore();

      console.log('Creating blob...');
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => {
            if (b) {
              console.log('Blob created:', b.size, 'bytes');
              resolve(b);
            } else reject(new Error('Failed to create blob'));
          },
          'image/jpeg',
          0.9
        );
      });

      const fileName = `${userId}/avatar_${Date.now()}.jpg`;
      console.log('Uploading file:', fileName);

      setUploadProgress(30);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, {
          upsert: true,
          contentType: 'image/jpeg',
        });

      console.log('Upload result:', { data: uploadData, error: uploadError });

      if (uploadError) {
        console.error('Upload error details:', uploadError);
        throw uploadError;
      }

      setUploadProgress(70);

      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(fileName);

      console.log('Public URL:', publicUrl);

      const { error: updateError } = await updateUserProfile(userId, {
        avatar_url: publicUrl,
      });

      console.log('Update profile result:', { updateError });

      if (updateError) {
        console.error('Profile update error:', updateError);
        throw new Error(updateError.message || 'Failed to update profile');
      }

      setUploadProgress(100);
      onAvatarUpdate(publicUrl + '?t=' + Date.now());
      onSuccess(t('settings.profile.avatar.uploadSuccess'));
      resetCropState();
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      console.error('Error type:', typeof error);
      console.error('Error keys:', Object.keys(error || {}));

      // 更详细的错误信息提取
      let errorMessage = t('settings.profile.avatar.uploadFailed');

      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error?.message) {
        errorMessage = error.error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else {
        // 尝试提取 Supabase 存储错误
        try {
          errorMessage = JSON.stringify(error);
        } catch {
          errorMessage = 'Unknown error';
        }
      }

      onError(`${t('settings.profile.avatar.uploadFailed')}: ${errorMessage}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!currentAvatarUrl) return;

    setIsUploading(true);
    try {
      const { error: updateError } = await updateUserProfile(userId, {
        avatar_url: null,
      });

      if (updateError) throw updateError;

      onAvatarUpdate('');
      onSuccess(t('settings.profile.avatar.deleteSuccess'));
    } catch {
      onError(t('settings.profile.avatar.deleteFailed'));
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <>
      <div className="space-y-4">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative group transition-all duration-300 ${isDragOver ? 'scale-105' : ''}`}
        >
          <div
            className={`w-32 h-32 mx-auto relative overflow-hidden border-2 transition-all duration-300 ${
              isDragOver
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50/50'
            }`}
          >
            {currentAvatarUrl ? (
              <img
                src={currentAvatarUrl}
                alt={t('settings.profile.avatar.label')}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                <Camera className="w-12 h-12 text-gray-300" />
              </div>
            )}

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-200 ${
                isDragOver ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              } disabled:opacity-0`}
            >
              <div className="text-center text-white pointer-events-none">
                <Upload className="w-8 h-8 mx-auto mb-1" />
                <span className="text-xs font-medium">
                  {isDragOver
                    ? t('settings.profile.avatar.dropHere')
                    : t('settings.profile.avatar.clickOrDrag')}
                </span>
              </div>
            </button>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="absolute -bottom-2 -right-2 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-blue-700 transition-all duration-200 hover:scale-110 disabled:opacity-50"
          >
            {isUploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Camera className="w-5 h-5" />
            )}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept={validTypes.join(',')}
            onChange={handleInputChange}
            className="hidden"
          />
        </div>

        <div className="text-center space-y-2">
          <p className="text-sm font-medium text-gray-700">{t('settings.profile.avatar.label')}</p>
          <p className="text-xs text-gray-500">{t('settings.profile.avatar.hint')}</p>

          {currentAvatarUrl && (
            <button
              onClick={handleDeleteAvatar}
              disabled={isUploading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {t('settings.profile.avatar.delete')}
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showCropModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => !isUploading && resetCropState()}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg shadow-2xl max-w-lg w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {t('settings.profile.avatar.cropTitle')}
                </h3>
                <button
                  onClick={resetCropState}
                  disabled={isUploading}
                  className="p-1 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-6">
                <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden mb-4">
                  <img
                    ref={imageRef}
                    src={previewUrl}
                    alt="Crop preview"
                    className="w-full h-full object-contain"
                    style={{
                      transform: `scale(${scale}) rotate(${rotation}deg)`,
                    }}
                  />

                  <div
                    className="absolute border-2 border-white shadow-lg cursor-move"
                    style={{
                      left: `${(cropArea.x / imageDimensions.width) * 100}%`,
                      top: `${(cropArea.y / imageDimensions.height) * 100}%`,
                      width: `${(cropArea.size / imageDimensions.width) * 100}%`,
                      height: `${(cropArea.size / imageDimensions.height) * 100}%`,
                    }}
                  >
                    <div className="absolute inset-0 border border-white/50" />
                    <div className="absolute top-1/3 left-0 right-0 border-t border-white/50" />
                    <div className="absolute top-2/3 left-0 right-0 border-t border-white/50" />
                    <div className="absolute left-1/3 top-0 bottom-0 border-l border-white/50" />
                    <div className="absolute left-2/3 top-0 bottom-0 border-l border-white/50" />
                  </div>
                </div>

                <div className="flex items-center justify-center gap-4 mb-6">
                  <button
                    onClick={() => setScale(Math.max(0.5, scale - 0.1))}
                    disabled={isUploading}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                    title={t('settings.profile.avatar.zoomOut')}
                  >
                    <ZoomOut className="w-5 h-5 text-gray-600" />
                  </button>
                  <span className="text-sm text-gray-500 w-16 text-center">
                    {Math.round(scale * 100)}%
                  </span>
                  <button
                    onClick={() => setScale(Math.min(2, scale + 0.1))}
                    disabled={isUploading}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                    title={t('settings.profile.avatar.zoomIn')}
                  >
                    <ZoomIn className="w-5 h-5 text-gray-600" />
                  </button>
                  <div className="w-px h-6 bg-gray-200" />
                  <button
                    onClick={() => setRotation((rotation + 90) % 360)}
                    disabled={isUploading}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                    title={t('settings.profile.avatar.rotate')}
                  >
                    <RotateCw className="w-5 h-5 text-gray-600" />
                  </button>
                </div>

                {isUploading && (
                  <div className="mb-4">
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadProgress}%` }}
                        className="h-full bg-blue-600"
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 text-center mt-2">
                      {t('settings.profile.avatar.uploading')} {uploadProgress}%
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={resetCropState}
                    disabled={isUploading}
                    className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 font-medium text-sm"
                  >
                    {t('settings.profile.cancel')}
                  </button>
                  <button
                    onClick={handleCropComplete}
                    disabled={isUploading}
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium text-sm flex items-center justify-center gap-2"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t('settings.profile.avatar.uploading')}
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        {t('settings.profile.avatar.apply')}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <canvas ref={canvasRef} className="hidden" />
    </>
  );
}
