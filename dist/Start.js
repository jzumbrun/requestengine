import { Ajv } from 'ajv';
import ajvKeywords from 'ajv-keywords';
import EngineError from './errors/EngineError.js';
/**
 * Start
 */
export default class Start {
    constructor(tuning) {
        this.tuning = tuning;
        this.avj = new Ajv({ useDefaults: true, removeAdditional: 'all' });
        ajvKeywords.default(this.avj);
    }
    turnOver() {
        var _a;
        if (!((_a = this.tuning.engines) === null || _a === void 0 ? void 0 : _a.length)) {
            throw new EngineError(1000, 'ERROR_MISSING_ENGINES');
        }
        for (const engine of this.tuning.engines) {
            if (!this.check(engine)) {
                throw new EngineError(1001, 'ERROR_REQUEST_ENGINE_VALIDATION', this.avj.errors);
            }
        }
    }
    /**
     * Check
     */
    check(engine) {
        return this.avj.validate({
            type: 'object',
            properties: {
                name: {
                    type: 'string',
                    default: 'ERROR_MISSING_NAME'
                },
                identifiers: {
                    items: {
                        type: 'object',
                        properties: {
                            name: {
                                type: 'string',
                                default: ''
                            },
                            alias: {
                                type: 'string',
                                default: ''
                            }
                        },
                    },
                    type: 'array',
                    default: []
                },
                intake: {
                    type: 'object',
                    default: {}
                },
                exhaust: {
                    type: 'object',
                    default: {}
                },
                keys: {
                    type: 'array',
                    default: []
                }
            },
            oneOf: [
                {
                    properties: {
                        compression: {
                            type: 'string',
                            default: ''
                        }
                    }
                },
                {
                    properties: {
                        power: {
                            typeof: 'function',
                            // Do not set default function
                        }
                    }
                }
            ],
            additionalProperties: false,
            required: ['name', 'intake', 'exhaust', 'keys']
        }, engine);
    }
}
