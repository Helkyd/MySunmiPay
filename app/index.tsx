import "react-native-gesture-handler";
import * as eva from "@eva-design/eva";
import { AppNavigator } from "./src/infra/navigation/main.navigation";
import { ApplicationProvider, IconRegistry } from "@ui-kitten/components";
import { AuthProvider } from "./src/provider/auth";
import Toast from 'react-native-toast-message';


import { default as theme } from "./theme.json";
import { FrappeProvider } from "./src/provider/backend";

import './src/utils/i18n'; // Import the i18n configuration file

import { EvaIconsPack } from '@ui-kitten/eva-icons';

//import { BleManager } from 'react-native-ble-plx';

import { AppSettingsProvider } from './src/provider/appSettings';

import { NavigationContainer } from "@react-navigation/native";

import { I18nextProvider } from 'react-i18next';
import i18n from './src/utils/i18n';

export default function App() {
  //const bleManager = new BleManager();
  return (
    <AppSettingsProvider>
      <ApplicationProvider {...eva} theme={{ ...eva.light, ...theme }}>
        <IconRegistry icons={EvaIconsPack} />
        <AuthProvider>
          <FrappeProvider>
            <I18nextProvider i18n={i18n}>
                <AppNavigator />
            </I18nextProvider>
          </FrappeProvider>
        </AuthProvider>
        <Toast />
      </ApplicationProvider>
    </AppSettingsProvider>
  );
}
