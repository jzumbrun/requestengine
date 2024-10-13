import { Ajv } from 'ajv';
import ajvKeywords from 'ajv-keywords';
import { getRequestModel } from './toolBox.js';
/**
 * Exhaust
 */
export default class Exhaust {
    constructor(cycle, data) {
        this.avj = new Ajv({ useDefaults: true, removeAdditional: 'all' });
        ajvKeywords.default(this.avj);
        this.cycle = cycle;
        this.data = data;
    }
    stroke() {
        // Do we have proper exhaust schema
        if (this.cycle.engine.exhaust && !this.avj.validate(this.cycle.engine.exhaust, this.data)) {
            this.cycle.response.requests.push(Object.assign(Object.assign({}, getRequestModel(this.cycle.request)), { error: {
                    errno: 1005,
                    code: 'ERROR_REQUEST_OUTBOUND_VALIDATION',
                    details: this.avj.errors
                } }));
        }
        else {
            if (this.cycle.request.id)
                this.cycle.history[this.cycle.request.id] = this.data;
            // Add succesfull request responses by id
            this.cycle.response.requests.push(Object.assign(Object.assign({}, getRequestModel(this.cycle.request)), { results: this.data }));
        }
    }
}
