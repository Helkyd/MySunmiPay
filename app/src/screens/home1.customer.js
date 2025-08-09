import React, { useContext, useEffect } from "react";
import { ScrollView, SafeAreaView, View, FlatList, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Input, Button, Layout, Text, Icon } from "@ui-kitten/components";
import { AuthContext } from "../provider/auth";
import { useFrappe } from "../provider/backend";
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';

export const HomeCustomer = () => {
  const { t } = useTranslation();
  const { refreshAccessTokenAsync, isAuthenticated, userInfo, accessToken } = useContext(AuthContext);
  const [visible, setVisible] = React.useState(false);
  const [criarCliente, setCriarCliente] = React.useState(false);
  const [customers, setCustomers] = React.useState([]);
  const [customerName, setCustomerName] = React.useState('');
  const [customerType, setCustomerType] = React.useState('');
  const [customerGroup, setCustomerGroup] = React.useState('');
  const [customerTaxID, setCustomerTaxID] = React.useState('');
  const [customerAddress, setCustomerAddress] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phoneNumber, setPhoneNumber] = React.useState('');
  const { db, call } = useFrappe();
  const [listaCustomers, setListaCustomers] = React.useState([]);
  const [searchNIF, setSearchNIF] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  // Validation functions
  const validate = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validate_phones = (phone) => {
    const re = /^\+?[0-9\s]+$/;
    return re.test(phone);
  };

  const validarNIF = (nif) => {
    // Add your NIF validation logic here
    return nif.length === 10 || nif.length === 14;
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = (procurarNIF = null) => {
    setLoading(true);
    if (procurarNIF) {
      const searchParams = {
        doctype: 'Customer',
        filters: { 'tax_id': procurarNIF },
      };
      call.get('frappe.client.get', searchParams)
        .then((result) => {
          console.log('customer ****** ', result);
          //setListaCustomers([result.message]);
          if (result && result.message) {
            setListaCustomers([result.message]);
          } else {
            setListaCustomers([]);
          }
        })
        .catch((error) => {
          console.error(error)
          setListaCustomers([]);
        })
        .finally(() => setLoading(false));
    } else {
      const searchParams = { username: userInfo.email };
      call.get('angola_erp.api.customer.all_customers', searchParams)
        .then((result) => {
          console.log('APICUstomer ****** ', result);
          setListaCustomers(result?.message || []);
        })
        .catch(async (e) => {
          if (e.httpStatus === 403 || e.httpStatus === 401) {
            await refreshAccessTokenAsync();
          } else {
            console.error(e);
            Toast.show({
              type: "error",
              position: 'top',
              text1: 'Error',
              text2: e.message
            });
          }
        })
        .finally(() => setLoading(false));
    }
  };

  const createCustomer = async () => {
    // Validate inputs
    if (email && !validate(email)) {
      Toast.show({
        type: 'error',
        position: 'top',
        text1: 'Invalid Email',
        text2: 'Please enter a valid email address'
      });
      return;
    }

    if (phoneNumber && !validate_phones(phoneNumber)) {
      Toast.show({
        type: 'error',
        position: 'top',
        text1: 'Invalid Phone',
        text2: 'Please enter a valid phone number'
      });
      return;
    }

    if (!customerName) {
      Toast.show({
        type: 'error',
        position: 'top',
        text1: 'Missing Information',
        text2: 'Customer name is required'
      });
      return;
    }

    // Check if customer exists
    try {
      const docs = await db.getDocList('Customer', {
        fields: ['name', 'customer_name'],
        filters: [['name', '=', customerName], ['tax_id', '=', customerTaxID]],
        asDict: false,
      });

      if (docs.length === 0) {
        // Create new customer
        const customertype = customerTaxID.length === 10 ? 'Company' : 'Individual';
        const customergroup = customerTaxID.length === 10 ? 'All Customer Groups' : 'Individual';

        const doc = await db.createDoc('Customer', {
          customer_name: customerName,
          customer_type: customertype,
          customer_group: customergroup,
          territory: 'Angola',
          tax_id: customerTaxID,
          email: email,
          phonenumber: phoneNumber,
        });

        Toast.show({
          type: 'success',
          position: 'top',
          text1: 'Success',
          text2: 'Customer created successfully'
        });

        resetForm();
        fetchCustomers();
      } else {
        // Update existing customer
        const doc = await db.updateDoc('Customer', customerName, {
          customer_name: customerName,
          tax_id: customerTaxID,
          email: email,
          phonenumber: phoneNumber,
        });

        Toast.show({
          type: 'success',
          position: 'top',
          text1: 'Success',
          text2: 'Customer updated successfully'
        });

        resetForm();
        fetchCustomers();
      }
    } catch (error) {
      if (error.httpStatus === 403 || error.httpStatus === 401) {
        await refreshAccessTokenAsync();
      } else {
        console.error(error);
        Toast.show({
          type: 'error',
          position: 'top',
          text1: 'Error',
          text2: error.message || 'Failed to save customer'
        });
      }
    }
  };

  const editCustomer = (customer) => {
    if (!customer) return;

    setCustomerName(customer.name || '');
    setCustomerTaxID(customer.tax_id || '');
    setEmail(customer.email || '');
    setPhoneNumber(customer.phonenumber || '');
    setCustomerAddress(customer.address || '');
    setCriarCliente(true);
  };

  const resetForm = () => {
    setCustomerName('');
    setCustomerType('');
    setCustomerGroup('');
    setCustomerTaxID('');
    setCustomerAddress('');
    setEmail('');
    setPhoneNumber('');
    setCriarCliente(false);
  };

  // Create a safe icon component
  const SafeIcon = (props) => {
    if (!props.name) return null;
    return <Icon {...props} name={props.name || 'alert-circle-outline'} />;
  };

  //accessoryLeft={(props) => <Icon {...props} name="plus-outline" />}
  //accessoryLeft={(props) => <Icon {...props} name="refresh-outline" />}

  return (
    <SafeAreaView style={styles.safeArea}>
      {!criarCliente ? (
        <Layout style={styles.container}>
          {/* Search Section */}
          <Layout style={styles.searchContainer}>
            <Input
              value={searchNIF}
              onSubmitEditing={() => searchNIF.length >= 10 && fetchCustomers(searchNIF)}
              onChangeText={setSearchNIF}
              placeholder={t('home.search_fornif')}
              //accessoryLeft={(props) => <SafeIcon {...props} name="search-outline" />}
              style={styles.searchInput}
              keyboardType="numeric"
            />

            <View style={styles.buttonGroup}>
              <Button
                style={styles.actionButton}
                size="small"
                onPress={() => setCriarCliente(true)}
                //accessoryLeft={(props) => <SafeIcon {...props} name="search-outline" />}
              >
                {t('home.button_createcustomer')}
              </Button>

              <Button
                style={styles.actionButton}
                size="small"
                appearance="ghost"
                onPress={() => {
                  setSearchNIF('');
                  fetchCustomers();
                }}
                //accessoryLeft={(props) => <SafeIcon {...props} name="search-outline" />}
              >
                {t('home.button_clearfilter')}
              </Button>
            </View>
          </Layout>

          {/* Customers List */}
          <Layout style={styles.listContainer}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <Text category="h6" appearance="hint">{t('general.loading')}...</Text>
              </View>
            ) : listaCustomers.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text category="h6" appearance="hint">{t('home.no_customers_found')}</Text>
              </View>
            ) : (
              <FlatList
                data={listaCustomers}
                keyExtractor={(item, index) => item?.name || `customer-${index}`}
                renderItem={({ item }) => {
                  if (!item) return null;

                  return (
                    // Your customer card rendering
                    <TouchableOpacity
                      style={styles.customerCard}
                      onPress={() => editCustomer(item)}
                    >
                      <View style={styles.customerHeader}>
                        <Text category="h6" style={styles.customerName}>
                          {item?.customer_name || 'Unnamed Customer'}
                        </Text>
                        {item?.tax_id && (
                          <Text appearance="hint" style={styles.customerNif}>
                            NIF: {item.tax_id}
                          </Text>
                        )}

                      </View>

                      <View style={styles.customerDetails}>
                        {item.email && (
                          <View style={styles.detailRow}>
                            //<Icon name="email-outline" width={16} height={16} fill="#888" />
                            <Icon name="email-outline" width={16} height={16} fill="#888" />
                            <Text style={styles.detailText}>{item.email}</Text>
                          </View>
                        )}

                        {item.phonenumber && (
                          <View style={styles.detailRow}>
                            //<Icon name="phone-outline" width={16} height={16} fill="#888" />
                            <Icon name="email-outline" width={16} height={16} fill="#888" />
                            <Text style={styles.detailText}>{item.phonenumber}</Text>
                          </View>
                        )}
                      </View>

                      <Button
                        size="tiny"
                        appearance="ghost"
                        status="info"
                        onPress={() => editCustomer(item)}
                        style={styles.editButton}
                        //accessoryLeft={(props) => <Icon {...props} name="edit-outline" />}
                        //accessoryLeft={(props) => <SafeIcon {...props} name="search-outline" />}
                      >
                        {t('home.button_edit')}
                      </Button>
                    </TouchableOpacity>
                  );
                }}
                contentContainerStyle={styles.listContent}
              />

            )}
          </Layout>
        </Layout>
      ) : (
        <Layout style={styles.formWrapper}>
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            <Text category="h5" style={styles.formTitle}>
              {t('home.customer_form_title')}
            </Text>

            <Input
              label={t('home.nif_empresaindividual')}
              value={customerTaxID}
              onSubmitEditing={() => customerTaxID.length >= 10 && validarNIF(customerTaxID)}
              onChangeText={setCustomerTaxID}
              placeholder="Ex: 1234567890"
              style={styles.formInput}
              keyboardType="numeric"
              accessoryRight={(props) => (
                <TouchableOpacity onPress={() => customerTaxID.length >= 10 && validarNIF(customerTaxID)}>
                   <Icon {...props} name="email-outline" />
                </TouchableOpacity>
              )}
            />

            <Input
              label={t('home.invoice_customername')}
              value={customerName}
              onChangeText={setCustomerName}
              placeholder={t('home.invoice_customername')}
              style={styles.formInput}
            />

            <Input
              label={t('home.invoice_customeremail')}
              value={email}
              onChangeText={setEmail}
              placeholder="exemplo@empresa.com"
              style={styles.formInput}
              keyboardType="email-address"
              autoCapitalize="none"
              accessoryRight={(props) => (
                //<Icon {...props} name="email-outline" />
                <Icon {...props} name="email-outline" />
              )}
            />

            <Input
              label={t('home.invoice_customerphonenumber')}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="+244 900 000 000"
              style={styles.formInput}
              keyboardType="phone-pad"
              accessoryRight={(props) => (
              //  <Icon {...props} name="phone-outline" />
               <Icon {...props} name="email-outline" />
              )}
            />

            <Input
              label={t('home.invoice_customeraddress')}
              value={customerAddress}
              onChangeText={setCustomerAddress}
              placeholder={t('home.invoice_customeraddress')}
              style={styles.formInput}
              multiline
              textStyle={{ minHeight: 64 }}
              accessoryRight={(props) => (
                //<Icon {...props} name="home-outline" />
                 <Icon {...props} name="email-outline" />
              )}
            />

            <View style={styles.formButtons}>
              <Button
                style={styles.formButton}
                status="success"
                onPress={createCustomer}
                //accessoryLeft={(props) => <Icon {...props} name="checkmark-outline" />}
                //accessoryLeft={(props) => <SafeIcon {...props} name="search-outline" />}
              >
                {t('home.button_addcustomer')}
              </Button>

              <Button
                style={styles.formButton}
                appearance="ghost"
                status="danger"
                onPress={resetForm}
                //accessoryLeft={(props) => <Icon {...props} name="close-outline" />}
                //accessoryLeft={(props) => <SafeIcon {...props} name="search-outline" />}
              >
                {t('home.button_dismiss')}
              </Button>
            </View>
          </ScrollView>
        </Layout>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  searchContainer: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    marginBottom: 16,
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  listContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  listContent: {
    paddingBottom: 32,
  },
  customerCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  customerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  customerName: {
    fontWeight: 'bold',
    flex: 1,
  },
  customerNif: {
    marginLeft: 8,
  },
  customerDetails: {
    marginVertical: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  detailText: {
    marginLeft: 8,
    color: '#555',
  },
  editButton: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  formWrapper: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    padding: 24,
    paddingBottom: 48,
  },
  formTitle: {
    marginBottom: 24,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  formInput: {
    marginBottom: 16,
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  formButton: {
    flex: 1,
    marginHorizontal: 8,
  },
});
