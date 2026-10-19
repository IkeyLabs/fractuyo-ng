
/**
 * @typedef {import("./Identification.js").default} Identification
 */

class Person {
	#name
	#address

	/** @type {Identification} */
	#identification

	getName() {
		return this.#name
	}

	setName(n) {
		n = n?.trim()
		if (n && n.length > 0) {
			this.#name = n
		}
	}

	/**
	 * @param {Identification} i - Identification.
	 */
	setIdentification(i) {
		this.#identification = i
	}


	getIdentification() {
		return this.#identification
	}

	setAddress(a) {
		this.#address = a
	}

	getAddress() {
		return this.#address
	}
}

export default Person;
