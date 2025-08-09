//Last Modified: 09-05-2025
import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../provider/auth";
import { ScrollView, FlatList, SafeAreaView, View, StyleSheet } from "react-native";
import { Spinner, Layout, Card, Text } from "@ui-kitten/components";
import { useFrappe } from "../provider/backend";
import styled from "styled-components/native";
import { BarChart } from "react-native-gifted-charts";
import { useTranslation } from 'react-i18next';
import { i18n } from '../utils/i18n';

//import LoginScreen from "../../screens/login.screen";
//import { AuthNavigator } from "./auth.navigator";
import { AuthNavigator } from "../infra/navigation/auth.navigator";

const HomeScreenContainer = styled(Layout)`
  padding-top: 20px;
  padding-left: 30px;
  padding-right: 30px;
`;

export const HomeScreen = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const formatarMoeda = new Intl.NumberFormat();

  // Auth and backend context
  const {
    isAuthenticated,
    isLoading: authLoading,
    refreshAccessTokenAsync,
    userInfo,
    accessToken,
    logout
  } = useContext(AuthContext);

  const { db, call } = useFrappe();

  // Component state
  const [isLoading, setIsLoading] = useState(true);
  const [numerodeFacturas, setNumerodeFacturas] = useState(null);
  const [numerofacturasUnpaid, setNumeroFacturasUnpaid] = useState(null);
  const [numeroCustomers, setNumeroCustomers] = useState(null);
  const [streams, setStreams] = useState([]);

  const monthNames = {
    en: [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ],
    pt: [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ]
  };

  // Process data for charts
  const sortedData = [...streams].sort((a, b) => {
    new Date(b.posting_date) - new Date(a.posting_date)
  });

  const groupedByMonth = sortedData.reduce((acc, item) => {
    const date = new Date(item.posting_date);
    const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthName = monthNames[i18n.language][date.getMonth()];

    if (!acc[monthYear]) {
      acc[monthYear] = {
        month: monthName,
        year: date.getFullYear(),
        monthYear: monthYear,
        count: 0,
        totalAmount: 0,
        items: []
      };
    }

    acc[monthYear].count += 1;
    acc[monthYear].totalAmount += item.grand_total;
    acc[monthYear].items.push(item);

    return acc;
  }, {});

  const data = Object.values(groupedByMonth).sort((a, b) =>
    new Date(b.monthYear) - new Date(a.monthYear)
  );

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated || !db) {
      navigation.navigate('AuthNavigator');
    }
  }, [isAuthenticated, db, navigation]);

  // Fetch data effect
  useEffect(() => {
    i18n.changeLanguage('pt');

    if (!isAuthenticated || !db || authLoading) {
      const RCTNetworking = require("react-native/Libraries/Network/RCTNetworking").default;
      RCTNetworking.clearCookies(() => {});
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const fetchData = async () => {
      try {
        setIsLoading(true);

        const [count, unpaidCount, customerCount] = await Promise.all([
          db.getCount('Sales Invoice'),
          db.getCount('Sales Invoice', [['status', '!=', 'Paid']]),
          db.getCount('Customer', [['disabled', '!=', 1]]),
        ]);

        db.getDocList('Sales Invoice',{
          fields: ['name','posting_date','doc_agt','customer','grand_total'],
          filters: [['doc_agt','!=',""]],
          orderBy: {
            field: "posting_date",
            order: 'desc',
          },
        })
        .then((docs) => {
          const facturas = docs;
          setStreams(facturas);
        })

        if (isMounted) {
          setNumerodeFacturas(count);
          setNumeroFacturasUnpaid(unpaidCount);
          setNumeroCustomers(customerCount);
        }
      } catch (e) {
        if (isMounted) {
          if (e.httpStatus === 403 || e.httpStatus === 401) {
            await refreshAccessTokenAsync();
          } else {
            console.error("Error fetching data:", e);
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [accessToken, db, isAuthenticated, authLoading, refreshAccessTokenAsync, userInfo, call, logout]);

  // Loading states
  if (authLoading) {
    return (
      <Layout style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Spinner size='giant' />
        <Text style={{ marginTop: 10 }}>{t('home.authLoading')}</Text>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Spinner size='giant' />
        <Text style={{ marginTop: 10 }}>{t('home.loading_data')}</Text>
      </Layout>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView>
        <HomeScreenContainer>
          <Card status="success">
            <Text category="h6">{t('home.total_invoices', { count: numerodeFacturas})} </Text>
          </Card>
          <Layout style={{ marginVertical: 10 }} />
          <Card status="danger">
            <Text category="h6">{t('home.unpaid_invoices', { count: numerofacturasUnpaid})} </Text>
          </Card>
          <Layout style={{ marginVertical: 10 }} />
          <Card status="info">
            <Text category="h6">
              {t('home.total_customers', { count: numeroCustomers })}
            </Text>
          </Card>
          <Card style={{ marginTop: 20 }}>
            <FlatList
              data={data}
              scrollEnabled={false}
              keyExtractor={(item) => item.monthYear}
              renderItem={({ item }) => (
                <View style={styles.monthContainer}>
                  <Text style={styles.monthHeader}>
                    {t(`months.${item.month.toLowerCase()}`, { defaultValue: item.month })} {item.year}
                  </Text>
                  <Text>{t('home.items')}: {item.count}</Text>
                  <Text>{t('home.totalamount')}: AOA { formatarMoeda.format(item.totalAmount)}</Text>

                  <FlatList
                    data={item.items}
                    scrollEnabled={false}
                    keyExtractor={(subItem) => subItem.name}
                    renderItem={({ item: subItem }) => (
                      <View style={styles.itemContainer}>
                        <Text>{subItem.name}</Text>
                        <Text>{subItem.posting_date}</Text>
                        <Text>AOA { formatarMoeda.format( subItem.grand_total)}</Text>
                      </View>
                    )}
                  />
                </View>
              )}
            />
          </Card>
        </HomeScreenContainer>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  monthContainer: {
    padding: 15,
    marginBottom: 10,
    backgroundColor: '#f5f5f5'
  },
  monthHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5
  },
  itemContainer: {
    padding: 10,
    marginVertical: 5,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd'
  }
});
