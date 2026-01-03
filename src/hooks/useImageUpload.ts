"use client";

import { useState } from "react";
import { supabaseBrowserClient } from "@utils/supabase/client";
import {
  STORAGE_BUCKET_NAME,
  generateUniqueFilename,
  getContentType,
} from "@utils/supabase/storage-config";

interface UploadResult {
  filename: string | null;
  error: string | null;
}

interface UseImageUploadReturn {
  uploadImage: (
    file: File | Blob,
    topicNumber?: number,
    questionNumber?: number
  ) => Promise<UploadResult>;
  isUploading: boolean;
}

export function useImageUpload(): UseImageUploadReturn {
  const [isUploading, setIsUploading] = useState(false);

  const uploadImage = async (
    file: File | Blob,
    topicNumber?: number,
    questionNumber?: number
  ): Promise<UploadResult> => {
    setIsUploading(true);

    try {
      const filespath = localStorage.getItem("filespath");
      if (!filespath) {
        return { filename: null, error: "No topic selected. Please select a topic first." };
      }

      if (!STORAGE_BUCKET_NAME) {
        return { filename: null, error: "Storage bucket not configured. Check NEXT_PUBLIC_RESOURCE_BUCKET_URL" };
      }

      let extension = "png";
      if (file instanceof File && file.name) {
        const match = file.name.match(/\.(\w+)$/);
        if (match) extension = match[1];
      } else if (file.type) {
        const typeParts = file.type.split("/");
        if (typeParts[1]) extension = typeParts[1];
      }

      const filename = generateUniqueFilename(
        topicNumber,
        questionNumber,
        extension
      );
      const fullPath = `${filespath}/${filename}`;

      console.log("Uploading to:", STORAGE_BUCKET_NAME, fullPath);

      const { error: uploadError } = await supabaseBrowserClient.storage
        .from(STORAGE_BUCKET_NAME)
        .upload(fullPath, file, {
          upsert: true,
          contentType: getContentType(extension),
        });

      if (uploadError) {
        console.error("Supabase upload error:", uploadError);
        return { filename: null, error: `Upload failed: ${uploadError.message}` };
      }

      return { filename, error: null };
    } catch (err) {
      console.error("Image upload error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Upload failed";
      return { filename: null, error: errorMessage };
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadImage, isUploading };
}
