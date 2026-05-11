"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { useState, useRef, useCallback, useEffect } from "react";

export interface CameraCapabilities {
  hasCamera: boolean;
  hasFrontCamera: boolean;
  hasBackCamera: boolean;
  isSupported: boolean;
}

export interface UseCameraAccessReturn {
  // State
  stream: MediaStream | null;
  isActive: boolean;
  error: string | null;
  capabilities: CameraCapabilities;
  
  // Actions
  startCamera: (facingMode?: "user" | "environment") => Promise<void>;
  stopCamera: () => void;
  capturePhoto: () => Promise<Blob | null>;
  switchCamera: () => Promise<void>;
  
  // Refs
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

/**
 * Hook para acceder a la cámara del dispositivo
 * Optimizado para móviles y tablets en contexto de warehouse
 * 
 * Features:
 * - Acceso a cámara frontal/trasera
 * - Captura de fotos
 * - Detección de capacidades
 * - Auto-cleanup
 */
export function useCameraAccess(): UseCameraAccessReturn {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [capabilities, setCapabilities] = useState<CameraCapabilities>({
    hasCamera: false,
    hasFrontCamera: false,
    hasBackCamera: false,
    isSupported: false,
  });

  const videoRef = useRef<HTMLVideoElement>(null!);
  const canvasRef = useRef<HTMLCanvasElement>(null!);

  // Check camera capabilities on mount
  useEffect(() => {
    const checkCapabilities = async () => {
      // Check if getUserMedia is supported
      const isSupported = !!(
        navigator.mediaDevices && navigator.mediaDevices.getUserMedia
      );

      if (!isSupported) {
        setCapabilities({
          hasCamera: false,
          hasFrontCamera: false,
          hasBackCamera: false,
          isSupported: false,
        });
        return;
      }

      try {
        // Try to enumerate devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((device) => device.kind === "videoinput");
        
        // Check for front/back cameras
        const hasFrontCamera = videoDevices.some(
          (device) => device.label.toLowerCase().includes("front")
        );
        const hasBackCamera = videoDevices.some(
          (device) => device.label.toLowerCase().includes("back")
        );

        setCapabilities({
          hasCamera: videoDevices.length > 0,
          hasFrontCamera: hasFrontCamera || videoDevices.length > 1,
          hasBackCamera: hasBackCamera || videoDevices.length > 0,
          isSupported: true,
        });
      } catch (err) {
        console.warn("Could not enumerate devices:", err);
        setCapabilities({
          hasCamera: true, // Assume camera exists if we can't check
          hasFrontCamera: true,
          hasBackCamera: true,
          isSupported: true,
        });
      }
    };

    checkCapabilities();
  }, []);

  // Start camera
  const startCamera = useCallback(
    async (requestedFacingMode: "user" | "environment" = "environment") => {
      setError(null);

      if (!capabilities.isSupported) {
        setError("Tu dispositivo no soporta acceso a cámara");
        return;
      }

      try {
        // Stop existing stream if any
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }

        // Request camera access
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: requestedFacingMode,
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });

        // Attach stream to video element
        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
          videoRef.current.play();
        }

        setStream(newStream);
        setFacingMode(requestedFacingMode);
        setIsActive(true);
      } catch (err) {
        console.error("Error accessing camera:", err);
        
        if (err instanceof Error) {
          if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
            setError("Permiso de cámara denegado. Por favor, habilítalo en la configuración.");
          } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
            setError("No se encontró ninguna cámara en este dispositivo.");
          } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
            setError("La cámara está siendo usada por otra aplicación.");
          } else {
            setError("Error al acceder a la cámara. Inténtalo de nuevo.");
          }
        } else {
          setError("Error desconocido al acceder a la cámara.");
        }
      }
    },
    [stream, capabilities.isSupported]
  );

  // Stop camera
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsActive(false);
    setError(null);
  }, [stream]);

  // Capture photo
  const capturePhoto = useCallback(async (): Promise<Blob | null> => {
    if (!videoRef.current || !canvasRef.current || !stream) {
      setError("La cámara no está activa");
      return null;
    }

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setError("Error al procesar la imagen");
        return null;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert canvas to blob
      return new Promise((resolve) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              setError("Error al capturar la foto");
              resolve(null);
            }
          },
          "image/jpeg",
          0.9 // Quality
        );
      });
    } catch (err) {
      console.error("Error capturing photo:", err);
      setError("Error al capturar la foto");
      return null;
    }
  }, [stream]);

  // Switch between front and back camera
  const switchCamera = useCallback(async () => {
    const newFacingMode = facingMode === "user" ? "environment" : "user";
    await startCamera(newFacingMode);
  }, [facingMode, startCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  return {
    stream,
    isActive,
    error,
    capabilities,
    startCamera,
    stopCamera,
    capturePhoto,
    switchCamera,
    videoRef,
    canvasRef,
  };
}
