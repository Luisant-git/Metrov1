import resolveApiBaseUrl from '../config/api';
import { getToken } from './api';
import { Platform } from 'react-native';

export const uploadApi = {
  uploadImage: async (fileUri, mimeType, fileName) => {
    const baseUrl = await resolveApiBaseUrl();
    const token = await getToken();
    
    const formData = new FormData();
    
    if (Platform.OS === 'web') {
      // On web, fetch the blob directly from the local blob: URL
      const res = await fetch(fileUri);
      const blob = await res.blob();
      formData.append('image', blob, fileName || 'upload.jpg');
    } else {
      // On native, React Native's polyfill handles this object format
      formData.append('image', {
        uri: fileUri,
        type: mimeType || 'image/jpeg',
        name: fileName || 'upload.jpg',
      });
    }

    const response = await fetch(`${baseUrl}/upload/image`, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        // fetch will automatically set Content-Type to multipart/form-data with boundary
      },
    });
    
    if (!response.ok) {
      throw new Error('Upload failed');
    }
    
    return await response.json();
  },
};
