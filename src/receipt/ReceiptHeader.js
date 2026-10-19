/*
 * Copyright (c) 2026 Jorge Pacora
 * Contributor to Fractuyo
 * SPDX-License-Identifier: ISC
 */

import DocumentReference from "./DocumentReference.js"
import TagsGenerator from "./xml/TagsGenerator.js"


/** @typedef {import("../person/Identification.js").default} Identification */

class ReceiptHeader {

	name = "Document"

    /**
	 * @type {string}
	 */
	#id

    /** @type {number} */
	#typeCode

    /** @type {Identification} */
	#customerIdentification

    /**
	 * ISO 4217 currency code.
	 * @type {string}
	 */
	#currencyId = "PEN"

    /** @type {number} */
	#totalGravadas = 0

    /** @type {number} */
	#totalExoneradas = 0

    /** @type {number} */
	#totalInafectas = 0

	/** @type {number} */
	#totalGratuitas = 0

    /** @type {number} */
	#isc

    /** @type {number} */
	#igv

    /** @type {number} */
	#totalAmount

    /**
	 * Codigo de operacion del item - catalogo No. 19
	 * @type {number}
	 */
	#estado

    /**
	 * Used in Credit note to hold just one invoice reference.
	 * @type {DocumentReference}
	 */
	#documentReference

    /**
	 * Set identifier of document reference like F000-12345678.
	 * @param {string} id
	 */
	setId(id) {
		this.#id = id
	}

    /**
     * @returns {string}
     */
    getId() {
    	return this.#id
    }

    /**
     * @param {number} typeCode
     */
    setTypeCode(typeCode) {
    	this.#typeCode = typeCode
    }

    /**
     * @returns {number}
     */
    getTypeCode() {
    	return this.#typeCode
    }

    /**
     * @param {Identification} customerIdentification
     */
    setCustomerIdentification(customerIdentification) {
    	this.#customerIdentification = customerIdentification
    }

    /**
     * @returns {Identification}
     */
    getCustomerIdentification() {
    	return this.#customerIdentification
    }

    /**
     * @param {string} cid - ISO 4217 currency code.
     */
    setCurrencyId(cid) {
    	this.#currencyId = cid
	}

	/**
	 * @returns {string}
	 */
	getCurrencyId() {
		return this.#currencyId
	}

	/**
	 * @param {number} total
	 */
	setTotalGravadas(total) {
		this.#totalGravadas = total
	}

	/**
	 * @returns {number}
	 */
	getTotalGravadas() {
		return this.#totalGravadas
	}

	/**
	 * @param {number} total
	 */
	setTotalExoneradas(total) {
		this.#totalExoneradas = total
	}

	/**
	 * @returns {number}
	 */
	getTotalExoneradas() {
		return this.#totalExoneradas
	}

	/**
	 * @param {number} total
	 */
	setTotalInafectas(total) {
		this.#totalInafectas = total
	}

	/**
	 * @returns {number}
	 */
	getTotalInafectas() {
		return this.#totalInafectas
	}

	/**
	 * @param {number} total
	 */
	setTotalGratuitas(total) {
		this.#totalGratuitas = total
	}

	/**
	 * @returns {number}
	 */
	getTotalGratuitas() {
		return this.#totalGratuitas
	}

	/**
	 * @param {number} isc
	 */
	setIsc(isc) {
		this.#isc = isc
	}

	/**
	 * @returns {number}
	 */
	getIsc() {
		return this.#isc
	}

	/**
	 * @param {number} igv
	 */
	setIgv(igv) {
		this.#igv = igv
	}

	/**
	 * @returns {number}
	 */
	getIgv() {
		return this.#igv
	}

	/**
	 * @param {number} totalAmount
	 */
	setTotalAmount(totalAmount) {
		this.#totalAmount = totalAmount
	}

	/**
	 * @returns {number}
	 */
	getTotalAmount() {
		return this.#totalAmount
	}

	/**
	 * @param {1 | 2 | 3} estado - Estado de la línea (1, 2 o 3).
	 */
	setEstado(estado) {
		if (![1, 2, 3].includes(estado)) {
			throw new Error("El estado debe ser 1, 2 o 3.")
		}
		this.#estado = estado
	}

	/**
	 * @returns {number}
	 */
	getEstado() {
		return this.#estado
	}

    /**
	 * Add a document reference
	 * @param {DocumentReference} documentReference
	 */
	addDocumentReference(documentReference) {
        this.#documentReference = documentReference
	}

	hasDetraction() {
		return false
	}

	getNetOperationAmount() {
		return this.#totalAmount
	}

	toXml() {
		// All parts of XML in array of strings
		const xmlParts = [
			TagsGenerator.generateTypeCode(this, false),
			TagsGenerator.generateIdentity(this),
			TagsGenerator.generateCustomerHeader(this),
			TagsGenerator.generateSatus(this),
			TagsGenerator.generateTotalAmmount(this),
			TagsGenerator.generateBillingBlock(this),
			TagsGenerator.generateTaxesHeader(this)
		]

		// Together in string inmediately
		this.xmlString = xmlParts.join("")
	}

}

export default ReceiptHeader