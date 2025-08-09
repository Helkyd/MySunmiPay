import { BASE_URI } from "../data/constants";

//import { readFile } from 'react-native-fs';
import * as FileSystem from 'expo-file-system';

export async function uploadFile(fileUri, fileName, fileType, options = {}) {
  const fileData = await readFile(fileUri, 'base64');

  const response = await fetch(`${BASE_URI}/api/method/upload_file`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${options.accessToken}`,
      'Content-Type': 'application/octet-stream',
      'File-Name': fileName,
      'File-Type': fileType || 'image/jpeg',
    },
    body: fileData
  });

  // ... handle response
  console.log('respnose');
  console.log(response);
}
