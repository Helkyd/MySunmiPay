import React, { useContext, useState, useCallback } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  BottomNavigation,
  BottomNavigationTab,
  Icon,
  OverflowMenu,
  MenuItem,
  Button,
  Layout
} from "@ui-kitten/components";
import { useTranslation } from 'react-i18next';
import { AuthContext } from "../../provider/auth";
import { StyleSheet } from "react-native";

// Screens
import { HomeScreen } from "../../screens/home.screen";
import { DetailsScreen } from "../../screens/details.screen";
import { AuthNavigator } from "./auth.navigator";
import { HomeDashboard } from "../../screens/home.dashboard";
import { HomeQuotations } from "../../screens/home.quotations";
import { HomeFacturas } from "../../screens/home.invoices";
import { HomeReceipts } from "../../screens/home.receipts";
import { HomeCustomer } from "../../screens/home.customer";
import { HomeProducts } from "../../screens/home.products";

const { Navigator, Screen } = createBottomTabNavigator();

// Icons mapping for better maintainability
const icons = {
  Dashboard: "bar-chart-outline",
  Quotations: "file-text-outline",
  Invoices: "credit-card-outline",
  Receipts: "archive-outline",
  Customers: "people-outline",
  Services: "shopping-bag-outline",
  More: "more-horizontal-outline",
  Home: "home-outline",
  User: "person-outline"
};

const createIcon = (name) => (props) => <Icon {...props} name={name} />;

const BottomTabBar = ({ navigation, state }) => {
  const { t } = useTranslation();
  const [menuVisible, setMenuVisible] = useState(false);

  const toggleMenu = useCallback(() => {
    setMenuVisible(prev => !prev);
  }, []);

  const onMenuItemSelect = useCallback((index) => {
    setMenuVisible(false);
    const routeMap = {
      0: "Customers",
      1: "Services",
      2: "Home",
      3: "Details"
    };
    const routeName = routeMap[index.row];
    if (routeName) {
      navigation.navigate(routeName);
    }
  }, [navigation]);

  const renderMoreButton = useCallback(() => (
    <Button
      appearance="ghost"
      accessoryLeft={createIcon(icons.More)}
      onPress={toggleMenu}
      style={styles.moreButton}
    />
  ), [toggleMenu]);

  const mainRoutes = [
    { name: "Dashboard", title: t('home.dashboard'), icon: icons.Dashboard },
    { name: "Quotations", title: t('home.quotations'), icon: icons.Quotations },
    { name: "Invoices", title: t('home.invoices'), icon: icons.Invoices },
    { name: "Receipts", title: t('home.receipts'), icon: icons.Receipts }
  ];

  const menuItems = [
    { title: t('home.customers'), icon: icons.Customers, route: "Customers" },
    { title: t('home.services'), icon: icons.Services, route: "Services" },
    { title: t('home.homescreen'), icon: icons.Home, route: "Home" },
    { title: t('home.userscreen'), icon: icons.User, route: "Details" }
  ];

  return (
    <Layout style={styles.tabContainer}>
      <BottomNavigation
        selectedIndex={state.index}
        onSelect={(index) => {
          if (index >= mainRoutes.length) {
            toggleMenu();
            return;
          }
          navigation.navigate(state.routeNames[index]);
        }}
        appearance="noIndicator"
        style={styles.bottomNavigation}
      >
        {mainRoutes.map((route) => (
          <BottomNavigationTab
            key={route.name}
            title={route.title}
            icon={createIcon(route.icon)}
          />
        ))}
      </BottomNavigation>

      <OverflowMenu
        anchor={renderMoreButton}
        visible={menuVisible}
        onBackdropPress={toggleMenu}
        onSelect={onMenuItemSelect}
        placement="top"
      >
        {menuItems.map((item, index) => (
          <MenuItem
            key={index}
            title={item.title}
            accessoryLeft={createIcon(item.icon)}
          />
        ))}
      </OverflowMenu>
    </Layout>
  );
};

const TabNavigator = () => {
  const screenOptions = {
    headerShown: false,
    tabBarHideOnKeyboard: true,
  };

  return (
    <Navigator
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={screenOptions}
      initialRouteName="Home"
    >
      <Screen name="Dashboard" component={HomeDashboard} />
      <Screen name="Quotations" component={HomeQuotations} />
      <Screen name="Invoices" component={HomeFacturas} />
      <Screen name="Receipts" component={HomeReceipts} />
      <Screen name="Customers" component={HomeCustomer} />
      <Screen name="Services" component={HomeProducts} />
      <Screen name="Home" component={HomeScreen} />
      <Screen name="Details" component={DetailsScreen} />
    </Navigator>
  );
};

export const AppNavigator = () => {
  const { isAuthenticated } = useContext(AuthContext);
  console.log('AppNavigator authe ', isAuthenticated);
  if (isAuthenticated) {
    return <TabNavigator />;
  }
    return <AuthNavigator />;
  };

const styles = StyleSheet.create({
  tabContainer: {
    position: 'relative',
  },
  bottomNavigation: {
    paddingVertical: 8,
  },
  moreButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
