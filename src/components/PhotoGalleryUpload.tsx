import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCreatePhoto, useUserPhotos, useDeletePhoto, useUpdatePhotoOrder, useSetPrimaryPhoto, useReplacePhoto } from '@/hooks/usePhotos';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Plus, X, Star, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PhotoEditor } from '@/components/PhotoEditor';
import type { UserPhoto } from '@/services/photo.service';

interface PhotoGalleryUploadProps {
  userId: string;
  maxPhotos?: number;
  minPhotos?: number;
  className?: string;
}

/**
 * Photo gallery upload component for managing multiple photos
 * Supports 3-9 photos with drag-and-drop ordering
 */
export function PhotoGalleryUpload({
  userId,
  maxPhotos = 9,
  minPhotos = 3,
  className,
}: PhotoGalleryUploadProps) {
  const { user } = useAuth();
  const { data: photos = [], isLoading } = useUserPhotos(userId);
  const createPhoto = useCreatePhoto();
  const deletePhoto = useDeletePhoto();
  const replacePhoto = useReplacePhoto();
  const updatePhotoOrder = useUpdatePhotoOrder();
  const setPrimaryPhoto = useSetPrimaryPhoto();
  
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [editingPhoto, setEditingPhoto] = useState<UserPhoto | null>(null);
  const [editingNewPhoto, setEditingNewPhoto] = useState<{ file: File; index: number } | null>(null);

  const sortedPhotos = [...photos].sort((a, b) => a.display_order - b.display_order);
  const canAddMore = sortedPhotos.length < maxPhotos;

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

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
    setEditingNewPhoto({ file, index });
    // Reset file input
    event.target.value = '';
  };

  const handleSaveNewPhoto = async (file: File) => {
    if (!user || !editingNewPhoto) return;

    setUploadingIndex(editingNewPhoto.index);
    try {
      await createPhoto.mutateAsync({
        userId: user.id,
        file,
        displayOrder: editingNewPhoto.index,
        isPrimary: editingNewPhoto.index === 0 && sortedPhotos.length === 0,
        generateEmbedding: true,
      });
      toast.success('Photo uploaded successfully!');
      setEditingNewPhoto(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload photo');
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleSaveEditedPhoto = async (file: File) => {
    if (!editingPhoto) return;

    try {
      await replacePhoto.mutateAsync({
        photoId: editingPhoto.id,
        file,
        generateEmbedding: true,
      });
      toast.success('Photo updated successfully!');
      setEditingPhoto(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update photo');
    }
  };

  const handleDeletePhoto = async (e: React.MouseEvent, photoId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Allow deletion - user can always delete and re-add photos
    // The minPhotos check is just a warning, not a blocker
    if (sortedPhotos.length <= minPhotos) {
      if (!confirm(`You currently have ${sortedPhotos.length} photo(s). Deleting will leave you below the recommended minimum of ${minPhotos}. Are you sure you want to delete this photo?`)) {
        return;
      }
    } else {
      if (!confirm('Are you sure you want to delete this photo?')) {
        return;
      }
    }

    try {
      await deletePhoto.mutateAsync(photoId);
      toast.success('Photo deleted');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete photo');
    }
  };

  const handleSetPrimary = async (photoId: string) => {
    if (!user) return;

    try {
      await setPrimaryPhoto.mutateAsync({ photoId, userId: user.id });
      toast.success('Primary photo updated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to set primary photo');
    }
  };

  const handleReorder = async (fromIndex: number, toIndex: number) => {
    const photo = sortedPhotos[fromIndex];
    if (!photo) return;

    try {
      await updatePhotoOrder.mutateAsync({
        photoId: photo.id,
        displayOrder: toIndex,
      });
    } catch (error: any) {
      toast.error('Failed to reorder photo');
    }
  };

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Photos</h3>
          <p className="text-sm text-muted-foreground">
            Add {minPhotos}-{maxPhotos} photos ({sortedPhotos.length}/{maxPhotos})
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: maxPhotos }).map((_, index) => {
          const photo = sortedPhotos[index];
          const isEmpty = !photo;

          return (
            <Card
              key={photo?.id || `empty-${index}`}
              className={cn(
                'aspect-[3/4] relative overflow-hidden',
                isEmpty && 'border-dashed border-2'
              )}
            >
              <CardContent className="p-0 h-full">
                {photo ? (
                  <>
                    <div
                      className="w-full h-full cursor-pointer group relative"
                      onClick={() => setEditingPhoto(photo)}
                    >
                      <img
                        src={photo.photo_url}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.error('Failed to load photo:', photo.photo_url, photo);
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      {/* Edit overlay - appears on hover */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Edit2 className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div className="absolute top-2 right-2 flex gap-1 z-10">
                      {photo.is_primary && (
                        <div className="bg-primary text-primary-foreground p-1 rounded-full">
                          <Star className="w-3 h-3 fill-current" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePhoto(e, photo.id);
                        }}
                        className="bg-destructive/80 text-destructive-foreground p-1 rounded-full hover:bg-destructive transition-colors"
                        aria-label="Delete photo"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    {!photo.is_primary && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetPrimary(photo.id);
                        }}
                        className="absolute bottom-2 left-2 bg-background/80 text-foreground px-2 py-1 rounded text-xs hover:bg-background transition-colors z-10"
                      >
                        Set as main
                      </button>
                    )}
                  </>
                ) : (
                  <label className="h-full flex flex-col items-center justify-center cursor-pointer hover:bg-secondary/50 transition-colors border-2 border-dashed border-border rounded-lg">
                    {uploadingIndex === index ? (
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    ) : (
                      <>
                        <Plus className="w-8 h-8 text-muted-foreground mb-2" />
                        <span className="text-xs text-muted-foreground">Add photo</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileSelect(e, index)}
                      disabled={uploadingIndex === index}
                    />
                  </label>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {sortedPhotos.length < minPhotos && (
        <p className="text-sm text-destructive">
          Please add at least {minPhotos} photos
        </p>
      )}

      {/* Photo Editor for editing existing photos */}
      <PhotoEditor
        imageSrc={editingPhoto?.photo_url || null}
        open={!!editingPhoto}
        onClose={() => setEditingPhoto(null)}
        onSave={handleSaveEditedPhoto}
        aspect={3 / 4}
        showRotation={true}
        cropShape="rect"
      />

      {/* Photo Editor for new uploads */}
      <PhotoEditor
        imageSrc={editingNewPhoto?.file || null}
        open={!!editingNewPhoto}
        onClose={() => setEditingNewPhoto(null)}
        onSave={handleSaveNewPhoto}
        aspect={3 / 4}
        showRotation={true}
        cropShape="rect"
      />
    </div>
  );
}

