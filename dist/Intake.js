import { Ajv } from 'ajv';
import ajvKeywords from 'ajv-keywords';
import { getRequestModel } from './toolBox.js';
/**
 * Intake
 */
export default class Intake {
    constructor(cycle) {
        this.cycle = cycle;
        this.avj = new Ajv({ useDefaults: true, removeAdditional: 'all' });
        ajvKeywords.default(this.avj);
    }
    stroke() {
        // Do we have a cycle?
        if (!this.cycle.engine.model) {
            this.cycle.response.requests.push(Object.assign(Object.assign({}, getRequestModel(this.cycle.request)), { error: { errno: 2000, code: 'ERROR_REQUEST_NOT_FOUND' } }));
            throw new Error('ERROR_REQUEST_NOT_FOUND');
        }
        // Do we have keys?
        if (!this.keysIntersects()) {
            this.cycle.response.requests.push(Object.assign(Object.assign({}, getRequestModel(this.cycle.request)), { error: { errno: 2001, code: 'ERROR_REQUEST_NO_KEYS' } }));
            throw new Error('ERROR_REQUEST_NO_KEYS');
        }
        if (!this.avj.validate(this.cycle.engine.intake, this.cycle.request.properties)) {
            this.cycle.response.requests.push(Object.assign(Object.assign({}, getRequestModel(this.cycle.request)), { error: {
                    errno: 2003,
                    code: 'ERROR_REQUEST_INTAKE_VALIDATION',
                    details: this.avj.errors
                } }));
            throw new Error('ERROR_REQUEST_INTAKE_VALIDATION');
        }
    }
    keysIntersects() {
        var _a;
        const setA = new Set(this.cycle.engine.keys);
        return (((_a = this.cycle.rider) === null || _a === void 0 ? void 0 : _a.keys) || []).some(value => setA.has(value));
    }
    /**
     * Check
     */
    check() {
        return this.avj.validate({
            type: 'object',
            properties: {
                id: {
                    type: 'string',
                    default: ''
                },
                name: {
                    type: 'string',
                    default: 'ERROR_MISSING_NAME'
                },
                properties: {
                    type: 'object',
                    default: {}
                },
                async: {
                    type: 'boolean',
                    default: false
                }
            },
            additionalProperties: false
        }, this.cycle.request);
    }
}
