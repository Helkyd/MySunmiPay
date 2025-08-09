import React, { useContext, useState } from "react";
import { SafeAreaView } from "react-native";
import styled from 'styled-components/native'
import { Layout, Text, Button } from "@ui-kitten/components";
import { AuthContext } from "../provider/auth";
import * as ImagePicker from 'expo-image-picker';
import { Image } from "expo-image"
import uploadFile from "../utils/fileUploader";
import { useFrappe } from "../provider/backend";
import { CircularProgressBar } from '@ui-kitten/components';

import { useTranslation } from 'react-i18next';
import { i18n } from '../utils/i18n';

//import { useFileUploader } from "../utils/useFileUploader";

const LogoutButton = styled(Button)`
  border-radius: 6px;
`

const ProfileImage = styled(Image)`
  width: 120px;
  height: 120px;
  border-radius: 9999px;
`

export const DetailsScreen = () => {
  const { t, i18n } = useTranslation();
  const { isAuthenticated, logout, userInfo, accessToken, fetchUserInfo } = useContext(AuthContext);
  const { db } = useFrappe();
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  //const { uploadFile } = useFileUploader();
  // Check if user is administrator
  const isAdmin = userInfo?.name === "Administrator";

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Layout
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <Layout style={{ marginVertical: 20, position: "relative" }}>
          <ProfileImage source={{
            uri: userInfo.picture, headers: {
              Authorization: `Bearer ${accessToken}` // for handling private images
            }
          }} contentFit="cover" />

          {loading && <CircularProgressBar style={{ position: "absolute", top: 30, left: 30, backgroundColor: "white" }} progress={uploadProgress} />}
        </Layout>
        {isAdmin && (
          <Button appearance="ghost"
            onPress={async () => {
              try {
                // Request permissions
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') {
                  alert(t('permissions.mediaLibraryRequired'));
                  return;
                }

                // Pick image
                const result = await ImagePicker.launchImageLibraryAsync({
                  //mediaTypes: ImagePicker.MediaType.Photo, // ImagePicker.MediaTypeOptions.Images,
                  mediaTypes: ImagePicker.MediaTypeOptions.Images, // Use MediaTypeOptions instead
                  allowsEditing: true,
                  aspect: [1, 1],
                  quality: 0.7,
                });


                if (result.canceled || !result.assets?.[0]) return;

                setLoading(true);
                setUploadProgress(0);

                const asset = result.assets[0];
                const fileType = asset.type || 'image/jpeg';
                console.log('URI ', asset.uri);
                console.log('file ', asset.fileName);
                console.log('asset ', asset.uri.split('/').pop());

                await uploadFile(
                  asset.uri,
                  asset.fileName || asset.uri.split('/').pop(),
                  fileType,
                  {
                    accessToken,
                    isPrivate: false,
                    doctype: "User",
                    docname: userInfo.email,
                    fieldname: "user_image",
                    onUploadProgress: (progressEvent) => {
                      const progress = Math.round(
                        (progressEvent.loaded / progressEvent.total) * 100
                      );
                      setUploadProgress(progress);
                    },
                    onUploadComplete: async (data) => {
                      if (!data?.message?.file_url) {
                        throw new Error('No file URL returned');
                      }

                      // Update user document
                      await db.updateDoc("User", userInfo.email, {
                        user_image: data.message.file_url
                      });

                      // Refresh user info
                      await fetchUserInfo();

                      // Show success
                      alert(t('profile.pictureUpdateSuccess'));
                    },
                    onUploadError: (error) => {
                      alert(t('profile.pictureUpdateError'));
                      console.error('Upload failed:', error);
                    }
                  }
                );
              } catch (error) {
                console.error('Profile picture change error:', error);
                alert(t('profile.pictureUpdateError'));
              } finally {
                setLoading(false);
              }
            }}
            >{t('home.button_changeprofilepic')}
          </Button>
        )}

        <Layout style={{ marginVertical: 20 }}></Layout>

        <Text category="h4">{isAuthenticated ? userInfo.name : "Not Logged In"}</Text>
        {isAuthenticated && (
          <LogoutButton
            onPress={() => {
              logout();
            }}
          >
            {t('home.button_logout')}
          </LogoutButton>
        )}
      </Layout>
    </SafeAreaView >
  );
};
