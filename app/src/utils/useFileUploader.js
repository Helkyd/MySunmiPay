// utils/useFileUploader.js
import { useFrappe } from "../provider/backend";
//import { BASE_URI } from "../data/constants";
//import { readFile } from 'react-native-fs';
//import RNFS from 'react-native-fs';
import * as FileSystem from 'expo-file-system';

export function useFileUploader() {
  const { file } = useFrappe(); // Destructure only what you need

  const uploadFile = async (
    fileUri,
    fileName,
    fileType,
    {
      isPrivate = false,
      doctype = null,
      docname = null,
      fieldname = null,
      onUploadProgress = null,
      onUploadComplete = null,
      onUploadError = null
    } = {}
  ) => {
    try {
      console.log('Starting file upload...');
      const fileData = await readFile(fileUri, 'base64');

      const fileArgs = {
        isPrivate,
        folder: "Home",
        file_url: '/files/' + fileName,
        doctype,
        docname,
        fieldname,
        file_name: fileName

      };

      console.log('File details:', {
        fileUri,
        fileName,
        fileType,
        fileArgs
      });

      if (!file || typeof file.uploadFile !== 'function') {
        throw new Error('File upload method not available');
      }
      const uploadPromise = file.uploadFile(
        fileUri,
        fileArgs,
        (completedBytes, totalBytes) => {
          const progress = Math.round((completedBytes / totalBytes) * 100);
          console.log(`${progress}% completed`);
          onUploadProgress?.({ loaded: completedBytes, total: totalBytes });
        }
      );

      const result = await uploadPromise;
      console.log("File Upload complete", result);

      onUploadComplete?.(result);
      return result;
    } catch (error) {
      console.error("Upload failed:", error);
      onUploadError?.(error);
      throw error;
    }
  };

  return { uploadFile };
}
