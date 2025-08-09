import React, { useContext, useEffect } from "react";
import { ScrollView, TouchableOpacity, SafeAreaView, View, FlatList, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Input, Button, Layout, Text, Icon } from "@ui-kitten/components";
import { useFrappe } from "../provider/backend";
import { AuthContext } from "../provider/auth";
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';

export const HomeProducts = () => {
  const { t } = useTranslation();
  const { refreshAccessTokenAsync, isAuthenticated, logout, userInfo, accessToken, fetchUserInfo } = useContext(AuthContext);
  const { db, call } = useFrappe();

  // State for product management
  const [visible, setVisible] = React.useState(false);
  const [criarProducto, setcriarProducto] = React.useState(false);
  const [editProducto, seteditProducto] = React.useState(false);
  const [searchItemCode, setsearchItemCode] = React.useState('');
  const [listaProdutos, setlistaProdutos] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  // Product form states
  const [itemCode, setItemCode] = React.useState('');
  const [itemName, setItemName] = React.useState('');
  const [itemDescription, setItemDescription] = React.useState('');
  const [itemStandardRate, setitemStandardRate] = React.useState('');

  // Selected product for editing
  const [selectedItem, setSelectedItem] = React.useState(null);
  const [selecteditemCode, setSelectedItemCode] = React.useState('');
  const [selecteditemName, setSelectedItemName] = React.useState('');
  const [selecteditemDescription, setSelectedItemDescription] = React.useState('');
  const [selecteditemStandardRate, setSelectedItemStandardRate] = React.useState('');

  const formatarMoeda = new Intl.NumberFormat();

  const fetchItems = (procurarItem = null) => {
    setLoading(true);
    if (procurarItem) {
      const searchParams = {
        doctype: 'Item',
        fields: ['name', 'item_code', 'item_name', 'description', 'standard_rate'],
        filters: [['item_name', 'like', procurarItem + '%']],
      };
      call.get('frappe.client.get_list', searchParams)
        .then((result) => {
          setlistaProdutos(result.message);
        })
        .catch((error) => {
          console.error(error);
          Toast.show({
            type: "error",
            position: 'top',
            text1: 'Error',
            text2: error.message
          });
        })
        .finally(() => setLoading(false));
    } else {
      const searchParams = { username: userInfo.email };
      call.get('angola_erp.api.product.all_products', searchParams)
        .then((result) => {
          setlistaProdutos(result.message);
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

  const createProduct = async () => {
    if (!itemCode || !itemName || !itemStandardRate) {
      Toast.show({
        type: 'error',
        position: 'top',
        text1: t('home.validation_error'),
        text2: t('home.fill_required_fields')
      });
      return;
    }

    setLoading(true);
    db.getDocList('Item', {
      fields: ['name', 'item_code'],
      filters: [['name', '=', itemName]],
    })
      .then((docs) => {
        if (docs.length === 0) {
          db.createDoc('Item', {
            item_name: itemCode,
            item_code: itemCode,
            description: itemDescription,
            standard_rate: itemStandardRate,
            item_group: 'Services',
            stock_uom: 'Unit',
          })
            .then(() => {
              Toast.show({
                type: 'success',
                position: 'top',
                text1: t('home.success'),
                text2: t('home.product_created')
              });
              resetForm();
              fetchItems();
            })
            .catch((error) => {
              console.error(error);
              Toast.show({
                type: 'error',
                position: 'top',
                text1: 'Error',
                text2: error.message
              });
            });
        } else {
          Toast.show({
            type: 'error',
            position: 'top',
            text1: t('home.error'),
            text2: t('home.product_exists')
          });
        }
      })
      .catch((error) => {
        console.error(error);
        Toast.show({
          type: 'error',
          position: 'top',
          text1: 'Error',
          text2: error.message
        });
      })
      .finally(() => setLoading(false));
  };

  const editProduct = async () => {
    if (!selecteditemCode || !selecteditemName || !selecteditemStandardRate) {
      Toast.show({
        type: 'error',
        position: 'top',
        text1: t('home.validation_error'),
        text2: t('home.fill_required_fields')
      });
      return;
    }

    setLoading(true);
    db.updateDoc('Item', selecteditemCode, {
      item_name: selecteditemName,
      description: selecteditemDescription,
      standard_rate: selecteditemStandardRate,
    })
      .then(() => {
        Toast.show({
          type: 'success',
          position: 'top',
          text1: t('home.success'),
          text2: t('home.product_updated')
        });
        resetForm();
        fetchItems();
      })
      .catch((error) => {
        console.error(error);
        Toast.show({
          type: 'error',
          position: 'top',
          text1: 'Error',
          text2: error.message
        });
      })
      .finally(() => setLoading(false));
  };

  const resetForm = () => {
    setItemCode('');
    setItemName('');
    setItemDescription('');
    setitemStandardRate('');
    setsearchItemCode('');
    setcriarProducto(false);
    seteditProducto(false);
  };

  const handleEditItem = (item) => {
    setSelectedItemStandardRate(String(item.standard_rate || ''));
    setSelectedItemCode(item.item_code);
    setSelectedItemName(item.item_name);
    setSelectedItemDescription(item.description || '');
    seteditProducto(true);
  };

  useEffect(() => {
    fetchItems();
  }, [accessToken, db]);

  const SearchIcon = (props) => <Icon {...props} name="search-outline" />;
  const PlusIcon = (props) => <Icon {...props} name="plus-outline" />;
  const CloseIcon = (props) => <Icon {...props} name="close-outline" />;
  const SaveIcon = (props) => <Icon {...props} name="save-outline" />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
      {!criarProducto && !editProducto ? (
        <Layout style={{ flex: 1, padding: 16 }}>
          {/* Search Section */}
          <View style={styles.searchContainer}>
            <Input
              value={searchItemCode}
              onSubmitEditing={() => searchItemCode.length >= 0 && fetchItems(searchItemCode)}
              onChangeText={setsearchItemCode}
              placeholder={t('home.search_forservice')}
              accessoryLeft={SearchIcon}
              style={styles.searchInput}
              returnKeyType="search"
            />

            <View style={styles.actionButtons}>
              <Button
                style={styles.actionButton}
                appearance="filled"
                status="primary"
                accessoryLeft={PlusIcon}
                onPress={() => setcriarProducto(true)}
              >
                {t('home.button_createservice')}
              </Button>

              {searchItemCode && (
                <Button
                  style={styles.actionButton}
                  appearance="outline"
                  status="basic"
                  accessoryLeft={CloseIcon}
                  onPress={() => {
                    setsearchItemCode('');
                    fetchItems();
                  }}
                >
                  {t('home.button_clearfilter')}
                </Button>
              )}
            </View>
          </View>

          {/* Products List */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text category="h6" appearance="hint">{t('home.loading')}</Text>
            </View>
          ) : (
            <FlatList
              data={listaProdutos}
              keyExtractor={(item) => item.name}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.itemContainer}
                  onPress={() => handleEditItem(item)}
                >
                  <View style={styles.itemContent}>
                    <Text category="s1" style={styles.itemName}>
                      {item.item_name}
                    </Text>
                    {item.description && item.name !== item.description && (
                      <Text category="p2" appearance="hint" style={styles.itemDescription}>
                        {item.description}
                      </Text>
                    )}
                    {item.standard_rate != null && (
                      <Text category="s2" style={styles.itemPrice}>
                        {t('home.price')}: {formatarMoeda.format(item.standard_rate)} AOA
                      </Text>
                    )}
                  </View>
                  <Icon name="edit-2-outline" fill="#3366ff" style={styles.editIcon} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text category="h6" appearance="hint">{t('home.no_products')}</Text>
                </View>
              }
            />
          )}
        </Layout>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.formContainer}
            keyboardShouldPersistTaps="handled"
          >
            <Text category="h5" style={styles.formTitle}>
              {editProducto ? t('home.edit_service') : t('home.create_service')}
            </Text>

            <Input
              label={t('home.service_itemcode')}
              placeholder={t('home.service_itemcode')}
              value={editProducto ? selecteditemCode : itemCode}
              onChangeText={editProducto ? null : (text) => {
                setItemCode(text);
                setItemName(text);
                setItemDescription(text);
              }}
              style={styles.formInput}
              disabled={editProducto}
            />

            <Input
              label={t('home.service_itemname')}
              placeholder={t('home.service_itemname')}
              value={editProducto ? selecteditemName : itemName}
              onChangeText={editProducto ? setSelectedItemName : setItemName}
              style={styles.formInput}
            />

            <Input
              label={t('home.service_itemdescription')}
              placeholder={t('home.service_itemdescription')}
              value={editProducto ? selecteditemDescription : itemDescription}
              onChangeText={editProducto ? setSelectedItemDescription : setItemDescription}
              style={styles.formInput}
              multiline
            />

            <Input
              label={t('home.service_itemrate')}
              placeholder={t('home.service_itemrate')}
              value={editProducto ? selecteditemStandardRate : itemStandardRate}
              onChangeText={editProducto ? setSelectedItemStandardRate : setitemStandardRate}
              style={styles.formInput}
              keyboardType="numeric"
            />

            <View style={styles.formButtons}>
              <Button
                style={styles.formButton}
                appearance="filled"
                status="primary"
                accessoryLeft={SaveIcon}
                onPress={editProducto ? editProduct : createProduct}
                disabled={loading}
              >
                {editProducto ? t('home.button_update') : t('home.button_save')}
              </Button>

              <Button
                style={styles.formButton}
                appearance="outline"
                status="basic"
                accessoryLeft={CloseIcon}
                onPress={resetForm}
                disabled={loading}
              >
                {t('home.button_cancel')}
              </Button>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    marginBottom: 16,
  },
  searchInput: {
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 16,
  },
  itemContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  itemDescription: {
    marginBottom: 4,
  },
  itemPrice: {
    color: '#3366ff',
    fontWeight: 'bold',
  },
  editIcon: {
    width: 24,
    height: 24,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  formContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  formTitle: {
    marginBottom: 24,
    textAlign: 'center',
  },
  formInput: {
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  formButtons: {
    flexDirection: 'row',
    marginTop: 16,
  },
  formButton: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 8,
  },
});
