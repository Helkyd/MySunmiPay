// provider/appSettings.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as data from '../data/constants';

const AppSettingsContext = createContext();

export const AppSettingsProvider = ({ children }) => {
  const [baseUri, setBaseUri] = useState(data.constants.BASE_URI);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings from storage when provider mounts
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storedUri = await AsyncStorage.getItem('BASE_URI');
        if (storedUri) {
          console.log('chama loadSettings tem storedUri...');
          setBaseUri(storedUri);
          data.constants.BASE_URI = storedUri;
          //TODO: Read all oauth userid and set as main or default according to storedUri
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const updateBaseUri = async (newUri) => {
    try {
      // Validate URI
      if (!newUri) throw new Error('URI cannot be empty');

      // Test the new URI
      const testResponse = await fetch(`${newUri}/api/method/frappe.ping`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!testResponse.ok) {
        throw new Error('Server test failed');
      }

      // Save to storage
      await AsyncStorage.setItem('BASE_URI', newUri);

      // Update state and constants
      console.log('chama Update BaseURI.... ');
      setBaseUri(newUri);
      data.constants.BASE_URI = newUri;

      return true;
    } catch (error) {
      console.error('Failed to update BASE_URI:', error);
      throw error;
    }
  };

  return (
    <AppSettingsContext.Provider value={{
      baseUri,
      updateBaseUri,
      isLoading
    }}>
      {children}
    </AppSettingsContext.Provider>
  );
};

export const useAppSettings = () => {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error('useAppSettings must be used within an AppSettingsProvider');
  }
  return context;
};
