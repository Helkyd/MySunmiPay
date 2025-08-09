import React, { useContext, useState, useEffect } from "react";
import { AuthContext } from "../provider/auth";
import { useAppSettings } from "../provider/appSettings";
import { Layout, Button, Text, Input } from "@ui-kitten/components";
import { Alert } from "react-native";
import { useTranslation } from 'react-i18next';
//import { i18n } from '../utils/i18n';

const LoginScreen = () => {
  //const { t } = useTranslation();
  const { t, i18n } = useTranslation();
  const { isAuthenticated, promptAsync, request, userInfo } = useContext(AuthContext);
  const { baseUri, updateBaseUri, isLoading: isSettingsLoading } = useAppSettings();
  const [newBaseUri, setNewBaseUri] = useState(baseUri);
  const [uriError, setUriError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const isAdmin = userInfo?.name === "Administrator";

  // URI validation function
  const isValidUri = (uri) => {
    try {
      const url = new URL(uri);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (e) {
      return false;
    }
  };

// Set language once when component mounts
  useEffect(() => {
    i18n.changeLanguage('pt').catch(err => console.error('Language change failed:', err));
  }, [i18n]);

  // Sync with context when it changes
  useEffect(() => {
    //i18n.changeLanguage('pt');
    setNewBaseUri(baseUri);
  }, [baseUri]);

  // Validate URI whenever it changes
  useEffect(() => {
    //i18n.changeLanguage('pt');
    if (newBaseUri && newBaseUri !== baseUri) {
      if (!isValidUri(newBaseUri)) {
        setUriError(t('profile.invalidUriError'));
      } else {
        setUriError('');
      }
    } else {
      setUriError('');
    }
  }, [newBaseUri, baseUri, t]);

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
      setIsUpdating(true);
      await updateBaseUri(newBaseUri);
      Alert.alert(t('home.success'), t('profile.uriUpdateSuccess'));
    } catch (error) {
      console.error('Failed to update BASE_URI:', error);
      Alert.alert(
        t('home.error'),
        `${t('profile.uriUpdateError')}: ${error.message}`
      );
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Layout
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 20,
        rowGap: 20,
      }}
    >
      {!isAuthenticated && (
        <>
          <Button
            disabled={!request}
            onPress={() => {
              promptAsync();
            }}
          >
            {t('login.button')}
          </Button>


          <Layout style={{
            width: '100%',
            padding: 20,
            borderRadius: 8,
            alignItems: 'center'
          }}>
            <Text category="h6" style={{ marginBottom: 10 }}>
              {t('profile.serverSettings')}
            </Text>

            <Text category="s1" style={{ marginBottom: 5, alignSelf: 'flex-start' }}>
              {t('profile.currentServer')}
            </Text>
            <Text style={{ marginBottom: 10, alignSelf: 'flex-start' }}>{baseUri}</Text>

            <Text category="s1" style={{ marginBottom: 5, alignSelf: 'flex-start' }}>
              {t('profile.newServer')}
            </Text>

            <Input
              value={newBaseUri}
              onChangeText={setNewBaseUri}
              placeholder={t('profile.enterNewUri')}
              autoCapitalize="none"
              autoCorrect={false}
              style={{ marginBottom: 10, width: '100%' }}
              status={uriError ? 'danger' : 'basic'}
              caption={uriError}
            />

            <Button
              onPress={handleUpdateBaseUri}
              appearance="outline"
              status="primary"
              disabled={isUpdating || !!uriError || newBaseUri === baseUri}
              style={{ width: '100%' }}
            >
              {isUpdating ? t('profile.updating') : t('profile.updateServer')}
            </Button>
          </Layout>

        </>
      )}
    </Layout>
  );
};

export default LoginScreen;
