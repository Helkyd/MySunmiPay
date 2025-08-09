import React, { useContext } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { HomeScreen } from "../../screens/home.screen";
import { DetailsScreen } from "../../screens/details.screen";
import { BottomNavigation, BottomNavigationTab } from "@ui-kitten/components";

import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { AuthNavigator } from "./auth.navigator";
import { AuthContext } from "../../provider/auth";
import { TodoScreen } from "../../screens/todo.screen";

import { HomeProducts } from "../../screens/home.products";
import { HomeCustomer } from "../../screens/home.customer";
import { HomeFacturas } from "../../screens/home.invoices";
import { HomeDashboard } from "../../screens/home.dashboard";
import { HomeQuotations } from "../../screens/home.quotations";
import { HomeReceipts } from "../../screens/home.receipts";

import { useTranslation } from 'react-i18next';

const { Navigator, Screen } = createBottomTabNavigator();

const BottomTabBar = ({ navigation, state }) => {
  const { t } = useTranslation();

  return (
    <BottomNavigation
      selectedIndex={state.index}
      onSelect={(index) => navigation.navigate(state.routeNames[index])}
    >
      <BottomNavigationTab title={t('home.homescreen')} />
      <BottomNavigationTab title={t('home.dashboard')} />
      <BottomNavigationTab title={t('home.quotations')} />
      <BottomNavigationTab title={t('home.invoices')} />
      <BottomNavigationTab title={t('home.receipts')} />
      <BottomNavigationTab title={t('home.customers')} />
      <BottomNavigationTab title={t('home.services')} />
      <BottomNavigationTab title={t('home.userscreen')} />
    </BottomNavigation>
  );
};

const TabNavigator = () => {
  const { t } = useTranslation(); // Added useTranslation here

  return (
    <Navigator tabBar={(props) => <BottomTabBar {...props} />}>
      <Screen name="Home" component={HomeScreen} options={{ title: t('home.homescreen') }} />
      <Screen name="Dashboard" component={HomeDashboard} options={{ title: t('home.dashboard') }} />
      <Screen name="Quotations" component={HomeQuotations} options={{ title: t('home.quotations') }} />
      <Screen name="Invoices" component={HomeFacturas} options={{ title: t('home.invoices') }} />
      <Screen name="Receipts" component={HomeReceipts} options={{ title: t('home.receipts') }} />
      <Screen name="Customers" component={HomeCustomer} options={{ title: t('home.customers') }} />
      <Screen name="Services" component={HomeProducts} options={{ title: t('home.services') }} />
      <Screen name="Details" component={DetailsScreen} options={{ title: t('home.userscreen') }} />
    </Navigator>
  );
};

export const AppNavigator = () => {
  const { isAuthenticated } = useContext(AuthContext);

  return (
    <NavigationContainer>
      {isAuthenticated ? <TabNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};
