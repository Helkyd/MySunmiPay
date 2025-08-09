import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../provider/auth";
import { ScrollView, FlatList, SafeAreaView, View, StyleSheet } from "react-native";
import { Spinner, Layout, Card, Text, Select, SelectItem, IndexPath } from "@ui-kitten/components";
import { useFrappe } from "../provider/backend";
import styled from "styled-components/native";
import { BarChart } from "react-native-gifted-charts";

const HomeScreenContainer = styled(Layout)`
  padding-top: 20px;
  padding-left: 30px;
  padding-right: 30px;
`;

export const HomeDashboard = () => {
  // Auth and backend context
  const {
    isAuthenticated,
    isLoading: authLoading,
    refreshAccessTokenAsync,
    userInfo,
    accessToken
  } = useContext(AuthContext);

  const { db, call } = useFrappe();

  // Component state
  const [isLoading, setIsLoading] = useState(true);
  const [numerodeFacturas, setNumerodeFacturas] = useState(null);
  const [numerofacturasUnpaid, setNumeroFacturasUnpaid] = useState(null);
  const [numeroCustomers, setNumeroCustomers] = useState(null);
  const [streams, setStreams] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYearIndex, setSelectedYearIndex] = useState(new IndexPath(0));
  const currentYear = new Date().getFullYear();

  // Process data for charts
  const sortedData = [...streams].sort((a, b) =>
    new Date(b.posting_date) - new Date(a.posting_date)
  );

  // Extract unique years from data
  useEffect(() => {
    if (streams.length > 0) {
      const years = new Set();
      streams.forEach(item => {
        const year = new Date(item.posting_date).getFullYear();
        years.add(year);
      });

      // Add current year if not present
      if (!years.has(currentYear)) {
        years.add(currentYear);
      }

      const sortedYears = Array.from(years).sort((a, b) => b - a);
      setAvailableYears(sortedYears);

      // Set default to current year if available
      const currentYearIndex = sortedYears.indexOf(currentYear);
      if (currentYearIndex !== -1) {
        setSelectedYearIndex(new IndexPath(currentYearIndex));
      }
    }
  }, [streams, currentYear]);

  // Filter and group data by month for selected year
  const filteredData = sortedData.filter(item => {
    const itemYear = new Date(item.posting_date).getFullYear();
    return availableYears.length > 0 && itemYear === availableYears[selectedYearIndex?.row];
  });

  const groupedByMonth = filteredData.reduce((acc, item) => {
    const date = new Date(item.posting_date);
    const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthName = date.toLocaleString('default', { month: 'long' });

    if (!acc[monthYear]) {
      acc[monthYear] = {
        month: monthName,
        year: date.getFullYear(),
        monthYear: monthYear,
        paidAmount: 0,
        unpaidAmount: 0,
        totalAmount: 0,
        items: []
      };
    }

    if (item.status === 'Paid') {
      acc[monthYear].paidAmount += item.grand_total;
    } else {
      acc[monthYear].unpaidAmount += item.grand_total;
    }

    acc[monthYear].totalAmount += item.grand_total;
    acc[monthYear].items.push(item);

    return acc;
  }, {});

  const monthlyData = Object.values(groupedByMonth).sort((a, b) =>
    new Date(a.monthYear) - new Date(b.monthYear)
  );

  // Prepare chart data
  const chartData = monthlyData.map(month => ({
    label: `${month.month.substring(0, 3)}`,
    stacks: [
      { value: month.paidAmount, color: '#4ABFF4', label: 'Paid' },
      { value: month.unpaidAmount, color: 'orange', label: 'Unpaid' },
      { value: month.totalAmount, color: '#28B2B3', label: 'Total', marginBottom: 2 }
    ],
    spacing: 20,
    labelTextStyle: { color: 'gray', width: 60 },
  }));

  // Fetch data effect
  useEffect(() => {
    if (!isAuthenticated || !db || authLoading) {
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
          db.getCount('Customer', [['disabled', '!=', 1]])
        ]);

        if (isMounted) {
          setNumerodeFacturas(count);
          setNumeroFacturasUnpaid(unpaidCount);
          setNumeroCustomers(customerCount);
        }

        // Fetch invoice data
        const searchParams = {
          usename: userInfo.email,
          statusfactura: ['Paid','Overdue']
        };

        const result = await call.get('angola_erp.api.invoices.all_invoices', searchParams);
        if (isMounted) {
          setStreams(result.message);
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
  }, [accessToken, db, isAuthenticated, authLoading, refreshAccessTokenAsync, userInfo, call]);

  // Loading states
  if (authLoading) {
    return (
      <Layout style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Spinner size='giant' />
        <Text style={{ marginTop: 10 }}>Checking authentication...</Text>
      </Layout>
    );
  }

  if (!isAuthenticated) {
    return (
      <Layout style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text category="h6">Please log in to view the dashboard</Text>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Spinner size='giant' />
        <Text style={{ marginTop: 10 }}>Loading dashboard data...</Text>
      </Layout>
    );
  }

  const displayValue = availableYears[selectedYearIndex?.row] || currentYear;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView>
        <HomeScreenContainer>
          <Card status="basic" style={styles.card}>
            <Text category="h6" style={styles.cardTitle}>Invoice Statistics</Text>
            <View style={styles.statsContainer}>
              <Card status="success" style={styles.statCard}>
                <Text category="s1">Total Invoices</Text>
                <Text category="h5">{numerodeFacturas}</Text>
              </Card>
              <Card status="danger" style={styles.statCard}>
                <Text category="s1">Unpaid Invoices</Text>
                <Text category="h5">{numerofacturasUnpaid}</Text>
              </Card>
              <Card status="info" style={styles.statCard}>
                <Text category="s1">Active Customers</Text>
                <Text category="h5">{numeroCustomers}</Text>
              </Card>
            </View>
          </Card>

          <Card style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Text category="h6" style={styles.chartTitle}>Monthly Invoice Summary</Text>
              <Select
                style={styles.yearSelector}
                value={displayValue.toString()}
                selectedIndex={selectedYearIndex}
                onSelect={index => setSelectedYearIndex(index)}
                size="small"
              >
                {availableYears.map(year => (
                  <SelectItem key={year} title={year.toString()} />
                ))}
              </Select>
            </View>

            {monthlyData.length > 0 ? (
              <>
                <View style={styles.chartContainer}>
                  <BarChart
                    width={340}
                    height={200}
                    rotateLabel
                    noOfSections={4}
                    stackData={chartData}
                    showValuesAsTopLabel
                    topLabelTextStyle={{ fontSize: 12 }}
                    yAxisTextStyle={{ fontSize: 12 }}
                    xAxisLabelTextStyle={{ fontSize: 12, width: 60 }}
                    spacing={20}
                    barWidth={22}
                    initialSpacing={10}
                    yAxisOffset={50}
                    yAxisLabelPrefix="$"
                    yAxisLabelSuffix=""
                    showYAxisIndices
                    yAxisIndicesColor="lightgray"
                    yAxisIndicesWidth={1}
                    rulesType="solid"
                    rulesColor="lightgray"
                    showReferenceLine1
                    referenceLine1Position={0}
                    referenceLine1Config={{
                      color: 'lightgray',
                      dashWidth: 2,
                      dashGap: 3,
                    }}
                  />
                </View>
                <View style={styles.legendContainer}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: '#4ABFF4' }]} />
                    <Text>Paid</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: 'orange' }]} />
                    <Text>Unpaid</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: '#28B2B3' }]} />
                    <Text>Total</Text>
                  </View>
                </View>
              </>
            ) : (
              <Text style={styles.noDataText}>No invoice data available for {displayValue}</Text>
            )}
          </Card>

          {monthlyData.length > 0 && (
            <Card style={styles.detailsCard}>
              <Text category="h6" style={styles.detailsTitle}>
                Invoice Details for {displayValue}
              </Text>
              <FlatList
                data={monthlyData}
                scrollEnabled={false}
                keyExtractor={(item) => item.monthYear}
                renderItem={({ item }) => (
                  <View style={styles.monthContainer}>
                    <Text style={styles.monthHeader}>
                      {item.month} {item.year}
                    </Text>
                    <Text>Paid: ${item.paidAmount.toFixed(2)}</Text>
                    <Text>Unpaid: ${item.unpaidAmount.toFixed(2)}</Text>
                    <Text>Total: ${item.totalAmount.toFixed(2)}</Text>
                    <Text>Invoices: {item.items.length}</Text>
                  </View>
                )}
              />
            </Card>
          )}
        </HomeScreenContainer>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 20,
  },
  cardTitle: {
    marginBottom: 15,
    textAlign: 'center'
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap'
  },
  statCard: {
    width: '30%',
    marginBottom: 10,
    alignItems: 'center'
  },
  chartCard: {
    marginBottom: 20,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15
  },
  chartTitle: {
    flex: 1,
  },
  yearSelector: {
    width: 100,
    marginLeft: 10
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 10
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10
  },
  legendColor: {
    width: 15,
    height: 15,
    marginRight: 5,
    borderRadius: 3
  },
  detailsCard: {
    marginBottom: 20,
  },
  detailsTitle: {
    marginBottom: 15,
    textAlign: 'center'
  },
  monthContainer: {
    padding: 15,
    marginBottom: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 5
  },
  monthHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5
  },
  noDataText: {
    textAlign: 'center',
    padding: 20,
    color: 'gray'
  }
});
