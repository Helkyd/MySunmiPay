import React, { createContext, useState, useEffect } from "react";
import {
  constants,
  OAUTH_CLIENT_ID,
  REDIRECT_URL_SCHEME,
  SECURE_AUTH_STATE_KEY,
} from "../data/constants";
import * as AuthSession from "expo-auth-session";
import * as SecureStore from "expo-secure-store";
import { FrappeApp } from "frappe-js-sdk";

import { useAppSettings } from "../provider/appSettings";

import * as SunmiPrinterLibrary from "@mitsuharu/react-native-sunmi-printer-library";

const AuthContext = createContext({});

const AuthProvider = (props) => {

  console.log('AuthProvider......');
  console.log('BASE_URI ', constants.BASE_URI);
  console.log('props ', props);
  console.log('userapp settings');

  const { baseUri, updateBaseUri, isLoading: isSettingsLoading } = useAppSettings();
  console.log('baseUri ',baseUri);
  console.log('updateBaseUri ',updateBaseUri);
  console.log('constants.BASE_URI ',constants.BASE_URI);
  //TODO: Get OAUTH Client ID
  console.log('Verificar');
  console.log(baseUri == 'https://factura-facil.angolaerp.co.ao');
  console.log(process.env.NODE_ENV == "development");
  console.log(process.env.NODE_ENV);
  /*
  if (baseUri == 'https://factura-facil.angolaerp.co.ao' && process.env.NODE_ENV == "development") {
    //Assuming Demo
    const OAUTH_CLIENTID = '6caq91r151'
    console.log('inicializou OAUTH_CLIENTID ', OAUTH_CLIENTID);
    console.log(typeof OAUTH_CLIENTID);
  }
  */

  //FIX 05-06-2025; Added TL and JS sites
  let OAUTH_CLIENTID; // Declare outside

  if (process.env.NODE_ENV == "development") {
    OAUTH_CLIENTID = (baseUri == 'https://factura-facil.angolaerp.co.ao')
      ? '6caq91r151'
      : (baseUri == 'https://tl.angolaerp.co.ao') ? 'g8vb9svjop'
      : (baseUri == 'https://js.angolaerp.co.ao') ? 'n8c7oh5muq'
      :undefined; // or your production client ID

  } else {
    OAUTH_CLIENTID = (baseUri == 'https://factura-facil.angolaerp.co.ao')
      ? '53sqjjv7dl'
      : (baseUri == 'https://tl.angolaerp.co.ao') ? '5b6976cfc2'
      : (baseUri == 'https://js.angolaerp.co.ao') ? 'n8c7oh5muq'
      :undefined; // or your production client ID

  }

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: REDIRECT_URL_SCHEME,
    path: "auth",
  });

  const [accessToken, setToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  console.log('ver qual deles =================');
  console.log('OAUTH_CLIENTID ',OAUTH_CLIENTID);
  console.log(typeof OAUTH_CLIENTID);
  console.log(typeof OAUTH_CLIENTID === 'undefined');
  console.log((typeof OAUTH_CLIENTID === 'undefined') ? OAUTH_CLIENT_ID : OAUTH_CLIENTID);
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: (typeof OAUTH_CLIENTID === 'undefined') ? OAUTH_CLIENT_ID : OAUTH_CLIENTID,
      redirectUri,
      responseType: "code",
      scopes: ["all"],
      usePKCE: false,
    },
    {
      authorizationEndpoint: `${constants.BASE_URI}/api/method/frappe.integrations.oauth2.authorize`,
      tokenEndpoint: `${constants.BASE_URI}/api/method/frappe.integrations.oauth2.get_token`,
    }
  );

  const fetchUserInfo = async () => {
    if (!accessToken) {
      console.error("accessToken not found");
      return;
    }
    console.log('seraaaaa');
    const frappe = new FrappeApp(constants.BASE_URI, {
      useToken: true,
      type: "Bearer",
      token: () => accessToken,
    });

    try {
      const call = frappe.call();
      const userInfo = await call.get(
        "frappe.integrations.oauth2.openid_profile"
      );
      setUserInfo(userInfo);
      console.log('Prepara Printerrrrrrr');
      await SunmiPrinterLibrary.prepare();
      await SunmiPrinterLibrary.printText('DAQUI AngolaERP');
      await SunmiPrinterLibrary.printText('DAQUI MetaGEst');
      await SunmiPrinterLibrary.printText(' ');

    } catch (e) {
      if (e.httpStatus === 403) {
        // refresh token
        await refreshAccessTokenAsync();
      } else {
        console.warn('IMPRESSORA NAO EXISTE OU NAO PRONTA... ', e);
      }
    }
  };

  const logout = async () => {
    await AuthSession.revokeAsync(
      {
        token: accessToken,
      },
      {
        revocationEndpoint: `${constants.BASE_URI}/api/method/frappe.integrations.oauth2.revoke_token`,
      }
    );
    await SecureStore.deleteItemAsync(SECURE_AUTH_STATE_KEY);
    setIsAuthenticated(false);
    setToken(null);
    setRefreshToken(null);
    setUserInfo(null);
  };

  const refreshAccessTokenAsync = async () => {
    if (!refreshToken) {
      logout();
      return;
    }
    AuthSession.refreshAsync(
      {
        refreshToken,
      },
      {
        tokenEndpoint: `${constants.BASE_URI}/api/method/frappe.integrations.oauth2.get_token`,
      }
    )
      .then(async (res) => {
        const authResponse = res;
        const storageValue = JSON.stringify(authResponse);
        await SecureStore.setItemAsync(SECURE_AUTH_STATE_KEY, storageValue);

        setToken(authResponse.accessToken);
        setRefreshToken(authResponse.refreshToken);
        setIsAuthenticated(true);

        const frappe = new FrappeApp(constants.BASE_URI, {
          useToken: true,
          type: "Bearer",
          token: () => accessToken,
        });
        const call = frappe.call();
        const userInfo = await call.get(
          "frappe.integrations.oauth2.openid_profile"
        );
        setUserInfo(userInfo);
      })
      .catch((err) => {
        // unable to refresh
        // clean up auth state
        logout();
        console.error(err);
      });
  };

  useEffect(() => {
    SecureStore.getItemAsync(SECURE_AUTH_STATE_KEY)
      .then((result) => {
        if (result) {
          const { accessToken, refreshToken } = JSON.parse(result);
          setToken(accessToken);
          setRefreshToken(refreshToken);
          setIsAuthenticated(true);
        } else {
          if (response?.type === "success") {
            const { code } = response.params;
            console.log('+++++++ secure store...');
            AuthSession.exchangeCodeAsync(
              {
                redirectUri,
                code,
                extraParams: {
                  grant_type: "authorization_code",
                  client_id: (typeof OAUTH_CLIENTID === 'undefined') ? OAUTH_CLIENT_ID : OAUTH_CLIENTID, //OAUTH_CLIENT_ID,
                },
                clientId: (typeof OAUTH_CLIENTID === 'undefined') ? OAUTH_CLIENT_ID : OAUTH_CLIENTID, //OAUTH_CLIENT_ID,
              },
              {
                tokenEndpoint: `${constants.BASE_URI}/api/method/frappe.integrations.oauth2.get_token`,
              }
            )
              .then(async (res) => {
                const authResponse = res;
                const storageValue = JSON.stringify(authResponse);
                await SecureStore.setItemAsync(
                  SECURE_AUTH_STATE_KEY,
                  storageValue
                );

                setToken(authResponse.accessToken);
                setRefreshToken(authResponse.refreshToken);
                setIsAuthenticated(true);
              })
              .catch((err) => {
                console.error(err);
              });
          } else {
            console.log("Not authenticated");
          }
        }
      })
      .catch((e) => console.error(e));
  }, [response]);

  useEffect(() => {
    if (accessToken) {
      fetchUserInfo();
    }
  }, [accessToken]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        accessToken,
        refreshToken,
        userInfo,
        request,
        promptAsync,
        logout,
        refreshAccessTokenAsync,
        fetchUserInfo,
      }}
    >
      {props.children}
    </AuthContext.Provider>
  );
};

export { AuthContext, AuthProvider };
