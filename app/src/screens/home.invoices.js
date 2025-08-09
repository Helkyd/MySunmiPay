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

//import ThermalPrinterModule from 'react-native-thermal-printer';
//import { NativeModules } from 'react-native';
//const ThermalPrinterModule = NativeModules.ThermalPrinterModule;
import RNHTMLtoPDF from 'react-native-html-to-pdf';
//const RNHTMLtoPDF = NativeModules.RNHTMLtoPDF;

//import SunmiPrinter from '@heasy/react-native-sunmi-printer';
//import SunmiV2Printer from 'react-native-sunmi-v2-printer';
//import {SunmiInnerPrinter} from 'react-native-sunmi-inner-printer'
//import * as SunmiPrinterLibrary from '@mitsuharu/react-native-sunmi-printer-library'
//import { SPrinter, Constants } from '@makgabri/react-native-sunmi-printer';
//import {BluetoothManager,BluetoothEscposPrinter,BluetoothTscPrinter} from 'react-native-bluetooth-escpos-printer';
//import {BluetoothEscposPrinter} from 'react-native-bluetooth-escpos-printer';

//import { BleManager } from 'react-native-ble-plx';
/*
import {
  USBPrinter,
  NetPrinter,
  BLEPrinter,
} from "react-native-thermal-receipt-printer";
*/

