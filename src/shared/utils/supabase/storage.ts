import { createClient } from "./client";

export async function uploadStudentPhoto(base64Data: string, fileName: string) {
  const supabase = createClient();
  
  // Convert base64 to Blob
  const response = await fetch(base64Data);
  const blob = await response.blob();
  
  const { data, error } = await supabase.storage
    .from('student-photos')
    .upload(fileName, blob, {
      contentType: 'image/jpeg',
      cacheControl: '3600',
      upsert: true
    });

  if (error) {
    console.error("Supabase Storage Upload Error:", error);
    throw new Error(error.message || "Failed to upload to Supabase Storage");
  }

  if (!data) {
    throw new Error("No data returned from Supabase upload");
  }

  const { data: publicUrlData } = supabase.storage
    .from('student-photos')
    .getPublicUrl(data.path);

  if (!publicUrlData || !publicUrlData.publicUrl) {
    throw new Error("Failed to generate public URL for uploaded photo");
  }

  return publicUrlData.publicUrl;
}
