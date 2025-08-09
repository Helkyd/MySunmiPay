//import React from "react";
import React, { useContext, useEffect } from "react";
import { AuthContext } from "../provider/auth";

//import { SafeAreaView, StyleSheet } from "react-native";
import { ScrollView, TouchableOpacity,SafeAreaView, View, FlatList, TextInput, StyleSheet } from 'react-native';
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

export const HomeProducts = () => {
  const { t, i18n } = useTranslation();
  const navigateDetails = () => {
    setVisible(true);
    setcriarProducto(true);
  };

  //const { accessToken, refreshAccessTokenAsync } = useContext(AuthContext);
  const { refreshAccessTokenAsync, isAuthenticated, logout, userInfo, accessToken, fetchUserInfo } = useContext(AuthContext);

  const [visible, setVisible] = React.useState(false);
  const [criarProducto, setcriarProducto] = React.useState(false);
  const [editProducto, seteditProducto] = React.useState(false);

  //Products ITEM
  const [itemCode, setItemCode] = React.useState('');
  const [itemName, setItemName] = React.useState('');
  const [itemDescription, setItemDescription] = React.useState('');
  const [itemGroup, setItemGrDescription] = React.useState('Services');
  const [itemStockUom, setItemStockUom] = React.useState('Unit');
  const [itemIsStock, setItemIsStock] = React.useState(false);
  const [itemStandardRate, setitemStandardRate] = React.useState('');

  const [listaProdutos, setlistaProdutos] = React.useState([]);
  const [searchItemCode, setsearchItemCode] = React.useState('');

  const [selectedItem, setSelectedItem] = React.useState(null);
  const [selecteditemCode, setSelectedItemCode] = React.useState('');
  const [selecteditemName, setSelectedItemName] = React.useState('');
  const [selecteditemDescription, setSelectedItemDescription] = React.useState('');
  const [selecteditemStandardRate, setSelectedItemStandardRate] = React.useState('');

  const formatarMoeda = new Intl.NumberFormat();

  const {db, call} = useFrappe();

  const dateHoje = new Date();


  const fetchItems = (procurarItem = null) => {
    if (procurarItem) {
      console.log('Produto ', procurarItem);

        const searchParams = {
          doctype: 'Item',
          fields: ['name','item_code','item_name','description','standard_rate'],
          filters: [['item_name','like', procurarItem + '%']],
        };
        call
          .get('frappe.client.get_list', searchParams)
          .then((result) => {
            console.log('**** Lista de ITems/Produtos')
            console.log(result)
            console.log(typeof(result))
            const streams = result.message
            console.log(streams.customer_name)
            setlistaProdutos(streams)

          })
          .catch((error) => {
            console.error(error)
          });


    } else {
      console.log('FETCH ITEMS....pppp');
      /*
      db.getDocList('Item',{
        fields: ['name','item_code','item_name','description','standard_rate'],
        filters: [['disabled','!=',1]],
        orderBy: {
          field: "item_code",
          order: 'desc',
        },

      })
      .then((docs) => {
        const streams = docs
        setlistaProdutos(streams)

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
      */

      //API to get Services/Products based on Company
      const searchParams = {
        username: userInfo.email
      };

      console.log('Search PARAM')
      console.log(searchParams)

      call
      .get('angola_erp.api.product.all_products', searchParams)
      .then((result) => {
        console.log('**** LISTA DE FACTURAs..... ')
        //console.log(result.message)
        console.log('USER ',userInfo.email)
        console.log(result.message[0])
        console.log('tamanhpo ',result.message.length);
        console.log(typeof(result.message))
        const streams = result.message
        setlistaProdutos(streams)
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

  const createProduct = async () => {
    console.log('Create Products...... ');
    console.log('Item Name ', itemName);
    console.log('Item code ', itemCode);
    console.log('Item Descrip ', itemDescription);
    console.log('Item Rate ', itemStandardRate);

    //Check if Exists first and after Save REcords
    db.getDocList('Item', {
      /** Fields to be fetched */
      fields: ['name', 'item_code'],
      /** Filters to be applied - SQL AND operation */
      filters: [['name', '=', itemName]],
      /** Filters to be applied - SQL OR operation */
      asDict: false,
    })
      .then((docs) => {
        console.log(docs)
        console.log(docs == [])
        console.log(docs == null)
        console.log(docs.length)


        if (docs.length === 0) {
          console.log('Produto NAO EXISTE PODE CRIAR...');
          //CREATE
          db.createDoc('Item', {
            item_name: itemCode,
            item_code: itemCode,
            description: itemDescription,
            standard_rate: itemStandardRate,
            item_group: itemGroup,
            stock_uom: itemStockUom,
          })
            .then((doc) => {
              console.log(doc)
              //TODO: ONCE Saved... Clear Fields and return to CUSTOMER LIST
              setItemCode('');
              setItemName('');
              setItemDescription('');
              setitemStandardRate('');

              setsearchItemCode('');
              setcriarProducto(false)

            })
            .catch((error) => console.error(error));

          //TODO: API on aoerp_tools that will save the Customer with Company and Address



        } else {
          console.log('PRODUTO ALREADY EXISTE.....')
          Toast.show({
            type: 'error',
            position: 'top',
            text1: 'O Servico/Produto ja Existe.',
            text2: 'Este Servico/Produto ja Existe no Sistema'
          });

        }


      })
      .catch((error) => {
        console.error(error)
        console.log('CREATE THE CUSTOMER...')
      });


  };


  const editProduct = async () => {
    console.log('****** EDIT Products...... ');
    console.log('Item Name ', selecteditemName);
    console.log('Item code ', selecteditemCode);
    console.log('Item Descrip ', selecteditemDescription);
    console.log('Item Rate ', selecteditemStandardRate);

    db.updateDoc('Item', selecteditemCode, {
      item_name: selecteditemName,
      description: selecteditemDescription,
      standard_rate: selecteditemStandardRate,
    })
      .then((doc) => {
        console.log('UDDATE ITEM....')
        console.log(doc)
        seteditProducto(false);
        fetchItems();
        setcriarProducto(false)

      })
      .catch((error) => console.error(error));


  };


  useEffect(() => {
    fetchItems();
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
      //setlistaProdutos(streams)
     // console.log('Cliente ', streams[0])

    })
     */

  }, [accessToken,db]);

  async function validarNIF(nifempresa) {
    console.log('nif a valida ', nifempresa);

    call
      .get("aoerp_tools.util.angola.validar_nif", {'nif':searchItemCode})
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
          setCustomerTaxID(searchItemCode);

        }



      })
      .catch((error) => console.error(error));

  }

  async function procurarItem(nifempresa) {
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
        setlistaProdutos(streams)

      })
      .catch((error) => console.error(error));



      const searchParams = {
        doctype: 'Customer',
        filters: {'tax_id':nifempresa},
      };
      call
        .get('frappe.client.get', searchParams)
        .then((result) => {
          console.log('**** listaProdutos',result)
          console.log(result)
          const streams = result.message
          setlistaProdutos(streams)

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
    console.log('listaProdutos updated:', listaProdutos);
    console.log('Rate ', selecteditemStandardRate)
  }, [listaProdutos,selecteditemStandardRate]);

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

  //Copied Item code to Item Name
  const changeItemCode = (valueOne) => {
    /*
    this.setState({
      itemName,
      itemCode: `${valueOne}-foo`
    })
      */
    setItemName(`${valueOne}`);
    setItemCode(`${valueOne}`);
    setItemDescription(`${valueOne}`);
  }

  //EDIT ITEM
  const handleEditItem = (item) => {
    // Option 1: Navigate to an edit screen
    //navigation.navigate('EditProduct', { product: item });
    console.log('PRodjut ',item);

    console.log('Antes PRECO ', item.standard_rate)
    setSelectedItemStandardRate(String(item.standard_rate));
    setSelectedItemCode(item.item_code);
    setSelectedItemName(item.item_name);
    setSelectedItemDescription(item.description);


    seteditProducto(true);

    // Option 2: Show an edit modal
    // setSelectedItem(item);
    // setEditModalVisible(true);
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {criarProducto == false && editProducto == false &&
        <Layout style={{ flex: 1 }}>
      <Layout style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Input
          value={searchItemCode}
          onSubmitEditing={() => {
            console.log('Search VALIDATE.... ',searchItemCode);
            if (searchItemCode.length >= 0){
              fetchItems(searchItemCode);
            } else {
              Toast.show({
                type: 'error',
                position: 'top',
                text1: 'Cliente!!!',
                text2: 'Cliente nao existe!!!'
              });
            }
          }}
          onChangeText={(nextValue) => setsearchItemCode(nextValue)}
          placeholder= {t('home.search_forservice')}
          style={{ width: 250, marginTop: 10 }}
        />

        <View style={styles.buttonContainer}>
          <Button
            style={styles.button}
            size="tiny"
            onPress={navigateDetails}
          >
            {t('home.button_createservice')}
          </Button>
          <Button
            style={styles.button}
            size="tiny"
            onPress={() => {
              setsearchItemCode('');
              fetchItems();
              setcriarProducto(false)
            }}

          >
            {t('home.button_clearfilter')}
          </Button>
        </View>
      </Layout>

      <Layout style={{ flex: 3 }}>
        <FlatList
          data={listaProdutos}
          keyExtractor={(item) => item.name}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.item}
              onPress={() => handleEditItem(item)}  // Handle item press
              >
                <Text>{item.name} {item.name != item.description && <Text> - {item.description} </Text>} </Text>
                {item.standard_rate != null && <Text>Preco AOA: {formatarMoeda.format(item.standard_rate)}</Text>}
                <Layout style={{ marginVertical: 5 }}></Layout>
            </TouchableOpacity>
          )}
        />
      </Layout>
    </Layout> }
      {criarProducto == true &&
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >

        <Layout
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >

          <View style={styles.containerNewCustomer}>

                <TextInput
                  label={t('home.service_itemcode')}
                  placeholder={t('home.service_itemcode')}
                  value={itemCode}
                  onChangeText={changeItemCode}
                  style={styles.input}
                />
                <TextInput
                  placeholder={t('home.service_itemname')}
                  value={itemName}
                  onChangeText={setItemName}
                  style={styles.input}
                />
                <TextInput
                  placeholder={t('home.service_itemdescription')}
                  value={itemDescription}
                  onChangeText={setItemDescription}
                  style={styles.input}
                />

                <TextInput
                  placeholder={t('home.service_itemrate')}
                  value={itemStandardRate}
                  onChangeText={setitemStandardRate}
                  //onChangeText={(setEmail) => validate(setEmail)}
                  style={styles.input}

                />


              </View>


            <View style={styles.buttonContainer}>
                <Button
                  style={styles.button}
                  size="tiny"
                  onPress={createProduct}
                >
                  {t('home.button_createservice')}
                </Button>
                <Button
                  style={styles.button}
                  size="tiny"
                  onPress={() => {
                    setItemCode('');
                    setItemDescription('');
                    setItemName('');
                    setitemStandardRate('');

                    setsearchItemCode('');
                    setcriarProducto(false)
                  }}
                >
                  {t('home.button_dismiss')}
                </Button>
              </View>

          </Layout>
        </ScrollView>
      }
      {editProducto == true &&
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >

        <Layout
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >

          <View style={styles.containerEditProducto}>
            <Input
                label={t('home.service_itemcode')}
                placeholder={t('home.service_itemcode')}
                value={selecteditemCode}
                onChangeText={changeItemCode}
                style={styles.inputEditProduct}
                disabled

              />
              <Input
                label={t('home.service_itemname')}
                placeholder={t('home.service_itemname')}
                value={selecteditemName}
                onChangeText={setItemName}
                style={styles.inputEditProduct}
              />
              <Input
                label={t('home.service_itemdescription')}
                placeholder={t('home.service_itemdescription')}
                value={selecteditemDescription}
                onChangeText={setItemDescription}
                style={styles.inputEditProduct}
              />
              <Input
                label={t('home.service_itemrate')}
                placeholder={t('home.service_itemrate')}
                value={selecteditemStandardRate}
                onChangeText={setSelectedItemStandardRate}
                style={styles.inputEditProduct}
              />


              </View>


            <View style={styles.buttonContainer}>
                <Button
                  style={styles.button}
                  size="tiny"
                  onPress={() => {

                    setsearchItemCode('');
                    editProduct();
                    //seteditProducto(false)

                  }}
                >
                  {t('home.button_updateservice')}
                </Button>
                <Button
                  style={styles.button}
                  size="tiny"
                  onPress={() => {
                    setItemCode('');
                    setItemDescription('');
                    setItemName('');
                    setitemStandardRate('');

                    setsearchItemCode('');
                    seteditProducto(false)
                  }}
                >
                  {t('home.button_dismiss')}
                </Button>
              </View>

          </Layout>
        </ScrollView>
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

  containerEditProducto: {
    padding: 16,
    color: 'red',
  },
  label: {
    marginBottom: 8,
    fontWeight: 'bold',
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
  inputEditProduct: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 2,
    padding: 5,
    //fontWeight: 'bold',
    //outlineColor: 'green',
    color: '#fff',

  },
});