export const HomeFacturas = () => {
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
  const [paidFacturas, setPaidFacturas] = useState([]);
  const [visible, setVisible] = useState(false);
  const [customerOptions, setCustomerOptions] = useState([]);
  const [itemOptions, setItemOptions] = useState([]);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [itemOpen, setItemOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [isFormModified, setIsFormModified] = useState(false);

  const [loadingStates, setLoadingStates] = useState({
    unpaid: true,
    paid: true,
    draft: true,
    customers: true,
    items: true,
    count: true
  });

  const dateHoje = new Date();


  // Add these with your other state declarations
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentFormData, setPaymentFormData] = useState({
    posting_date: format(dateHoje, 'dd-MM-yyyy'),
    mode_of_payment: '',
    payment_reference: '',
    paid_amount: 0
  });

  // Add mode of payment options
  /*
  const [modeOfPaymentOptions, setModeOfPaymentOptions] = useState([
    {label: 'Bank Transfer', value: 'Bank Transfer'},
    {label: 'Cash', value: 'Cash'},
    {label: 'Cheque', value: 'Cheque'},
    {label: 'Mobile Payment', value: 'Mobile Payment'},
  ]);
  */
  const fetchPaymentModes = useCallback(async () => {
    try {
      const result = await call.post('angola_erp.api.receipts.all_mode_of_payments', {
        username: userInfo.email
      });

      if (result.message) {
        //console.log('Modos de pagamentos');
        //console.log(result.message);
        const paymentOptions = result.message.map(mode => ({
          label: mode.mode_of_payment,
          value: mode.mode_of_payment
        }));
        setModeOfPaymentOptions(paymentOptions);
      }
    } catch (error) {
      console.error('Error fetching payment modes:', error);
      Toast.show({
        type: "error",
        text1: 'Error',
        text2: 'Failed to load payment methods'
      });
    }
  }, [call, userInfo.email]);


  const [modeOfPaymentOpen, setModeOfPaymentOpen] = useState(false);

  // Replace the hardcoded options with an empty array initially
  const [modeOfPaymentOptions, setModeOfPaymentOptions] = useState([]);

  const create_receipt = (invoice) => {
    setSelectedInvoice(invoice);
    setPaymentFormData({
      posting_date: format(new Date(), 'dd-MM-yyyy'),
      mode_of_payment: '',
      payment_reference: '',
      paid_amount: invoice.outstanding_amount || invoice.rounded_total || 0
    });
    setShowPaymentForm(true);
  };

  const submitPayment = async () => {
    try {
      setIsLoading(true);

      // Format dates for backend
      const formatToBackendDate = (dateString) => {
        if (!dateString) return '';
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
        const [day, month, year] = dateString.split('-');
        return `${year}-${month}-${day}`;
      };

      const postingDate = formatToBackendDate(paymentFormData.posting_date);
      /*
      // Prepare payment data
      const paymentData = {
        invoice: selectedInvoice.name,
        company: selectedInvoice.company,
        customer: selectedInvoice.customer,
        posting_date: postingDate,
        mode_of_payment: paymentFormData.mode_of_payment,
        paid_amount: paymentFormData.paid_amount,
        reference_no: paymentFormData.payment_reference
      };
      */
      // Call backend API to create payment
      const result = await call.post('angola_erp.api.receipts.criar_pagamento', {
        factura: selectedInvoice.name,
        mode_payment: paymentFormData.mode_of_payment,
        pay_reference: paymentFormData.payment_reference,
        total_paid: paymentFormData.paid_amount,
        username: userInfo.email
      });
      console.log('result PAYMENT ');
      console.log(result.message);
      /*
      if (result.message) {
        Toast.show({
          type: "success",
          text1: 'Payment Successful',
          text2: 'Payment has been recorded'
        });

        // Refresh invoices list
        await fetchUnpaidInvoices();
        setShowPaymentForm(false);
      }
      */
      // Refresh invoices list
      await fetchUnpaidInvoices();
      setShowPaymentForm(false);

    } catch (error) {
      console.error('Error submitting payment:', error);
      Toast.show({
        type: "error",
        text1: 'Payment Failed',
        text2: error.message || 'Could not process payment'
      });
    } finally {
      setIsLoading(false);
    }
  };

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
    setIsFormModified(false); // Add this line
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
    setIsFormModified(false); // Add this line
  };

  const handleInputChange = (name, value) => {
    setIsFormModified(true);
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleItemChange = (index, field, value) => {
    setIsFormModified(true);
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
      const count = await db.getCount('Sales Invoice');
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


  const fetchPaidInvoices = useCallback(async () => {
    try {
      setLoadingStates(prev => ({...prev, paid: true}));
      const result = await call.get('angola_erp.api.invoices.all_invoices', JSON.stringify({
        username: userInfo.email,
        statusfactura: ['Paid', 'Return', 'Cancelled', 'Credit Note Issued']
      }));
      console.log('Facturas PAGAS...');
      //console.log(result.message);
      console.log(result.message.length);

      const filteredInvoices = result.message.filter(invoice =>
        ['Paid'].includes(invoice.status)
      );
      console.log('Facturas FILTRADAS PAGAS...');
      //console.log(filteredInvoices);
      console.log(filteredInvoices.length);

      setPaidFacturas(
        filteredInvoices.sort((a, b) => new Date(b.posting_date) - new Date(a.posting_date))
      );
    } catch (error) {
      console.error(error);
      Toast.show({type: "error", text1: 'Failed to load invoices'});
    } finally {
      setLoadingStates(prev => ({...prev, paid: false}));
    }
  }, [call, userInfo]);

  const fetchUnpaidInvoices = useCallback(async () => {
    try {
      setLoadingStates(prev => ({...prev, unpaid: true}));
      const result = await call.get('angola_erp.api.invoices.all_invoices', JSON.stringify({
        username: userInfo.email,
        statusfactura: ['Unpaid','Overdue','Partly Paid']
      }));

      const filteredInvoices = result.message.filter(invoice =>
        !['Draft', 'Paid', 'Return', 'Cancelled', 'Credit Note Issued'].includes(invoice.status)
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
      const data = await db.getDocList('Sales Invoice', {
        fields: ["name","doc_agt","posting_date","customer","outstanding_amount","rounded_total","status","company"],
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
    console.log('GeneratePDF Normal....');
    try {
      setIsLoading(true);
      let bancoIban = null;
      let lic = null;

      // Fetch invoice details
      const doc = await db.getDoc('Sales Invoice', invoiceData.name);
      invoiceData = doc;

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
                  <h1>${ t('home.invoices_title') }</h1>
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
                          <p><${invoiceData.company_address_display || ''}</p>
                          <p><strong>NIF:</strong> ${invoiceData.company_tax_id || ''}</p>
                        </div>

                      </td>
                      <td style="border: 0px solid #ddd;">
                        <div class="customer-info">
                          <h3>Cliente:</h3>
                          <p>${invoiceData.customer_name}</p>
                          ${ invoiceData.address_display || ''}
                          ${ invoiceData.contact_email || ''}
                          ${ invoiceData.contact_mobile || ''}
                          ${ invoiceData.tax_id || 'Consumidor Final'}
                        </div>

                      </td>
                    </tr>

                    <tr>
                      <td>
                        <div class="invoice-info">
                          <p><strong>Data:</strong> ${ format(invoiceData.posting_date,'dd-MM-yyyy') }</p>
                          <p><strong>Due Date:</strong> ${ format(invoiceData.due_date,'dd-MM-yyyy') }</p>
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
                    ${invoiceData.items.map(item => `
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
                    <p>Total sem Imposto: ${formatarMoeda.format(invoiceData.items.reduce((sum, item) => sum + parseFloat(item.amount), 0))}</p>
                    <p>Valor do Imposto: 0</p>
                    <p>Total do Desconto: 0</p>
                    <p>Total Geral: ${formatarMoeda.format(invoiceData.items.reduce((sum, item) => sum + parseFloat(item.amount), 0).toFixed(2))}</p>
                  </div>

                  ${bancoIban ? `
                    <div class="dados_banco">
                      <p>Coordenadas Bancárias/IBAN: ${bancoIban}</p>
                    </div>
                  ` : ''}

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
          UTI: '.pdf' //'com.adobe.pdf'
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

  const getPairedPrinters = async () => {
    try {
      const printers = await ThermalPrinterModule.getBluetoothDeviceList();
      console.log("Available Printers:", printers);
      return printers;
    } catch (error) {
      console.error("Failed to fetch printers:", error);
      return [];
    }
  };

  const connectAndPrint = async (printerMacAddress) => {
    console.log('trying connect and print');
    try {
      await ThermalPrinterModule.connectPrinter(printerMacAddress);
      console.log("Connected to printer!");

      // Now you can print
      await ThermalPrinterModule.printBluetooth({
        payload: [{ command: "TEXT", text: "Test Print\n", align: "CENTER" }],
      });
    } catch (error) {
      console.error("Printing failed:", error);
    }
  };


  const printInvoice1 = ()  => {
    console.log('scan printers...');
    const bleManager = new BleManager();
    bleManager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.error('Error scanning for devices:', error);
        return;
      }
      console.log('device name ', device);
      if (device.name === 'YourDeviceName') {
        bleManager.stopDeviceScan();
        connectToDevice(device.id)
          .then(connectedDevice => {
            // Perform operations with the connected device
          })
          .catch(error => {
            // Handle connection or operation errors
          });
      }
    });
  }

  const printInvoice = async (invoiceData)  => {
    console.log('scan printers...');
    const bleManager = new BleManager();
    bleManager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.error('Error scanning for devices:', error);
        return;
      }
      console.log('device name ', device);
      if (device.name === 'YourDeviceName') {
        bleManager.stopDeviceScan();
        connectToDevice(device.id)
          .then(connectedDevice => {
            // Perform operations with the connected device
          })
          .catch(error => {
            // Handle connection or operation errors
          });
      }
    });

    console.log('printInvoice.......');
    const [printers, setPrinters] = useState([]);
    const [currentPrinter, setCurrentPrinter] = useState();
    await BLEPrinter.init()
      .then(async () => {
        await BLEPrinter.getDeviceList()
          .then((result) => {
            console.log('Printers', result);
            if (result) setPrinters(result);
          })
          .catch((err) => console.log(err));
      })
      .catch((err) => console.log('Bluetooth Error', err));

    //generatePDF1();
    // 1. Get paired printers
    console.log('Get paired printers');
    // const printers = await ThermalPrinterModule.getBluetoothDeviceList();

     if (printers.length === 0) {
       Alert.alert("No printers found. Please pair a printer first.");
       return;
     }

     // 2. Connect to the first printer
     console.log('Connect to the first printer');
     await ThermalPrinterModule.connectPrinter(printers[0].deviceName);

    let bancoIban = null;
    let lic = null;

    // Fetch invoice details
    const doc = await db.getDoc('Sales Invoice', invoiceData.name);
    invoiceData = doc;

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

    try {
      // Generate the ESC/POS commands for printing
      const commands = [];

      // Add header
      commands.push({
        command: 'TEXT',
        text: 'INVOICE\n',
        align: 'CENTER',
        width: 2,
        height: 2
      });

      commands.push({
        command: 'TEXT',
        text: `No. #${invoiceData.doc_agt || ''}\n`,
        align: 'CENTER'
      });

      commands.push({
        command: 'TEXT',
        text: 'ORIGINAL\n\n',
        align: 'CENTER'
      });

      // Add company info
      commands.push({
        command: 'TEXT',
        text: `${invoiceData.company}\n`,
        align: 'LEFT'
      });

      commands.push({
        command: 'TEXT',
        text: `${invoiceData.company_address_display || ''}\n`,
        align: 'LEFT'
      });

      commands.push({
        command: 'TEXT',
        text: `NIF: ${invoiceData.company_tax_id || ''}\n\n`,
        align: 'LEFT'
      });

      // Add customer info
      commands.push({
        command: 'TEXT',
        text: 'CLIENTE:\n',
        align: 'LEFT',
        width: 1,
        height: 1
      });

      commands.push({
        command: 'TEXT',
        text: `${invoiceData.customer_name}\n`,
        align: 'LEFT'
      });

      // Add more customer details as needed...

      // Add items table header
      commands.push({
        command: 'TEXT',
        text: 'ITEM            QTY   PRICE   TOTAL\n',
        align: 'LEFT'
      });

      // Add items
      invoiceData.items.forEach(item => {
        commands.push({
          command: 'TEXT',
          text: `${item.item_name.substring(0, 15)} ${item.qty} ${formatarMoeda.format(item.rate)} ${formatarMoeda.format(item.amount)}\n`,
          align: 'LEFT'
        });
      });

      // Add totals
      const total = invoiceData.items.reduce((sum, item) => sum + parseFloat(item.amount), 0);

      commands.push({
        command: 'TEXT',
        text: `\nTOTAL: ${formatarMoeda.format(total)}\n\n`,
        align: 'RIGHT'
      });

      // Add footer
      commands.push({
        command: 'TEXT',
        text: `Date: ${new Date().toLocaleDateString()}\n`,
        align: 'CENTER'
      });

      commands.push({
        command: 'TEXT',
        text: '© AngolaERP\n',
        align: 'CENTER'
      });

      // Print the commands
      await ThermalPrinterModule.printBluetooth({
        payload: commands,
        printerNbrCharactersPerLine: 42, // Adjust based on your printer
        mmFeedPaper: 20 // Adjust paper feed
      });

    } catch (error) {
      console.error('Printing error:', error);
    }
  };


    const printInvoiceT = async (invoiceData)  => {

      let bancoIban = null;
      let lic = null;

      // Fetch invoice details
      const doc = await db.getDoc('Sales Invoice', invoiceData.name);
      invoiceData = doc;

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

      try {
        // Generate the ESC/POS commands for printing
        const commands = [];

        // Add header
        commands.push({
          command: 'TEXT',
          text: 'INVOICE\n',
          align: 'CENTER',
          width: 2,
          height: 2
        });

        commands.push({
          command: 'TEXT',
          text: `No. #${invoiceData.doc_agt || ''}\n`,
          align: 'CENTER'
        });

        commands.push({
          command: 'TEXT',
          text: 'ORIGINAL\n\n',
          align: 'CENTER'
        });

        // Add company info
        commands.push({
          command: 'TEXT',
          text: `${invoiceData.company}\n`,
          align: 'LEFT'
        });

        commands.push({
          command: 'TEXT',
          text: `${invoiceData.company_address_display || ''}\n`,
          align: 'LEFT'
        });

        commands.push({
          command: 'TEXT',
          text: `NIF: ${invoiceData.company_tax_id || ''}\n\n`,
          align: 'LEFT'
        });

        // Add customer info
        commands.push({
          command: 'TEXT',
          text: 'CLIENTE:\n',
          align: 'LEFT',
          width: 1,
          height: 1
        });

        commands.push({
          command: 'TEXT',
          text: `${invoiceData.customer_name}\n`,
          align: 'LEFT'
        });

        // Add more customer details as needed...

        // Add items table header
        commands.push({
          command: 'TEXT',
          text: 'ITEM            QTY   PRICE   TOTAL\n',
          align: 'LEFT'
        });

        // Add items
        invoiceData.items.forEach(item => {
          commands.push({
            command: 'TEXT',
            text: `${item.item_name.substring(0, 15)} ${item.qty} ${formatarMoeda.format(item.rate)} ${formatarMoeda.format(item.amount)}\n`,
            align: 'LEFT'
          });
        });

        // Add totals
        const total = invoiceData.items.reduce((sum, item) => sum + parseFloat(item.amount), 0);

        commands.push({
          command: 'TEXT',
          text: `\nTOTAL: ${formatarMoeda.format(total)}\n\n`,
          align: 'RIGHT'
        });

        // Add footer
        commands.push({
          command: 'TEXT',
          text: `Date: ${new Date().toLocaleDateString()}\n`,
          align: 'CENTER'
        });

        commands.push({
          command: 'TEXT',
          text: '© AngolaERP\n',
          align: 'CENTER'
        });

        // Print the commands
        await ThermalPrinterModule.printBluetooth({
          payload: commands,
          printerNbrCharactersPerLine: 42, // Adjust based on your printer
          mmFeedPaper: 20 // Adjust paper feed
        });

      } catch (error) {
        console.error('Printing error:', error);
      }
    };


      const generateHtmlInvoice = async (invoiceData) => {
        try {
          setIsLoading(true);
          let bancoIban = null;
          let lic = null;

          // Fetch invoice details
          const doc = await db.getDoc('Sales Invoice', invoiceData.name);
          invoiceData = doc;

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
                      <h1>${ t('home.invoices_title') }</h1>
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
                              <p><${invoiceData.company_address_display || ''}</p>
                              <p><strong>NIF:</strong> ${invoiceData.company_tax_id || ''}</p>
                            </div>

                          </td>
                          <td style="border: 0px solid #ddd;">
                            <div class="customer-info">
                              <h3>Cliente:</h3>
                              <p>${invoiceData.customer_name}</p>
                              ${ invoiceData.address_display || ''}
                              ${ invoiceData.contact_email || ''}
                              ${ invoiceData.contact_mobile || ''}
                              ${ invoiceData.tax_id || 'Consumidor Final'}
                            </div>

                          </td>
                        </tr>

                        <tr>
                          <td>
                            <div class="invoice-info">
                              <p><strong>Data:</strong> ${ format(invoiceData.posting_date,'dd-MM-yyyy') }</p>
                              <p><strong>Due Date:</strong> ${ format(invoiceData.due_date,'dd-MM-yyyy') }</p>
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
                        ${invoiceData.items.map(item => `
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
                        <p>Total sem Imposto: ${formatarMoeda.format(invoiceData.items.reduce((sum, item) => sum + parseFloat(item.amount), 0))}</p>
                        <p>Valor do Imposto: 0</p>
                        <p>Total do Desconto: 0</p>
                        <p>Total Geral: ${formatarMoeda.format(invoiceData.items.reduce((sum, item) => sum + parseFloat(item.amount), 0).toFixed(2))}</p>
                      </div>

                      ${bancoIban ? `
                        <div class="dados_banco">
                          <p>Coordenadas Bancárias/IBAN: ${bancoIban}</p>
                        </div>
                      ` : ''}

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
          return html;
        } catch (error) {
          console.error('Error generating html:', error);
          alert('Failed to generate html. Please try again.');
          throw error;
        } finally {
          setIsLoading(false);
        }
      };

    // Using react-native-html-to-pdf
    const printPdf = async (invoiceData) => {
      console.log('PRINTPDF .....');
      const html = '<h1>Test</h1>'; //await generateHtmlInvoice(invoiceData); // Your HTML generation function
      const options = {
        html: '<h1>Test PDF</h1><p>This is a demo</p>',
        fileName: 'invoice',
        directory: 'Documents',
        base64: false,
      };

      console.log('optiossssss');
      console.log(options);

      const file = await RNHTMLtoPDF.convert(options);
      console.log('FEZ FILE.....');
      await ThermalPrinterModule.printImage(file.filePath);
    };

    // Using react-native-html-to-pdf
    const printSUNMI = async (invoiceData) => {
      console.log('call SunmPrinter');
      SunmiPrinter.printerText('Hello World\n');

      console.log('teste connectAndPrint');
      connectAndPrint("02-3A-21-82-CE-6E")
      try {
          await SunmiPrinterLibrary.prepare()
      } catch (error) {
          console.warn("This device is not supported.")
          console.error(error);
      }

    };

    const printSUNMI1 = async (invoiceData) => {
      console.log('NAO FUNCIONA SunmiV2Printer');
      //await SPrinter.connect();
      //await SPrinter.testPrint();
      //await SPrinter.disconnect();
      /*
      try {
          await SunmiV2Printer.printerText('Hello World\n');
      } catch (error) {
          console.warn("This device is not supported.")
          console.error(error);
      }
      */

    };

    const generatePDF1 = async () => {
      console.log('Trying generatePDF1');
      try {
        const options = {
          html: '<h1>Test PDF</h1><p>This is a demo</p>',
          fileName: 'test_invoice',
          directory: 'Documents',
          // Optional: Specify base CSS for better styling
          base64: false, // Set true if you need base64 string
        };

        console.log('Generating PDF...');
        const file = await RNHTMLtoPDF.convert(options);

        if (!file) {
          throw new Error('PDF generation returned null');
        }

        console.log('PDF saved at:', file.filePath);
        return file;
      } catch (error) {
        console.error('PDF generation failed:', error);
        throw error;
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
        await db.updateDoc('Sales Invoice', formData.name, invoiceData);
        console.log('isFormModified ', isFormModified);
        if (invoiceData.submit_on_creation === 1 && !isFormModified) {
          await call.get('angola_erp.api.invoices.submeter_invoices', {
            invoice_name: formData.name
          });
          setIsSubmitted(true);
        }
      } else {
        await db.createDoc('Sales Invoice', invoiceData);
        setIsSubmitted(false);
      }


      setVisible(false);
      setCriarFactura(false);
      setIsFormModified(false);
      fetchDraftInvoices();
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
      const doc = await db.getDoc('Sales Invoice', invoice.name);

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

  const InvoiceListTab = ({ data, isLoading, onRefresh, isDraft = false }) => (
    <Layout style={{ padding: 8 }}>
      <View style={{ flexDirection: 'row', marginBottom: 10 }}>
        <Button
          style={{ flex: 1, marginRight: 8 }}
          onPress={navigateDetails}
        >
          {t('home.create_invoices')}
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
        <InvoiceList
          data={data}
          isDraft={isDraft} // Pass the isDraft prop directly
        />
      )}
    </Layout>
  );

  const InvoiceList = ({ data, isDraft = false }) => (
    <View style={{ width: "100%", height: "100%" }}>
      <FlashList
        data={data}
        renderItem={({ item }) => (
          <Card key={item.name} style={{ width: "100%", marginBottom: 20 }}>
            <Text style={{ fontSize: 10 }}>
              {item.posting_date ? format(item.posting_date, "dd-MM-yyyy") : ''}
              {item.posting_date && (item.doc_agt || item.name || item.customer) ? ' - ' : ''}
              {item.doc_agt || item.name ? (
                <Text style={{ fontWeight: 'bold' }}>{item.doc_agt || item.name}</Text>
              ) : null}
              {(item.doc_agt || item.name) && item.customer ? ' - ' : ''}
              <Text style={{ fontWeight: 'bold' }}>{item.customer}</Text>
            </Text>

            <Text category="h6" style={{
              fontSize: 12,
              color: item.status === 'Draft' ? 'orange' : 'red'
            }}>
              {item.outstanding_amount ? formatarMoeda.format(item.outstanding_amount) : ''}
            </Text>
            <Text>EMPRE {item.company}</Text>
            <Text>Status: {item.status}</Text>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
               <Button
                 onPress={() => {
                   if (item.name) {
                     Linking.openURL(`${BASE_URI}/app/sales-invoice/${item.name}`)
                   }
                 }}
                 appearance="ghost"
                 style={{ flex: 1, marginHorizontal: 2 }}
               >
                 {t('home.button_open')}
               </Button>

               {!isDraft && (item.status == 'Unpaid' ||  item.status == 'Partly Paid') && (
                 <>
                   <Button
                     onPress={() => create_receipt(item)}
                     appearance="ghost"
                     status="success"
                     size="small"
                     style={{ flex: 1, marginHorizontal: 4 }}
                   >
                     {t('home.button_createreceipt')}
                   </Button>
                 </>

               )}
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
                         text1: 'Feature coming soon',
                         text2: 'Print functionality will be added soon'
                       })}
                       appearance="ghost"
                       status="success"
                       style={{ flex: 1, marginHorizontal: 4 }}
                     >
                       {t('home.button_print')}
                     </Button>

                   */}
                   {/* PRINT BUTTONS to test BLUETOOTH printers
                     <TouchableOpacity style={styles.printButton} onPress={() => printInvoice(item) }>
                            <Text style={styles.printButtonText}>Print Invoice</Text>
                          </TouchableOpacity>
                      <TouchableOpacity style={styles.printButton} onPress={() => printInvoice1() }>
                             <Text style={styles.printButtonText}>Print Invoice1</Text>
                           </TouchableOpacity>

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
          fetchDraftInvoices(),
          fetchCustomerOptions(),
          fetchItemOptions(),
          fetchInvoiceCount(),
          fetchPaymentModes(), // Add this line
          fetchPaidInvoices()
        ]);
      } catch (error) {
        handleError(error);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [fetchUnpaidInvoices, fetchDraftInvoices, fetchCustomerOptions, fetchItemOptions, fetchInvoiceCount, fetchPaymentModes, fetchPaidInvoices]);

  if (isLoading) {
    return (
      <Layout style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Spinner size='giant' />
        <Text style={{ marginTop: 10 }}>{t('home.loading_invoice_data')}</Text>
      </Layout>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Layout style={{ flex: 1, padding: 16 }}>
        {!criarFactura && (
          <View style={{ flex: 1 }}>
            <Text category="h6">{t('home.title_invoices')}</Text>
            <Layout style={{ marginVertical: 10 }} />
            <Card status="success">
              <Text>{t('home.total_invoices', { count: numerodeFacturas })}</Text>
            </Card>

            <Layout style={{ marginVertical: 5 }} />
            <TabView selectedIndex={selectedIndex} onSelect={setSelectedIndex}>
              <Tab title={t('home.invoices_paid')}>
                <InvoiceListTab
                  data={paidFacturas}
                  isLoading={loadingStates.paid}
                  onRefresh={fetchPaidInvoices}
                  isDraft={false} // Explicitly set to false for unpaid invoices
                />
              </Tab>

              <Tab title={t('home.invoices_topay')}>
                <InvoiceListTab
                  data={listaFacturas}
                  isLoading={loadingStates.unpaid}
                  onRefresh={fetchUnpaidInvoices}
                  isDraft={false} // Explicitly set to false for unpaid invoices
                />
              </Tab>
              <Tab title={t('home.invoices_draft')}>
                <InvoiceListTab
                  data={draftInvoices}
                  isLoading={loadingStates.draft}
                  onRefresh={fetchDraftInvoices}
                  isDraft={true} // Explicitly set to true for draft invoices
                />
              </Tab>
            </TabView>
          </View>
        )}

        <Modal visible={visible} animationType="slide" transparent={false}>
          <ScrollView style={styles.container}>
            <Text style={styles.header}>{t('home.invoices_title')}</Text>

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
                   (isFormModified ? t('home.button_save') : t('home.button_submit'))}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Modal>
        {/* Payment Form Modal */}
        <Modal visible={showPaymentForm} animationType="slide" transparent={false}>
          <ScrollView style={styles.container}>
            <Text style={styles.header}>{t('home.create_payment_receipt')}</Text>

            {selectedInvoice && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('home.invoice_number')}</Text>
                <TextInput
                  style={styles.input}
                  value={selectedInvoice.doc_agt || selectedInvoice.name}
                  editable={false}
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('home.invoice_postingdate')}</Text>
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                style={styles.dateInput}
              >
                <Text style={styles.dateText}>
                  {paymentFormData.posting_date || 'Select a date'}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={parseCustomDate(paymentFormData.posting_date)}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) {
                      setPaymentFormData(prev => ({
                        ...prev,
                        posting_date: formatDate(selectedDate)
                      }));
                    }
                  }}
                />
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('home.receipt_modeofpayment')} *</Text>
              <DropDownPicker
                open={modeOfPaymentOpen}
                value={paymentFormData.mode_of_payment}
                items={modeOfPaymentOptions}
                setOpen={setModeOfPaymentOpen}
                setValue={(value) => setPaymentFormData(prev => ({
                  ...prev,
                  mode_of_payment: value()
                }))}
                style={styles.picker}
                placeholder={t('home.select_modeofpayment')}
                dropDownContainerStyle={{
                  backgroundColor: '#fff',
                  borderColor: '#ddd'
                }}
              />
              {!paymentFormData.mode_of_payment && (
                <Text style={{color: 'red', fontSize: 12}}>{t('home.payment_methodrequired')}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('home.payment_reference')}</Text>
              <TextInput
                style={styles.input}
                value={paymentFormData.payment_reference}
                onChangeText={(text) => setPaymentFormData(prev => ({
                  ...prev,
                  payment_reference: text
                }))}
                placeholder={t('home.reference_numberdetails')}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('home.amount_paid')} *</Text>
              <TextInput
                style={styles.input}
                value={paymentFormData.paid_amount.toString()}
                onChangeText={(text) => setPaymentFormData(prev => ({
                  ...prev,
                  paid_amount: parseFloat(text) || 0
                }))}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowPaymentForm(false)}
              >
                <Text style={styles.buttonText}>{t('home.button_cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, !paymentFormData.mode_of_payment && {backgroundColor: '#cccccc'}]}
                onPress={submitPayment}
                disabled={!paymentFormData.mode_of_payment}
              >
                <Text style={styles.buttonText}>{t('home.button_submitpayment')}</Text>
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
  printButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },

});
