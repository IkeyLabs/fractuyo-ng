/**
 * Handles the SUNAT Proof of Receipt (CDR) and its status code ranges.
 */
class Cdr {
	// Just flags using min values
	static UNKNOWN = -1
	static ACCEPTED = 0
	static OBSERVED = 100
	static REJECTED = 2000
	static EXCEPTION = 4000

	#code;
	#description;

	/**
	 * @param {number|string} code - Response code from SUNAT.
	 * @param {string} description - Response description.
	 */
	constructor(code, description) {
		this.#code = parseInt(code, 10)
		this.#description = description
	}

	/**
	 * Returns the raw status code.
	 * @returns {number}
	 */
	getCode() {
		return this.#code
	}

	/**
	 * Returns the status description.
	 * @returns {string}
	 */
	getDescription() {
		return this.#description
	}

	/**
	 * Categorizes the response code into a general status type
	 * for easy evaluation in switch statements.
	 * @returns {string} Category type: 'ACCEPTED', 'OBSERVED', 'REJECTED', 'EXCEPTION'
	 */
	getCategory() {
		if (this.#code === Cdr.ACCEPTED) {
			return Cdr.ACCEPTED
		}
		if (this.#code >= Cdr.OBSERVED && this.#code < Cdr.REJECTED) {
			return Cdr.OBSERVED
		}
		if (this.#code >= Cdr.REJECTED && this.#code < Cdr.EXCEPTION) {
			return Cdr.REJECTED
		}
		if (this.#code >= Cdr.EXCEPTION) {
			return Cdr.EXCEPTION
		}
		return Cdr.UNKNOWN
	}
}

export default Cdr;
