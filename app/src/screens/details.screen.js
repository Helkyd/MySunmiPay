import React, { useContext, useState, useEffect } from "react";
import { SafeAreaView, TextInput, Alert } from "react-native";
import styled from 'styled-components/native';
import { Layout, Text, Button } from "@ui-kitten/components";
import { AuthContext } from "../provider/auth";
import * as ImagePicker from 'expo-image-picker';
import { Image } from "expo-image";
import uploadFile from "../utils/fileUploader";
import { useFrappe } from "../provider/backend";
import { CircularProgressBar } from '@ui-kitten/components';
import { useTranslation } from 'react-i18next';
import { i18n } from '../utils/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as data from '../data/constants';

const LogoutButton = styled(Button)`
  border-radius: 6px;
  margin-top: 10px;
`;

const ProfileImage = styled(Image)`
  width: 120px;
  height: 120px;
  border-radius: 9999px;
`;

const AdminSection = styled(Layout)`
  margin-top: 20px;
  padding: 15px;
  border-radius: 8px;
  width: 80%;
`;

const ServerInput = styled(TextInput)`
  height: 40px;
  border: 1px solid #ccc;
  border-radius: 6px;
  padding: 8px;
  margin-bottom: 10px;
`;

const ErrorText = styled(Text)`
  color: #ff3d71;
  margin-bottom: 10px;
`;

// URI validation function
const isValidUri = (uri) => {
  try {
    const url = new URL(uri);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (e) {
    return false;
  }
};

export const DetailsScreen = () => {
  const { t } = useTranslation();
  const { isAuthenticated, logout, userInfo, accessToken, fetchUserInfo } = useContext(AuthContext);
  const { db } = useFrappe();
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [baseUri, setBaseUri] = useState(data.constants.BASE_URI);
  const [newBaseUri, setNewBaseUri] = useState(data.constants.BASE_URI);
  const [isUpdatingUri, setIsUpdatingUri] = useState(false);
  const [uriError, setUriError] = useState('');

  const isAdmin = userInfo?.name === "Administrator";

  // Validate URI whenever it changes
  useEffect(() => {
    if (newBaseUri && newBaseUri !== baseUri) {
      if (!isValidUri(newBaseUri)) {
        setUriError(t('profile.invalidUriError'));
      } else {
        setUriError('');
      }
    } else {
      setUriError('');
    }
  }, [newBaseUri, baseUri]);

  const handleUpdateBaseUri = async () => {
    if (!newBaseUri) {
      Alert.alert(t('error'), t('profile.emptyUriError'));
      return;
    }

    if (uriError) {
      Alert.alert(t('error'), uriError);
      return;
    }

    try {
      setIsUpdatingUri(true);

      // Test the new URI before saving
      const testResponse = await fetch(`${newBaseUri}/api/method/frappe.ping`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!testResponse.ok) {
        throw new Error(t('profile.uriTestFailed'));
      }

      // Save to AsyncStorage for persistence
      await AsyncStorage.setItem('BASE_URI', newBaseUri);

      // Update in-memory configuration
      data.constants.BASE_URI = newBaseUri;

      // Optionally: Update in backend if needed
      // await db.updateDoc("System Settings", "System Settings", {
      //   base_url: newBaseUri
      // });

      setBaseUri(newBaseUri);
      Alert.alert(t('success'), t('profile.uriUpdateSuccess'));
    } catch (error) {
      console.error('Failed to update BASE_URI:', error);
      Alert.alert(
        t('error'),
        `${t('profile.uriUpdateError')}: ${error.message}`
      );
    } finally {
      setIsUpdatingUri(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Layout style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Layout style={{ marginVertical: 20, position: "relative" }}>
          <ProfileImage source={{
            uri: userInfo.picture,
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          }} contentFit="cover" />

          {loading && (
            <CircularProgressBar
              style={{
                position: "absolute",
                top: 30,
                left: 30,
                backgroundColor: "white"
              }}
              progress={uploadProgress}
            />
          )}
        </Layout>

        {isAdmin && (
          <>
            <Button
              appearance="ghost"
              onPress={async () => {
                try {
                  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                  if (status !== 'granted') {
                    alert(t('permissions.mediaLibraryRequired'));
                    return;
                  }

                  const result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsEditing: true,
                    aspect: [1, 1],
                    quality: 0.7,
                  });

                  if (result.canceled || !result.assets?.[0]) return;

                  setLoading(true);
                  setUploadProgress(0);

                  const asset = result.assets[0];
                  const fileType = asset.type || 'image/jpeg';

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

                        await db.updateDoc("User", userInfo.email, {
                          user_image: data.message.file_url
                        });

                        await fetchUserInfo();
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
            >
              {t('home.button_changeprofilepic')}
            </Button>

            <AdminSection level="2">
              <Text category="h6" style={{ marginBottom: 10 }}>
                {t('profile.serverSettings')}
              </Text>

              <Text category="s1" style={{ marginBottom: 5 }}>
                {t('profile.currentServer')}
              </Text>
              <Text style={{ marginBottom: 10 }}>{baseUri}</Text>

              <Text category="s1" style={{ marginBottom: 5 }}>
                {t('profile.newServer')}
              </Text>

              <ServerInput
                value={newBaseUri}
                onChangeText={setNewBaseUri}
                placeholder={t('profile.enterNewUri')}
                autoCapitalize="none"
                autoCorrect={false}
              />

              {uriError ? <ErrorText>{uriError}</ErrorText> : null}

              <Button
                onPress={handleUpdateBaseUri}
                appearance="outline"
                status="primary"
                disabled={isUpdatingUri || !!uriError || newBaseUri === baseUri}
              >
                {isUpdatingUri ? t('profile.updating') : t('profile.updateServer')}
              </Button>
            </AdminSection>
          </>
        )}

        <Layout style={{ marginVertical: 20 }}></Layout>

        <Text category="h4">
          {isAuthenticated ? userInfo.name : "Not Logged In"}
        </Text>

        {isAuthenticated && (
          <LogoutButton onPress={logout}>
            {t('home.button_logout')}
          </LogoutButton>
        )}
      </Layout>
    </SafeAreaView>
  );
};
