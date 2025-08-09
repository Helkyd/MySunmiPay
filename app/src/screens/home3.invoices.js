import React, { useContext, useEffect } from "react";
import { AuthContext } from "../provider/auth";

import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView, TextInput, SafeAreaView } from 'react-native';

//import { Picker } from '@react-native-picker/picker';
//import { Picker } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { Spinner, Card, Button, Layout, Tab, TabView } from '@ui-kitten/components';

import { FlashList } from '@shopify/flash-list';

//import DatePicker from 'react-native-date-picker';
import DateTimePicker from '@react-native-community/datetimepicker';


import { useFrappe } from "../provider/backend";
import styled from "styled-components/native";
import { FrappeApp } from "frappe-js-sdk";


import { format } from "date-fns";

import * as Linking from 'expo-linking';
import { BASE_URI } from "../data/constants";

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { htmlToPdf } from 'react-native-html-to-pdf';
import * as FileSystem from 'expo-file-system';

import { useTranslation } from 'react-i18next';
import { i18n } from '../utils/i18n';

import Toast from 'react-native-toast-message';

const UnpaidFacturas = ({ item }) => {
  const formatarMoeda = new Intl.NumberFormat();
  return (
    <Card key={item.name} style={{ width: "100%", marginBottom: 20 }}>
    <Text style={{ fontSize: 10 }}>
      {item.posting_date ? format(item.posting_date,"dd-MM-yyyy") : ''}
      {item.posting_date && (item.doc_agt || item.customer) ? ' - ' : ''}
      {item.doc_agt || ''}
      {item.doc_agt && item.customer ? ' - ' : ''}
      {item.customer || ''}
    </Text>

      <Text category="h6" style={{ fontSize: 12, color: 'red' }}>{formatarMoeda.format(item.outstanding_amount)}</Text>

      <Button onPress={() => {
        console.log('pressed');
        Linking.openURL(`${BASE_URI}/app/sales-invoice/${item.name}`)
      }} appearance="ghost"> Abrir</Button>
      <Layout style={{ marginVertical: 2 }}></Layout>
    </Card>
  );
};



