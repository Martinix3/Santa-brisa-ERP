/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

/**
 * Firebase Storage Upload Utilities
 * Handles file uploads to Firebase Storage with proper error handling
 */

import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirebaseSync } from "@/lib/firebaseClient";

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Upload a file to Firebase Storage
 * @param file - The file to upload
 * @param path - Storage path (e.g., "goods-receipts/2025/01/photo.jpg")
 * @returns Promise with download URL or error
 */
export async function uploadFileToStorage(
  file: File,
  path: string
): Promise<UploadResult> {
  try {
    const { firebaseApp } = getFirebaseSync();
    const storage = getStorage(firebaseApp);
    const storageRef = ref(storage, path);
    
    // Upload file
    await uploadBytes(storageRef, file, {
      contentType: file.type,
    });

    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);

    return {
      success: true,
      url: downloadURL,
    };
  } catch (error: any) {
    console.error("Error uploading file:", error);
    return {
      success: false,
      error: error.message || "Error al subir archivo",
    };
  }
}

/**
 * Upload multiple files to Firebase Storage
 * @param files - Array of files to upload
 * @param basePath - Base storage path (e.g., "goods-receipts/GR_123456")
 * @returns Promise with array of download URLs
 */
export async function uploadMultipleFiles(
  files: File[],
  basePath: string
): Promise<{ urls: string[]; errors: string[] }> {
  const urls: string[] = [];
  const errors: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const timestamp = Date.now();
    const ext = file.name.split(".").pop();
    const path = `${basePath}/${timestamp}_${i}.${ext}`;

    const result = await uploadFileToStorage(file, path);

    if (result.success && result.url) {
      urls.push(result.url);
    } else {
      errors.push(`${file.name}: ${result.error}`);
    }
  }

  return { urls, errors };
}

/**
 * Generate storage path for goods receipt photos
 * @param receiptNumber - Receipt number (e.g., "GR_20250117_001")
 * @param lineIndex - Line index in receipt
 * @returns Storage path string
 */
export function generateGoodsReceiptPhotoPath(
  receiptNumber: string,
  lineIndex: number
): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  
  return `goods-receipts/${year}/${month}/${receiptNumber}/line-${lineIndex}`;
}

/**
 * Generate storage path for manual inventory adjustments
 * @param adjustmentId - Identifier for the adjustment (e.g., lotNumber or generated id)
 */
export function generateManualAdjustmentPath(adjustmentId: string): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `manual-adjustments/${year}/${month}/${adjustmentId}`;
}

/**
 * Generate storage path for quality CoA / attachments
 */
export function generateQualityCoAPath(lotNumber: string): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `quality/coa/${year}/${month}/${lotNumber}`;
}

/**
 * Generate storage path for account photos
 */
export function generateAccountPhotoPath(accountId: string): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `accounts/${accountId}/photos/${year}/${month}`;
}
