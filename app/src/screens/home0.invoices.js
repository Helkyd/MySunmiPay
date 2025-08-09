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

  const generatePDF = async (invoiceData) => {
    console.log('Empresa ', invoiceData.company);
    try {
      await db.getDoc('Sales Invoice', invoiceData.name)
          .then((doc) => {
            console.log('TEM NOVOS DADOS');
            console.log(doc);
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
            const invoiceData ={
              name: doc.name,
              customer_name: doc.customer,
              posting_date: format(new Date(doc.posting_date), "dd-MM-yyyy"),
              posting_time: doc.posting_time,
              due_date: format(new Date(doc.due_date), "dd-MM-yyyy"),
              company: doc.company,
              company_tax_id: doc.company_tax_id,
              company_address_display: doc.company_address_display,
              contact_email: doc.contact_email,
              contact_mobile: doc.contact_mobile,
              status: doc.status,
              items: items
            }

          })
          .catch(async (error) => {
            if (error.httpStatus === 403 || error.httpStatus === 401) {
              await refreshAccessTokenAsync();
            } else {
              console.error('Error fetching invoice:', error);
              alert('Failed to load invoice for editing');
            }
          });

      console.log('Generating PDF for:', invoiceData);

      // Ensure items exist or provide empty array
      const items = invoiceData.items || [];

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
      /*
      db.getDocList('Dynamic Link', {
        fields: ["parent"],
        filters: [['link_doctype': 'Company'], ['link_name':invoiceData.company], ['parenttype': 'Address']],
      }).then((data) => {
        const links = data.parent;
        console.log('linkkkkkkkkkkkkkss ', links);
        db.getDoc('Address', links)
        .then((doc) => {
          console.log('ADDRESS XXXXXXXX ', doc)
          address = doc;
        })
        .catch((error) => console.error(error));

      })
      .catch(async (error) => {
        if (error.httpStatus === 403 || error.httpStatus === 401) {
          await refreshAccessTokenAsync();
        } else {
          console.error('Error fetching Company Address:', error);
          alert('Failed to  Company Company Address');
        }
      });
      */

      //const nifempresa = db.get_value('Company',invoiceData.company,"registration_details");
      /*
      db.getDocList('Company', {
        fields: ["name","registration_details"],
        filters: [['company','=',invoiceData.company]],
      }).then((data) => {
        const nifempresa = data.registration_details;
      })
      .catch(async (error) => {
        if (error.httpStatus === 403 || error.httpStatus === 401) {
          await refreshAccessTokenAsync();
        } else {
          console.error('Error fetching Company Registration details:', error);
          alert('Failed to  Company Registration details');
        }
      });
      */


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

          {% macro above_items() %}
          <div class="page-break" style="border:0px solid #F5FFFA; width:100%; height:963px;">
          	<br><br>
          	<strong>
          		<div style="position:relative; margin-top:0px;">

          			<b>
          				<h3 style="text-transform: capitalize; text-align:center;">&nbsp;${ invoiceData.company }<br></h3>
          			</b>


          		</div>
          	</strong>


          	<div style="border: 0px solid black; width:100%; font-size:10px;">
          		<br>
          		<div class="row section-break">

          			<div class="col-xs-6 column-break">
          				<div>
          					${ invoiceData.company }<br>
                    ${ invoiceData.address_display }<br>
          					${ invoiceData.company_tax_id }<br>



          				</div>

          			</div>

          			<div class="col-xs-6 column-break">

          				<div>Exmo(s) Senhor(es)

          					<h3>${ invoiceData.customer_name }</h3>
          					<b>NIF: ${ invoiceData.tax_id || 'Consumidor Final' } </b>

          					<br> ${ invoiceData.address_display }
          					${ invoiceData.contact_mobile }
          				</div>


          			</div>

          		</div>

          		<br>

          		${ invoiceData.imprimir }

          		<table id="tb1" width="100%">
          			<tr style="border-bottom: solid thin;">
          				<td class="sn3" style="font-size:12px;text-align:left;"><b> Factura &nbsp;&nbsp; ${ invoiceData.doc_agt | '' } </b> </td>

          			</tr>
          		</table>

          		<table id="tb3" width="100%">
          			<tr>
          				<td class="td1" style="border-bottom: solid thin;"><b>Emitido em</b></td>
          				<td class="td1" style="border-bottom: solid thin;"><b>Prazo Pagamento</b></td>
          				<td class="td1"></td>
          			</tr>
          			<tr>
          				<td class="td1">${ invoiceData.posting_date } ${ invoiceData.posting_time }</td>
          				<td class="td1">${ invoiceData.due_date }</td>

          			</tr>
          			<tr>
          				<td class="td1" style="border-bottom: solid thin;"><b>Operador(a)</b></td>
          				<td class="td1" style="border-bottom: solid thin;"><b>V/ Requisição</b></td>
          				<td class="td1"></td>

          				<td class="td1" colspan="5">
          					<div style="width:50px; height:50px; margin-top:-10px;float:right;"><img src="${ linkfactura }">
          					</div>
          				</td>


          			</tr>
          			<tr>
          				<td class="td1">
                    ${ invoiceData.status === 'DRAFT' &&
                      <b>Este documento não serve de Factura </b>
                    }
                    ${ invoiceData.status != 'DRAFT' &&
                      `${ invoiceData.modified_by }`
                    }

          				</td>
          				<td class="td1"></td>
          				<td class="td1"></td>

          			</tr>
          		</table>


          	</div>
          	<br>

          		<table id="tt1" style="width:100%; ">
          			<tr id="trr1" class="trr1" style="border-top: solid thin;">

          				<th id="th1" class="th1" width="35%" style="text-transform: uppercase;background-color:lavender;">{{
          					_("Descrição") }}</th>
          				<th id="th1" class="th1" width="3%" style="text-transform: uppercase;background-color:lavender;"></th>
          				<th id="th1" class="th1" width="5%"
          					style="text-align:center;text-transform: uppercase;background-color:lavender;">{{ _("QUANT") }}</th>
          				<th id="th1" class="th1" width="10%"
          					style="text-align:right;text-transform: uppercase;background-color:lavender;">{{ _("UNI") }}</th>
          				<th id="th1" class="th1" style="text-align:right;text-transform: uppercase;background-color:lavender;"
          					width="20%">{{ _("PREÇO") }}</th>
          				<th id="th1" class="th1" width="7%" style="text-transform: uppercase;background-color:lavender;">{{
          					"DESC" }}</th>
          				<th id="th1" class="th1" width="7%" style="text-transform: uppercase;background-color:lavender;">{{
          					("TAXA") }}</th>
          				<th id="th1" class="th1" style="text-align:right;text-transform: uppercase;background-color:lavender;"
          					width="25%">{{ _("VALOR TOTAL") }}</th>
          			</tr>
          		</table>


          		{% endmacro %}


          		{% macro above_items_notable() %}
          		<div class="page-break" style="border:0px solid #F5FFFA; width:100%; height:963px;">
          			<strong>
          				<div style="position:relative; margin-top:0px;">
          					<img src="/files/logo.jpg" width="60%" height: 25px; style="float:left; position:absolute;">

          					<div class="po">
          						<table id="tb1" width="100%">
          							<tr>
          								<th class="sn3">FATURA</th>
          								<th class="sn3">{{ invoiceData.name }}</th>
          							</tr>
          							<tr>
          								<td class="sn3"></td>
          								<td class="sn3">Original</td>
          							</tr>
          						</table>
          					</div>
          				</div>
          			</strong>

          			<div style="border: 0px solid black; width:100%; font-size:10px;">
          				<div class="row section-break">

          					<div class="col-xs-6 column-break">

          						<div>
          							<br><br>
          							<br><br>
          							<br><br>
          							<br><br>
          							<br><br>

          						</div>

          					</div>

          					<div class="col-xs-6 column-break">

          						<div> <br><br>
          						</div>

          					</div>

          				</div>

          				<div class="row section-break">
          					LADO 2
          					<div class="col-xs-6 column-break">

          						<div>
          							{% set links = frappe.get_all('Dynamic Link', filters={'link_doctype': 'Company',
          							'link_name': invoiceData.company, 'parenttype': 'Address'}, fields=['parent']) %}
          							{% if links %}
          							{% set address = frappe.get_doc("Address", links[0].parent) %}
          							{{ address.address_line1 }}<br>
          							{{ address.city }} - {{ address.country }}<br>
          							Telef. {{ address.phone }}<br>
          							Email: {{ address.email_id }}<br>
          							{{ frappe.db.get_value('Company',invoiceData.company,"registration_details") }}<br>
          							{% endif %}
          							{% set ff = frappe.get_doc("Letter Head", "Bancos") %}

          							<div class="text-left small letter-head-footer">
          								{{ ff.footer }}
          							</div>


          						</div>

          					</div>

          					<div class="col-xs-6 column-break">

          						<div>Exmo(s) Senhor(es)

          							<h3>{{ invoiceData.customer_name }}</h3>
          							{% if invoiceData.tax_id %} <b>NIF: {{ invoiceData.tax_id }}</b> {% endif %}
          							<br>{% if invoiceData.address_display %} {{ invoiceData.address_display }} {% endif %}
          							{% if invoiceData.contact_mobile %} {{ invoiceData.contact_mobile }} {% endif %}
          						</div>
          						{% if invoiceData.po_no %}
          						<div>
          							PO {{ invoiceData.po }} &nbsp;&nbsp; {{ _("Order Date") }} {{ invoiceData.po_date }}
          						</div>
          						{% endif %}
          					</div>

          				</div>


          				<div class="row section-break">
          					<div class="col-xs-6 column-break">

          						<div> <b> {{ _("Date") }}: {{ invoiceData.get_formatted("posting_date") }} </b>

          						</div>

          					</div>

          					<div class="col-xs-6 column-break">
          						<div class="col-xs-6 column-break">
          							<div> <b> Válida até:0 {{ invoiceData.get_formatted("due_date") }} </b>
          								<b>Estado: </b> {{ invoiceData.status }}
          							</div>
          							<div> <b> </b>

          								<br>

          							</div>
          							<div class="col-xs-6 column-break">
          								<div> <b> </b>
          								</div>
          								<div> <b> </b>

          								</div>


          							</div>
          						</div>
          						<div class="col-xs-6 column-break">

          							<div>
          								<b>0 {{ invoiceData.terms }} </b>
          								<br>

          							</div>


          						</div>
          					</div>
          				</div>


          			</div>
          		</div>

          		{% endmacro %}




          		{% macro below_items() %}
          	</div>


          	<div>

          		<div class="footer text-center small page-number visible-pdf" style="font-size:6px">


          			{% set moeda = frappe.get_doc("Currency", invoiceData.currency) %}
          			{% if invoiceData.payment_terms_template %}
          			<div style="text-align:left;font-size:10px"> Metodo de Pagamento</div>
          			<table width="60%" style="border-top: solid thin; font-size: 10px">
          				<tr>
          					<td style="text-align:left;">{{ _("Description") }}</td>
          					<td style="text-align:left;">{{ _("Due Date") }}</td>
          					<td style="text-align:left;">{{ _("Invoice Portion") }}</td>
          					<td style="text-align:right;">{{ _("Payment Amount") }}</td>

          				</tr>

          				{%- for row in invoiceData.payment_schedule -%}
          				<tr>
          					<td style="text-align:left;">{{row.description}}</td>
          					<td style="text-align:left;">{{row.due_date}} </td>
          					<td style="text-align:left;">{{row.get_formatted("invoice_portion") | replace(".0","")}} </td>
          					<td style="text-align:right;">{{row.get_formatted("payment_amount")}} {{ moeda.symbol }}</td>

          				</tr>
          				{%-endfor-%}

          			</table>
          			{% endif %}
          			{% if doc.is_pos %}
          			<div style="text-align:left;font-size:10px"> Pagamento</div>
          			<table width="60%" style="border-top: solid thin; font-size: 10px">
          				<tr>
          					<td style="text-align:left;">{{ ("Forma de Pagamento") }}</td>
          					<td style="text-align:left;">{{ ("Tipo") }}</td>
          					<td style="text-align:right;">{{ ("Valor do Pagamento") }}</td>
          					{% if doc.outstanding_amount %} <td style="text-align:right;">{{ ("Valor em Falta") }}</td> {% endif
          					%}

          				</tr>

          				{%- for row1 in doc.advances -%}
          				{%if row1.allocated_amount != 0 %}
          				<tr>
          					<td style="text-align:left;">{{row1.reference_name}}</td>
          					<td style="text-align:left;">{{ _(row1.reference_type) }} </td>
          					<td style="text-align:right;">{{row1.get_formatted("allocated_amount")}} {{ moeda.symbol }}</td>
          					{% if doc.outstanding_amount %} <td style="text-align:right;">
          						{{doc.get_formatted("outstanding_amount")}} {{ moeda.symbol }}</td> {% endif %}

          				</tr>
          				{% endif %}
          				{%-endfor-%}


          				{%- for row in doc.payments -%}
          				{%if row.amount != 0 %}
          				<tr>
          					<td style="text-align:left;">{{row.mode_of_payment}}</td>
          					<td style="text-align:left;">{{ _(row.type) }} </td>
          					<td style="text-align:right;">{{row.get_formatted("amount")}} {{ moeda.symbol }}</td>
          					{% if doc.outstanding_amount %} <td style="text-align:right;">
          						{{doc.get_formatted("outstanding_amount")}} {{ moeda.symbol }}</td> {% endif %}

          				</tr>
          				{% endif %}
          				{%-endfor-%}

          			</table>
          			{% elif doc.advances %}
          			<div style="text-align:left;font-size:10px"> Adiantamento</div>
          			<table width="60%" style="border-top: solid thin; font-size: 10px">
          				<tr>
          					<td style="text-align:left;">{{ ("Forma de Pagamento") }}</td>
          					<td style="text-align:left;">{{ ("Tipo") }}</td>
          					<td style="text-align:right;">{{ ("Valor do Pagamento") }}</td>
          					{% if doc.outstanding_amount %} <td style="text-align:right;">{{ ("Valor em Falta") }}</td> {% endif
          					%}

          				</tr>

          				{%- for row1 in doc.advances -%}
          				{%if row1.allocated_amount != 0 %}
          				<tr>
          					<td style="text-align:left;">{{row1.reference_name}}</td>
          					<td style="text-align:left;">{{ _(row1.reference_type) }} </td>
          					<td style="text-align:right;">{{row1.get_formatted("allocated_amount")}} {{ moeda.symbol }}</td>
          					{% if doc.outstanding_amount %} <td style="text-align:right;">
          						{{doc.get_formatted("outstanding_amount")}} {{ moeda.symbol }}</td> {% endif %}

          				</tr>
          				{% endif %}
          				{%-endfor-%}


          			</table>

          			{% endif %}
          			<div>
          				{% set naomotivo = [0] %}

          				{%- for row in doc.items -%}
          				{%- set adicionarmotivo = [0] -%}
          				{% if row.isento_iva %}
          				{% if motivoisencao == [0] %}
          				{% if motivoisencao.append(row.motivo_isencao) %}{% endif %}
          				{% if adicionarmotivo.append(adicionarmotivo.pop() - 1) %}{% endif %}
          				{% else %}

          				{%- for x in motivoisencao -%}

          				{% if row.motivo_isencao == x %}

          				{% if adicionarmotivo.append(adicionarmotivo.pop() - 1) %}{% endif %}
          				{% endif %}

          				{%-endfor-%}

          				{% endif %}

          				{% if adicionarmotivo == [0] %}
          				{% if motivoisencao.append(row.motivo_isencao) %}{% endif %}
          				{% endif %}

          				{% endif %}

          				{%-endfor-%}
          				{%- for x in (motivoisencao) -%}

          				{% if x != 0 %}

          				{% if loop.index == 2 %}
          				<p style="text-align:left; font-size:10px;"> * {{ x }} </p>
          				{% endif %}
          				{% if loop.index == 3 %}
          				<p style="text-align:left; font-size:10px;"> ** {{ x }} </p>
          				{% endif %}
          				{% if loop.index == 4 %}

          				<p style="text-align:left; font-size:10px;"> *** {{ x }} </p>
          				{% endif %}
          				{% if loop.index == 5 %}
          				<p style="text-align:left; font-size:10px;"> **** {{ x }} </p>
          				{% endif %}
          				{% endif %}
          				{%-endfor-%}



          			</div>


          			<table width="100%" style="border-top: solid thin; font-size: 10px">
          				<tr>
          					<td width="20%" style="text-align:left;">Incidência </td>
          					{% if doc.base_retencao_fonte %}
          					<td style="text-align:left;">Taxa</td>
          					{% else %}
          					<td style="text-align:left;">Iva</td>
          					{% endif %}
          					{% if doc.taxes_and_charges %}
          					{% if doc.base_retencao_fonte %}
          					<td style="text-align:left;">Total Retenção</td>
          					{% else %}

          					{% if "IPC" not in doc.taxes_and_charges %}
          					<td style="text-align:left;">Imposto</td>
          					{% else %}
          					<td style="text-align:left;">Total Retenção</td>
          					{% endif %}
          					{% endif %}
          					{% else %}
          					{% if doc.base_retencao_fonte %}
          					<td style="text-align:left;">Total Retenção</td>
          					{% else %}
          					<td style="text-align:left;">Imposto</td>
          					{% endif %}


          					{% endif %}
          					<td style="text-align:left;"></td>
          					<td style="text-align:left;">Total Iliquido</td>
          					<td style="text-align:right; ">{{doc.get_formatted("total",doc).lstrip("-")}} {{ moeda.symbol }}
          					</td>
          				</tr>
          				<tr>

          					{% if doc.base_retencao_fonte %} <td style="text-align:left;">
          						{{doc.get_formatted("base_retencao_fonte")}} {{ moeda.symbol }} </td> {% endif %}
          					{% if doc.base_retencao_fonte %} <td style="text-align:left;"> {{ 100 - (((doc.base_retencao_fonte -
          						doc.total_retencao_na_fonte) / doc.base_retencao_fonte) * 100) }} </td> {% endif %}
          					{% if doc.base_retencao_fonte %} <td style="text-align:left;"> {{
          						doc.get_formatted("total_retencao_na_fonte")}} {{ moeda.symbol }} </td> {% endif %}

          					{% set ipc = frappe.get_doc("Retencoes", "IVA") %}

          					{%- for row in doc.items -%}

          					{% if row.isento_iva == 0 %}
          					{% if row.iva | int == 0 or row.iva | int == 14 %}
          					{% if incidenciaiva.append(incidenciaiva.pop() + row.net_amount) %}{% endif %}
          					{% if row.iva | int == 0 and frappe.db.get_value('Company',doc.company,"regime_do_iva") == "Regime
          					Geral" %}
          					{% if iva.append(iva.pop() + 14) %}{% endif %}
          					{% else %}
          					{% if iva.append(iva.pop() + row.iva) %}{% endif %}
          					{% endif %}

          					{% else %}
          					{% if incidenciaivaii.append(incidenciaivaii.pop() + row.net_amount) %}{% endif %}
          					{% if row.iva != ivaii[0] %}
          					{% if ivaii.append(ivaii.pop() + row.iva) %}{% endif %}
          					{% endif %}
          					{% endif %}
          					{% endif %}

          					{%-endfor-%}
          					{% if doc.taxes_and_charges %}
          					{% if doc.base_retencao_fonte %}
          					{% elif incidenciaiva[0] != 0 %}

          					{% if "IPC" not in doc.taxes_and_charges %} <td style="text-align:left;">{% if
          						doc.total_taxes_and_charges %} {% set d = incidenciaiva[0] %} {{
          						"{:,.2f}".format(d|float).lstrip("-") }} {% else %} 0.00 {% endif %} {{ moeda.symbol }} </td> {%
          					endif %}
          					{% if "IPC" not in doc.taxes_and_charges %} <td style="text-align:left;">{% if
          						doc.total_taxes_and_charges %} {% if iva %} {{ iva[0] | replace(".0","") }}% {% else %} {{
          						ipc.get_formatted("percentagem") | replace(".0","") }} {% endif %} {% endif %} </td> {% endif %}
          					{% if "IPC" not in doc.taxes_and_charges %} <td style="text-align:left;">{% if iva %} {{
          						"{:,.2f}".format((d * iva[0]) / 100).lstrip("-") }} {{ moeda.symbol }} {% endif %} </td> {%
          					endif %}

          					{% if "IPC" in doc.taxes_and_charges %}
          					<td style="text-align:left;">AQ 0.00 {{ moeda.symbol }} </td>
          					<td style="text-align:left;">AQ 0.00 {{ moeda.symbol }} </td>
          					<td style="text-align:left;">AQ 0.00 {{ moeda.symbol }} </td>
          					{% endif %}

          					{%- set incidenciaiva = [0] -%}
          					{%- set iva = [0] -%}

          					{% elif incidenciaivaii[0] != 0 %}
          					{% if "IPC" not in doc.taxes_and_charges %} <td style="text-align:left;"> {% if
          						doc.total_taxes_and_charges %} {% set d1 = incidenciaivaii[0] %} {{
          						"{:,.2f}".format(d1|float).lstrip("-") }} {% else %} 0.00 {% endif %} {{ moeda.symbol }} </td>
          					{% endif %}
          					{% if "IPC" not in doc.taxes_and_charges %} <td style="text-align:left;"> {% if
          						doc.total_taxes_and_charges %} {% if ivaii %} {{ ivaii[0] | replace(".0","") }}% {% else %} {{
          						ipc.get_formatted("percentagem") | replace(".0","") }} {% endif %} {% endif %} </td> {% endif %}
          					{% if "IPC" not in doc.taxes_and_charges %} <td style="text-align:left;">{% if ivaii %} {{
          						"{:,.2f}".format((d1 * ivaii[0]) / 100).lstrip("-") }} {{ moeda.symbol }} {% endif %} </td> {%
          					endif %}

          					{%- set incidenciaivaii = [0] -%}
          					{%- set ivaii = [0] -%}

          					{% else %}
          					<td style="text-align:left;"></td>
          					<td style="text-align:left;"></td>
          					<td style="text-align:left;"></td>

          					{% endif %}
          					{% else %}
          					{% if doc.base_retencao_fonte %}
          					{% else %}
          					<td style="text-align:left;"></td>
          					<td style="text-align:left;"></td>
          					<td style="text-align:left;"></td>
          					{% endif %}
          					{% endif %}

          					<td style="text-align:left;"></td>
          					<td style="text-align:left;">Desconto Linha</td>
          					{% set mostrardescontlinha = frappe.db.get_single_value('Emergencia','mostrar_desconto_linha') %}
          					<td id="descontolinha" style="text-align:right; ">{% if mostrardescontlinha == 1 %}
          						{{doc.get_formatted("total_desconto_linha",doc).lstrip("-")}} {% else %} 0.00 {% endif %} {{
          						moeda.symbol }} </td>
          				</tr>
          				<tr>
          					{% if doc.taxes_and_charges %}

          					{% if incidenciaiva[0] != 0 %}

          					{% if "IPC" not in doc.taxes_and_charges %} <td style="text-align:left;">{% if
          						doc.total_taxes_and_charges %} {% set d = incidenciaiva[0] %} {{
          						"{:,.2f}".format(d|float).lstrip("-") }} {% else %} 0.00 {% endif %} {{ moeda.symbol }} </td> {%
          					endif %}
          					{% if "IPC" not in doc.taxes_and_charges %} <td style="text-align:left;"> {% if
          						doc.total_taxes_and_charges %} {% if iva %} {{ iva[0] | replace(".0","") }}% {% else %} {{
          						ipc.get_formatted("percentagem") | replace(".0","") }} {% endif %} {% endif %} </td> {% endif %}
          					{% if "IPC" not in doc.taxes_and_charges %} <td style="text-align:left;">{% if iva %} {{
          						"{:,.2f}".format((d * iva[0]) / 100).lstrip("-") }} {{ moeda.symbol }} {% endif %} </td> {%
          					endif %}

          					{% if "IPC" in doc.taxes_and_charges %}
          					<td style="text-align:left;">AQ 0.00 {{ moeda.symbol }} </td>
          					<td style="text-align:left;">AQ 0.00 {{ moeda.symbol }} </td>
          					<td style="text-align:left;">AQ 0.00 {{ moeda.symbol }} </td>
          					{% endif %}
          					{% elif incidenciaivaii[0] != 0 %}
          					{% if "IPC" not in doc.taxes_and_charges %} <td style="text-align:left;"> {% if
          						doc.total_taxes_and_charges %} {% set d1 = incidenciaivaii[0] %} {{
          						"{:,.2f}".format(d1|float).lstrip("-") }} {% else %} 0.00 {% endif %} {{ moeda.symbol }} </td>
          					{% endif %}
          					{% if "IPC" not in doc.taxes_and_charges %} <td style="text-align:left;"> {% if
          						doc.total_taxes_and_charges %} {% if ivaii %} {{ ivaii[0] | replace(".0","") }}% {% else %} {{
          						ipc.get_formatted("percentagem") | replace(".0","") }} {% endif %} {% endif %} </td> {% endif %}
          					{% if "IPC" not in doc.taxes_and_charges %} <td style="text-align:left;">{% if ivaii %} {{
          						"{:,.2f}".format((d1 * ivaii[0]) / 100).lstrip("-") }} {{ moeda.symbol }} {% endif %} </td> {%
          					endif %}

          					{%- set incidenciaivaii = [0] -%}



          					{% else %}
          					<td colspan="3" style="text-align:left;"></td>
          					{% endif %}
          					{% else %}
          					<td colspan="3" style="text-align:left;"></td>
          					{% endif %}
          					<td style="text-align:left;"></td>
          					<td style="text-align:left;">Desconto</td>
          					<td style="text-align:right; "> {{doc.get_formatted("discount_amount",doc).lstrip("-")}} {{
          						moeda.symbol }}</td>
          				</tr>

          				<tr>
          					{% if doc.taxes_and_charges %}
          					{% if incidenciaivaii[0] != 0 %}
          					{% if "IPC" not in doc.taxes_and_charges %} <td style="text-align:left;"> {% if
          						doc.total_taxes_and_charges %} {% set d1 = incidenciaivaii[0] %} {{
          						"{:,.2f}".format(d1|float).lstrip("-") }} {% else %} 0.00 {% endif %} {{ moeda.symbol }} </td>
          					{% endif %}
          					{% if "IPC" not in doc.taxes_and_charges %} <td style="text-align:left;"> {% if
          						doc.total_taxes_and_charges %} {% if ivaii %} {{ ivaii[0] | replace(".0","") }}% {% else %} {{
          						ipc.get_formatted("percentagem") | replace(".0","") }} {% endif %} {% endif %} </td> {% endif %}
          					{% if "IPC" not in doc.taxes_and_charges %} <td style="text-align:left;">{% if ivaii %} {{
          						"{:,.2f}".format((d1 * ivaii[0]) / 100).lstrip("-") }} {{ moeda.symbol }} {% endif %} </td> {%
          					endif %}

          					{%- set incidenciaivaii = [0] -%}



          					{% else %}
          					<td colspan="3" style="text-align:left;"><b>{% if doc.tc_name %} {{ doc.tc_name }}:</b> {{ doc.terms
          						}} {% elif doc.terms %} {{ doc.terms }} {% endif %}</td>
          					{% endif %}
          					{% else %}
          					<td colspan="3" style="text-align:left;"><b>{% if doc.tc_name %} {{ doc.tc_name }}:</b> {{ doc.terms
          						}} {% elif doc.terms %} {{ doc.terms }} {% endif %}</td>
          					{% endif %}

          					<td style="text-align:left;"></td>
          					<td style="text-align:left;">Total Liquido</td>
          					<td style="text-align:right; "> {{doc.get_formatted("net_total",doc).lstrip("-")}} {{ moeda.symbol
          						}}</td>
          				</tr>
          				{% if doc.iva_cativo_valor %}
          				<tr>
          					<td style="text-align:left;"></td>
          					<td style="text-align:left;"></td>
          					<td style="text-align:left;"></td>
          					<td style="text-align:left;"></td>
          					<td style="text-align:left;">IVA Cativo</td>
          					<td style="text-align:right; "> {{ doc.iva_cativo_percentagem | replace(".0","") }} &nbsp;&nbsp;{{
          						doc.get_formatted("iva_cativo_valor").lstrip("-") }} {{ moeda.symbol }}</td>
          				</tr>
          				{% elif doc.iva_cativo_percentagem %}
          				<tr>
          					<td style="text-align:left;"></td>
          					<td style="text-align:left;"></td>
          					<td style="text-align:left;"></td>
          					<td style="text-align:left;"></td>
          					<td style="text-align:left;">IVA Cativo</td>
          					<td style="text-align:right; "> {{ doc.iva_cativo_percentagem | replace(".0","") }} &nbsp;&nbsp;{{
          						doc.taxes[0].get_formatted('tax_amount') }} {{ moeda.symbol }}</td>
          				</tr>


          				{% endif %}

          				<tr>
          					<td style="text-align:left;"></td>
          					<td style="text-align:left;"></td>
          					<td style="text-align:left;"></td>
          					<td style="text-align:left;"></td>
          					{% if doc.taxes_and_charges %}
          					{% if "IPC" in doc.taxes_and_charges %}
          					{% if "Transitorio" not in frappe.db.get_value("Company", doc.company,"regime_do_iva") %}
          					{% if "Sujeicao" not in frappe.db.get_value("Company", doc.company,"regime_do_iva") %}
          					<td style="text-align:left;">IPC</td>
          					{% set ipc = frappe.get_doc("Retencoes", "IPC") %}
          					<td style="text-align:right; ">{{ ipc.get_formatted("percentagem") | replace(".0","") }}
          						&nbsp;&nbsp;{{ doc.get_formatted("total_taxes_and_charges") }} {{ moeda.symbol }}</td>
          					{% endif %}
          					{% endif %}
          					{% endif %}

          					{% if "IPC" not in doc.taxes_and_charges %}
          					{% if doc.total_taxes_and_charges %}
          					<td style="text-align:left;">IVA</td>
          					{% set ipc = frappe.get_doc("Retencoes", "IVA") %}
          					<td style="text-align:right; "> {% if ivaii[0] != 0 %} {% else %} {% if iva[0] != 0 %} {{ iva[0] |
          						replace(".0","") }}% {% else %} {{ ipc.get_formatted("percentagem") | replace(".0","") }} {%
          						endif %}{% endif %} &nbsp;&nbsp;{{ doc.get_formatted("total_taxes_and_charges").lstrip("-") }}
          						{{ moeda.symbol }}</td>
          					{% endif %}
          					{% endif %}
          					{% endif %}

          				</tr>
          				<tr>
          					<td colspan="2" style="text-align:left; ">{% if doc.base_retencao_fonte %} {% if doc.que_retencao ==
          						"IPU" %} <b>Lei 20/20 IP </b> {% else %} <b>Lei 19/14 de Retenções na Fonte </b>{% endif %}{%
          						endif %}</td>
          					<td></td>

          					<td style="text-align:left;"></td>
          					<td style="text-align:left; border-top: solid thin;font-size:12px;"><strong>TOTAL </strong></td>
          					<td style="text-align:right; border-top: solid thin;font-size:12px;"><strong>
          							{{doc.get_formatted("grand_total",doc).lstrip("-")}} {{ moeda.symbol }}</strong></td>
          				</tr>
          				{% if doc.contravalor %}
          				<tr>
          					<td colspan="2" style="text-align:left; "></td>
          					<td></td>

          					<td style="text-align:left;"></td>

          					{% set cambiomoeda = frappe.get_all('Currency Exchange', filters={'from_currency':
          					doc.contravalor,'date': doc.posting_date}, fields=['exchange_rate'], order_by='date DESC', limit=1)
          					%}
          					{% if cambiomoeda[0] %}
          					<td style="text-align:left; border-top: solid thin;font-size:12px;">Total ({{ doc.contravalor }})
          					</td>
          					<td style="text-align:right; border-top: solid thin;font-size:12px;"> {{
          						'{0:0,.2f}'.format((doc.grand_total / cambiomoeda[0]['exchange_rate'])|float) }}</td>
          					{% else %}
          					<td style="text-align:right; border-top: solid thin;font-size:12px;">NAO TEM CAMBIO...</td>
          					{% endif %}


          				</tr>
          				{% elif doc.currency != 'KZ' %}

          				{% if doc.conversion_rate %}
          				<tr>
          					<td colspan="2" style="text-align:left; "></td>
          					<td></td>

          					<td style="text-align:left;"></td>

          					<td style="text-align:left; border-top: solid thin;font-size:12px;">Total (KZ)</td>
          					<td style="text-align:right; border-top: solid thin;font-size:12px;"> {{
          						'{0:0,.2f}'.format((doc.grand_total * doc.conversion_rate)|float) }}</td>

          				</tr>
          				{% endif %}



          				{% endif %}

          				<tr>
          					<td colspan="3" style="text-align:left;">
          						Bens / Serviços colocados a disposição do adquirente a data do documento. <br>
          						<u>{{ frappe.db.get_value('Company',doc.company,"regime_do_iva") }}</u>
          					</td>

          				</tr>
          				{% if doc.is_return %}
          				<tr>
          					<td colspan="3" style="text-align:left;">
          						<p class="text-left" style="font-size:10px">
          							<span style="float: left"><b>Entreguei:</b> _________________________</span>
          							<span style="float: right"><b>Recebi:</b> _________________________</span>
          						</p>

          					</td>
          				</tr>
          				{% endif %}

          			</table>

          			<div id="footer-html" class="text-center small ">
          				{% set lic = frappe.get_hooks("agt_lic",app_name="angola_erp") %}
          				{% if doc.hash_erp %}
          				<div class="text-center" style="font-size:10px"><b><small> {{ doc.hash_erp[0:1] }}{{ doc.hash_erp[10:11]
          							}}{{ doc.hash_erp[20:21] }}{{ doc.hash_erp[30:31] }} - Processado por programa validado n.
          							{{ lic[0][1:3] }}/AGT/19 &nbsp;© AngolaERP | {{ _("Page {0} of {1}").format('<span
          								class="page"></span>', '<span class="topage"></span>') }} </small> </b> </div>
          				{% else %}
          				<div class="text-center" style="font-size:10px"><b><small>Processado por Computador /&nbsp;© AngolaERP /
          							| {{ _("Page {0} of {1}").format('<span class="page"></span>', '<span
          								class="topage"></span>') }} </small> </b> </div>
          				{% endif %}
          			</div>


          		</div>



          	</div>
          	{% endmacro %}


          	{% macro below_items_nofooter() %}



          	<div>

          		<div class="text-center small page-number " style="font-size:6px">
          			{%- set incidenciaiva = [0] -%}
          			{%- set iva = [0] -%}
          			{% set moeda = frappe.get_doc("Currency", doc.currency) %}
          			{% if doc.payment_terms_template %}
          			<div style="text-align:left;font-size:10px"> Metodo de Pagamento</div>
          			<table width="60%" style="border-top: solid thin; font-size: 10px">
          				<tr>
          					<td style="text-align:left;">{{ _("Description") }}</td>
          					<td style="text-align:left;">{{ _("Due Date") }}</td>
          					<td style="text-align:left;">{{ _("Invoice Portion") }}</td>
          					<td style="text-align:right;">{{ _("Payment Amount") }}</td>

          				</tr>

          				{%- for row in doc.payment_schedule -%}
          				<tr>
          					<td style="text-align:left;">{{row.description}}</td>
          					<td style="text-align:left;">{{row.due_date}} </td>
          					<td style="text-align:left;">{{row.get_formatted("invoice_portion") | replace(".0","")}} </td>
          					<td style="text-align:right;">{{row.get_formatted("payment_amount")}} {{ moeda.symbol }}</td>

          				</tr>
          				{%-endfor-%}

          			</table>
          			{% endif %}
          			<div>
          				{% set naomotivo = [0] %}

          				{%- for row in doc.items -%}
          				{%- set adicionarmotivo = [0] -%}
          				{% if row.isento_iva %}
          				{% if motivoisencao2 == [0] %}
          				{% if motivoisencao2.append(row.motivo_isencao) %}{% endif %}
          				{% if adicionarmotivo.append(adicionarmotivo.pop() - 1) %}{% endif %}
          				{% else %}

          				{%- for x in motivoisencao2 -%}

          				{% if row.motivo_isencao == x %}

          				{% if adicionarmotivo.append(adicionarmotivo.pop() - 1) %}{% endif %}
          				{% endif %}

          				{%-endfor-%}

          				{% endif %}

          				{% if adicionarmotivo == [0] %}
          				{% if motivoisencao2.append(row.motivo_isencao) %}{% endif %}
          				{% endif %}

          				{% endif %}

          				{%-endfor-%}
          				{%- for x in (motivoisencao2) -%}

          				{% if x != 0 %}

          				{% if loop.index == 2 %}
          				<p style="text-align:left; font-size:10px;"> * {{ x }} </p>
          				{% endif %}
          				{% if loop.index == 3 %}
          				<p style="text-align:left; font-size:10px;"> ** {{ x }} </p>
          				{% endif %}
          				{% if loop.index == 4 %}

          				<p style="text-align:left; font-size:10px;"> *** {{ x }} </p>
          				{% endif %}
          				{% if loop.index == 5 %}
          				<p style="text-align:left; font-size:10px;"> **** {{ x }} </p>
          				{% endif %}
          				{% endif %}
          				{%-endfor-%}



          			</div>
          			<table width="100%" style="border-top: solid thin; font-size: 10px">
          				<tr>
          					<td width="20%" style="text-align:left;">Incidência </td>
          					<td style="text-align:left;">Iva </td>

          					{% if doc.taxes_and_charges %}
          					{% if doc.base_retencao_fonte %}
          					<td style="text-align:left;">Total Retenção</td>
          					{% else %}

          					{% if "IPC" not in doc.taxes_and_charges %}
          					<td style="text-align:left;">Imposto</td>
          					{% else %}
          					<td style="text-align:left;">Total Retenção</td>
          					{% endif %}
          					{% endif %}
          					{% else %}
          					{% if doc.base_retencao_fonte %}
          					<td style="text-align:left;">Total Retenção</td>
          					{% else %}
          					<td style="text-align:left;">Imposto</td>
          					{% endif %}

          					{% endif %}
          					<td style="text-align:left;"></td>
          					<td style="text-align:left;">Total Iliquido</td>
          					<td style="text-align:right; ">{{doc.get_formatted("total",doc).lstrip("-")}} {{ moeda.symbol }}
          					</td>
          				</tr>
          				<tr>

          					{% if doc.base_retencao_fonte %} <td style="text-align:left;">
          						{{doc.get_formatted("base_retencao_fonte")}} {{ moeda.symbol }} </td> {% endif %}
          					{% if doc.base_retencao_fonte %} <td style="text-align:left;"> {{ 100 - (((doc.base_retencao_fonte -
          						doc.total_retencao_na_fonte) / doc.base_retencao_fonte) * 100) }} </td> {% endif %}
          					{% if doc.base_retencao_fonte %} <td style="text-align:left;"> {{
          						doc.get_formatted("total_retencao_na_fonte")}} {{ moeda.symbol }} </td> {% endif %}

          					{% set ipc = frappe.get_doc("Retencoes", "IVA") %}
          					{%- for tax in doc.taxes -%}
          					{% if "3451" in tax.account_head %}
          					{% if iva.append(iva.pop() + tax.rate) %}{% endif %}
          					{% endif %}
          					{%- endfor -%}

          					{%- for row in doc.items -%}

          					{% if row.isento_iva == 0 %}
          					{% if row.iva == 0 %}
          					{% if incidenciaiva.append(incidenciaiva.pop() + row.net_amount) %}{% endif %}
          					{% endif %}
          					{% endif %}

          					{%-endfor-%}
          					{% if doc.taxes_and_charges %}
          					{% if "IPC" not in doc.taxes_and_charges %} <td style="text-align:left;">{% if
          						doc.total_taxes_and_charges %} {% set d = incidenciaiva[0] %} {{
          						"{:,.2f}".format(d|float).lstrip("-") }} {% else %} 0.00 {% endif %} {{ moeda.symbol }} </td> {%
          					endif %}
          					{% if "IPC" not in doc.taxes_and_charges %} <td style="text-align:left;">{% if
          						doc.total_taxes_and_charges %} {% if iva %} {{ iva[0] | replace(".0","") }}% {% else %} {{
          						ipc.get_formatted("percentagem") | replace(".0","") }} {% endif %} {% endif %} </td> {% endif %}
          					{% if "IPC" not in doc.taxes_and_charges %} <td style="text-align:left;"> {{
          						doc.get_formatted("total_taxes_and_charges").lstrip("-")}} {{ moeda.symbol }} </td> {% endif %}
          					{% if doc.base_retencao_fonte %}
          					{% else %}
          					{% if "IPC" in doc.taxes_and_charges %}
          					<td style="text-align:left;"> 0.00 {{ moeda.symbol }} </td>
          					<td style="text-align:left;"> 0.00 {{ moeda.symbol }} </td>
          					<td style="text-align:left;"> 0.00 {{ moeda.symbol }} </td>
          					{% endif %}
          					{% endif %}
          					{% else %}
          					{% if doc.base_retencao_fonte %}
          					{% else %}
          					<td style="text-align:left;"></td>
          					<td style="text-align:left;"></td>
          					<td style="text-align:left;"></td>
          					{% endif %}
          					{% endif %}

          					<td style="text-align:left;"></td>
          					<td style="text-align:left;">Desconto Linha</td>
          					{% set mostrardescontlinha = frappe.db.get_single_value('Emergencia','mostrar_desconto_linha') %}
          					<td id="descontolinha" style="text-align:right; ">{% if mostrardescontlinha == 1 %}
          						{{doc.get_formatted("total_desconto_linha",doc).lstrip("-")}} {% else %} 0.00 {% endif %} {{
          						moeda.symbol }}</td>
          				</tr>
          				<tr>
          					<td colspan="3" style="text-align:left;"><b>{% if doc.tc_name %} {{ doc.tc_name }}:</b> {{ doc.terms
          						}} {% endif %}</td>
          					<td style="text-align:left;"></td>
          					<td style="text-align:left;">Desconto</td>
          					<td style="text-align:right; "> {{doc.get_formatted("discount_amount",doc).lstrip("-")}} {{
          						moeda.symbol }}</td>
          				</tr>

          				<tr>
          					<td colspan="3" style="text-align:left;"></td>
          					<td style="text-align:left;"></td>
          					<td style="text-align:left;">Total Liquido</td>
          					<td style="text-align:right; "> {{doc.get_formatted("net_total",doc).lstrip("-")}} {{ moeda.symbol
          						}}</td>
          				</tr>
          				{% if doc.iva_cativo_valor %}
          				<tr>
          					<td style="text-align:left;"></td>
          					<td style="text-align:left;"></td>
          					<td style="text-align:left;"></td>
          					<td style="text-align:left;"></td>
          					<td style="text-align:left;">IVA Cativo</td>
          					<td style="text-align:right; "> {{ doc.iva_cativo_percentagem | replace(".0","") }} &nbsp;&nbsp;{{
          						doc.get_formatted("iva_cativo_valor").lstrip("-") }} {{ moeda.symbol }}</td>
          				</tr>
          				{% elif doc.iva_cativo_percentagem %}
          				<tr>
          					<td style="text-align:left;"></td>
          					<td style="text-align:left;"></td>
          					<td style="text-align:left;"></td>
          					<td style="text-align:left;"></td>
          					<td style="text-align:left;">IVA Cativo</td>
          					<td style="text-align:right; "> {{ doc.iva_cativo_percentagem | replace(".0","") }} &nbsp;&nbsp;{{
          						doc.taxes[0].get_formatted('tax_amount') }} {{ moeda.symbol }}</td>
          				</tr>


          				{% endif %}

          				<tr>
          					<td style="text-align:left;"></td>
          					<td style="text-align:left;"></td>
          					<td style="text-align:left;"></td>
          					<td style="text-align:left;"></td>
          					{% if doc.taxes_and_charges %}
          					{% if "IPC" in doc.taxes_and_charges %}
          					{% if "Transitorio" not in frappe.db.get_value("Company", doc.company,"regime_do_iva") %}
          					{% if "Sujeicao" not in frappe.db.get_value("Company", doc.company,"regime_do_iva") %}
          					<td style="text-align:left;">IPC</td>
          					{% set ipc = frappe.get_doc("Retencoes", "IPC") %}
          					<td style="text-align:right; ">{{ ipc.get_formatted("percentagem") | replace(".0","") }}
          						&nbsp;&nbsp;{{ doc.get_formatted("total_taxes_and_charges") }} {{ moeda.symbol }}</td>
          					{% endif %}
          					{% endif %}
          					{% endif %}

          					{% if "IPC" not in doc.taxes_and_charges %}
          					{% if doc.total_taxes_and_charges %}
          					<td style="text-align:left;">IVA</td>
          					{% set ipc = frappe.get_doc("Retencoes", "IVA") %}
          					<td style="text-align:right; "> {% if ivaii[0] != 0 %} {% else %} {% if iva[0] != 0 %} {{ iva[0] |
          						replace(".0","") }}% {% else %} {{ ipc.get_formatted("percentagem") | replace(".0","") }} {%
          						endif %}{% endif %} &nbsp;&nbsp;{{ doc.get_formatted("total_taxes_and_charges").lstrip("-") }}
          						{{ moeda.symbol }}</td>
          					{% endif %}
          					{% endif %}
          					{% endif %}

          				</tr>
          				<tr>
          					<td colspan="2" style="text-align:left; ">{% if doc.base_retencao_fonte %} {% if doc.que_retencao ==
          						"IPU" %} <b>Lei 20/20 IP </b> {% else %} <b>Lei 19/14 de Retenções na Fonte </b>{% endif %}{%
          						endif %}</td>
          					<td></td>

          					<td style="text-align:left;"></td>
          					<td style="text-align:left; border-top: solid thin;font-size:12px;"><strong>TOTAL </strong></td>
          					<td style="text-align:right; border-top: solid thin;font-size:12px;"><strong>
          							{{doc.get_formatted("grand_total",doc).lstrip("-")}} {{ moeda.symbol }}</strong></td>
          				</tr>
          				{% if doc.contravalor %}
          				<tr>
          					<td colspan="2" style="text-align:left; "></td>
          					<td></td>

          					<td style="text-align:left;"></td>

          					{% set cambiomoeda = frappe.get_all('Currency Exchange', filters={'from_currency':
          					doc.contravalor,'date': doc.posting_date}, fields=['exchange_rate'], order_by='date DESC', limit=1)
          					%}
          					{% if cambiomoeda[0] %}
          					<td style="text-align:left; border-top: solid thin;font-size:12px;">Total ({{ doc.contravalor }})
          					</td>
          					<td style="text-align:right; border-top: solid thin;font-size:12px;"> {{
          						'{0:0,.2f}'.format((doc.grand_total / cambiomoeda[0]['exchange_rate'])|float) }}</td>
          					{% else %}
          					<td style="text-align:right; border-top: solid thin;font-size:12px;">NAO TEM CAMBIO...</td>
          					{% endif %}


          				</tr>
          				{% elif doc.currency != 'KZ' %}

          				{% if doc.conversion_rate %}
          				<tr>
          					<td colspan="2" style="text-align:left; "></td>
          					<td></td>

          					<td style="text-align:left;"></td>

          					<td style="text-align:left; border-top: solid thin;font-size:12px;">Total (KZ)</td>
          					<td style="text-align:right; border-top: solid thin;font-size:12px;"> {{
          						'{0:0,.2f}'.format((doc.grand_total * doc.conversion_rate)|float) }}</td>

          				</tr>
          				{% endif %}

          				{% endif %}

          				<tr>
          					<td colspan="3" style="text-align:left;">
          						Bens / Serviços colocados a disposição do adquirente a data do documento. <br>
          						<u>{{ frappe.db.get_value('Company',doc.company,"regime_do_iva") }}</u>
          					</td>

          				</tr>
          				{% if doc.is_return %}
          				<tr>
          					<td colspan="3" style="text-align:left;">
          						<p class="text-left" style="font-size:10px">
          							<span style="float: left"><b>Entreguei:</b> _________________________</span>
          							<span style="float: right"><b>Recebi:</b> _________________________</span>
          						</p>

          					</td>
          				</tr>
          				{% endif %}



          			</table>


          			<div id="footer-html" class="text-center small ">
          				{% set lic = frappe.get_hooks("agt_lic",app_name="angola_erp") %}
          				{% if doc.hash_erp %}
          				<div class="text-center" style="font-size:10px"><b><small> {{ doc.hash_erp[0:1] }}{{ doc.hash_erp[10:11]
          							}}{{ doc.hash_erp[20:21] }}{{ doc.hash_erp[30:31] }} - Processado por programa validado n.
          							{{ lic[0][1:3] }}/AGT/19 &nbsp;© AngolaERP | {{ _("Page {0} of {1}").format('<span
          								class="page"></span>', '<span class="topage"></span>') }} </small> </b> </div>
          				{% else %}
          				<div class="text-center" style="font-size:10px"><b><small>Processado por Computador /&nbsp;© AngolaERP /
          							| {{ _("Page {0} of {1}").format('<span class="page"></span>', '<span
          								class="topage"></span>') }} </small> </b> </div>
          				{% endif %}
          			</div>



          		</div>



          	</div>
          	{% endmacro %}




          	{% macro atransportar() %}
          	<br><br>

          	<p style="text-align:right;">A transportar...&nbsp; {% set d = transval[0]|string %} {{ '{0:0,.2f}'.format(d|float)
          		}} </p>
          	{% endmacro %}



          	{% macro valortransportado() %}

          	{% if transval[0] != 0 %}
          	<br><br>

          	<div style="text-align:right; font-size:10px">
          		{% set moeda = frappe.get_doc("Currency", doc.currency) %}
          		<p>Valor Transportado: {% set d = transval[0]|string %} {{ '{0:0,.2f}'.format(d|float).lstrip("-") }} {{
          			moeda.symbol }} &nbsp;&nbsp;&nbsp; </p>
          	</div>
          	{% endif %}
          	{% endmacro %}



          	{{ above_items() }}

          	<table id="tb1" style="width:100%;">

          		{% set naomotivo1 = [0] %}
          		{%- set totalinhas = [0] -%}
          		{%- for row in doc.items -%}
          		{%- set adicionarmotivo = [0] -%}
          		{% if totalinhas.append(totalinhas.pop() + 1) %}{% endif %}

          		{% if row.isento_iva %}
          		{% if motivoisencao1 == [0] %}
          		{% if motivoisencao1.append(row.motivo_isencao) %}{% endif %}
          		{% if adicionarmotivo.append(adicionarmotivo.pop() - 1) %}{% endif %}
          		{% else %}

          		{%- for x in motivoisencao1 -%}

          		{% if row.motivo_isencao == x %}

          		{% if adicionarmotivo.append(adicionarmotivo.pop() - 1) %}{% endif %}
          		{% endif %}

          		{%-endfor-%}

          		{% endif %}

          		{% if adicionarmotivo == [0] %}
          		{% if motivoisencao1.append(row.motivo_isencao) %}{% endif %}
          		{% endif %}
          		{% endif %}
          		{%- endfor -%}


          		{%- for row in doc.items -%}
          		{% if totalinhas[0] <= 20 and row.idx==13 %} </table>
          			{{ atransportar() }}

          			{% if temtransp.append(temtransp.pop() + 1) %}{% endif %}

          			<div class="page-break">
          			</div>
          			<br>
          			{{ above_items() }}


          			<!--
          	{{ below_items() }}

          -->
          			<table id="tb1" style="width:100%;">
          				{% endif %}

          				<tr>
          					<td align="left" width="35%;" style="text-transform: uppercase;">{{ row.description | striptags }}
          					</td>
          					{% set moeda = frappe.get_doc("Currency", doc.currency) %}
          					{% set naoisento = [0] %}

          					{% if motivoisencao1 %}
          					{%- for x in (motivoisencao1) -%}

          					{% if x != 0 %}
          					{% if row.isento_iva %}

          					{% if naoisento.append(naoisento.pop() + 1) %}{% endif %}
          					{% if row.motivo_isencao == x %}

          					{% if loop.index == 2 %}
          					<td align="left" width="3%;" style="text-transform: uppercase;">* </td>

          					{% endif %}
          					{% if loop.index == 3 %}
          					<td align="left" width="3%;" style="text-transform: uppercase;">** </td>

          					{% endif %}
          					{% if loop.index == 4 %}
          					<td align="left" width="3%;" style="text-transform: uppercase;">*** </td>

          					{% endif %}
          					{% if loop.index == 5 %}
          					<td align="left" width="3%;" style="text-transform: uppercase;">**** </td>

          					{% endif %}
          					{% endif %}



          					{% endif %}
          					{% endif %}
          					{%-endfor-%}
          					{% if naoisento == [0] %}

          					<td align="left" width="3%;" style="text-transform: uppercase;"></td>
          					{% else %}
          					{% if naoisento.append(naoisento.pop() - 1) %}{% endif %}
          					{% endif %}
          					{% else %}

          					<td align="left" width="3%;" style="text-transform: uppercase;"></td>

          					{% endif %}
          					{% set mostrardescontlinha = frappe.db.get_single_value('Emergencia','mostrar_desconto_linha') %}
          					<td style="text-align:right; width:5%;">{% if doc.is_return %}
          						{{row.get_formatted("qty").lstrip("-")}} {% else %} {{row.get_formatted("qty")}} {% endif %}
          					</td>
          					<td style="text-align:right; width:10%;">{{ _(row.uom) }}</td>
          					<td style="text-align:right; margin-right:5px; width:20%;">{% if row.discount_percentage > 0 and
          						row.discount_amount == 0 %} {{row.get_formatted("rate")}} {% else %} {% if
          						row.discount_percentage > 0 and row.discount_amount > 0 %} {% if row.rate !=
          						row.rate_with_margin %} {% if row.rate_with_margin %} {{row.get_formatted("rate_with_margin")}}
          						{% else %} {{row.get_formatted("price_list_rate")}} {% endif %} {% else %}
          						{{row.get_formatted("price_list_rate")}} {% endif %} {% else %} {% if row.price_list_rate == 0
          						%} {{row.get_formatted("rate")}} {% else %} {% if row.price_list_rate != row.rate %}
          						{{row.get_formatted("rate")}} {% else %} {{row.get_formatted("price_list_rate")}} {% endif %} {%
          						endif %} {% endif %} {% endif %}</td>
          					<td style="text-align:right; margin-right:5px; width:7%;">{% if mostrardescontlinha == 1 %} {% if
          						row.discount_percentage %} {% if doc.total_desconto_linha %}
          						{{row.get_formatted("discount_percentage")}} {% endif %}{% endif %}{% endif %}</td>
          					{% set ipc = frappe.get_doc("Retencoes", "IVA") %}
          					<td style="text-align:center; margin-right:5px; width:7%;">{% if row.iva %}
          						{{row.get_formatted("iva") | replace(".0","")}} {% else %} {% if row.isento_iva == 0 %} {% if
          						"Transitorio" not in frappe.db.get_value("Company", doc.company,"regime_do_iva") %} {% if
          						"Sujeicao" not in frappe.db.get_value("Company", doc.company,"regime_do_iva") %} {% if
          						"Exclusao" not in frappe.db.get_value("Company", doc.company,"regime_do_iva") %} {{
          						ipc.get_formatted("percentagem") | replace(".0","") }} {% endif %}{% endif %}{% endif %} {% else
          						%} 0% {% endif %}{% endif %}</td>
          					<td style="text-align:right; margin-right:5px; width:25%;">{% if doc.is_return %}
          						{{row.get_formatted("amount", doc).lstrip("-")}} {% else %} {{row.get_formatted("amount", doc)}}
          						{% endif %}</td>
          				</tr>

          				{% if transval.append(transval.pop() + row.amount) %}{% endif %}

          				{% if contalinhas.append(contalinhas.pop() + 1) %}{% endif %}

          				{% if row.discount_percentage %}

          				{% if desclinha.append(row.get_formatted("amount") ) %}{% endif %}

          				{% endif %}
          				{%-endfor-%}
          			</table>

          			{% if doc.timesheets %}
          			<br><br><br>
          			{% set moeda = frappe.get_doc("Currency", doc.currency) %}
          			<table id="tt1" style="width:100%; ">
          				<tr id="trr1" class="trr1" style="border-top: solid thin;">

          					<th id="th1" class="th1" width="35%" style="text-transform: uppercase;background-color:lavender;">{{
          						_("Time Sheet ") }}</th>
          					<th id="th1" class="th1" width="20%"
          						style="text-align:center;text-transform: uppercase;background-color:lavender;">{{ _("Billing
          						Hours") }}</th>
          					<th id="th1" class="th1"
          						style="text-align:right;text-transform: uppercase;background-color:lavender;" width="20%">{{
          						_("Billing Amount") }}</th>
          				</tr>
          				{%- for row1 in doc.timesheets -%}
          				<tr>
          					<td style="text-align:center; width:35%;">{{row1.time_sheet}}</td>
          					<td style="text-align:right; margin-right:5px; width:5%;">{{row1.get_formatted("billing_hours")}}
          					</td>
          					<td style="text-align:right; margin-right:5px; width:20%;">{{row1.get_formatted("billing_amount")}}
          						{{ moeda.symbol }}</td>

          				</tr>

          				{%-endfor-%}
          			</table>

          			{% endif %}

          			{% set d = contalinhas[0] %}
          			{% set d1 = temtransp[0] %}


          			{% if d1 == 0 %}

          			{{ below_items() }}

          			{% else %}

          			{{ below_items_nofooter() }}

          			{% endif %}
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
      fields: ["name","doc_agt","posting_date","customer","outstanding_amount","rounded_total","status","company"],
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
      fields: ["name","doc_agt","posting_date","customer","outstanding_amount","rounded_total","status","comapny"],
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
            <Text> EMPRE { item.company } </Text>

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
