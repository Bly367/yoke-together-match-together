import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Loader2, X, Edit2 } from 'lucide-react';
import { useUploadPhoto, useDeletePhoto } from '@/hooks/useStorage';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { PhotoEditor } from '@/components/PhotoEditor';

interface PhotoUploadProps {
  currentPhotoUrl?: string;
  onPhotoUploaded: (url: string) => void;
  userId: string;
  className?: string;
}

/**
 * Reusable photo upload component with cropping functionality
 * Similar to Hinge/text messaging - tap to edit, easy adjustments
 */
export function PhotoUpload({ currentPhotoUrl, onPhotoUploaded, userId, className = '' }: PhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentPhotoUrl || null);
  const [imageToEdit, setImageToEdit] = useState<string | File | null>(null);
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

    // Open editor for new photo
    setImageToEdit(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSavePhoto = async (file: File) => {
    try {
      // Upload edited photo
      const url = await uploadPhotoMutation.mutateAsync({ file, userId });
      
      // Validate URL was returned
      if (!url || !url.trim()) {
        throw new Error('Upload succeeded but no URL was returned');
      }

      // Update preview and close editor
      setPreview(url.trim());
      setImageToEdit(null);
      onPhotoUploaded(url.trim());
      toast.success('Photo uploaded successfully');
    } catch (error: any) {
      logger.error('Failed to upload photo', error);
      toast.error(error.message || 'Failed to upload photo');
    }
  };

  const handleEditExisting = () => {
    if (preview) {
      setImageToEdit(preview);
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
        <div className="relative w-32 h-32 rounded-full bg-secondary/50 flex items-center justify-center border-4 border-primary/20 shadow-lg overflow-hidden">
          {preview ? (
            <>
              <div
                className="w-full h-full cursor-pointer group relative"
                onClick={handleEditExisting}
              >
                <img
                  src={preview}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
                {/* Edit overlay - appears on hover */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                  <Edit2 className="w-6 h-6 text-white" />
                </div>
              </div>
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
            <div
              className="w-full h-full cursor-pointer flex items-center justify-center"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="w-12 h-12 text-primary" />
            </div>
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

      {/* Photo Editor */}
      <PhotoEditor
        imageSrc={imageToEdit}
        open={!!imageToEdit}
        onClose={() => setImageToEdit(null)}
        onSave={handleSavePhoto}
        aspect={1}
        showRotation={true}
        cropShape="round"
      />
    </>
  );
}
