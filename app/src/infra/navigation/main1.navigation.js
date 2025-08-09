import React, { useContext, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  BottomNavigation,
  BottomNavigationTab,
  Icon,
  OverflowMenu,
  MenuItem,
  Button,
  Layout,
  Text
} from "@ui-kitten/components";
import { useTranslation } from 'react-i18next';
import { AuthContext } from "../../provider/auth";
import { StyleSheet, View } from "react-native";

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

// Icons for the tab bar
const DashboardIcon = (props) => <Icon {...props} name="bar-chart-outline" />;
const QuotationIcon = (props) => <Icon {...props} name="file-text-outline" />;
const InvoiceIcon = (props) => <Icon {...props} name="credit-card-outline" />;
const ReceiptIcon = (props) => <Icon {...props} name="archive-outline" />;
const CustomerIcon = (props) => <Icon {...props} name="people-outline" />;
const ProductIcon = (props) => <Icon {...props} name="shopping-bag-outline" />;
const MoreIcon = (props) => <Icon {...props} name="more-horizontal-outline" />;
const HomeIcon = (props) => <Icon {...props} name="home-outline" />;
const UserIcon = (props) => <Icon {...props} name="person-outline" />;

const BottomTabBar = ({ navigation, state }) => {
  const { t } = useTranslation();
  const [menuVisible, setMenuVisible] = useState(false);

  const toggleMenu = () => {
    setMenuVisible(!menuVisible);
  };

  const onMenuItemSelect = (index) => {
    setMenuVisible(false);
    const routes = [
      "Customers",
      "Services",
      "Home",
      "Details"
    ];
    navigation.navigate(routes[index.row]);
  };

  const renderMoreButton = () => (
    <Button
      appearance="ghost"
      accessoryLeft={MoreIcon}
      onPress={toggleMenu}
      style={styles.moreButton}
    />
  );

  return (
    <Layout style={styles.tabContainer}>
      <BottomNavigation
        selectedIndex={state.index}
        onSelect={(index) => {
          if (index === 4) {
            toggleMenu();
            return;
          }
          navigation.navigate(state.routeNames[index]);
        }}
        appearance="noIndicator"
        style={styles.bottomNavigation}
      >
        <BottomNavigationTab
          title={t('home.homescreen')}
          icon={HomeIcon}
        />
        <BottomNavigationTab
          title={t('home.dashboard')}
          icon={DashboardIcon}
        />
        <BottomNavigationTab
          title={t('home.customers')}
          icon={CustomerIcon}
        />
        <BottomNavigationTab
          title={t('home.services')}
          icon={ProductIcon}
        />
        <BottomNavigationTab
          title={t('home.more')}
          icon={MoreIcon}
        />
      </BottomNavigation>

      <OverflowMenu
        anchor={renderMoreButton}
        visible={menuVisible}
        onBackdropPress={toggleMenu}
        onSelect={onMenuItemSelect}
        placement="top"
      >
        <MenuItem
          title={t('home.quotations')}
          accessoryLeft={QuotationIcon}
        />
        <MenuItem
          title={t('home.invoices')}
          accessoryLeft={InvoiceIcon}
        />
        <MenuItem
          title={t('home.receipts')}
          accessoryLeft={ReceiptIcon}
        />
        <MenuItem
          title={t('home.userscreen')}
          accessoryLeft={UserIcon}
        />
      </OverflowMenu>
    </Layout>
  );
};

const TabNavigator = () => {
  const { t } = useTranslation();

  return (
    <Navigator
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
      }}
      initialRouteName="Home"
    >
      <Screen name="Home" component={HomeScreen} />
      <Screen name="Dashboard" component={HomeDashboard} />
      <Screen name="Customers" component={HomeCustomer} />
      <Screen name="Services" component={HomeProducts} />
      <Screen name="Quotations" component={HomeQuotations} />
      <Screen name="Invoices" component={HomeFacturas} />
      <Screen name="Receipts" component={HomeReceipts} />
      <Screen name="Details" component={DetailsScreen} />
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
