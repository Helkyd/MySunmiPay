//import React from "react";
import React, { useContext, useEffect } from "react";
import { AuthContext } from "../provider/auth";

//import { SafeAreaView, StyleSheet } from "react-native";
import { ScrollView, SafeAreaView, View, FlatList, TextInput, StyleSheet } from 'react-native';
import { Input, Button, Layout, Modal, Card, Text, Spinner, Icon, IconElement } from "@ui-kitten/components";

import Form from "../components/form.component";
//import { Formik, Form, Field } from 'formik';


import { useFrappe } from "../provider/backend";

import { BASE_URI } from "../data/constants";

import Toast from 'react-native-toast-message';

//import axios from 'axios';
//import { useContext, useEffect, useState } from "react";

import { useTranslation } from 'react-i18next';
import { i18n } from '../utils/i18n';


const API_URL = "`${BASE_URI}`/api/resource/Customer";

export const HomeCustomer = () => {
  const { t, i18n } = useTranslation();
  const navigateDetails = () => {
    setVisible(true);
    setCriarCliente(true);
  };

  //const { accessToken, refreshAccessTokenAsync } = useContext(AuthContext);
  const { refreshAccessTokenAsync, isAuthenticated, logout, userInfo, accessToken, fetchUserInfo } = useContext(AuthContext);
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

  const {db, call} = useFrappe();
  const [numerodeFacturas, setNumerodeFacturas] = React.useState(null);
  const [listaFacturas, setListaFacturas] = React.useState([]);

  const [customerCount, setCustomerCount] = React.useState(null);
  const [listaCustomers, setListaCustomers] = React.useState([]);

  const dateHoje = new Date();

  const [searchNIF, setSearchNIF] = React.useState('');

  const fetchCustomers = (procurarNIF = null) => {
    if (procurarNIF) {
      console.log('nif a valida ', procurarNIF);

        const searchParams = {
          doctype: 'Customer',
          filters: {'tax_id':procurarNIF},
        };
        call
          .get('frappe.client.get', searchParams)
          .then((result) => {
            console.log('**** listaCustomers')
            console.log(result)
            console.log(typeof(result))
            const streams = [result.message]
            console.log(streams.customer_name)
            setListaCustomers(streams)

          })
          .catch((error) => console.error(error));


    } else {
      console.log('FETCH CUSTOMERS....pppp');
      /*
      db.getDocList('Customer',{
        fields: ['name','customer_name','tax_id','email','phonenumber'],
        filters: [['docstatus','!=',1]],
        orderBy: {
          field: "customer_name",
          order: 'desc',
        },

      })
        .then((docs) => {
          console.log('Ficha de Clientes')
          console.log(docs)
          console.log(typeof(docs))
          const streams = docs
          setListaCustomers(streams)

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


        console.log('FACTURAS aaaa ')
        */
      //Call API based on Company
      const searchParams = {
        username: userInfo.email
      };

      console.log('Search PARAM')
      console.log(searchParams)

      call
      .get('angola_erp.api.customer.all_customers', searchParams)
      .then((result) => {
        console.log('**** LISTA DE FACTURAs..... ')
        //console.log(result.message)
        console.log('USER ',userInfo.email)
        console.log(result.message[0])
        console.log('tamanhpo ',result.message.length);
        console.log(typeof(result.message))
        const streams = result.message
        setListaCustomers(streams)
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
      .finally(() => {
        setLoadingTodos(false);
      });


    }


  };

  const createCustomer = async () => {
    // Validate inputs
    if (email && !validate(email)) return;
    if (phoneNumber && !validate_phones(phoneNumber)) return;

    console.log('Criar Cliente ', criarCliente);
    console.log('Cliente ', customerName);

    if (customerName) {
      //Check if Exists first and after Save REcords
      db.getDocList('Customer', {
        /** Fields to be fetched */
        fields: ['name', 'customer_name'],
        /** Filters to be applied - SQL AND operation */
        filters: [['name', '=', customerName],['tax_id','=',customerTaxID]],
        /** Filters to be applied - SQL OR operation */
        asDict: false,
      })
        .then((docs) => {
          console.log(docs)
          console.log(docs == [])
          console.log(docs == null)
          console.log(docs.length)


          if (docs.length === 0) {
            console.log('CLIENTE NAO EXISTE PODE CRIAR...');
            //CREATE

            if (customerTaxID.length == 10) {
              customertype = 'Company'
              customergroup = 'All Customer Groups'
            } else {
              customertype = 'Individual'
              customergroup = 'Individual'
            }

            db.createDoc('Customer', {
              customer_name: customerName,
              customer_type: customertype,
              customer_group: customergroup,
              territory: 'Angola',  //Default
              tax_id: customerTaxID,
              email: email,
              phonenumber: phoneNumber,

            })
              .then((doc) => {
                console.log(doc)
                //TODO: ONCE Saved... Clear Fields and return to CUSTOMER LIST
                setCustomerName('');
                setCustomerType('');
                setCustomerTaxID('');
                setCustomerAddress('');
                setEmail('');
                setPhoneNumber('');

                setCriarCliente(false)

              })
              .catch((error) => console.error(error));

            //TODO: API on aoerp_tools that will save the Customer with Company and Address



          } else {
            console.log('CriarCliente ', criarCliente);
            console.log('CLIENTE ALREADY EXISTE.....')
            /*
            Toast.show({
              type: 'error',
              position: 'top',
              text1: 'O Cliente ja Existe.',
              text2: 'Este Cliente ja Existe no Sistema'
            });
            */

            // This is an update operation
            db.updateDoc('Customer', customerName, {
              customer_name: customerName,
              tax_id: customerTaxID,
              email: email,
              phonenumber: phoneNumber,
            })
            .then((doc) => {
              console.log('Customer updated:', doc);
              Toast.show({
                type: 'success',
                position: 'top',
                text1: 'Success',
                text2: 'Customer updated successfully'
              });
              resetForm();
              fetchCustomers(); // Refresh the list
            })
            .catch(async (error) => {
              if (error.httpStatus === 403 || error.httpStatus === 401) {
                await refreshAccessTokenAsync();
              } else {
                console.error(error);
                Toast.show({
                  type: 'error',
                  position: 'top',
                  text1: 'Error',
                  text2: 'Failed to update customer'
                });

              }
            });

          }


        })


    } else {
      // This is a create operation
      // ... (keep your existing create logic)
    }
  };

  const editCustomer = (customer) => {
    // Set the form data with the customer's information
    setCustomerName(customer.customer_name);
    setCustomerTaxID(customer.tax_id || '');
    setEmail(customer.email || '');
    setPhoneNumber(customer.phonenumber || '');

    // Set the customer name to identify this is an edit operation
    setCustomerName(customer.name);

    // Open the create customer form in edit mode
    setCriarCliente(true);
  };

  const resetForm = () => {
    setCustomerName('');
    setCustomerTaxID('');
    setCustomerAddress('');
    setEmail('');
    setPhoneNumber('');
    setSearchNIF('');
    setCriarCliente(false);
  };

  useEffect(() => {
    fetchCustomers();
    /*
    db.getDocList('Supplier', {
      fields: ["name","status"],
      filters: [['docstatus','>=', 0]],
      limit_start: 5,
      limit: 20,
      orderBy: {
        field: "name",
        order: 'desc',
      },
    }).then((data) => {
      console.log('Ficha de Clientes')
      console.log(data);
      //const streams = data
      //setListaCustomers(streams)
     // console.log('Cliente ', streams[0])

    })
     */

  }, [db]);

  async function validarNIF(nifempresa) {
    console.log('nif a valida ', nifempresa);

    call
      .get("aoerp_tools.util.angola.validar_nif", {'nif':searchNIF})
      .then((result) => {
        console.log('NIF RESULT ',result)
        console.log("NIF INVALIDO ",result.message);
        console.log('NIF EMP ',result.message[2]);
        if (result.message == "NIF INVALIDO") {
          setCustomerName("");
          setCustomerTaxID("");

          Toast.show({
            type: 'error',
            position: 'top',
            text1: 'NIF INVALIDO',
            text2: 'Volte da Digitar'
          });

        } else {
          setCustomerName(result.message[2]);
          setCustomerTaxID(searchNIF);

        }



      })
      .catch((error) => console.error(error));

  }

  async function procurarNIF(nifempresa) {
    console.log('nif a valida ', nifempresa);
    db.getDocList('Customer',{
      fields: ['name','customer_name','tax_id','email','phonenumber'],
      filters: [['name','=','Teresa Joaquim']],
      limit_start: 5,
      limit: 20,
      orderBy: {
        field: "customer_name",
        order: 'desc',
      },

    })
      .then((docs) => {
        console.log('Ficha de Clientes')
        console.log(docs)
        const streams = docs
        setListaCustomers(streams)

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



      const searchParams = {
        doctype: 'Customer',
        filters: {'tax_id':nifempresa},
      };
      call
        .get('frappe.client.get', searchParams)
        .then((result) => {
          console.log('**** listaCustomers',result)
          console.log(result)
          const streams = result.message
          setListaCustomers(streams)

        })
        .catch((error) => console.error(error));



  }

  const handleChange = (event) => {
    const value = event.target.value;
    console.log('HANDLE CHANGE Customer Name')
    setCustomerName(value);
  };

  // Log changes to customerName (optional)
  useEffect(() => {
    console.log('customerName updated:', customerName);
    //console.log('listaCustomers updated:', listaCustomers);

  }, [accessToken, db, customerName,listaCustomers]);

  //NEW FORM
  function handleSubmit(e) {
    console.log('NOVA FORMA HANDLE SUBMIT....');
    // Prevent the browser from reloading the page
    e.preventDefault();

    // Read the form data
    const form = e.target;
    const formData = new FormData(form);

    // You can pass formData as a fetch body directly:
    fetch('/some-api', { method: form.method, body: formData });

    // Or you can work with it as a plain object:
    const formJson = Object.fromEntries(formData.entries());
    console.log(formJson);
  }

  //VALIDATE EMAILS
  const validate = (values) => {
    const errors = {}

    console.log('VALUE Email ', values);
    console.log('TESTAR EMAIL ', (/\w+([-+.']\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*/i.test(values)));

    if (!values) {
      errors.email = 'Required'
      Toast.show({
        type: 'error',
        position: 'top',
        text1: 'Email Necessario',
        text2: 'Digite o Email'
      });

    } else if (!(/\w+([-+.']\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*/i.test(values))) {
      errors.email = 'Invalid email address'
      Toast.show({
        type: 'error',
        position: 'top',
        text1: 'Email INVALIDO',
        text2: 'Volte a Digitar'
      });

    }
    return errors
  }

    //VAlidate Phone /^(\+\d{1,3}\s)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{3}$|^(\+\d{1,3}\d{9})|^(\d{12})|^(\d{9})/
  //VALIDATE Phones
  const validate_phones = (values) => {
    const errors = {}

    console.log('VALUE PhoneEmail ', values);
    console.log('TESTAR Phone ', (/^(\+\d{1,3}\s)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{3}$|^(\+\d{1,3}\d{9})|^(\d{12})|^(\d{9})/i.test(values)));

    if (!values) {
      errors.phone = 'Required'
      Toast.show({
        type: 'error',
        position: 'top',
        text1: 'Phone Necessario',
        text2: 'Digite o Phone'
      });

    } else if (!(/^(\+\d{1,3}\s)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{3}$|^(\+\d{1,3}\d{9})|^(\d{12})|^(\d{9})/i.test(values))) {
      errors.phone = 'Invalid Phone Number'
      Toast.show({
        type: 'error',
        position: 'top',
        text1: 'Phone INVALIDO',
        text2: 'Volte a Digitar'
      });

    }
    return errors
  }


  return (
    <SafeAreaView style={{ flex: 1 }}>
      {criarCliente == false &&
        <Layout style={{ flex: 1 }}>
      <Layout style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Input
          value={searchNIF}
          onSubmitEditing={() => {
            console.log('Search VALIDATE.... ',searchNIF);
            if (searchNIF.length >= 10){
              fetchCustomers(searchNIF);
            } else {
              Toast.show({
                type: 'error',
                position: 'top',
                text1: 'Cliente!!!',
                text2: 'Cliente nao existe!!!'
              });
            }
          }}
          onChangeText={(nextValue) => setSearchNIF(nextValue)}
          placeholder={t('home.search_fornif')}
          style={{ width: 200, marginTop: 10 }}
        />

        <View style={styles.buttonContainer}>
          <Button
            style={styles.button}
            size="tiny"
            onPress={navigateDetails}
          >
            {t('home.button_createcustomer')}
          </Button>
          <Button
            style={styles.button}
            size="tiny"
            onPress={() => {
              setSearchNIF('');
              fetchCustomers();
              setCriarCliente(false)
            }}

          >
            {t('home.button_clearfilter')}
          </Button>
        </View>
      </Layout>

      <Layout style={{ flex: 3 }}>
        <FlatList
          data={listaCustomers}
          keyExtractor={(item) => item.name}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <Text>{item.customer_name}</Text>
              {item.tax_id != null && <Text>NIF: {item.tax_id}</Text>}
              {item.email != null && item.email != '' && <Text>@: {item.email}</Text>}
              {item.phonenumber != null && item.phonenumber != '' && <Text>Telef. {item.phonenumber}</Text>}
              <Layout style={{ marginVertical: 5 }}></Layout>
              <View style={styles.buttonContainer}>
                <Button
                  size="tiny"
                  onPress={() => editCustomer(item)}
                  appearance="ghost"
                  status="info"
                >
                  {t('home.button_edit')}
                </Button>
              </View>
            </View>
          )}
        />

      </Layout>
    </Layout> }
    {/* Replace your existing criarCliente == true section with this */}
    {criarCliente == true &&
      <Layout style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formContainer}>
            <Input
              label={t('home.nif_empresaindividual')}
              value={searchNIF}
              onSubmitEditing={() => {
                console.log('NIF VALIDATE.... ',searchNIF);
                if (searchNIF.length >= 10){
                  validarNIF(searchNIF);
                } else {
                  Toast.show({
                    type: 'error',
                    position: 'top',
                    text1: 'NIF INVALIDO',
                    text2: 'Volte da Digitar'
                  });
                }
              }}
              onChangeText={(nextValue) => setSearchNIF(nextValue)}
              placeholder="Procurar NIF ?"
              style={{ marginBottom: 20 }}
            />

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('home.invoice_customername')}</Text>
              <TextInput
                placeholder={t('home.invoice_customername')}
                value={customerName}
                onChangeText={setCustomerName}
                style={styles.input}
                readOnly
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('home.invoice_customertaxid')}</Text>
              <TextInput
                placeholder={t('home.invoice_customertaxid')}
                value={customerTaxID}
                onChangeText={setCustomerTaxID}
                style={styles.input}
                readOnly
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('home.invoice_customeremail')}</Text>
              <TextInput
                placeholder={t('home.invoice_customeremail')}
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('home.invoice_customerphonenumber')}</Text>
              <TextInput
                placeholder={t('home.invoice_customerphonenumber')}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                style={styles.input}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('home.invoice_customeraddress')}</Text>
              <TextInput
                placeholder={t('home.invoice_customeraddress')}
                value={customerAddress}
                onChangeText={setCustomerAddress}
                style={styles.input}
                multiline
              />
            </View>

            <View style={styles.buttonContainer}>
              <Button
                style={styles.button}
                size="tiny"
                onPress={createCustomer}
              >
                {t('home.button_addcustomer')}
              </Button>
              <Button
                style={styles.button}
                size="tiny"
                onPress={resetForm}
              >
                {t('home.button_dismiss')}
              </Button>
            </View>
          </View>
        </ScrollView>
      </Layout>
    }

    </SafeAreaView>
  );
};

/*
const styles = StyleSheet.create({
  container: {
    minHeight: 192,
  },
  backdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },

});
*/

const styles = StyleSheet.create({
  container: { padding: 16 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, marginBottom: 100, marginTop: -100 , top: 100 },
  item: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#ccc' },

  containerNewCustomer: {
    minHeight: 192,
    flexDirection: 'col',
    flexWrap: 'wrap',

  },

  container: {
    //flexDirection: 'col',
    //flexWrap: 'wrap',
    //minHeight: 192,
    flex: 1,
    flexDirection: 'row', // Align children from left to right
    flexWrap: 'wrap',
    alignItems: 'flex-start'
  },
  backdrop: {
    backgroundColor: "rgba(177, 78, 78, 0.5)",
  },
  button: {
    margin: 2,
    marginHorizontal: 5,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '60%',
    marginVertical: 10,
  },

  item: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    marginBottom: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },

  formContainer: {
    width: '90%',
    padding: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },

  inputReadOnly: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f5f5f5',
    color: '#666',
  },

  scrollContainer: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 50, // Extra space at bottom
  },
  formContainer: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 40, // Ensure space below buttons
  },
});
