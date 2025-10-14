"use client";

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';

interface ImageUploadProps {
  onUpload: (files: File[]) => Promise<string[]>;
  maxFiles?: number;
  existingImages?: string[];
  onRemove?: (url: string) => void;
}

export function ImageUpload({ 
  onUpload, 
  maxFiles = 5, 
  existingImages = [],
  onRemove 
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string[]>(existingImages);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploading(true);
    try {
      // Crear previews locales
      const newPreviews = acceptedFiles.map(file => URL.createObjectURL(file));
      setPreview(prev => [...prev, ...newPreviews]);
      
      // Upload real (implementar según tu backend)
      const urls = await onUpload(acceptedFiles);
      
      // Limpiar previews temporales y usar URLs reales
      newPreviews.forEach(url => URL.revokeObjectURL(url));
      setPreview(prev => {
        const withoutTemp = prev.filter(p => !newPreviews.includes(p));
        return [...withoutTemp, ...urls];
      });
    } catch (error) {
      console.error('Error uploading files:', error);
    } finally {
      setUploading(false);
    }
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp']
    },
    maxFiles: maxFiles - preview.length,
    disabled: preview.length >= maxFiles || uploading
  });

  const handleRemove = (url: string) => {
    setPreview(prev => prev.filter(p => p !== url));
    if (onRemove) {
      onRemove(url);
    }
  };

  return (
    <div className="space-y-3">
      {/* Dropzone */}
      {preview.length < maxFiles && (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
            ${isDragActive 
              ? 'border-primary bg-primary/5' 
              : 'border-border hover:border-primary/50 hover:bg-secondary/50'
            }
            ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-2">
            {uploading ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Subiendo imágenes...</p>
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    {isDragActive 
                      ? 'Suelta las imágenes aquí' 
                      : 'Arrastra imágenes o haz click para seleccionar'
                    }
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    JPG, PNG o WEBP (máx. {maxFiles} imágenes)
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Preview Grid */}
      {preview.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {preview.map((url, index) => (
            <div key={index} className="relative group">
              <div className="aspect-square rounded-lg overflow-hidden bg-secondary">
                <img 
                  src={url} 
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                onClick={() => handleRemove(url)}
                className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                disabled={uploading}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Info */}
      {preview.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {preview.length} de {maxFiles} imágenes
        </p>
      )}
    </div>
  );
}
