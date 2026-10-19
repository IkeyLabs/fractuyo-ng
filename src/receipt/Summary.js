/*
 * Copyright (c) 2026 Jorge Pacora
 * Contributor to Fractuyo
 * SPDX-License-Identifier: ISC
 */
import { Parse } from "xmldsigjs"
import XmlSigner from "./xml/XmlSigner.js"
import JSZip from "jszip"
import SoapEnvelope from "./xml/SoapEnvelope.js"
import Endpoint from "../webservice/Endpoint.js"
import Cdr from "./Cdr.js"

import ReceiptHeader from "./ReceiptHeader.js"
import Taxpayer from "../person/Taxpayer.js"
import TagsGenerator from "./xml/TagsGenerator.js"



class Summary {

	static STATUS_ACCEPTED = 0
	static STATUS_IN_PROCESS = 98
	static STATUS_WITH_ERRORS = 99

	/** @type {string} */
	#ublVersion = "2.0"

	/** @type {string} */
	#customizationId = "1.1"

	/** @type {Taxpayer} */
	#taxpayer

	/** @type {Date} */
	#referenceDate

	/** @type {Date} */
	#issueDate

	/** @type {Date} */
	#generationDate

	/** @type {number} */
	#numeration

	/** @type {Array<ReceiptHeader>} */
	#lines = Array()

	/**
	 * @param {Date} fecha - The Taxpayer.
	 */
	static fechaYYYYMMDD(fecha) {
		return `${fecha.getFullYear()}${String(fecha.getMonth() + 1).padStart(2, '0')}${String(fecha.getDate()).padStart(2, '0')}`;
	}

	/**
	 * @param {Taxpayer} taxpayer - The Taxpayer.
	 */
	constructor(taxpayer) {
		this.#taxpayer = taxpayer
	}

	/**
	 * @returns {Taxpayer} The taxpayer set in the constructor.
	 */
	getTaxpayer() {
		return this.#taxpayer
	}

	/**
	 * @param {Taxpayer} taxpayer - The new taxpayer.
	 */
	setTaxpayer(taxpayer) {
		this.#taxpayer = taxpayer
	}

	/**
	 * @param {Date} date - The reference date of the summary.
	 */
	setReferenceDate(date) {
		this.#referenceDate = date
	}

	/**
	 * @returns {Date} The reference date of the summary.
	 */
	getReferenceDate() {
		return this.#referenceDate
	}

	/**
	 * @returns {Date} The issue date of the document.
	 */
	getIssueDate() {
		return this.#issueDate
	}

	/**
	 * @param {Date} date - The generation date of the summary.
	 */
	setGenerationDate(date) {
		this.#generationDate = date
	}

	/**
	 * @returns {Date} The generation date of the summary.
	 */
	getGenerationDate() {
		return this.#generationDate
	}

	/**
	 * @param {ReceiptHeader} line - The item to add.
	 */
	addLine(line) {
		this.#lines.push(line)
	}

	/**
	 * @param {Array<ReceiptHeader>} lines - The summary lines.
	 */
	setLines(lines) {
		this.#lines = lines
	}

	/**
	 * @returns {Array<ReceiptHeader>} The summary lines.
	 */
	getLines() {
		return this.#lines
	}

	get name() {
		return "SummaryDocuments"
	}

	/**
	 * @returns {string} The serie of the document.
	 */
	getSerie() {
		return "RC"
	}

	/**
	 * @param {Date} date - The issue date of the document.
	 */
	setIssueDate(date) {
		if (date) {
			this.#issueDate = date
		}
		else {
			this.#issueDate = new Date()
		}
	}


	/**
	 * @param {number} number - The numeration of the document from 1 to 99999999.
	 */
	setNumeration(number) {
		if (number > 0x5F5E0FF) {
			throw new Error("Numeración supera el límite.")
		}
		this.#numeration = number
	}

	/**
	 * @returns {number} The numeration of the document.
	 */
	getNumeration() {
		return this.#numeration
	}


