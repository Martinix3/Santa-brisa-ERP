"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { useState, useRef } from "react";
import { Camera, Upload, X, RefreshCw, AlertCircle } from "lucide-react";
import { useCameraAccess } from "@/hooks/useCameraAccess";
import { warehouseES } from "@/i18n/warehouse.es";

export interface PhotoFile {
  id: string;
  file: File;
  preview: string;
  timestamp: Date;
}

interface PhotoUploadButtonProps {
  photos: PhotoFile[];
  onChange: (photos: PhotoFile[]) => void;
  maxPhotos?: number;
  label?: string;
  helperText?: string;
}

export function PhotoUploadButton({
  photos,
  onChange,
  maxPhotos = 5,
  label = warehouseES.goodsReceipt.photos,
  helperText,
}: PhotoUploadButtonProps) {
  const [showCamera, setShowCamera] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    isActive,
    error: cameraError,
    capabilities,
    startCamera,
    stopCamera,
    capturePhoto,
    switchCamera,
    videoRef,
    canvasRef,
  } = useCameraAccess();

  // Handle opening camera
  const handleOpenCamera = async () => {
    setShowCamera(true);
    await startCamera("environment"); // Start with back camera
  };

  // Handle closing camera
  const handleCloseCamera = () => {
    stopCamera();
    setShowCamera(false);
  };

  // Handle capturing photo from camera
  const handleCapturePhoto = async () => {
    const blob = await capturePhoto();
    if (!blob) return;

    // Convert blob to file
    const file = new File([blob], `photo-${Date.now()}.jpg`, {
      type: "image/jpeg",
    });

    // Create preview URL
    const preview = URL.createObjectURL(blob);

    // Add to photos
    const newPhoto: PhotoFile = {
      id: `${Date.now()}-${Math.random()}`,
      file,
      preview,
      timestamp: new Date(),
    };

    onChange([...photos, newPhoto]);
  };

  // Handle gallery upload
  const handleGalleryUpload = () => {
    fileInputRef.current?.click();
  };

  // Handle file input change
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);

    try {
      const newPhotos: PhotoFile[] = [];

      for (const file of files) {
        // Check if we've reached max photos
        if (photos.length + newPhotos.length >= maxPhotos) break;

        // Validate file type (images and PDFs)
        if (!file.type.startsWith("image/") && file.type !== "application/pdf") continue;

        // Create preview
        const preview = URL.createObjectURL(file);

        newPhotos.push({
          id: `${Date.now()}-${Math.random()}`,
          file,
          preview,
          timestamp: new Date(),
        });
      }

      onChange([...photos, ...newPhotos]);
    } catch (error) {
      console.error("Error uploading photos:", error);
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Handle delete photo
  const handleDeletePhoto = (photoId: string) => {
    const updatedPhotos = photos.filter((photo) => photo.id !== photoId);
    
    // Revoke object URL to free memory
    const deletedPhoto = photos.find((photo) => photo.id === photoId);
    if (deletedPhoto) {
      URL.revokeObjectURL(deletedPhoto.preview);
    }
    
    onChange(updatedPhotos);
  };

  const canAddMore = photos.length < maxPhotos;

  return (
    <div className="space-y-3">
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-foreground">
          {label}
          <span className="text-muted-foreground font-normal ml-2">
            ({photos.length}/{maxPhotos})
          </span>
        </label>
      )}

      {/* Photo/PDF Grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((photo) => {
            const isPDF = photo.file.type === "application/pdf";
            
            return (
              <div
                key={photo.id}
                className="relative aspect-square rounded-lg overflow-hidden bg-muted group"
              >
                {isPDF ? (
                  <div className="w-full h-full flex flex-col items-center justify-center p-4">
                    <svg className="w-12 h-12 text-destructive mb-2" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M4 18h12V6h-4V2H4v16zm-2 1V0h12l4 4v16H2v-1z"/>
                      <text x="6" y="14" fontSize="6" fontWeight="bold" fill="currentColor">PDF</text>
                    </svg>
                    <p className="text-xs text-center text-foreground truncate max-w-full">
                      {photo.file.name}
                    </p>
                  </div>
                ) : (
                  <img
                    src={photo.preview}
                    alt="Uploaded photo"
                    className="w-full h-full object-cover"
                  />
                )}
                
                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => handleDeletePhoto(photo.id)}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive text-destructive-foreground
                           opacity-0 group-hover:opacity-100 transition-opacity
                           hover:bg-destructive/90 focus:outline-none focus:ring-2 focus:ring-destructive"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Action Buttons */}
      {canAddMore && (
        <div className="flex gap-3">
          {/* Camera Button */}
          {capabilities.isSupported && (
            <button
              type="button"
              onClick={handleOpenCamera}
              className="flex-1 h-12 flex items-center justify-center gap-2 rounded-lg
                       border-2 border-dashed border-border
                       text-foreground font-medium
                       hover:border-primary
                       hover:text-primary
                       transition-colors"
            >
              <Camera className="w-5 h-5" />
              <span>{warehouseES.goodsReceipt.takePhoto}</span>
            </button>
          )}

          {/* Gallery Upload Button */}
          <button
            type="button"
            onClick={handleGalleryUpload}
            disabled={isUploading}
            className="flex-1 h-12 flex items-center justify-center gap-2 rounded-lg
                     border-2 border-dashed border-border
                     text-foreground font-medium
                     hover:border-primary
                     hover:text-primary
                     transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-5 h-5" />
            <span>
              {isUploading
                ? warehouseES.goodsReceipt.uploadingPhotos
                : warehouseES.goodsReceipt.uploadImage}
            </span>
          </button>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}

      {/* Helper Text */}
      {helperText && photos.length === 0 && (
        <p className="text-sm text-muted-foreground">{helperText}</p>
      )}

      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 z-50 bg-black">
          {/* Camera View */}
          <div className="relative w-full h-full">
            {/* Video Stream */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Hidden canvas for capture */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Camera Error */}
            {cameraError && (
              <div className="absolute top-4 left-4 right-4 p-4 rounded-lg bg-destructive text-destructive-foreground">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Error de Cámara</p>
                    <p className="text-sm mt-1">{cameraError}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Camera Controls */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
              <div className="flex items-center justify-between max-w-2xl mx-auto">
                {/* Close Button */}
                <button
                  type="button"
                  onClick={handleCloseCamera}
                  className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm
                           flex items-center justify-center text-white
                           hover:bg-white/30 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>

                {/* Capture Button */}
                <button
                  type="button"
                  onClick={handleCapturePhoto}
                  disabled={!isActive || !!cameraError}
                  className="w-16 h-16 rounded-full bg-background
                           flex items-center justify-center
                           hover:bg-muted transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed
                           ring-4 ring-foreground/30"
                >
                  <Camera className="w-8 h-8 text-foreground" />
                </button>

                {/* Switch Camera Button */}
                {capabilities.hasFrontCamera && capabilities.hasBackCamera && (
                  <button
                    type="button"
                    onClick={switchCamera}
                    disabled={!isActive}
                    className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm
                             flex items-center justify-center text-white
                             hover:bg-white/30 transition-colors
                             disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className="w-6 h-6" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
