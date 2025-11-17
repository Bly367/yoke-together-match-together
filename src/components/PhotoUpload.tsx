import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Loader2, X, ZoomIn, RotateCw } from 'lucide-react';
import { useUploadPhoto, useDeletePhoto } from '@/hooks/useStorage';
import { toast } from 'sonner';
import Cropper from 'react-easy-crop';
import { createCroppedImage } from '@/lib/utils';
import { logger } from '@/lib/logger';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';

interface PhotoUploadProps {
  currentPhotoUrl?: string;
  onPhotoUploaded: (url: string) => void;
  userId: string;
  className?: string;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Reusable photo upload component with cropping functionality
 */
export function PhotoUpload({ currentPhotoUrl, onPhotoUploaded, userId, className = '' }: PhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentPhotoUrl || null);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadPhotoMutation = useUploadPhoto();
  const deletePhotoMutation = useDeletePhoto();

  // Update preview when currentPhotoUrl changes
  useEffect(() => {
    setPreview(currentPhotoUrl || null);
  }, [currentPhotoUrl]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    // Create preview and open crop dialog
    const reader = new FileReader();
    reader.onloadend = () => {
      setImageToCrop(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
    };
    reader.readAsDataURL(file);
  };

  const onCropComplete = (_croppedArea: CropArea, croppedAreaPixels: CropArea) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleCropAndUpload = async () => {
    if (!imageToCrop || !croppedAreaPixels) return;

    try {
      // Create cropped blob
      const croppedBlob = await createCroppedImage(
        imageToCrop,
        croppedAreaPixels,
        rotation
      );

      // Convert blob to file
      const croppedFile = new File([croppedBlob], 'cropped-image.jpg', {
        type: 'image/jpeg',
      });

      // Upload cropped photo
      const url = await uploadPhotoMutation.mutateAsync({ file: croppedFile, userId });
      
      // Validate URL was returned
      if (!url || !url.trim()) {
        throw new Error('Upload succeeded but no URL was returned');
      }

      // Update preview and close dialog
      setPreview(url.trim());
      setImageToCrop(null);
      onPhotoUploaded(url.trim());
      toast.success('Photo uploaded successfully');
    } catch (error: any) {
      logger.error('Failed to upload photo', error);
      toast.error(error.message || 'Failed to upload photo');
      // Reset state on error
      setImageToCrop(null);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      setCroppedAreaPixels(null);
    }
  };

  const handleCancelCrop = () => {
    setImageToCrop(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setCroppedAreaPixels(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    // Delete photo from storage if there's a preview URL
    if (preview && preview.trim()) {
      try {
        await deletePhotoMutation.mutateAsync(preview);
        toast.success('Photo removed');
      } catch (error: any) {
        // Log error but continue with removal (photo might already be deleted)
        logger.error('Failed to delete photo from storage', error);
        toast.error(error.message || 'Failed to remove photo from storage');
        // Continue with removal anyway
      }
    }
    
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onPhotoUploaded('');
  };

  return (
    <>
      <div className={`relative ${className}`}>
        <div className="relative w-32 h-32 rounded-full bg-secondary/50 flex items-center justify-center border-4 border-primary/20 shadow-lg overflow-hidden cursor-pointer"
          onClick={() => fileInputRef.current?.click()}>
          {preview ? (
            <>
              <img
                src={preview}
                alt="Profile"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={async (e) => {
                  e.stopPropagation();
                  await handleRemove();
                }}
                disabled={deletePhotoMutation.isPending}
                className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-full p-1 shadow-lg hover:scale-110 transition-transform z-10 disabled:opacity-50"
              >
                {deletePhotoMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <X className="w-4 h-4" />
                )}
              </button>
            </>
          ) : (
            <Camera className="w-12 h-12 text-primary" />
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploadPhotoMutation.isPending}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="absolute bottom-0 right-0 rounded-full p-2"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadPhotoMutation.isPending}
        >
          {uploadPhotoMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Camera className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Crop Dialog */}
      <Dialog open={!!imageToCrop} onOpenChange={(open) => !open && handleCancelCrop()}>
        <DialogContent className="max-w-2xl data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100">
          <DialogHeader>
            <DialogTitle>Crop Your Photo</DialogTitle>
          </DialogHeader>
          
          <div className="relative w-full h-[400px] bg-secondary/20 rounded-lg overflow-hidden">
            {imageToCrop && (
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onRotationChange={setRotation}
                onCropComplete={onCropComplete}
                cropShape="round"
                showGrid={false}
                style={{
                  containerStyle: {
                    width: '100%',
                    height: '100%',
                    position: 'relative',
                  },
                }}
              />
            )}
          </div>

          {/* Controls */}
          <div className="space-y-4">
            {/* Zoom Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <ZoomIn className="w-4 h-4" />
                  <span>Zoom</span>
                </div>
                <span className="text-muted-foreground">{Math.round(zoom * 100)}%</span>
              </div>
              <Slider
                value={[zoom]}
                onValueChange={(value) => setZoom(value[0])}
                min={1}
                max={3}
                step={0.1}
                className="w-full"
              />
            </div>

            {/* Rotation Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <RotateCw className="w-4 h-4" />
                  <span>Rotation</span>
                </div>
                <span className="text-muted-foreground">{rotation}°</span>
              </div>
              <Slider
                value={[rotation]}
                onValueChange={(value) => setRotation(value[0])}
                min={0}
                max={360}
                step={1}
                className="w-full"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelCrop}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCropAndUpload}
              disabled={uploadPhotoMutation.isPending || !croppedAreaPixels}
            >
              {uploadPhotoMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Save Photo'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
