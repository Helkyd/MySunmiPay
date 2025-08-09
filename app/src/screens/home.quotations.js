import React, { useContext, useEffect, useCallback, useState } from "react";
import { AuthContext } from "../provider/auth";
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView, TextInput, SafeAreaView } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { Spinner, Card, Button, Layout, Tab, TabView } from '@ui-kitten/components';
import { FlashList } from '@shopify/flash-list';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFrappe } from "../provider/backend";
import { format } from "date-fns";
import * as Linking from 'expo-linking';
import { BASE_URI } from "../data/constants";
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';

export const HomeQuotations = () => {
  const { t } = useTranslation();
  const { refreshAccessTokenAsync, userInfo } = useContext(AuthContext);
  const { db, call } = useFrappe();

  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [draftquotations, setDraftquotations] = useState([]);
  const [criarFactura, setCriarFactura] = useState(false);
  const [numerodeFacturas, setNumerodeFacturas] = useState(0);
  const [listaFacturas, setListaFacturas] = useState([]);
  const [visible, setVisible] = useState(false);
  const [customerOptions, setCustomerOptions] = useState([]);
  const [itemOptions, setItemOptions] = useState([]);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [itemOpen, setItemOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [wasButtonPressed, setwasButtonPressed] = useState(false);

  const [initialFormData, setInitialFormData] = useState(null);

  const [loadingStates, setLoadingStates] = useState({
    unpaid: true,
    draft: true,
    customers: true,
    items: true,
    count: true
  });

  const dateHoje = new Date();

  // Form data state
  const [formData, setFormData] = useState({
    name: '',
    doc_agt: '',
    customer_name: '',
    transaction_date: format(dateHoje, 'dd-MM-yyyy'),
    valid_till: format(new Date(dateHoje.setDate(dateHoje.getDate() + 30)), 'dd-MM-yyyy'),
    company: '',
    status: '',
    items: [{
      item_code: '',
      item_name: '',
      description: '',
      rate: 0,
      qty: '1',
      uom: '',
      total: 0
    }]
  });

  // Helper functions
  const formatarMoeda = new Intl.NumberFormat();

  const parseCustomDate = (dateString) => {
    if (!dateString) return new Date();
    if (dateString.includes('T')) return new Date(dateString);
    const [day, month, year] = dateString.split('-');
    return new Date(`${year}-${month}-${day}`);
  };

  const formatDate = (date) => {
    return format(date, 'dd-MM-yyyy');
  };

  const calculateDueDate = (postingDate) => {
    if (!postingDate) return '';
    const date = new Date(postingDate);
    date.setDate(date.getDate() + 30);
    return format(date, 'yyyy-MM-dd');
  };

  const unformatCurrency = (formattedValue) => {
    if (!formattedValue) return 0;
    const numericString = formattedValue.toString().replace(/[^0-9.]/g, '');
    return parseFloat(numericString) || 0;
  };

  const calculateGrandTotal = () => {
    return formData.items.reduce((sum, item) => {
      return sum + unformatCurrency(item.total) || 0;
    }, 0);
  };

  const isFormValid = () => {
    return (
      formData.customer_name &&
      formData.items.length > 0 &&
      formData.items.every(item => item.item_code)
    );
  };

  const onClose = () => {
    setVisible(false);
    setCriarFactura(false);
    setIsSubmitted(false);
  };

  const navigateDetails = () => {
    setCriarFactura(true);
    openModal();
  };

  const old_openModal = () => {
    const today = new Date();
    setFormData({
      name: '',
      doc_agt: '',
      customer_name: '',
      transaction_date: formatDate(today),
      valid_till: formatDate(new Date(today.setDate(today.getDate() + 30))),
      company: '',
      status: '',
      items: [{
        item_code: '',
        item_name: '',
        description: '',
        rate: 0,
        qty: '1',
        uom: '',
        total: 0
      }]
    });
    setVisible(true);
    setIsSubmitted(false);
  };

  const openModal = () => {
    const today = new Date();
    const newFormData = {
      name: '',
      doc_agt: '',
      customer_name: '',
      transaction_date: formatDate(today),
      valid_till: formatDate(new Date(today.setDate(today.getDate() + 30))),
      company: '',
      status: '',
      items: [{
        item_code: '',
        item_name: '',
        description: '',
        rate: 0,
        qty: '1',
        uom: '',
        total: 0
      }]
    };

    setFormData(newFormData);
    setInitialFormData(JSON.stringify(newFormData)); // Store initial state
    setVisible(true);
    setIsSubmitted(false);
  };

  const handleInputChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleItemChange = (index, field, value) => {
    setFormData(prev => {
      const updatedItems = [...prev.items];
      updatedItems[index] = {
        ...updatedItems[index],
        [field]: value,
      };

      if (field === 'qty' || field === 'rate') {
        const qty = parseFloat(field === 'qty' ? value : updatedItems[index].qty) || 0;
        const rate = parseFloat(field === 'rate' ? value : updatedItems[index].rate) || 0;
        updatedItems[index].total = (qty * rate).toFixed(2);
      }

      if (field === 'item_code') {
        const selectedItem = itemOptions.find(item => item.code === value);
        if (selectedItem) {
          updatedItems[index] = {
            ...updatedItems[index],
            item_name: selectedItem.name,
            description: selectedItem.description,
            rate: formatarMoeda.format(selectedItem.rate),
            uom: selectedItem.uom,
            total: formatarMoeda.format((parseFloat(updatedItems[index].qty || 0) * selectedItem.rate).toFixed(2))
          };
        }
      }

      return {
        ...prev,
        items: updatedItems
      };
    });
  };

  const addItem = () => {
    if (itemOptions.length === 0) return;
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          item_code: itemOptions[0].code,
          item_name: itemOptions[0].name,
          description: itemOptions[0].description,
          rate: itemOptions[0].rate,
          qty: '1',
          uom: itemOptions[0].uom,
          total: itemOptions[0].rate * 1
        }
      ]
    }));
  };

  const removeItem = (index) => {
    setFormData(prev => {
      const updatedItems = [...prev.items];
      updatedItems.splice(index, 1);
      return {
        ...prev,
        items: updatedItems
      };
    });
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const formattedDate = formatDate(selectedDate);
      const dueDate = formatDate(new Date(selectedDate.setDate(selectedDate.getDate() + 30)));

      setFormData(prev => ({
        ...prev,
        transaction_date: formattedDate,
        valid_till: dueDate
      }));
    }
  };

  // API calls
  const fetchquotationCount = useCallback(async () => {
    try {
      const count = await db.getCount('Quotation');
      setNumerodeFacturas(count);
      setLoadingStates(prev => ({...prev, count: false}));
    } catch (error) {
      handleError(error);
    }
  }, [db]);

  const fetchCustomerOptions = useCallback(async () => {
    try {
      const data = await db.getDocList('Customer', {
        fields: ["name", "customer_name"],
        filters: [['disabled','!=',1]],
        limit_start: 5,
        limit: 20,
        orderBy: {
          field: "customer_name",
          order: 'desc',
        },
      });
      setCustomerOptions(data);
      setLoadingStates(prev => ({...prev, customers: false}));
    } catch (error) {
      handleError(error);
    }
  }, [db]);

  const fetchItemOptions = useCallback(async () => {
    try {
      const data = await db.getDocList('Item', {
        fields: ["name","item_code","item_name","description","standard_rate","stock_uom"],
        filters: [['disabled','!=',1]],
        orderBy: {
          field: "name",
          order: 'desc',
        },
      });
      const formattedItems = data.map(item => ({
        code: item.item_code || item.name,
        name: item.item_name,
        description: item.description,
        rate: item.standard_rate,
        uom: item.stock_uom
      }));
      setItemOptions(formattedItems);
      setLoadingStates(prev => ({...prev, items: false}));
    } catch (error) {
      handleError(error);
    }
  }, [db]);

  const fetchUnpaidquotations = useCallback(async () => {
    try {
      setLoadingStates(prev => ({...prev, unpaid: true}));
      const result = await call.get('angola_erp.api.quotations.all_quotations', JSON.stringify({
        username: userInfo.email
      }));
      console.log('proformas');
      console.log(result.message);
      console.log(results.message);
      const filteredquotations = result.message.filter(quotation =>
        !['Ordered'].includes(quotation.status)
      );

      setListaFacturas(
        filteredquotations.sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date))
      );
    } catch (error) {
      console.error(error);
      Toast.show({type: "error", text1: 'Failed to load quotations'});
    } finally {
      setLoadingStates(prev => ({...prev, unpaid: false}));
    }
  }, [call, userInfo]);

  const createInvoice = async (item) => {
  //const createInvoice = useCallback(async () => {
    console.log('ITEM PARA CRIAR FCATURA');
    console.log(item);
    console.log(item.name);
    setwasButtonPressed(true);

      try {
        setLoadingStates(prev => ({...prev, unpaid: true}));
        //const result = await call.get('angola_erp.api.quotations.criar_Factura', JSON.stringify({
        //  quotationname: item.name
        //}));
        const result = await call.get('angola_erp.api.quotations.criar_Factura', {
          quotationname: item.name
        });

        console.log('resultado....');
        console.log(result.message);
        fetchDraftquotations();
        setwasButtonPressed(false);
        if (result && result.message) {
          Toast.show({
            type: "info",
            position: 'top',
            text1: t('home.quotation_si_created1') + result.message,
            text2: t('home.quotation_si_created2') + result.message,
            duration: 6000,
          })
        }

      } catch (error) {
        console.error(error);
        Toast.show({type: "error", text1: 'Failed to load quotations'});
      } finally {
        setLoadingStates(prev => ({...prev, unpaid: false}));
      }
    };

  const fetchDraftquotations = useCallback(async () => {
    try {
      setLoadingStates(prev => ({...prev, draft: true}));
      const data = await db.getDocList('Quotation', {
        fields: ["name","doc_agt","transaction_date","party_name","customer_name","grand_total","rounded_total","status","company"],
        filters: [
          ['transaction_date','<=', `${dateHoje.getFullYear()}-${dateHoje.getMonth()+1}-${dateHoje.getDate()}`],
          ['status','!=','Ordered'],
          ['naming_series','like','PP%']
        ],
        orderBy: {
          field: "transaction_date",
          order: 'desc',
        },
      });
      setDraftquotations(data);
    } catch (error) {
      handleError(error);
    } finally {
      setLoadingStates(prev => ({...prev, draft: false}));
    }
  }, [db]);

  const handleError = async (error) => {
    if (error.httpStatus === 403 || error.httpStatus === 401) {
      await refreshAccessTokenAsync();
    } else {
      console.error('Error:', error);
      Toast.show({
        type: "error",
        text1: 'Error',
        text2: 'Operation failed'
      });
    }
  };

  const generatePDF = async (quotationData) => {
    try {
      setIsLoading(true);
      let bancoIban = null;
      let lic = null;

      // Fetch quotation details
      const doc = await db.getDoc('Quotation', quotationData.name);
      quotationData = doc;

      // Fetch bank details
      const bankAccounts = await db.getDocList('Account', {
        fields: ['name','company','iban'],
        filters: [['account_number','=','43100000'],['company','=', quotationData.company]]
      });
      if (bankAccounts.length > 0) {
        bancoIban = bankAccounts[0].iban;
      }

      // Fetch license info
      const searchParams1 = { hook_str: 'agt_lic' };
      const result = await call.get('angola_erp.api.util.gethooks', searchParams1);
      if (result.message && result.message.length > 0) {
        lic = result.message[0];
      }

      // Generate HTML
      const html = `
      <!DOCTYPE html>
            <html>
              <head>
                <style>
                  body { font-family: Arial; margin: 20px; counter-reset: page; }
                  .header { text-align: center; margin-bottom: 20px; }
                  .quotation-info { margin-bottom: 20px; }
                  .customer-info { margin-bottom: 20px; }
                  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                  th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                  th { background-color: #f2f2f2; }
                  .total { text-align: right; font-weight: bold; }
                  footer {position: fixed; left: 0; bottom: 0; width: 100%; color: white; text-align: center;}
                  .page-number:after { content: "Page " counter(page); }
                   @page { margin-bottom: 100px; /* Space for footer */
                     @bottom-center {
                       content: "Page " counter(page) " of " counter(pages);
                       font-size: 12px;
                     }
                   }
                </style>
              </head>
              <body>
                <div class="header">
                  <h1>${ t('home.quotations_title') }</h1>
                    <div style="display: flex; justify-content: space-between;">
                      <p>Nº #${ quotationData.doc_agt || '' }</p>
                      <p>Original</p>
                    </div>
                </div>

                <table id="tb2" style="border: none; width: 100%;">
                  <tbody>
                    <tr>
                      <td style="border: 0px solid #ddd;">
                        <div class="quotation-info">
                          <p><strong> ${quotationData.company}</strong></p>
                          <p><${quotationData.company_address_display || ''}</p>
                          <p><strong>NIF:</strong> ${quotationData.company_tax_id || ''}</p>
                        </div>

                      </td>
                      <td style="border: 0px solid #ddd;">
                        <div class="customer-info">
                          <h3>Cliente:</h3>
                          <p>${quotationData.customer_name}</p>
                          ${ quotationData.address_display || ''}
                          ${ quotationData.contact_email || ''}
                          ${ quotationData.contact_mobile || ''}
                          ${ quotationData.tax_id || 'Consumidor Final'}
                        </div>

                      </td>
                    </tr>

                    <tr>
                      <td>
                        <div class="quotation-info">
                          <p><strong>Data:</strong> ${ format(quotationData.transaction_date,'dd-MM-yyyy') }</p>
                          <p><strong>Valido até:</strong> ${ format(quotationData.valid_till,'dd-MM-yyyy') }</p>
                        </div>

                      </td>
                    </tr>

                  </tbody>
                </table>

                <table id="tb1">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Descrição</th>
                      <th>Qty</th>
                      <th>Preço Unit.</th>
                      <th>Desconto</th>
                      <th>% IVA</th>
                      <th>Valor IVA</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${quotationData.items.map(item => `
                      <tr>
                        <td>${item.item_name}</td>
                        <td>${item.description}</td>
                        <td>${item.qty}</td>
                        <td>${ formatarMoeda.format(item.rate) }</td>
                        <td>0</td>
                        <td>0</td>
                        <td>0</td>
                        <td>${formatarMoeda.format(item.amount) }</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
                <div class="footer">
                  <div style="font-size:12px">
                    Os bens/serviços foram colocados a disposição do adquirente a ${dateHoje.getDate()}-${dateHoje.getMonth()+1}-${dateHoje.getFullYear()}<br>
                    Local de prestação de bens/serviços: Luanda
                  </div>
                  <div class="total" style="font-size:14px">
                    <p>Total sem Imposto: ${formatarMoeda.format(quotationData.items.reduce((sum, item) => sum + parseFloat(item.amount), 0).toFixed(2))}</p>
                    <p>Valor do Imposto: ${formatarMoeda.format(quotationData.items.reduce((sum, item) => sum + parseFloat(item.amount), 0).toFixed(2))}</p>
                    <p>Total do Desconto: ${formatarMoeda.format(quotationData.items.reduce((sum, item) => sum + parseFloat(item.amount), 0).toFixed(2))}</p>
                    <p>Total Geral: ${formatarMoeda.format(quotationData.items.reduce((sum, item) => sum + parseFloat(item.amount), 0).toFixed(2))}</p>
                  </div>

                  ${bancoIban ? `
                    <div class="dados_banco">
                      <p>Coordenadas Bancárias/IBAN: ${bancoIban}</p>
                    </div>
                  ` : ''}

                  ${quotationData ? `
                    <div class="text-center" style="font-size:14px">
                      <b>${quotationData.hash_erp?.slice(0,1) || ''} ${quotationData.hash_erp?.slice(10,11) || ''}
                      ${quotationData.hash_erp?.slice(20,21) || ''} ${quotationData.hash_erp?.slice(30,31) || ''} -
                      Processado por programa validado n. ${lic?.slice(1,3) || ''}/AGT/19 &nbsp;© AngolaERP</b>
                    </div>
                  ` : `
                    <div class="text-center" style="font-size:14px">
                      <b><small>Processado por Computador /&nbsp;© AngolaERP / |</small></b>
                    </div>
                  `}
                </div>

      			</div>
              </body>
            </html>
      `;
      // Generate PDF
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const pdfName = (quotationData.doc_agt ?
        quotationData.doc_agt.replace(' ','_').replace('/','-') :
        quotationData.name) + ".pdf";
      const newPath = `${FileSystem.documentDirectory}${pdfName}`;

      await FileSystem.moveAsync({ from: uri, to: newPath });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(newPath, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share quotation',
          UTI: 'com.adobe.pdf'
        });
      } else {
        alert('Sharing not available on this device');
      }

      return newPath;
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!isFormValid()) {
      alert('Please fill all required fields');
      return;
    }

    try {
      setIsLoading(true);

      // Format dates
      const formatToBackendDate = (dateString) => {
        if (!dateString) return '';
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
        const [day, month, year] = dateString.split('-');
        return `${year}-${month}-${day}`;
      };

      const postingDate = formatToBackendDate(formData.transaction_date);
      const dueDate = formatToBackendDate(formData.valid_till);

      // Prepare items
      const tabelaItens = formData.items.map(item => ({
        item_code: item.item_code || item.name,
        item_name: item.item_name,
        description: item.description,
        rate: item.rate,
        uom: item.stock_uom,
        qty: item.qty
      }));

      const isEdit = !!formData.name;
      const quotationData = {
        name: formData.name || '',
        doc_agt: formData.doc_agt || '',
        party_name: formData.customer_name,
        company: 'Para Testes',
        transaction_date: postingDate,
        valid_till: dueDate,
        update_stock: 0,
        items: tabelaItens,
        status: formData.status || 'Draft',
        submit_on_creation: formData.status === 'Draft' ? 1 : 0,
      };

      if (isEdit) {
        await db.updateDoc('Quotation', formData.name, quotationData);
        console.log('FORM CHANGED OU NAO ', hasFormChanged());
        console.log('submit on creation ',quotationData.submit_on_creation );
        if (quotationData.submit_on_creation === 1 && !hasFormChanged()) {
          await call.get('angola_erp.api.quotations.submeter_quotations', {
            quotation_name: formData.name
          });
        }
      } else {
        await db.createDoc('Quotation', quotationData);
      }


      setIsSubmitted(true);
      setInitialFormData(JSON.stringify(formData)); // Update initial data after submission
      setVisible(false);
      setCriarFactura(false);
      fetchDraftquotations();

    } catch (error) {
      console.error('Error submitting quotation:', error);
      Toast.show({
        type: "error",
        text1: 'Error',
        text2: 'Failed to submit quotation'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const old_editDraftquotation = async (quotation) => {
    try {
      const doc = await db.getDoc('Quotation', quotation.name);

      const items = doc.items.map(item => ({
        item_code: item.item_code,
        item_name: item.item_name,
        description: item.description,
        rate: item.rate,
        qty: item.qty.toString(),
        uom: item.uom,
        total: (item.rate * item.qty).toFixed(2)
      }));

      setFormData({
        name: doc.name,
        customer_name: doc.party_name,
        transaction_date: format(new Date(doc.transaction_date), "dd-MM-yyyy"),
        valid_till: format(new Date(doc.valid_till), "dd-MM-yyyy"),
        company: doc.company,
        status: doc.status,
        items: items
      });

      setCriarFactura(true);
      setVisible(true);
      setIsSubmitted(false);
    } catch (error) {
      handleError(error);
    }
  };

  const editDraftquotation = async (quotation) => {
    try {
      const doc = await db.getDoc('Quotation', quotation.name);

      const items = doc.items.map(item => ({
        item_code: item.item_code,
        item_name: item.item_name,
        description: item.description,
        rate: item.rate,
        qty: item.qty.toString(),
        uom: item.uom,
        total: (item.rate * item.qty).toFixed(2)
      }));

      const formData = {
        name: doc.name,
        customer_name: doc.party_name,
        transaction_date: format(new Date(doc.transaction_date), "dd-MM-yyyy"),
        valid_till: format(new Date(doc.valid_till), "dd-MM-yyyy"),
        company: doc.company,
        status: doc.status,
        items: items
      };

      setFormData(formData);
      setInitialFormData(JSON.stringify(formData)); // Store initial state
      setCriarFactura(true);
      setVisible(true);
      setIsSubmitted(false);
    } catch (error) {
      handleError(error);
    }
  };

  const hasFormChanged = () => {
    if (!initialFormData) return false;
    return JSON.stringify(formData) !== initialFormData;
  };

  const QuotationListTab = ({ data, isLoading, onRefresh, isDraft = false }) => (
    <Layout style={{ padding: 8 }}>
      <View style={{ flexDirection: 'row', marginBottom: 10 }}>
        <Button
          style={{ flex: 1, marginRight: 8 }}
          onPress={navigateDetails}
        >
          {t('home.create_quotations')}
        </Button>
        <Button
          style={{ flex: 1 }}
          onPress={onRefresh}
          appearance="outline"
          accessoryLeft={isLoading ? <Spinner size='small'/> : null}
        >
          {t('home.refresh')}
        </Button>
      </View>

      {isLoading && data.length === 0 ? (
        <Layout style={{flex: 1, justifyContent: 'center'}}>
          <Spinner size='large'/>
        </Layout>
      ) : (
        <QuotationList
          data={data}
          isDraft={isDraft} // Pass the isDraft prop directly
        />
      )}
    </Layout>
  );

  const QuotationList = ({ data, isDraft = false }) => (
    <View style={{ width: "100%", height: "100%" }}>
      <FlashList
        data={data}
        renderItem={({ item }) => (
          <Card key={item.name} style={{ width: "100%", marginBottom: 20 }}>
            <Text style={{ fontSize: 10 }}>
              {item.transaction_date ? format(item.transaction_date, "dd-MM-yyyy") : ''}
              {item.transaction_date && (item.doc_agt || item.name || item.party_name) ? ' - ' : ''}
              {item.doc_agt || item.name ? (
                <Text style={{ fontWeight: 'bold' }}>{item.doc_agt || item.name}</Text>
              ) : null}
              {(item.doc_agt || item.name) && item.party_name ? ' - ' : ''}
              <Text style={{ fontWeight: 'bold' }}>{item.party_name}</Text>
            </Text>

            <Text category="h6" style={{
              fontSize: 12,
              color: item.status === 'Draft' ? 'orange' : 'red'
            }}>
              {item.grand_total ? formatarMoeda.format(item.grand_total) : ''}
            </Text>
            <Text>EMPRE {item.company}</Text>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
               <Button
                 onPress={() => {
                   if (item.name) {
                     Linking.openURL(`${BASE_URI}/app/sales-quotation/${item.name}`)
                   }
                 }}
                 appearance="ghost"
                 style={{ flex: 1, marginRight: 4 }}
               >
                 {t('home.button_open')}
               </Button>
               {isDraft && item.status !== 'Draft' && (
                 <>
                   <Button
                     onPress={() => generatePDF(item)}
                     appearance="ghost"
                     status="success"
                     style={{ flex: 1, marginHorizontal: 4 }}
                   >
                     {t('home.button_pdf')}
                   </Button>
                 </>
               )}

               {/* Show PDF/Print only for non-draft quotations */}
               {!isDraft && item.status !== 'Draft' && (
                 <>
                   <Button
                     onPress={() => generatePDF(item)}
                     appearance="ghost"
                     status="success"
                     style={{ flex: 1, marginHorizontal: 4 }}
                   >
                     {t('home.button_pdf')}
                   </Button>
                   <Button
                     onPress={() => Toast.show({
                       type: "error",
                       position: 'top',
                       text1: 'Feature coming soon',
                       text2: 'Print functionality will be added soon'
                     })}
                     appearance="ghost"
                     status="success"
                     style={{ flex: 1, marginHorizontal: 4 }}
                   >
                     {t('home.button_print')}
                   </Button>
                 </>
               )}

               {/* Show Edit button only for draft quotations */}
               {isDraft  && item.status == 'Draft' && (
                 <Button
                   onPress={() => editDraftquotation(item)}
                   appearance="ghost"
                   status="warning"
                   style={{ flex: 1, marginLeft: 4 }}
                 >
                   {t('home.button_edit')}
                 </Button>
               )}
               {isDraft  && item.status != 'Draft' && (
                 <Button
                   onPress={() => createInvoice(item)}
                   appearance="ghost"
                   status="warning"
                   size="small"
                   style={{ flex: 1, margin: 2 }}
                   disabled={wasButtonPressed}
                 >
                   {t('home.button_createinvoice')}
                 </Button>
               )}

             </View>
          </Card>
        )}
        estimatedItemSize={100}
        keyExtractor={(item) => item.name}
      />
    </View>
  );

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        await Promise.all([
          //fetchUnpaidquotations(),
          fetchDraftquotations(),
          fetchCustomerOptions(),
          fetchItemOptions(),
          fetchquotationCount()
        ]);
      } catch (error) {
        handleError(error);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [ fetchDraftquotations, fetchCustomerOptions, fetchItemOptions, fetchquotationCount]);

  if (isLoading) {
    return (
      <Layout style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Spinner size='giant' />
        <Text style={{ marginTop: 10 }}>{t('home.loading_quotation_data')}</Text>
      </Layout>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Layout style={{ flex: 1, padding: 16 }}>
        {!criarFactura && (
          <View style={{ flex: 1 }}>
            <Card status="success">
              <Text>{t('home.total_quotations', { count: numerodeFacturas })}</Text>
            </Card>

            <Layout style={{ marginVertical: 5 }} />
            <TabView selectedIndex={selectedIndex} onSelect={setSelectedIndex}>
              <Tab title={t('home.quotations_draft')}>
                <QuotationListTab
                  data={draftquotations}
                  isLoading={loadingStates.draft}
                  onRefresh={fetchDraftquotations}
                  isDraft={true} // Explicitly set to true for draft quotations
                />
              </Tab>
            </TabView>
          </View>
        )}

        <Modal visible={visible} animationType="slide" transparent={false}>
          <ScrollView style={styles.container}>
            <Text style={styles.header}>{t('home.quotations_title')}</Text>

            {formData.name && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('home.quotation_intnumber')}</Text>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  editable={false}
                />
              </View>
            )}

            {formData.doc_agt && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('home.quotation_number')}</Text>
                <TextInput
                  style={styles.input}
                  value={formData.doc_agt}
                  editable={false}
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('home.quotation_customername')}</Text>
              <DropDownPicker
                open={customerOpen}
                value={formData.customer_name}
                items={customerOptions.map(c => ({
                  label: c.customer_name || c.name,
                  value: c.name
                }))}
                setOpen={setCustomerOpen}
                setValue={(value) => handleInputChange('customer_name', value())}
                style={styles.picker}
                placeholder={t('home.quotation_selectcustomer')}
                dropDownContainerStyle={{
                  backgroundColor: '#fff',
                  borderColor: '#ddd'
                }}
              />
              {!formData.customer_name && (
                <Text style={{color: 'red', fontSize: 12}}>{t('home.quotation_customernameisrequired')}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('home.quotation_postingdate')}</Text>
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                style={styles.dateInput}
              >
                <Text style={styles.dateText}>
                  {formData.transaction_date || 'Select a date'}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={parseCustomDate(formData.transaction_date)}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                />
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('home.quotation_duedate')}</Text>
              <View style={styles.dateInput}>
                <Text style={styles.dateText}>
                  {formData.valid_till || 'Will calculate after posting date is selected'}
                </Text>
              </View>
            </View>

            <Text style={[styles.header, { marginTop: 2 }]}>{t('home.quotation_items')}</Text>

            {formData.items.map((item, index) => (
              <View key={index} style={styles.itemContainer}>
                <Text style={styles.itemHeader}>Item #{index + 1}</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('home.quotation_itemcode')} *</Text>
                  <DropDownPicker
                    open={itemOpen}
                    value={item.item_code}
                    items={itemOptions.map(i => ({
                      label: `${i.code} - ${i.name}`,
                      value: i.code
                    }))}
                    setOpen={setItemOpen}
                    setValue={(value) => handleItemChange(index, 'item_code', value())}
                    style={styles.picker}
                    placeholder="Select an item"
                    dropDownContainerStyle={{
                      backgroundColor: '#fff',
                      borderColor: '#ddd'
                    }}
                  />
                  {!item.item_code && (
                    <Text style={{color: 'red', fontSize: 12}}>{t('home.quotation_itemcoderequired')}</Text>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('home.quotation_itemname')}</Text>
                  <TextInput
                    style={styles.input}
                    value={item.item_name}
                    editable={false}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('home.quotation_itemdescription')}</Text>
                  <TextInput
                    style={styles.input}
                    value={item.description}
                    editable={false}
                  />
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.label}>{t('home.quotation_itemprice')}</Text>
                    <TextInput
                      style={styles.input}
                      value={item.rate.toString()}
                      onChangeText={(text) => handleItemChange(index, 'rate', text)}
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={styles.label}>{t('home.quotation_itemquantity')}</Text>
                    <TextInput
                      style={styles.input}
                      value={item.qty}
                      onChangeText={(text) => handleItemChange(index, 'qty', text)}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('home.quotation_itemtotal')}</Text>
                  <TextInput
                    style={styles.input}
                    value={item.total.toString()}
                    editable={false}
                  />
                </View>

                {index > 0 && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeItem(index)}
                  >
                    <Text style={styles.removeButtonText}>{t('home.quotation_itemremove')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}

            <View style={styles.grandTotalContainer}>
              <Text style={styles.grandTotalLabel}>{t('home.quotation_itemgrandtotal')}:</Text>
              <Text style={styles.grandTotalValue}>
                AOA {formatarMoeda.format(calculateGrandTotal())}
              </Text>
            </View>

            <TouchableOpacity style={styles.addButton} onPress={addItem}>
              <Text style={styles.addButtonText}>+ {t('home.quotation_additem')}</Text>
            </TouchableOpacity>

            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.buttonText}>{t('home.button_cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, !isFormValid() && {backgroundColor: '#cccccc'}]}
                onPress={handleSubmit}
                disabled={!isFormValid()}
              >
                <Text style={styles.buttonText}>
                  {isSubmitted ? t('home.button_submitted') :
                   (hasFormChanged() ? t('home.button_save') : t('home.button_submit'))}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Modal>
      </Layout>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  header: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    marginBottom: 5,
    fontSize: 14,
    color: '#555',
  },
  input: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  picker: {
    backgroundColor: '#fff',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  itemContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 5,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#eee',
  },
  itemHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#444',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 20,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  removeButton: {
    backgroundColor: '#f44336',
    padding: 8,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  cancelButton: {
    backgroundColor: '#f44336',
    padding: 12,
    borderRadius: 5,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 5,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  grandTotalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  dateInput: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dateText: {
    color: '#000',
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidthInput: {
    flex: 1,
  },
  leftInput: {
    marginRight: 8,
  },
  rightInput: {
    marginLeft: 8,
  },
  printButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 5,
    flex: 1,
    marginHorizontal: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
});
