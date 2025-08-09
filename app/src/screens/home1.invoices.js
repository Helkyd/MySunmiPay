import React, { useContext, useEffect } from "react";
import { AuthContext } from "../provider/auth";

import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView, TextInput, SafeAreaView } from 'react-native';
//import { Picker } from '@react-native-picker/picker';
//import { Picker } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { Card, Button, Layout, Tab, TabView } from '@ui-kitten/components';

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

const generateInvoiceHTML = (invoiceData) => {
  console.log('InvoiceDATA for print');
  console.log(invoiceData);
  return `
    <html>
      <head>
        <style>
          body { font-family: Arial; margin: 20px; }
          .header { text-align: center; margin-bottom: 20px; }
          .invoice-info { margin-bottom: 20px; }
          .customer-info { margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .total { text-align: right; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>INVOICE</h1>
          <p>Invoice #${invoiceData.name || invoiceData.doc_agt}</p>
        </div>

        <div class="invoice-info">
          <p><strong>Date:</strong> ${invoiceData.posting_date}</p>
          <p><strong>Due Date:</strong> ${invoiceData.due_date}</p>
        </div>

        <div class="customer-info">
          <h3>Customer:</h3>
          <p>${invoiceData.customer_name}</p>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Description</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${invoiceData.items.map(item => `
              <tr>
                <td>${item.item_name}</td>
                <td>${item.description}</td>
                <td>${item.qtd}</td>
                <td>${item.price}</td>
                <td>${item.total}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="total">
          <p>Grand Total: ${invoiceData.items.reduce((sum, item) => sum + parseFloat(item.total), 0).toFixed(2)}</p>
        </div>
      </body>
    </html>
  `;
};

const OLD_generatePDF = async (invoiceData) => {

  console.log('InvoiceDATA GeneratePDF ');
  console.log(invoiceData);
  console.log(invoiceData.name);
  const { db, call } = useFrappe();

  try {
    db.getDoc('Sales Invoice', invoiceData.name)
        .then((doc) => {
          // Format the items for the form
          const items = doc.items.map(item => ({
            item_code: item.item_code,
            item_name: item.item_name,
            description: item.description,
            price: item.rate,
            qtd: item.qty.toString(),
            uom: item.uom,
            total: (item.rate * item.qty).toFixed(2)
          }));

          // Set the form data
          invoiceData({
            name: doc.name,
            customer_name: doc.customer,
            posting_date: format(new Date(doc.posting_date), "dd-MM-yyyy"),
            posting_time: doc.posting_time,
            due_date: format(new Date(doc.due_date), "dd-MM-yyyy"),
            company: doc.company,
            status: doc.status,
            items: items
          });

        })
        .catch(async (error) => {
          if (error.httpStatus === 403 || error.httpStatus === 401) {
            await refreshAccessTokenAsync();
          } else {
            console.error('Error fetching invoice:', error);
            alert('Failed to load invoice for editing');
          }
        });
    const html = generateInvoiceHTML(invoiceData);

    // Option 1: Using expo-print
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false
    });

    // Option 2: Using react-native-html-to-pdf
    // const options = {
    //   html,
    //   fileName: `invoice_${invoiceData.name || invoiceData.doc_agt}`,
    //   directory: 'Invoices',
    // };
    // const { filePath } = await htmlToPdf(options);

    // Share the PDF
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Share Invoice',
      UTI: 'com.adobe.pdf'
    });

    return uri;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

const generatePDF = async (invoiceData) => {
  try {
    console.log('Generating PDF for:', invoiceData);

    // Ensure items exist or provide empty array
    const items = invoiceData.items || [];

    // Generate HTML with proper fallbacks
    const html = `
      <html>
        <head>
          <style>
            body { font-family: Arial; margin: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            .invoice-info { margin-bottom: 20px; }
            .customer-info { margin-bottom: 20px; }


            .po {float: right; position:absolute; margin-left:65%; width:35%;margin-top:20px;}
            .grand_total1 {font-size:12px; text-align:left; }
            .grand_total2 { font-size:12px; text-align:right; }
            .sn3 { font-size:15px; text-align:center; border:0px #ffffff; background-color:#ffffff;}
            .sn2 { font-size:15px; text-align:center; border:1px solid black; }
            .sn1{ font-size:15px; text-align:left; width:55%;}
            .sn { font-size:15px; text-align:left; width:15%; }
            table.th { text-align:center; border:1px solid black; background-color:lavenderblush;}
            .th1 { text-align:center; border:0px #ffffff; border-color:lavenderblush; background-color:lavenderblush !important; }
            table.tb2 { border:none; }
            table.tb1 { border:0px #ffffff; background-color:lavenderblush;}
            table.tb3 { border-collapse: separate; border-spacing: 0 2px; }
            .td1 { text-align: left; padding: 0.5px; font-size: 8px;}
            .feeter { width:100%; text-align:center; }
            p { font-size:11.5px; }
            .total { border:1px solid black; width:65%; background-color:lavenderblush; }
            .footer { position: fixed; left: 0; bottom: 0; width: 100%; color: white; text-align: center; }
            .showcase { background-image: url("/files/pdf_watermark.png"); background-position: center; background-repeat: no-repeat; background-size: auto;
            	height: 500px; width: 100px;opacity: 1.0;}

          </style>
        </head>
        <body>
          <div class="header">
            <h1>INVOICE</h1>
            <p>Invoice #${invoiceData.name || invoiceData.doc_agt || 'N/A'}</p>
          </div>

          <div class="invoice-info">
            <p><strong>Date:</strong> ${invoiceData.posting_date || 'N/A'}</p>
            <p><strong>Due Date:</strong> ${invoiceData.due_date || 'N/A'}</p>
          </div>

          <div class="customer-info">
            <h3>Customer:</h3>
            <p>${invoiceData.customer_name || invoiceData.customer || 'N/A'}</p>
          </div>

          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Description</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => `
                <tr>
                  <td>${item.item_name || 'N/A'}</td>
                  <td>${item.description || ''}</td>
                  <td>${item.qtd || 0}</td>
                  <td>${item.price || 0}</td>
                  <td>${item.total || 0}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="total">
            <p>Grand Total: ${items.reduce((sum, item) => sum + parseFloat(item.total || 0), 0).toFixed(2)}</p>
          </div>
        </body>
      </html>
    `;

    // Generate PDF
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false
    });

    console.log('PDF generated at:', uri);

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

    return uri;
  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('Failed to generate PDF. Please try again.');
    throw error;
  }
};

const UnpaidFacturas = ({ item }) => {
  const formatarMoeda = new Intl.NumberFormat();
  return (
    <Card key={item.name} style={{ width: "100%", marginBottom: 20 }}>
      <Text style={{ fontSize: 10 }}>{format(item.posting_date,"dd-MM-yyyy")} - {item.doc_agt} - {item.customer}</Text>
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

  //const { accessToken, refreshAccessTokenAsync } = useContext(AuthContext);
  const { refreshAccessTokenAsync, isAuthenticated, logout, userInfo, accessToken, fetchUserInfo } = useContext(AuthContext);

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

  const { db, call } = useFrappe();
  const dateHoje = new Date();

  //const [datePickerOpen, setDatePickerOpen] = useState(false);
  //const [date, setDate] = useState(new Date());
  //const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = React.useState(false);

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
      price: 0,
      qtd: '1',
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
        price: '', //itemOptions[0].price,
        qtd: '1',
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

    if (field === 'qtd' || field === 'price') {
      const qtd = parseFloat(field === 'qtd' ? value : updatedItems[index].qtd) || 0;
      const price = parseFloat(field === 'price' ? value : updatedItems[index].price) || 0;
      updatedItems[index].total = (qtd * price).toFixed(2);
    }

    if (field === 'item_code') {
      const selectedItem = itemOptions.find(item => item.code === value);
      if (selectedItem) {
        updatedItems[index] = {
          ...updatedItems[index],
          item_name: selectedItem.name,
          description: selectedItem.description,
          price: formatarMoeda.format(selectedItem.price),
          uom: selectedItem.uom,
          total: formatarMoeda.format((parseFloat(updatedItems[index].qtd || 0) * selectedItem.price).toFixed(2))
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
          price: itemOptions[0].price,
          qtd: '1',
          uom: itemOptions[0].uom,
          total: itemOptions[0].price * 1
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
      rate: item.price,
      uom: item.stock_uom,
      qty: item.qtd
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
      rate: item.price,
      uom: item.stock_uom,
      qty: item.qtd
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

  const fetchDraftInvoices = () => {
    db.getDocList('Sales Invoice', {
      fields: ["name","doc_agt","posting_date","customer","outstanding_amount","rounded_total","status"],
      filters: [['posting_date','<=', `${dateHoje.getFullYear()}-${dateHoje.getMonth()+1}-${dateHoje.getDate()}`],['status','=','Draft'],['naming_series','like','FT%']],
      orderBy: {
        field: "posting_date",
        order: 'desc',
      },
    }).then((data) => {
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


  useEffect(() => {
    console.log('use effect');

    db.getCount('Sales Invoice').then((count) => {
      console.log('conta ', count)
      //console.log('Data hoje ', `${dateHoje.getFullYear()}-${dateHoje.getMonth()+1}-${dateHoje.getDate()}`)
      //setNumerodeFacturas(count)
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


    //Get from contarfacturas
    console.log('userinfo ', userInfo);
    const searchParams0 = {
      username: userInfo.email,
    };


    call
    .get('angola_erp.api.invoices.contarFacturas', searchParams0)
    .then((result) => {
      console.log('**** CONTAGEM DE FACTURAs..... ')
      //console.log(result.message)
      console.log('USER ',userInfo.email)
      console.log(result.message)
      const streams = result.message
      setNumerodeFacturas(streams)
    })
    .catch((error) => {
      console.error(error)
    });


/*
    db.getDocList('Sales Invoice', {
      fields: ["name","doc_agt","posting_date","customer","outstanding_amount","rounded_total","status"],
      filters: [['status','=',['Unpaid','Overdue']],['doc_agt','!=',""]],
      orderBy: {
        field: "posting_date",
        order: 'desc',
      },
    }).then((data) => {
      console.log(data);
      const streams = data
      setListaFacturas(streams)
      console.log('factura1 ', streams[0])
      console.log('Data hoje ', dateHoje.getDate())
    })
*/

    //Get from all_invoices
    const searchParams = {
      username: userInfo.email,
      statusfactura: 'Unpaid' // ['Unpaid','Overdue']
    };

    console.log('Search PARAM')
    console.log(searchParams)

    call
    .get('angola_erp.api.invoices.all_invoices', searchParams)
    .then((result) => {
      console.log('**** LISTA DE FACTURAs..... ')
      //console.log(result.message)
      console.log('USER ',userInfo.email)
      console.log(result.message[0])
      console.log('tamanhpo ',result.message.length);
      console.log(typeof(result.message))
      const streams = result.message
      //setListaFacturas(streams)

      const sortedData = streams.sort((a, b) => {
        return new Date(b.posting_date) - new Date(a.posting_date);
      });

      // Sort by posting_date in descending order (newest first)
      const sorted = [...streams].sort((a, b) => {
        return new Date(b.posting_date) - new Date(a.posting_date);
      });

      setListaFacturas(sorted)
    })
    .catch((error) => {
      console.error(error)
    });


    // Add this to fetch draft invoices
    db.getDocList('Sales Invoice', {
      fields: ["name","doc_agt","posting_date","customer","outstanding_amount","rounded_total","status"],
      filters: [['status','=','Draft']],
      orderBy: {
        field: "posting_date",
        order: 'desc',
      },
    }).then((data) => {
      setDraftInvoices(data);
    });


    db.getDocList('Customer', {
      fields: ["name"],
      filters: [['disabled','!=',1]],
      limit_start: 5,
      limit: 20,
      orderBy: {
        field: "customer_name",
        order: 'desc',
      },
    }).then((data) => {
      //console.log('Customers data:', data);
      setcustomerOptions(data);
    })

    //{ code: 'ITM001', name: 'Laptop', description: '15" Business Laptop', price: 899.99, uom: 'EA' },
    //ITEM
    db.getDocList('Item', {
      fields: ["name","item_code","item_name","description","standard_rate","stock_uom"],
      filters: [['disabled','!=',1]],
      orderBy: {
        field: "name",
        order: 'desc',
      },
    }).then((data) => {
      //console.log('ITEMS/PRODS data:', data);
      const formattedItems = data.map(item => ({
          code: item.item_code || item.name,
          name: item.item_name,
          description: item.description,
          price: item.standard_rate,
          uom: item.stock_uom
        }));
        setitemOptions(formattedItems);
    })

    fetchDraftInvoices();

  }, [accessToken,db]);

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
                Abrir
              </Button>
              { /*In your InvoiceList component, add a print button: */}
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
                Print
              </Button>

              {isDraft && (
                <Button
                  onPress={() => editDraftInvoice(item)}
                  appearance="ghost"
                  status="warning"
                  style={{ flex: 1, marginLeft: 4 }}
                >
                  Editar
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
          price: item.rate,
          qtd: item.qty.toString(),
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
            <Text category="h5">AngolaERP Demo15 Dashboard</Text>
            <Layout style={{ marginVertical: 10 }} />
            <Card status="success">
              <Text>Total de Facturas: {numerodeFacturas}</Text>
            </Card>

          {/* // Replace the existing Card component with this TabView implementation */}
          <Layout style={{ marginVertical: 5 }} />
          <TabView
            selectedIndex={selectedIndex}
            onSelect={index => setSelectedIndex(index)}
          >
            <Tab title="Facturas por Pagar">
              <Layout style={{ padding: 8 }}>
                <Button
                  style={styles.button}
                  size="tiny"
                  onPress={navigateDetails}
                >
                  Create Invoice
                </Button>
                <Layout style={{ marginVertical: 5 }} />
                <InvoiceList data={listaFacturas} />
              </Layout>
            </Tab>
            <Tab title="Facturas em Rascunho">
              <Layout style={{ padding: 8 }}>
                <Button
                  style={styles.button}
                  size="tiny"
                  onPress={navigateDetails}
                >
                  Create Invoice
                </Button>
                <Layout style={{ marginVertical: 5 }} />
                <InvoiceList data={draftInvoices} isDraft={true} />
              </Layout>
            </Tab>
          </TabView>


          </View>
        )}

        <Modal visible={visible} animationType="slide" transparent={false}>
          <ScrollView style={styles.container}>
            <Text style={styles.header}>Sales Invoice</Text>
            {/* Invoice Name */}
            {formData.name != null && formData.name &&
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Int. Invoice Number</Text>
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
                <Text style={styles.label}>Invoice Number</Text>
                <TextInput
                  style={styles.inputGroup}
                  value={formData.doc_agt}
                  editable={false}
                />
              </View>
            }

            {/* Customer Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Customer Name</Text>
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
                placeholder="Select a customer"
                dropDownContainerStyle={{
                  backgroundColor: '#fff',
                  borderColor: '#ddd'
                }}
              />
              {!formData.customer_name && (
                    <Text style={{color: 'red', fontSize: 12}}>Customer is required</Text>
                  )}

            </View>


            {/* Posting Date */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Posting Date</Text>
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
              <Text style={styles.label}>Posting Time</Text>
              <TextInput
                style={styles.input}
                value={formData.posting_time}
                onChangeText={(text) => handleInputChange('posting_time', text)}
                placeholder="HH:MM"
              />
            </View>

            {/* Due Date (read-only) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Due Date (30 days)</Text>
              <View style={styles.dateInput}>
                <Text style={styles.dateText}>
                  {formData.due_date || 'Will calculate after posting date is selected'}
                </Text>
              </View>
            </View>


            <Text style={[styles.header, { marginTop: 2 }]}>Items</Text>

            {/* Items Table */}
            {formData.items.map((item, index) => (
              <View key={index} style={styles.itemContainer}>
                <Text style={styles.itemHeader}>Item #{index + 1}</Text>

                {/* Item Code */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Item Code *</Text>
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
                    <Text style={{color: 'red', fontSize: 12}}>Item code is required</Text>
                  )}
                </View>

                {/* Item Name */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Item Name</Text>
                  <TextInput
                    style={styles.input}
                    value={item.item_name}
                    editable={false}
                  />
                </View>

                {/* Description */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Description</Text>
                  <TextInput
                    style={styles.input}
                    value={item.description}
                    editable={false}
                  />
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  {/* Price */}
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.label}>Price</Text>
                    <TextInput
                      style={styles.input}
                      value={item.price.toString()}
                      onChangeText={(text) => handleItemChange(index, 'price', text)}
                      keyboardType="numeric"
                    />
                  </View>

                  {/* Quantity */}
                  <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={styles.label}>Quantity</Text>
                    <TextInput
                      style={styles.input}
                      value={item.qtd}
                      onChangeText={(text) => handleItemChange(index, 'qtd', text)}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                {/* Total */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Total</Text>
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
                    <Text style={styles.removeButtonText}>Remove Item</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {/* Grand Total Section */}
            <View style={styles.grandTotalContainer}>
              <Text style={styles.grandTotalLabel}>Grand Total:</Text>
              <Text style={styles.grandTotalValue}>
                AOA {new Intl.NumberFormat().format(calculateGrandTotal())}

              </Text>
            </View>

            {/* Add Item Button */}
            <TouchableOpacity style={styles.addButton} onPress={addItem}>
              <Text style={styles.addButtonText}>+ Add Item</Text>
            </TouchableOpacity>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.buttonText}>Cancel</Text>
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
