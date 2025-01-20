import { Ajv } from 'ajv';
import ajvKeywords from 'ajv-keywords';
import { getRequestEngine } from './toolChest.js';
import RequestError from './errors/RequestError.js';
/**
 * Intake
 */
export default class Intake {
    constructor(engine) {
        this.engine = engine;
        this.avj = new Ajv({ useDefaults: true });
        ajvKeywords.default(this.avj);
    }
    stroke() {
        // Do we have a engine?
        if (!this.engine.model.model) {
            throw new RequestError(getRequestEngine(this.engine.request), 2000, 'ERROR_REQUEST_ENGINE_MODEL_NOT_FOUND');
        }
        // Do we have the correct keys for the ignition?
        if (!this.ignitionKeysIntersects()) {
            throw new RequestError(getRequestEngine(this.engine.request), 2001, 'ERROR_REQUEST_WRONG_KEYS');
        }
        if (!this.avj.validate(this.engine.model.intake, this.engine.request.fuel || null)) {
            throw new RequestError(getRequestEngine(this.engine.request), 2003, 'ERROR_REQUEST_INTAKE_VALIDATION', this.avj.errors);
        }
    }
    ignitionKeysIntersects() {
        var _a;
        if (!this.engine.model.ignition.length)
            return true;
        const setA = new Set(this.engine.model.ignition);
        return (((_a = this.engine.operator) === null || _a === void 0 ? void 0 : _a.keys) || []).some((value) => setA.has(value));
    }
    /**
     * Check
     */
    check() {
        return this.avj.validate({
            type: 'object',
            properties: {
                serial: {
                    type: 'string',
                    default: '',
                },
                engine: {
                    type: 'string',
                    default: 'ERROR_MISSING_MODEL',
                },
                fuel: {
                    type: [
                        'number',
                        'integer',
                        'string',
                        'boolean',
                        'array',
                        'object',
                        'null',
                    ],
                },
                timing: {
                    type: 'boolean',
                    default: false,
                },
            },
            additionalProperties: false,
            required: ['engine'],
        }, this.engine.request);
    }
}
