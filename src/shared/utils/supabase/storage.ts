import { createClient } from "./client";
import { compressImage } from "../image-compression";

/**
 * Uploads student photo to Supabase Storage with automatic client-side compression
 * and maximum Cache-Control headers to minimize Egress bandwidth.
 */
export async function uploadStudentPhoto(
  imageData: string | File | Blob,
  fileName: string
) {
  const supabase = createClient();

  // 1. Compress image to WebP/JPEG before upload (Max 480x480, quality 82%)
  let uploadBlob: Blob;
  let contentType = "image/webp";

  try {
    const compressed = await compressImage(imageData, {
      maxWidth: 480,
      maxHeight: 480,
      quality: 0.82,
      format: "image/webp",
    });
    uploadBlob = compressed.blob;
    contentType = compressed.format;
  } catch (err) {
    console.warn("Client compression failed, using original image:", err);
    if (typeof imageData === "string") {
      const res = await fetch(imageData);
      uploadBlob = await res.blob();
    } else {
      uploadBlob = imageData;
    }
  }

  // Ensure file extension matches contentType
  let finalFileName = fileName;
  if (contentType === "image/webp" && !finalFileName.endsWith(".webp")) {
    finalFileName = finalFileName.replace(/\.[^/.]+$/, "") + ".webp";
  }

  // 2. Upload with 1 year immutable cache header
  const { data, error } = await supabase.storage
    .from("student-photos")
    .upload(finalFileName, uploadBlob, {
      contentType: contentType,
      cacheControl: "31536000, public, immutable",
      upsert: true,
    });

  if (error) {
    console.error("Supabase Storage Upload Error:", error);
    throw new Error(error.message || "Failed to upload to Supabase Storage");
  }

  if (!data) {
    throw new Error("No data returned from Supabase upload");
  }

  const { data: publicUrlData } = supabase.storage
    .from("student-photos")
    .getPublicUrl(data.path);

  if (!publicUrlData || !publicUrlData.publicUrl) {
    throw new Error("Failed to generate public URL for uploaded photo");
  }

  return publicUrlData.publicUrl;
}

/**
 * Uploads school logos, stamps, and official headers with compression
 */
export async function uploadSchoolAsset(
  bucketName: string,
  imageData: string | File | Blob,
  fileName: string,
  maxWidth = 600
) {
  const supabase = createClient();

  let uploadBlob: Blob;
  let contentType = "image/webp";

  try {
    const compressed = await compressImage(imageData, {
      maxWidth,
      maxHeight: maxWidth,
      quality: 0.85,
      format: "image/webp",
    });
    uploadBlob = compressed.blob;
    contentType = compressed.format;
  } catch (_) {
    if (typeof imageData === "string") {
      const res = await fetch(imageData);
      uploadBlob = await res.blob();
    } else {
      uploadBlob = imageData;
    }
  }

  let finalFileName = fileName;
  if (contentType === "image/webp" && !finalFileName.endsWith(".webp")) {
    finalFileName = finalFileName.replace(/\.[^/.]+$/, "") + ".webp";
  }

  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(finalFileName, uploadBlob, {
      contentType: contentType,
      cacheControl: "31536000, public, immutable",
      upsert: true,
    });

  if (error) {
    throw new Error(error.message || `Failed to upload to ${bucketName}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(data.path);

  return publicUrlData.publicUrl;
}
