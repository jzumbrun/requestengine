import { Ajv } from 'ajv';
import ajvKeywords from 'ajv-keywords';
import { getRequestEngine } from './toolChest.js';
import RequestError from './errors/RequestError.js';
/**
 * Exhaust
 */
export default class Exhaust {
    constructor(engine, exhaustValves) {
        this.avj = new Ajv({ useDefaults: true, removeAdditional: 'all' });
        ajvKeywords.default(this.avj);
        this.engine = engine;
        this.exhaustValves = exhaustValves;
    }
    stroke() {
        // Do we have proper exhaust schema
        if (this.engine.model.exhaust && !this.avj.validate(this.engine.model.exhaust, this.exhaustValves)) {
            throw new RequestError(getRequestEngine(this.engine.request), 1005, 'ERROR_REQUEST_EXHAUST_VALIDATION', this.avj.errors);
        }
        if (this.engine.request.serial)
            this.engine.revolution[this.engine.request.serial] = this.exhaustValves;
        // Add succesfull request response by id
        return Object.assign(Object.assign({}, getRequestEngine(this.engine.request)), { results: this.exhaustValves });
    }
}
