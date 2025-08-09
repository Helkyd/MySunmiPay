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

  export const HomeReceipts = () => {
    const { t } = useTranslation();
    const { refreshAccessTokenAsync, userInfo } = useContext(AuthContext);
    const { db, call } = useFrappe();

    // State management
    const [isLoading, setIsLoading] = useState(true);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [draftInvoices, setDraftInvoices] = useState([]);
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
      posting_date: format(dateHoje, 'dd-MM-yyyy'),
      posting_time: dateHoje.toTimeString().substring(0, 5),
      due_date: format(new Date(dateHoje.setDate(dateHoje.getDate() + 30)), 'dd-MM-yyyy'),
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

    const openModal = () => {
      const today = new Date();
      setFormData({
        name: '',
        doc_agt: '',
        customer_name: '',
        posting_date: formatDate(today),
        posting_time: today.toTimeString().substring(0, 5),
        due_date: formatDate(new Date(today.setDate(today.getDate() + 30))),
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
          posting_date: formattedDate,
          due_date: dueDate
        }));
      }
    };

    // API calls
    const fetchInvoiceCount = useCallback(async () => {
      try {
        const count = await db.getCount('Payment Entry');
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

    const fetchUnpaidInvoices = useCallback(async () => {
      try {
        setLoadingStates(prev => ({...prev, unpaid: true}));
        const result = await call.get('angola_erp.api.receipts.all_receipts', JSON.stringify({
          username: userInfo.email
        }));

        const filteredInvoices = result.message.filter(invoice =>
          !['Draft'].includes(invoice.status)
        );

        setListaFacturas(
          filteredInvoices.sort((a, b) => new Date(b.posting_date) - new Date(a.posting_date))
        );
      } catch (error) {
        console.error(error);
        Toast.show({type: "error", text1: 'Failed to load invoices'});
      } finally {
        setLoadingStates(prev => ({...prev, unpaid: false}));
      }
    }, [call, userInfo]);

    const fetchDraftInvoices = useCallback(async () => {
      try {
        setLoadingStates(prev => ({...prev, draft: true}));
        const data = await db.getDocList('Payment Entry', {
          fields: ["name","doc_agt","posting_date","customer","paid_amount","rounded_total","status","company"],
          filters: [
            ['posting_date','<=', `${dateHoje.getFullYear()}-${dateHoje.getMonth()+1}-${dateHoje.getDate()}`],
            ['status','=','Draft'],
            ['naming_series','like','FT%']
          ],
          orderBy: {
            field: "posting_date",
            order: 'desc',
          },
        });
        setDraftInvoices(data);
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

    const generatePDF = async (invoiceData) => {
      try {
        setIsLoading(true);
        let bancoIban = null;
        let lic = null;

        // Fetch invoice details
        const doc = await db.getDoc('Payment Entry', invoiceData.name);
        invoiceData = doc;
        const dadosempresa = await db.getDoc('Company', invoiceData.company);
        const dadoscliente = await db.getDoc('Customer', invoiceData.party_name);

        //const enderecoempresa = await db.getDoc('Dynamic Link', filters={'link_doctype':'Company','link_name':invoiceData.company,'parenttype':'Address'})
        const enderecoempresa = await call.get('angola_erp.api.receipts.return_enderecoempresa', {
          empresa: invoiceData.company
        });

        const enderecocliente = await call.get('angola_erp.api.receipts.return_enderecocliente', {
          cliente: invoiceData.party_name
        });

        console.log('dados empresa');
        console.log(dadosempresa);
        console.log('Endereço');
        console.log(enderecoempresa);
        console.log(enderecoempresa.message.address_line1);
        console.log('Endereço cliente');
        console.log(enderecocliente);
        console.log(enderecocliente.message);

        // Fetch bank details
        const bankAccounts = await db.getDocList('Account', {
          fields: ['name','company','iban'],
          filters: [['account_number','=','43100000'],['company','=', invoiceData.company]]
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

        // First fetch all reference documents
        const referencesWithDocs = await Promise.all(
          invoiceData.references.map(async (item) => {
            try {
              if (item.reference_doctype === 'Sales Invoice') {
                const doc = await db.getDoc('Sales Invoice', item.reference_name);
                return {
                  ...item,
                  doc_agt: doc.doc_agt || ''
                };
              }
              return item;
            } catch (error) {
              console.error(`Error fetching reference ${item.reference_name}:`, error);
              return item; // Return original item if there's an error
            }
          })
        );

        // Generate HTML
        const html = `
        <!DOCTYPE html>
              <html>
                <head>
                  <style>
                    body { font-family: Arial; margin: 20px; counter-reset: page; }
                    .header { text-align: center; margin-bottom: 20px; }
                    .invoice-info { margin-bottom: 20px; }
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
                    <h1>${ t('home.receipts_title') }</h1>
                      <div style="display: flex; justify-content: space-between;">
                        <p>Nº #${ invoiceData.doc_agt || '' }</p>
                        <p>Original</p>
                      </div>
                  </div>

                  <table id="tb2" style="border: none; width: 100%;">
                    <tbody>
                      <tr>
                        <td style="border: 0px solid #ddd;">
                          <div class="invoice-info">
                            <p><strong> ${invoiceData.company}</strong></p>
                            <p>${enderecoempresa?.message?.address_line1 ? enderecoempresa.message.address_line1 : ''} </p>
                            ${enderecoempresa?.message?.email_id ? enderecoempresa.message.email_id : ''}
                            ${enderecoempresa?.message?.phone ? enderecoempresa.message.phone : ''}

                            <p><strong>NIF:</strong> ${dadosempresa.tax_id || ''}</p>
                          </div>

                        </td>
                        <td style="border: 0px solid #ddd;">
                          <div class="customer-info">
                            <h3>Cliente:</h3>
                            <p>${invoiceData.party_name}</p>

                            ${enderecocliente?.message?.address_line1 ? enderecocliente.message.address_line1 : ''}
                            ${enderecocliente?.message?.email ? enderecocliente.message.email : ''}
                            ${enderecocliente?.message?.phonenumber ? enderecocliente.message.phonenumber : ''}
                            ${enderecocliente?.message?.tax_id ? enderecocliente.message.tax_id : 'Consumidor Final'}
                          </div>

                        </td>
                      </tr>

                      <tr>
                        <td>
                          <div class="invoice-info">
                            <p><strong>Data:</strong> ${ format(invoiceData.posting_date,'dd-MM-yyyy') }</p>

                          </div>

                        </td>
                      </tr>

                    </tbody>
                  </table>

                  <table id="tb1">
                    <thead>
                      <tr>
                        <th>Tipo de Documento</th>
                        <th>Numero do Documento</th>
                        <th>Por Pagar</th>
                        <th>Valor Pago</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${referencesWithDocs.map(item => `
                        <tr>
                          <td>${item.reference_doctype == "Sales Invoice" ? "Factura de Venda" : item.reference_doctype}</td>
                          <td>${item.doc_agt || ''}</td>
                          <td>${item.outstanding_amount ? formatarMoeda.format(item.outstanding_amount) : ''}</td>
                          <td>${item.allocated_amount ? formatarMoeda.format(item.allocated_amount) : ''}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                  <div class="footer">

                    ${invoiceData ? `
                      <div class="text-center" style="font-size:14px">
                        <b>${invoiceData.hash_erp?.slice(0,1) || ''} ${invoiceData.hash_erp?.slice(10,11) || ''}
                        ${invoiceData.hash_erp?.slice(20,21) || ''} ${invoiceData.hash_erp?.slice(30,31) || ''} -
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
        const pdfName = (invoiceData.doc_agt ?
          invoiceData.doc_agt.replace(' ','_').replace('/','-') :
          invoiceData.name) + ".pdf";
        const newPath = `${FileSystem.documentDirectory}${pdfName}`;

        await FileSystem.moveAsync({ from: uri, to: newPath });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(newPath, {
            mimeType: 'application/pdf',
            dialogTitle: 'Share Invoice',
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

        const postingDate = formatToBackendDate(formData.posting_date);
        const dueDate = formatToBackendDate(formData.due_date);

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
        const invoiceData = {
          name: formData.name || '',
          doc_agt: formData.doc_agt || '',
          customer: formData.customer_name,
          company: 'Para Testes',
          posting_date: postingDate,
          posting_time: formData.posting_time,
          due_date: dueDate,
          update_stock: 0,
          items: tabelaItens,
          status: formData.status || 'Draft',
          submit_on_creation: formData.status === 'Draft' ? 1 : 0,
        };

        if (isEdit) {
          await db.updateDoc('Payment Entry', formData.name, invoiceData);

          if (invoiceData.submit_on_creation === 1) {
            await call.get('angola_erp.api.receipts.submeter_invoices', {
              invoice_name: formData.name
            });
          }
        } else {
          await db.createDoc('Payment Entry', invoiceData);
        }

        setIsSubmitted(true);
        setVisible(false);
        setCriarFactura(false);
        //fetchDraftInvoices();
      } catch (error) {
        console.error('Error submitting invoice:', error);
        Toast.show({
          type: "error",
          text1: 'Error',
          text2: 'Failed to submit invoice'
        });
      } finally {
        setIsLoading(false);
      }
    };

    const editDraftInvoice = async (invoice) => {
      try {
        const doc = await db.getDoc('Payment Entry', invoice.name);

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
          customer_name: doc.customer,
          posting_date: format(new Date(doc.posting_date), "dd-MM-yyyy"),
          posting_time: doc.posting_time,
          due_date: format(new Date(doc.due_date), "dd-MM-yyyy"),
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

    const ReceiptListTab = ({ data, isLoading, onRefresh, isDraft = false }) => (
      <Layout style={{ padding: 8 }}>
        <View style={{ flexDirection: 'row', marginBottom: 10 }}>
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
          <ReceiptList
            data={data}
            isDraft={isDraft} // Pass the isDraft prop directly
          />
        )}
      </Layout>
    );

    const ReceiptList = ({ data, isDraft = false }) => (
      <View style={{ width: "100%", height: "100%" }}>
        <FlashList
          data={data}
          renderItem={({ item }) => (
            <Card key={item.name} style={{ width: "100%", marginBottom: 20 }}>
              <Text style={{ fontSize: 10 }}>
                {item.posting_date ? format(item.posting_date, "dd-MM-yyyy") : ''}
                {item.posting_date && (item.doc_agt || item.name || item.party_name) ? ' - ' : ''}
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
                {item.paid_amount ? formatarMoeda.format(item.paid_amount) : ''}
              </Text>
              <Text>EMPRE {item.company}</Text>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                 <Button
                   onPress={() => {
                     if (item.name) {
                       Linking.openURL(`${BASE_URI}/app/sales-invoice/${item.name}`)
                     }
                   }}
                   appearance="ghost"
                   style={{ flex: 1, marginRight: 4 }}
                 >
                   {t('home.button_open')}
                 </Button>

                 {/* Show PDF/Print only for non-draft invoices */}
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
                     {/*
                       <Button
                         onPress={() => Toast.show({
                           type: "error",
                           position: 'top',
                           text1: t('home.feature_comingsoon'),
                           text2: t('home.feature_comingsoon_print')
                         })}
                         appearance="ghost"
                         status="success"
                         style={{ flex: 1, marginHorizontal: 4 }}
                       >
                         {t('home.button_print')}
                       </Button>
                       */}

                   </>
                 )}

                 {/* Show Edit button only for draft invoices */}
                 {isDraft && (
                   <Button
                     onPress={() => editDraftInvoice(item)}
                     appearance="ghost"
                     status="warning"
                     style={{ flex: 1, marginLeft: 4 }}
                   >
                     {t('home.button_edit')}
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
            fetchUnpaidInvoices(),
            //fetchDraftInvoices(),
            fetchCustomerOptions(),
            fetchItemOptions(),
            fetchInvoiceCount()
          ]);
        } catch (error) {
          handleError(error);
        } finally {
          setIsLoading(false);
        }
      };

      loadInitialData();
    }, [fetchUnpaidInvoices, fetchCustomerOptions, fetchItemOptions, fetchInvoiceCount]);

    if (isLoading) {
      return (
        <Layout style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Spinner size='giant' />
          <Text style={{ marginTop: 10 }}>{t('home.loading_receipt_data')}</Text>
        </Layout>
      );
    }

    return (
      <SafeAreaView style={{ flex: 1 }}>
        <Layout style={{ flex: 1, padding: 16 }}>
          {!criarFactura && (
            <View style={{ flex: 1 }}>
              <Card status="success">
                <Text>{t('home.total_receipts', { count: numerodeFacturas })}</Text>
              </Card>

              <Layout style={{ marginVertical: 5 }} />
              <TabView selectedIndex={selectedIndex} onSelect={setSelectedIndex}>
                <Tab title={t('home.receipts_topay')}>
                  <ReceiptListTab
                    data={listaFacturas}
                    isLoading={loadingStates.unpaid}
                    onRefresh={fetchUnpaidInvoices}
                    isDraft={false} // Explicitly set to false for unpaid invoices
                  />
                </Tab>
              </TabView>
            </View>
          )}

          <Modal visible={visible} animationType="slide" transparent={false}>
            <ScrollView style={styles.container}>
              <Text style={styles.header}>{t('home.receipts_title')}</Text>

              {formData.name && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('home.invoice_intnumber')}</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.name}
                    editable={false}
                  />
                </View>
              )}

              {formData.doc_agt && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('home.invoice_number')}</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.doc_agt}
                    editable={false}
                  />
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('home.invoice_customername')}</Text>
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
                  placeholder={t('home.invoice_selectcustomer')}
                  dropDownContainerStyle={{
                    backgroundColor: '#fff',
                    borderColor: '#ddd'
                  }}
                />
                {!formData.customer_name && (
                  <Text style={{color: 'red', fontSize: 12}}>{t('home.invoice_customernameisrequired')}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('home.invoice_postingdate')}</Text>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(true)}
                  style={styles.dateInput}
                >
                  <Text style={styles.dateText}>
                    {formData.posting_date || 'Select a date'}
                  </Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={parseCustomDate(formData.posting_date)}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                  />
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('home.invoice_postingtime')}</Text>
                <TextInput
                  style={styles.input}
                  value={formData.posting_time}
                  onChangeText={(text) => handleInputChange('posting_time', text)}
                  placeholder="HH:MM"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('home.invoice_duedate')}</Text>
                <View style={styles.dateInput}>
                  <Text style={styles.dateText}>
                    {formData.due_date || 'Will calculate after posting date is selected'}
                  </Text>
                </View>
              </View>

              <Text style={[styles.header, { marginTop: 2 }]}>{t('home.invoice_items')}</Text>

              {formData.items.map((item, index) => (
                <View key={index} style={styles.itemContainer}>
                  <Text style={styles.itemHeader}>Item #{index + 1}</Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>{t('home.invoice_itemcode')} *</Text>
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
                      <Text style={{color: 'red', fontSize: 12}}>{t('home.invoice_itemcoderequired')}</Text>
                    )}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>{t('home.invoice_itemname')}</Text>
                    <TextInput
                      style={styles.input}
                      value={item.item_name}
                      editable={false}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>{t('home.invoice_itemdescription')}</Text>
                    <TextInput
                      style={styles.input}
                      value={item.description}
                      editable={false}
                    />
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                      <Text style={styles.label}>{t('home.invoice_itemprice')}</Text>
                      <TextInput
                        style={styles.input}
                        value={item.rate.toString()}
                        onChangeText={(text) => handleItemChange(index, 'rate', text)}
                        keyboardType="numeric"
                      />
                    </View>

                    <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                      <Text style={styles.label}>{t('home.invoice_itemquantity')}</Text>
                      <TextInput
                        style={styles.input}
                        value={item.qty}
                        onChangeText={(text) => handleItemChange(index, 'qty', text)}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>{t('home.invoice_itemtotal')}</Text>
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
                      <Text style={styles.removeButtonText}>{t('home.invoice_itemremove')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              <View style={styles.grandTotalContainer}>
                <Text style={styles.grandTotalLabel}>{t('home.invoice_itemgrandtotal')}:</Text>
                <Text style={styles.grandTotalValue}>
                  AOA {formatarMoeda.format(calculateGrandTotal())}
                </Text>
              </View>

              <TouchableOpacity style={styles.addButton} onPress={addItem}>
                <Text style={styles.addButtonText}>+ {t('home.invoice_additem')}</Text>
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
                     (formData.status === "Draft" ? t('home.button_submit') : t('home.button_save'))}
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