	/**
	 * Format serie and number: F000-00000001
	 * @param {boolean} compacted - Compact format.
	 * @returns {string}
	 */
	getId(compacted = false) {
		if (this.#referenceDate == undefined) {
			throw new Error("Sin referenceDate.")
		}

		// Pre-format numeration as string
		const fecha = Summary.fechaYYYYMMDD(this.#referenceDate)
		const numStr = compacted ? String(this.#numeration) : String(this.#numeration).padStart(8, '0')

		return `RC-${fecha}-${numStr}`
	}

	/**
	 * @returns {string} The UBL version.
	 */
	getUblVersion() {
		return this.#ublVersion
	}

	/**
	 * @returns {string} The customization ID.
	 */
	getCustomizationId() {
		return this.#customizationId
	}

	toXml() {
		const upperWrapper = `\
<?xml version="1.0" encoding="utf-8"?>
<SummaryDocuments xmlns="urn:sunat:names:specification:ubl:peru:schema:xsd:SummaryDocuments-1"
	xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
	xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
	xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
	xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"
	xmlns:sac="urn:sunat:names:specification:ubl:peru:schema:xsd:SunatAggregateComponents-1"
	xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">`

		const lowerWrapper = `</SummaryDocuments>`

		// All parts of XML in array of strings
		const xmlParts = [
			upperWrapper,
			TagsGenerator.generateUblExtensions(this),
			TagsGenerator.generateHeader(this),
			TagsGenerator.generateIdentity(this, true),
			TagsGenerator.generateReferenceDate(this),
			TagsGenerator.generateIssueDate(this),
			//TagsGenerator.generateAdditionalDocumentReferences(this),
			TagsGenerator.generateSignature(this),
			TagsGenerator.generateSupplierHeader(this),
			TagsGenerator.generateSummaryLines(this),
			lowerWrapper
		]

		// Together in string inmediately
		this.xmlString = xmlParts.join("")
	}

	getTypeCode() {
		return null
	}

	/**
	 * Finalize the document signing it.
	 * @param {SubtleCrypto} cryptoSubtle - The crypto subtle to use for signing.
	 * @param {string} canonMethod - The canonicalization method to use for signing.
	 */
	async finalize(cryptoSubtle, canonMethod = "c14n") {
		try {
			const xmlDocForSigning = Parse(this.xmlString) // Construction of XML document

			// Getting signature using extarnal signer
			const signatureNode = await XmlSigner.getSignedNode(
				cryptoSubtle,
				xmlDocForSigning,
				this.#taxpayer,
				canonMethod
			)

			// Apply Id to ds:Signature
			signatureNode.setAttribute("Id", "terexoris");

			const serializer = new XMLSerializer()
			const signatureString = serializer.serializeToString(signatureNode)

			// Just insertion of signature literal
			const targetTag = "<ext:ExtensionContent></ext:ExtensionContent>"
			const signedTag = `<ext:ExtensionContent>${signatureString}</ext:ExtensionContent>`

			// Halt everything
			if (!this.xmlString.includes(targetTag)) {
				throw new Error("No se encontró contenedor <ext:ExtensionContent></ext:ExtensionContent>.")
			}

			this.xmlString = this.xmlString.replace(targetTag, signedTag)

			return true
		} catch (e) {
			console.error("Error en la finalización/firma:", e);
			return false
		}
	}

	/**
	 * Create a ZIP file containing XML. Default type is base64.
	 * @param {"base64" | "string" | "text" | "binarystring" | "array" | "uint8array" | "arraybuffer" | "blob" | "nodebuffer"} type - according JSZip API.
	 * @param {string} [xmlString] - that is raw XML.
	 * @return {Promise<any>} A ZIP file containing XML.
	 */
	async createZip(type = "base64", xmlString) {
		const zip = new JSZip()
		// if there is xmlString then use it else the XML string created recently
		zip.file(`${this.#taxpayer.getIdentification().getNumber()}-${this.getId(true)}.xml`, xmlString ?? this.xmlString)

		return zip.generateAsync({ type: type }).then(zipb64 => {
			return zipb64
		})
	}

	/**
	 * Declare the document sending it to server.
	 * @param {string} zipStream - The zip file.
	 * @returns {Promise<string>} The proof of the document.
	 */
	async declare(zipStream) {
		const SOAP_NS = "http://schemas.xmlsoap.org/soap/envelope/"
		const SUNAT_NS = "http://service.sunat.gob.pe"

		const soapXmlDocument = SoapEnvelope.generateSendSummary(this, this.#taxpayer, zipStream)

		const responseText = await Endpoint.fetch(Endpoint.INDEX_INVOICE, soapXmlDocument.toString())
		const xmlDoc = new DOMParser().parseFromString(responseText, "text/xml")

		// Fault
		const faultNode = xmlDoc.getElementsByTagNameNS(SOAP_NS, "Fault")[0]

		if (faultNode) {
			const faultString = faultNode.getElementsByTagName("faultstring")[0]?.textContent
			throw new Error(faultString || "Error SOAP desconocido.")
		}

		// Respuesta exitosa: independiente del prefijo (xsns, br, ns1, etc.)
		const responseNode = xmlDoc.getElementsByTagNameNS(SUNAT_NS, "sendSummaryResponse")[0]

		if (!responseNode) {
			throw new Error("Respuesta inesperada.")
		}

		// <ticket> no tiene prefijo ni namespace propio, por eso se busca por nombre simple
		const ticket = responseNode.getElementsByTagName("ticket")[0]?.textContent?.trim()

		if (!ticket) {
			throw new Error("La respuesta no contiene ticket.")
		}

		return ticket
	}

	/**
	 * Handles and parses the Proof of Receipt (CDR) zip stream returned by SUNAT.
	 * @param {string|ArrayBuffer} zipStream - The ZIP file containing the response XML, usually as a base64 string.
	 * @param {boolean} [isBase64=true] - Indicates whether the input stream is encoded in base64.
	 * @returns {Promise<Cdr>} A promise that resolves to a Cdr instance representing the status and description.
	 */
	async handleCdr(zipStream, isBase64 = true) {
		const zip = new JSZip()

		return zip.loadAsync(zipStream, { base64: isBase64 }).then(async (zip) => {
			const xmlFiles = zip.file(/\.xml$/i);
			if (xmlFiles.length > 0) {
				return xmlFiles[0].async("string").then(async (data) => {
					const xmlDoc = new DOMParser().parseFromString(data, "application/xml")

					// Go directly to node <cbc:ResponseCode>
					const codes = xmlDoc.getElementsByTagNameNS("urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2", "ResponseCode")

					if (codes.length > 0) {
						const description = xmlDoc.getElementsByTagNameNS("urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2", "Description")[0]?.textContent ?? "Sin descripción"
						return new Cdr(parseInt(codes[0].textContent), description)
					}
					else { // error
						return new Cdr(Cdr.UNKNOWN, "No se encontró respuesta.")
					}
				})
			}
			return new Cdr(Cdr.UNKNOWN, "No se encontró archivo XML en la constancia.");
		})
	}

	/**
	 * Queries the status of a ticket returned by sendSummary.
	 * @param {string} ticketNumber - The ticket returned by declare().
	 * @returns {Promise<{statusCode: number, zipCdr64: string|null}>}
	 *   statusCode: 0 = accepted, 98 = in process, 99 = processed with errors.
	 *   zipCdr64: CDR ZIP in base64, or null while in process (98) or if SUNAT sent no content.
	 */
	async handleTicket(ticketNumber) {
		const SOAP_NS = "http://schemas.xmlsoap.org/soap/envelope/"
		const SUNAT_NS = "http://service.sunat.gob.pe"

		const soapXmlDocument = SoapEnvelope.generateGetStatus(ticketNumber, this.#taxpayer)

		const responseText = await Endpoint.fetch(Endpoint.INDEX_INVOICE, soapXmlDocument.toString())
		const xmlDoc = new DOMParser().parseFromString(responseText, "text/xml")

		// Fault
		const faultNode = xmlDoc.getElementsByTagNameNS(SOAP_NS, "Fault")[0]

		if (faultNode) {
			const faultString = faultNode.getElementsByTagName("faultstring")[0]?.textContent
			throw new Error(faultString || "Error SOAP desconocido.")
		}

		const responseNode = xmlDoc.getElementsByTagNameNS(SUNAT_NS, "getStatusResponse")[0]

		if (!responseNode) {
			throw new Error("Respuesta inesperada.")
		}

		// <status>, <statusCode> and <content> have no namespace of their own
		const statusCodeText = responseNode.getElementsByTagName("statusCode")[0]?.textContent?.trim()

		if (statusCodeText === undefined || statusCodeText === "") {
			throw new Error("La respuesta no contiene statusCode.")
		}

		const statusCode = parseInt(statusCodeText)
		const zipCdr64 = responseNode.getElementsByTagName("content")[0]?.textContent?.trim() || null

		return { statusCode, zipCdr64 }
	}

	/**
	 * Convert the document to XML string.
	 * It includes signature node if the document was finalized.
	 * @returns {string} The XML string.
	 */
	toString() {
		return this.xmlString
	}

}


export default Summary