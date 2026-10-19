import test from 'ava'
import fs from 'node:fs'
import { Application } from "xmldsigjs"

import { Cdr, Summary, ReceiptHeader, Taxpayer, Identification, Address } from '../src/fractuyo.js'

let customer
let taxpayer
let summary
let summaryDate = new Date("13-Sep-2021 UTC")

test.before(async t => {
	Application.setEngine("NodeJS", globalThis.crypto)
})

test.serial("creating persons", tester => {
	customer = new Identification(6, "20545314437")

	const address = new Address()
	address.line = "An address in Peru"
	address.country = "PE"
	address.ubigeo = "150101"
	address.typecode = "0000"
	address.urbanization = "The Urbanization"
	address.city = "The City"
	address.subentity = "Provincia"
	address.district = "St. District of Provincia"

	taxpayer = new Taxpayer()
	taxpayer.setName("Efectibit SAC")
	taxpayer.setTradeName("Efectibit")
	taxpayer.setIdentification(new Identification(6, "20606829265"))
	taxpayer.setAddress(address)

	try {
		const cert = fs.readFileSync("./tests/cert.pem", "utf8")
		taxpayer.setCert(cert)
		const key = fs.readFileSync("./tests/key.pem", "utf8")
		taxpayer.setKey(key)
	}
	catch (err) {
		console.error(err)
	}

	tester.is(taxpayer.getName(), "Efectibit SAC")
	tester.is(taxpayer.getIdentification().getNumber(), "20606829265")
})

test.serial("creating summary", (tester) => {
	summary = new Summary(taxpayer)
	summary.setReferenceDate(summaryDate)
	summary.setGenerationDate(summaryDate)
	summary.setIssueDate(summaryDate)
	
	summary.setNumeration(800)

	// Add summary lines
	const summaryLine1 = new ReceiptHeader()
	summaryLine1.setTypeCode("03")
	summaryLine1.setId("B000-16950749")
	summaryLine1.setCustomerIdentification(customer)
	summaryLine1.setEstado(1)
	//summaryLine1.setCurrencyId("PEN")
	summaryLine1.setTotalAmount(400)
	summaryLine1.setTotalGravadas(400)
	//summaryLine1.setTotalExoneradas(0)
	//summaryLine1.setTotalInafectas(0)
	summaryLine1.setIgv(72)

	summary.addLine(summaryLine1)


	tester.is(customer.getNumber(), "20545314437")

	tester.is(summary.getId(true), "RC-20210912-800")
})


test.serial("signing summary", async tester => {
	summary.toXml()

	const { subtle } = globalThis.crypto // from Node API
	const isSigned = await summary.finalize(subtle)

	tester.true(isSigned)

	// Remove this return to validate with XSD
	return

	try {
		const mainXsdContent = fs.readFileSync("./tests/xsd/2.1/maindoc/UBL-Invoice-2.1.xsd", "utf8").replace(
			/schemaLocation="(\.\.\/)+common\//g,
			'schemaLocation="'
		)

		const secondarySchemas = [
			"UBL-CommonAggregateComponents-2.1.xsd",
			"UBL-CommonBasicComponents-2.1.xsd",
			"UBL-CommonExtensionComponents-2.1.xsd",
			"UBL-CommonSignatureComponents-2.1.xsd",
			"UBL-ExtensionContentDataType-2.1.xsd",
			"UBL-QualifiedDataTypes-2.1.xsd",
			"UBL-SignatureAggregateComponents-2.1.xsd",
			"UBL-SignatureBasicComponents-2.1.xsd",
			"UBL-UnqualifiedDataTypes-2.1.xsd",
			"UBL-xmldsig-core-schema-2.1.xsd",
			"UBL-XAdESv132-2.1.xsd",
			"UBL-XAdESv141-2.1.xsd",
			"CCTS_CCT_SchemaModule-2.1.xsd"
		].map(filename => ({
			fileName: filename,
			contents: fs.readFileSync(`./tests/xsd/2.1/common/${filename}`, "utf8").replace(
				/schemaLocation="(\.\.\/)+common\//g,
				'schemaLocation="'
			)
		}))

		const xmlValidated = await invoice.validateXmlWithXsd(
			{
				fileName: "UBL-Invoice-2.1.xsd",
				contents: mainXsdContent
			},
			secondarySchemas
		)

		if (!xmlValidated) {
			tester.true(false)
			return
		}
	}
	catch (err) {
		console.error(err)
		tester.true(false)
	}
})


test.serial("presenting summary", async tester => {
	try {
		const zipStream = await summary.createZip()

		const ticket = await summary.declare(zipStream)
		const { statusCode, cdr } = await summary.handleTicket(ticket)

		tester.not(cdr, null, "No se obtuvo cdr")

		tester.true(cdr.getCode() == Cdr.ACCEPTED)

	}
	catch (e) {
		console.error(e)
		tester.fail()
	}
})