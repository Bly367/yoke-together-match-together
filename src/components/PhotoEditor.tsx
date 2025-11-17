import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, ZoomIn, RotateCw } from 'lucide-react';
import { toast } from 'sonner';
import Cropper from 'react-easy-crop';
import { createCroppedImage } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PhotoEditorProps {
  /** Image source - can be a URL or File */
  imageSrc: string | File | null;
  /** Whether the editor is open */
  open: boolean;
  /** Callback when editor closes */
  onClose: () => void;
  /** Callback when photo is saved - receives the edited File */
  onSave: (file: File) => Promise<void>;
  /** Aspect ratio for cropping (default: 3/4 for portrait photos) */
  aspect?: number;
  /** Whether to show rotation controls (default: true) */
  showRotation?: boolean;
  /** Crop shape - 'rect' or 'round' (default: 'rect') */
  cropShape?: 'rect' | 'round';
}

/**
 * Photo editor component with crop, zoom, and rotation controls
 * Similar to Hinge/text messaging photo editing
 */
export function PhotoEditor({
  imageSrc,
  open,
  onClose,
  onSave,
  aspect = 3 / 4,
  showRotation = true,
  cropShape = 'rect',
}: PhotoEditorProps) {
  const [imageToEdit, setImageToEdit] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load image when src changes
  useEffect(() => {
    if (!imageSrc) {
      setImageToEdit(null);
      return;
    }

    if (typeof imageSrc === 'string') {
      // URL string
      setImageToEdit(imageSrc);
    } else {
      // File object
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageToEdit(reader.result as string);
      };
      reader.readAsDataURL(imageSrc);
    }

    // Reset controls
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setCroppedAreaPixels(null);
  }, [imageSrc]);

  const onCropComplete = (_croppedArea: CropArea, croppedAreaPixels: CropArea) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleSave = async () => {
    if (!imageToEdit || !croppedAreaPixels) {
      toast.error('Please adjust your photo before saving');
      return;
    }

    setIsSaving(true);
    try {
      // Create cropped blob
      const croppedBlob = await createCroppedImage(
        imageToEdit,
        croppedAreaPixels,
        rotation
      );

      // Convert blob to file
      const editedFile = new File([croppedBlob], 'edited-photo.jpg', {
        type: 'image/jpeg',
      });

      await onSave(editedFile);
      handleClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save photo');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setImageToEdit(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setCroppedAreaPixels(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-2xl data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0">
          <DialogHeader>
            <DialogTitle>Edit Photo</DialogTitle>
            <DialogDescription>
              Drag the image to position it, then adjust zoom and rotation
            </DialogDescription>
          </DialogHeader>

        {imageToEdit && (
          <>
            <div className="relative w-full h-[400px] bg-secondary/20 rounded-lg overflow-hidden touch-none">
              <Cropper
                image={imageToEdit}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={aspect}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onRotationChange={setRotation}
                onCropComplete={onCropComplete}
                cropShape={cropShape}
                showGrid={false}
                restrictPosition={false}
                style={{
                  containerStyle: {
                    width: '100%',
                    height: '100%',
                    position: 'relative',
                  },
                  cropAreaStyle: {
                    border: '2px solid rgba(255, 255, 255, 0.8)',
                  },
                }}
              />
            </div>

            {/* Instructions */}
            <div className="text-sm text-muted-foreground text-center py-2">
              Click and drag the image to position it • Use sliders below for zoom and rotation
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
                  min={0}
                  max={2}
                  step={0.01}
                  className="w-full"
                />
              </div>

              {/* Rotation Control */}
              {showRotation && (
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
              )}
            </div>
          </>
        )}

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !croppedAreaPixels}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

