import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../provider/auth";
import { ScrollView, FlatList, SafeAreaView, View, StyleSheet } from "react-native";
import { Spinner, Layout, Card, Text } from "@ui-kitten/components";
import { useFrappe } from "../provider/backend";
import styled from "styled-components/native";
import { BarChart } from "react-native-gifted-charts";

import { useTranslation } from 'react-i18next';
import { i18n } from '../utils/i18n';

const HomeScreenContainer = styled(Layout)`
  padding-top: 20px;
  padding-left: 30px;
  padding-right: 30px;
`;

export const HomeScreen = () => {
  //const { t } = useTranslation();
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

  // Add this at the top of your file
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
    //console.log('straeammmmmm ', streams);
    //console.log('A ', a);
    //console.log('B ', b);
    new Date(b.posting_date) - new Date(a.posting_date)
  });

  const groupedByMonth = sortedData.reduce((acc, item) => {
    //console.log('groupedByMonth');
    //console.log(item);
    //console.log('posting date ',item.posting_date);
    const date = new Date(item.posting_date);
    const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    //const monthName = date.toLocaleString('default', { month: 'long' });
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

  // Fetch data effect
  useEffect(() => {
    //Force to be PT
    i18n.changeLanguage('pt');

    console.log(data != []);
    console.log(data.length);
    if (data.length > 0){
      console.log('daatattttat')
      console.log(data);
    }
    if (!isAuthenticated || !db || authLoading) {
      console.log('NAO ESTA LIGADO!!!!');
      //logout();
      //const RCTNetworking = require('react-native/Libraries/Network/RCTNetworking');
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
          //db.getDocList('Sales Invoice', ['name','posting_date','doc_agt','customer'], [['doc_agt','!=',""]]),
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
          //setStreams(facturas);
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

  if (!isAuthenticated) {
    return (
      <Layout style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text category="h6">{t('home.login_prompt')}</Text>
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

  // Chart data
  const stackData = [
    {
      stacks: [
        {value: 10, color: 'orange'},
        {value: 20, color: '#4ABFF4', marginBottom: 2},
      ],
      label: 'Jan',
    },
    {
      stacks: [
        {value: 10, color: '#4ABFF4'},
        {value: 11, color: 'orange', marginBottom: 2},
        {value: 15, color: '#28B2B3', marginBottom: 2},
      ],
      label: 'Mar',
    },
    {
      stacks: [
        {value: 14, color: 'orange'},
        {value: 18, color: '#4ABFF4', marginBottom: 2},
      ],
      label: 'Feb',
    },
    {
      stacks: [
        {value: 7, color: '#4ABFF4'},
        {value: 11, color: 'orange', marginBottom: 2},
        {value: 10, color: '#28B2B3', marginBottom: 2},
      ],
      label: 'Mar',
    },
  ];

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
          {/*
          <Card style={{ marginTop: 20 }}>
            <Layout style={{ marginVertical: 10 }} />
            <Layout style={{ width: "100%", height: "50%" }}>
              <Card status="success">
                <View>
                  <Text category="h6">Grafico de Facturas</Text>
                  <BarChart
                    width={340}
                    rotateLabel
                    noOfSections={4}
                    stackData={stackData}
                  />
                </View>
              </Card>
            </Layout>
          </Card>
          */}
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