export const HomeFacturas = ()  => {

  const { t, i18n } = useTranslation();

  //const { accessToken, refreshAccessTokenAsync } = useContext(AuthContext);
  const { refreshAccessTokenAsync, isAuthenticated, logout, userInfo, accessToken, fetchUserInfo } = useContext(AuthContext);

  const [isLoading, setIsLoading] = React.useState(true);

  // Then, add state for the selected tab index
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [draftInvoices, setDraftInvoices] = React.useState([]);

  const [criarFactura, setCriarFactura] = React.useState(false);
  const [numerodeFacturas, setNumerodeFacturas] = React.useState(0);
  const [listaFacturas, setListaFacturas] = React.useState([]);
  const [visible, setVisible] = React.useState(false);
  const [onSubmit, setonSubmit] = React.useState(false);

  const [customerOptions, setcustomerOptions] = React.useState([]);
  const [itemOptions, setitemOptions] = React.useState([]);

  const [customerOpen, setCustomerOpen] = React.useState(false);
  const [itemOpen, setItemOpen] = React.useState(false);

  const [isSubmitted, setIsSubmitted] = React.useState(false);

  const { db, call, client } = useFrappe();
  const dateHoje = new Date();

  //const [datePickerOpen, setDatePickerOpen] = useState(false);
  //const [date, setDate] = useState(new Date());
  //const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = React.useState(false);

  const [loadingStates, setLoadingStates] = React.useState({
    unpaid: true,
    draft: true,
    customers: true,
    items: true,
    count: true
  });

  const generatePDF = async (invoiceData) => {
    console.log('Empresa ', invoiceData.company);
    try {
      setIsLoading(true);

      await db.getDoc('Sales Invoice', invoiceData.name)
          .then((doc) => {
            console.log('TEM NOVOS DADOS');
            console.log(doc);

            console.log('ANTES DO PDDDDDDDDFFFFFF');
            invoiceData = doc;
            console.log(invoiceData);

          })
          .catch(async (error) => {
            if (error.httpStatus === 403 || error.httpStatus === 401) {
              await refreshAccessTokenAsync();
            } else {
              console.error('Error fetching invoice:', error);
              alert('Failed to load invoice for editing');
            }
          });

      console.log('Generating PDF for:');
      console.log(invoiceData);
      console.log('NAMEEEEEE:', invoiceData.name);

      //GET Bancos
      bancoIban = null;
      db.getDocList('Account',{
        fields: ['name','company','iban'],
        filters: [['account_number','=','43100000'],['company','=', invoiceData.company]]
      })
      .then((docs) => {
        console.log('tem docs do BANCO');
        console.log(docs);
        console.log(docs[0].name);
        console.log(docs[0].iban);
        console.log(docs[0].iban == null);
        bancoIban = docs[0].iban;
      })
      .catch(async (error) => {
        if (error.httpStatus === 403 || error.httpStatus === 401) {
          await refreshAccessTokenAsync();
        } else {
          console.error('Error fetching BANCOS:', error);
          alert('Failed to load BANCOS');
        }
      });

      lic = null;
      searchParams1 = {
        hook_str: 'agt_lic'
      }
      await call
      .get('angola_erp.api.util.gethooks', searchParams1)
      .then((result) => {
        console.log('**** HOOKKKK CALL ..... ')
        console.log(result)
        console.log(result.message[0])
        lic = result.message[0];

      })
      .catch((error) => {
        console.error(error)
      });


      // Ensure items exist or provide empty array
      const items_factura = invoiceData.items || [];

      const paginabreak = false;
      const contalinhas = [0];
      const incidenciaiva = [0];
      const iva = [0];
      const motivoisencao = [0];
      const motivoisencao1 = [0];
      const motivoisencao2 = [0];
      const temtransp = [0];

      const incidenciaivaii = [0];
      const ivaii = [0];
      address = null;

      const linkfactura = "https://qrcode.tec-it.com/API/QRCode?data=" + `BASE_URI/app/sales-invoice/invoiceData.name`
      //frappe.utils.get_url_to_form(doc.doctype,doc.name).replace('://','%3a%2f%2f').replace('/','%2f').replace('#','%23') %}

      //const links = db.get_all('Dynamic Link', filters={'link_doctype': 'Company', 'link_name':invoiceData.company, 'parenttype': 'Address'}, fields=['parent']);
      //const address = db.get_doc("Address", links[0].parent);
      console.log('invoiceData.company ', invoiceData.company);
      console.log('items_factura');
      console.log(items_factura);

      const formatarMoeda = new Intl.NumberFormat();
      // Generate HTML with proper fallbacks
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
                      <th>Description</th>
                      <th>Qty</th>
                      <th>Unit Price</th>
                      <th>Discount</th>
                      <th>VAT Percentage</th>
                      <th>Tax Amount</th>
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
                    <p>Total sem Imposto: ${invoiceData.items.reduce((sum, item) => sum + parseFloat(formatarMoeda.format(item.amount)), 0).toFixed(2)}</p>
                    <p>Valor do Imposto: ${invoiceData.items.reduce((sum, item) => sum + parseFloat(formatarMoeda.format(item.amount)), 0).toFixed(2)}</p>
                    <p>Total do Desconto: ${invoiceData.items.reduce((sum, item) => sum + parseFloat(formatarMoeda.format(item.amount)), 0).toFixed(2)}</p>
                    <p>Grand Total: ${invoiceData.items.reduce((sum, item) => sum + parseFloat(formatarMoeda.format(item.amount)), 0).toFixed(2)}</p>
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
      /*
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false
      });

      console.log('PDF generated at:', uri);

      // Extract filename from URI (or define your own)
       const pdfName = invoiceData.doc_agt + ".pdf" || invoiceData.name + ".pdf"; //  "MyCustomFile.pdf"; // Set your desired filename here

      // Share the PDF
      if (!(await Sharing.isAvailableAsync())) {
        alert('Sharing is not available on this device');
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Invoice',
        UTI: 'com.adobe.pdf'
      });

      // On Android/iOS, the file is saved in a cache directory.
      // To move it permanently, use `expo-file-system`:
      const newPath = `${FileSystem.documentDirectory}${pdfName}`;
      return await FileSystem.moveAsync({ from: uri, to: newPath });

      //return uri;
      */

      // 1. Generate PDF (temporary file)
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false
      });

      console.log('Temporary PDF generated at:', uri);

      // 2. Define the new filename (customize as needed)
      //const pdfName = (invoiceData.doc_agt ? invoiceData.doc_agt.toString().replace(' ','_').replace('/','-') + ".pdf" || "Invoice.pdf");
      const pdfName = (invoiceData.doc_agt ? invoiceData.doc_agt.replace(' ','_').replace('/','-') : invoiceData.name) + ".pdf";

      // 3. Move/Rename the file to a permanent location
      const newPath = `${FileSystem.documentDirectory}${pdfName}`;

      // Check if the source file exists
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        throw new Error('PDF file not found!');
      }

      // Ensure the destination directory exists
      await FileSystem.makeDirectoryAsync(FileSystem.documentDirectory, { intermediates: true });

      // Move the file (renames it)
      await FileSystem.moveAsync({
        from: uri,
        to: newPath,
      });

      console.log('PDF renamed and saved to:', newPath);

      // 4. Share the renamed file
      if (!(await Sharing.isAvailableAsync())) {
        alert('Sharing not available on this device');
        return;
      }

      await Sharing.shareAsync(newPath, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Invoice',
        UTI: 'com.adobe.pdf',
      });

      setIsLoading(false);
      return newPath;

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
      throw error;
    }
  };

  // Helper function to parse date strings in dd-MM-yyyy format
  const parseCustomDate = (dateString) => {
    if (!dateString) return new Date();

    // If already in ISO format (from initial state), parse directly
    if (dateString.includes('T')) {
      return new Date(dateString);
    }

    // Parse dd-MM-yyyy format
    const [day, month, year] = dateString.split('-');
    return new Date(`${year}-${month}-${day}`);
  };

  // Format date to dd-MM-yyyy
  const formatDate = (date) => {
    return format(date, 'dd-MM-yyyy');
  };

  const ol_handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      //handleInputChange('posting_date', format(selectedDate, 'dd-MM-yyyy'));
      //handleInputChange('due_date', formatDate(calculateDueDate(selectedDate)));
      //handleInputChange('posting_date', formatDate(selectedDate));
      //handlePostingDateChange('posting_date',selectedDate)
      handleInputChange('posting_date', formatDate(selectedDate));
      handleInputChange('due_date', formatDate(posting_date));

    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const formattedDate = formatDate(selectedDate);
      const dueDate = formatDate(new Date(selectedDate.setDate(selectedDate.getDate() + 30)));

      // Update both fields in one state update
      setFormData(prev => ({
        ...prev,
        posting_date: formattedDate,
        due_date: dueDate
      }));
    }
  };

  const handlePostingDateChange = (selectedDate) => {
    console.log('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')
    console.log(selectedDate.value)
    console.log(formatDate(selectedDate))
    console.log(calculateDueDate(selectedDate))

    const formattedDate = format(selectedDate, 'dd-MM-yyyy');
    setFormData({
      ...formData,
      //posting_date: formattedDate,
      due_date: calculateDueDate(formattedDate)
    });
  };

  // Form data state
  const [formData, setFormData] = React.useState({
    name: '',
    doc_agt: '',
    customer_name: '',
    posting_date: formatDate(new Date()), //new Date().toISOString().split('T')[0],
    posting_time: new Date().toTimeString().substring(0, 5),
    due_date: formatDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), // Initialize with +30 days
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

  // Customer options
  /*
  const customerOptions = [
    'John Doe',
    'Jane Smith',
    'Robert Johnson',
    'Emily Davis',
    'Michael Wilson'
  ];
  */

  // Item options
  /*
  const itemOptions = [
    { code: 'ITM001', name: 'Laptop', description: '15" Business Laptop', price: 899.99, uom: 'EA' },
    { code: 'ITM002', name: 'Mouse', description: 'Wireless Mouse', price: 24.99, uom: 'EA' },
    { code: 'ITM003', name: 'Keyboard', description: 'Mechanical Keyboard', price: 59.99, uom: 'EA' },
    { code: 'ITM004', name: 'Monitor', description: '27" 4K Monitor', price: 299.99, uom: 'EA' },
    { code: 'ITM005', name: 'Headphones', description: 'Noise Cancelling', price: 199.99, uom: 'EA' }
  ];
  */

  // Initialize form data when modal opens
  const openModal = () => {
    const today = new Date();
    setFormData({
      name: '',
      doc_agt: '',
      customer_name: '',
      //posting_date: new Date().toISOString().split('T')[0],
      //posting_date: formatDate(new Date()), // Use formatted date
      //posting_time: new Date().toTimeString().substring(0, 5),
      posting_date: formatDate(today),
      posting_time: today.toTimeString().substring(0, 5),
      due_date: formatDate(new Date(today.setDate(today.getDate() + 30))),
      company: '',
      status: '',
      items: [{
        item_code: '', //itemOptions[0].code,
        item_name: '', //itemOptions[0].name,
        description: '', //itemOptions[0].description,
        rate: '', //itemOptions[0].price,
        qty: '1',
        uom: '', //itemOptions[0].uom,
        total: '', //itemOptions[0].price * 1
      }]
    });
    setVisible(true);
    setIsSubmitted(false); // Reset submission status
  };


  const navigateDetails = () => {
    setCriarFactura(true);
    openModal();
  };

  const handleInputChange = (name, value) => {
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    const formatarMoeda = new Intl.NumberFormat();

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

    setFormData({
      ...formData,
      items: updatedItems
    });
  };

  const addItem = () => {
    if (itemOptions.length === 0) return;
    setFormData({
      ...formData,
      items: [
        ...formData.items,
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
    });
  };

  const removeItem = (index) => {
    const updatedItems = [...formData.items];
    updatedItems.splice(index, 1);
    setFormData({
      ...formData,
      items: updatedItems
    });
  };

  const old_handleSubmit = () => {
    // Validate that all items have item_code selected
    const hasEmptyItemCode = formData.items.some(item => !item.item_code);

    if (hasEmptyItemCode) {
      alert('Please select an item code for all items');
      return;
    }

    // Validate customer is selected
    if (!formData.customer_name) {
      alert('Please select a customer');
      return;
    }

    console.log('Form submitted:', formData);

    // Format dates to YYYY-MM-DD
    const formatToBackendDate = (dateString) => {
      if (!dateString) return '';
      // If already in YYYY-MM-DD format, return as is
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return dateString;
      }
      // Parse from dd-MM-yyyy to YYYY-MM-DD
      const [day, month, year] = dateString.split('-');
      return `${year}-${month}-${day}`;
    };
    const postingDate = formatToBackendDate(formData.posting_date);
    const dueDate = formatToBackendDate(formData.due_date);

    console.log('Formatted posting date:', postingDate);
    console.log('Formatted due date:', dueDate);

    //CREATE
    //TODO: Company should be based on CUSTOMER SETUP
    //Bcs is FACTURA FACIL has no need to set IVA... but might have to create
    const tabelaItens = formData.items.map(item => ({
      item_code: item.item_code || item.name,
      item_name: item.item_name,
      description: item.description,
      rate: item.rate,
      uom: item.stock_uom,
      qty: item.qty
    }));


    db.createDoc('Sales Invoice', {
      customer: formData.customer_name,
      company: 'Para Testes',
      posting_date: postingDate,
      posting_time: formData.posting_time,
      due_date: dueDate,
      update_stock: 0,  //Default for FACTURA FACIL; No STOCK
      items: tabelaItens,
      status: 'Draft' //TESTING BEFORE SUMITTING...

    })
      .then((doc) => {
        console.log('FACTURA CRIADA......')
        console.log(doc)
        //TODO: ONCE Saved... Clear Fields and return to CUSTOMER LIST
        setVisible(false);
        setCriarFactura(false);

      })
      .catch((error) => console.error(error));


  };

  const handleSubmit = () => {
    // Validate form
    const hasEmptyItemCode = formData.items.some(item => !item.item_code);
    if (hasEmptyItemCode) {
      alert('Please select an item code for all items');
      return;
    }
    if (!formData.customer_name) {
      alert('Please select a customer');
      return;
    }

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

    // Check if we're editing an existing invoice
    const isEdit = formData.name; // Assuming we set this when editing

    console.log('SUBMIT OU DRAFT ', formData.status)

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
      //status: formData.status == null ? 'Draft':'Unpaid',
      //submit_on_creation: formData.status == 'Draft' ? 1:0,
      status: formData.status || 'Draft', // Default to 'Draft' if status is not set
      submit_on_creation: formData.status === 'Draft' ? 1 : 0, // Explicit comparison
    };

    console.log('invoidata ', invoiceData)
    console.log('form DATA ', formData)
    console.log('ISEDIT ', isEdit)

    if (isEdit) {
      // Update existing invoice
      db.updateDoc('Sales Invoice', formData.name, invoiceData)
        .then(() => {
          console.log('Invoice updated');
          setIsSubmitted(true); // Add this line

          //SUBMIT if DRAFT...
          console.log('Status FACT ', formData.status )
          if (invoiceData.submit_on_creation == 1) {
            const searchParams = {
              invoice_name: formData.name,
            };
            call
            .get('angola_erp.api.invoices.submeter_invoices', searchParams)
            .then((result) => {
              console.log('**** FACTURA SUMETIDA..... ')
              console.log(result)
              setVisible(false);
              setCriarFactura(false);
              // Refresh the draft invoices list

              fetchDraftInvoices();

            })
            .catch((error) => {
              console.error(error)
            });

          } else {
            setVisible(false);
            setCriarFactura(false);
            // Refresh the draft invoices list
            fetchDraftInvoices();

          }
        })
        .catch(error => console.error(error));
    } else {
      // Create new invoice
      db.createDoc('Sales Invoice', invoiceData)
        .then((doc) => {
          console.log('Invoice created');
          //Draft stay on the Form for SUBMIT
          if (invoiceData.status == "Draft" || invoiceData.status == null) {
            console.log('REFREShhhh');
            setVisible(false);
            setCriarFactura(false);
            fetchDraftInvoices();

            setIsSubmitted(false); // Add this line
          } else {
            setVisible(false);
            setCriarFactura(false);
            fetchDraftInvoices();
            setIsSubmitted(true); // Add this line

          }
        })
        .catch(error => console.error(error));
    }
  };

  const fetchInvoiceCount = async () => {
    // Count invoices
    await db.getCount('Sales Invoice').then((count) => {
      console.log('conta ', count);
    }).catch(handleError);

  };

  const fetchCustomerOptions = async () => {
    // Get customers
    await db.getDocList('Customer', {
      fields: ["name"],
      filters: [['disabled','!=',1]],
      limit_start: 5,
      limit: 20,
      orderBy: {
        field: "customer_name",
        order: 'desc',
      },
    }).then((data) => {
      setcustomerOptions(data);
    }).catch(handleError);
  };

  const fetchItemOptions = async () => {
    // Get items
    await db.getDocList('Item', {
      fields: ["name","item_code","item_name","description","standard_rate","stock_uom"],
      filters: [['disabled','!=',1]],
      orderBy: {
        field: "name",
        order: 'desc',
      },
    }).then((data) => {
      const formattedItems = data.map(item => ({
        code: item.item_code || item.name,
        name: item.item_name,
        description: item.description,
        rate: item.standard_rate,
        uom: item.stock_uom
      }));
      setitemOptions(formattedItems);
    }).catch(handleError);

  };

  const fetchUnpaidInvoices = async () => {
    try {
      setLoadingStates(prev => ({...prev, unpaid: true}));

      const result = await call.get('angola_erp.api.invoices.all_invoices', JSON.stringify({
        username: userInfo.email,
        statusfactura: ['Unpaid','Overdue']
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
  };

  const OLD_fetchUnpaidInvoices = async () => {
    setIsLoading(true);
    try {
      const searchParamss = {
        username: userInfo.email,
        statusfactura: ['Unpaid','Overdue']
      };

      const result = await call.get('angola_erp.api.invoices.all_invoices', JSON.stringify(searchParamss));

      const filteredInvoices = result.message.filter(invoice =>
        invoice.status !== 'Draft' &&
        invoice.status !== 'Paid' &&
        invoice.status !== 'Return' &&
        invoice.status !== 'Cancelled' &&
        invoice.status !== 'Credit Note Issued'
      );

      const sorted = [...filteredInvoices].sort((a, b) => {
        return new Date(b.posting_date) - new Date(a.posting_date);
      });

      setListaFacturas(sorted);
    } catch (error) {
      console.error(error);
      Toast.show({
        type: "error",
        position: 'top',
        text1: 'Error',
        text2: 'Failed to refresh invoices'
      });
    } finally {
      //setIsLoading(false);
    }
  };

  const fetchDraftInvoices = () => {
    setIsLoading(true);
    db.getDocList('Sales Invoice', {
      fields: ["name","doc_agt","posting_date","customer","outstanding_amount","rounded_total","status","company"],
      filters: [['posting_date','<=', `${dateHoje.getFullYear()}-${dateHoje.getMonth()+1}-${dateHoje.getDate()}`],['status','=','Draft'],['naming_series','like','FT%']],
      orderBy: {
        field: "posting_date",
        order: 'desc',
      },
    }).then((data) => {
      //setIsLoading(false);
      setDraftInvoices(data);
    })
    .catch(async (error) => {
      if (error.httpStatus === 403 || error.httpStatus === 401) {
        await refreshAccessTokenAsync();
      } else {
        console.error('Error fetching fetchDraftInvoices:', error);
        alert('Failed to load fetchDraftInvoices for editing');
      }
    });

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
     setIsSubmitted(false); // Reset submission status
  };

  const unformatCurrency = (formattedValue) => {
    if (!formattedValue) return 0;
    // Remove all non-digit characters except decimal point
    const numericString = formattedValue.toString()
      .replace(/[^0-9.]/g, '');
    return parseFloat(numericString) || 0;
  };

  const calculateGrandTotal = () => {
    const formatarMoeda = new Intl.NumberFormat();
    return formData.items.reduce((sum, item) => {
      console.log(sum)
      console.log('vvvv')
      console.log(unformatCurrency(item.total))
      console.log(formatarMoeda.format(sum+unformatCurrency(item.total)) || 0)
      console.log('valor')
      console.log(formatarMoeda.format(sum + (unformatCurrency(item.total)) || 0));
      return sum+unformatCurrency(item.total) || 0;
    }, 0);
  };

  const calculateDueDate = (postingDate) => {
    if (!postingDate) return '';
    const date = new Date(postingDate);
    date.setDate(date.getDate() + 30);
    return format(date, 'yyyy-MM-dd');
  };

  const UnpaidFacturas = ({ item }) => (
    <View>
      <Text>{item}</Text>
    </View>
  );

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
      marginBottom: 5,
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
      padding: 5,
      borderRadius: 5,
      alignItems: 'center',
      marginBottom: 20,
      marginTop: -10,
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
      marginTop: -10,
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
    button: {
      marginVertical: 10,
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
    // Add these new styles:
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

  const InvoiceListTab = ({ data, isLoading, onRefresh }) => (
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
        <InvoiceList data={data} />
      )}
    </Layout>
  );

  useEffect(() => {
    // Load independent data in parallel
    const loadInitialData = async () => {
      await Promise.all([
        fetchUnpaidInvoices(),
        fetchDraftInvoices(),
        fetchCustomerOptions(),
        fetchItemOptions(),
        fetchInvoiceCount()
      ]);
    };

    loadInitialData();
  }, [accessToken, db]);

  if (isLoading) {
    return (
      <Layout style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Spinner size='giant' />
        <Text style={{ marginTop: 10 }}>{t('home.loading_invoice_data')}</Text>
      </Layout>
    );
  }

  // Create a reusable InvoiceList component
  // Update the InvoiceList component
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
              {item.outstanding_amount ? new Intl.NumberFormat().format(item.outstanding_amount) : ''}
            </Text>
            <Text> EMPRE { item.company } </Text>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Button visible={visible}
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
              { /*In your InvoiceList component, add a print button: */}
              {!isDraft && (
                <Button
                onPress={async () => {
                  try {
                    await generatePDF(item);
                  } catch (error) {
                    console.error('Print error:', error);
                    alert('Failed to print. Please try again.');
                  }
                }}
                appearance="ghost"
                status="success"
                style={{ flex: 1, marginHorizontal: 4 }}
              >
                {t('home.button_pdf')}
              </Button>
            )}
            {!isDraft && (
              <Button
              onPress={async () => {
                try {
                  Toast.show({
                    type: "error",
                    position: 'top',
                    text1: 'Por FAZER!!!!',
                    text2: 'Por FAZER!!!!'
                  });

                } catch (error) {
                  console.error('Print error:', error);
                  alert('Failed to print. Please try again.');
                }
              }}
              appearance="ghost"
              status="success"
              style={{ flex: 1, marginHorizontal: 4 }}
            >
              {t('home.button_print')}
            </Button>
          )}

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

            <Layout style={{ marginVertical: 2 }}></Layout>
          </Card>
        )}
        estimatedItemSize={100}
        keyExtractor={(item) => item.name}
      />
    </View>
  );

  const editDraftInvoice = (invoice) => {
    // Fetch the full invoice details including items
    console.log('edit draft invoice')
    console.log(invoice)

    db.getDoc('Sales Invoice', invoice.name)
      .then((doc) => {
        // Format the items for the form
        const items = doc.items.map(item => ({
          item_code: item.item_code,
          item_name: item.item_name,
          description: item.description,
          rate: item.rate,
          qty: item.qty.toString(),
          uom: item.uom,
          total: (item.rate * item.qty).toFixed(2)
        }));

        // Set the form data
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

        // Open the modal in edit mode
        setCriarFactura(true);
        setVisible(true);
        setIsSubmitted(false);
      })
      .catch(async (error) => {
        if (error.httpStatus === 403 || error.httpStatus === 401) {
          await refreshAccessTokenAsync();
        } else {
          console.error('Error fetching invoice:', error);
          alert('Failed to load invoice for editing');
        }
      });
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Layout style={{ flex: 1, padding: 16 }}>
        {!criarFactura && (
          <View style={{ flex: 1 }}>
            <Text category="h6">{t('home.title_invoices')} </Text>
            <Layout style={{ marginVertical: 10 }} />
            <Card status="success">
              <Text>{t('home.total_invoices', { count: numerodeFacturas})} </Text>
            </Card>

          {/* // Replace the existing Card component with this TabView implementation */}
          <Layout style={{ marginVertical: 5 }} />
          <TabView selectedIndex={selectedIndex} onSelect={setSelectedIndex}>
            <Tab title={t('home.invoices_topay')}>
              <InvoiceListTab
                data={listaFacturas}
                isLoading={loadingStates.unpaid}
                onRefresh={fetchUnpaidInvoices}
              />
            </Tab>
            <Tab title={t('home.invoices_draft')}>
              <InvoiceListTab
                data={draftInvoices}
                isLoading={loadingStates.draft}
                onRefresh={fetchDraftInvoices}
              />
            </Tab>
          </TabView>

          </View>
        )}

        <Modal visible={visible} animationType="slide" transparent={false}>
          <ScrollView style={styles.container}>
            <Text style={styles.header}>{t('home.invoices_title')}</Text>
            {/* Invoice Name */}
            {formData.name != null && formData.name &&
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('home.invoice_intnumber')}</Text>
                <TextInput
                  style={styles.inputGroup}
                  value={formData.name}
                  editable={false}
                />
              </View>
            }
            {/* Doc AGT */}
            {formData.doc_agt != null && formData.doc_agt &&
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('home.invoice_number')} </Text>
                <TextInput
                  style={styles.inputGroup}
                  value={formData.doc_agt}
                  editable={false}
                />
              </View>
            }

            {/* Customer Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('home.invoice_customername')}</Text>
              {/* For Customer selection */}
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


            {/* Posting Date */}
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


            {/* Posting Time */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('home.invoice_postingtime')}</Text>
              <TextInput
                style={styles.input}
                value={formData.posting_time}
                onChangeText={(text) => handleInputChange('posting_time', text)}
                placeholder="HH:MM"
              />
            </View>

            {/* Due Date (read-only) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('home.invoice_duedate')}</Text>
              <View style={styles.dateInput}>
                <Text style={styles.dateText}>
                  {formData.due_date || 'Will calculate after posting date is selected'}
                </Text>
              </View>
            </View>


            <Text style={[styles.header, { marginTop: 2 }]}>{t('home.invoice_items')}</Text>

            {/* Items Table */}
            {formData.items.map((item, index) => (
              <View key={index} style={styles.itemContainer}>
                <Text style={styles.itemHeader}>Item #{index + 1}</Text>

                {/* Item Code */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('home.invoice_itemcode')} *</Text>
                  {/* For Item selection */}
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

                {/* Item Name */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('home.invoice_itemname')}</Text>
                  <TextInput
                    style={styles.input}
                    value={item.item_name}
                    editable={false}
                  />
                </View>

                {/* Description */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('home.invoice_itemdescription')}</Text>
                  <TextInput
                    style={styles.input}
                    value={item.description}
                    editable={false}
                  />
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  {/* Price */}
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.label}>{t('home.invoice_itemprice')}</Text>
                    <TextInput
                      style={styles.input}
                      value={item.rate.toString()}
                      onChangeText={(text) => handleItemChange(index, 'rate', text)}
                      keyboardType="numeric"
                    />
                  </View>

                  {/* Quantity */}
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

                {/* Total */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('home.invoice_itemtotal')}</Text>
                  <TextInput
                    style={styles.input}
                    value={item.total.toString()}
                    editable={false}
                  />
                </View>

                {/* Remove button for items beyond the first one */}
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

            {/* Grand Total Section */}
            <View style={styles.grandTotalContainer}>
              <Text style={styles.grandTotalLabel}>{t('home.invoice_itemgrandtotal')}:</Text>
              <Text style={styles.grandTotalValue}>
                AOA {new Intl.NumberFormat().format(calculateGrandTotal())}

              </Text>
            </View>

            {/* Add Item Button */}
            <TouchableOpacity style={styles.addButton} onPress={addItem}>
              <Text style={styles.addButtonText}>+ {t('home.invoice_additem')}</Text>
            </TouchableOpacity>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.buttonText}>{t('home.button_cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, !isFormValid() && {backgroundColor: '#cccccc'}]}
                onPress={handleSubmit}
                disabled={!isFormValid()}
              >
                <Text style={styles.buttonText}>{isSubmitted ? "Submitted" : (formData.status === "Draft" ? "Submit?" : "Save?")}</Text>
              </TouchableOpacity>

            </View>
          </ScrollView>
        </Modal>
      </Layout>
    </SafeAreaView>
  );
};
