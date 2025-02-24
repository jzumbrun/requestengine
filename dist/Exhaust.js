import { Ajv } from 'ajv';
import ajvKeywords from 'ajv-keywords';
import { getRequestEngine } from './toolChest.js';
import RequestError from './errors/RequestError.js';
/**
 * Exhaust
 */
export default class Exhaust {
    constructor(engine, response) {
        this.avj = new Ajv({ useDefaults: true });
        ajvKeywords.default(this.avj);
        this.engine = engine;
        this.response = response;
    }
    stroke() {
        // Do we have proper exhaust schema
        if (this.engine.model.exhaust &&
            !this.avj.validate(this.engine.model.exhaust, this.response)) {
            throw new RequestError(getRequestEngine(this.engine.request), 1005, 'ERROR_REQUEST_EXHAUST_VALIDATION', this.avj.errors);
        }
        if (this.engine.request.serial)
            this.engine.revolution[this.engine.request.serial] = this.response;
        // Add succesfull request response by id
        return Object.assign(Object.assign({}, getRequestEngine(this.engine.request)), { response: this.response });
    }
}
