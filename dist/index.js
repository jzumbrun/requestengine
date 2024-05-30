"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ajv_1 = __importDefault(require("ajv"));
const hql_1 = __importDefault(require("./hql"));
class Superqequel {
    constructor(config) {
        config.definitions = config.definitions || [];
        config.env = process.env.NODE_ENV || 'production';
        config.query = config.query || undefined;
        config.release = config.release || undefined;
        this.config = config;
    }
    intersects(a, b) {
        const setA = new Set(a);
        return b.some(value => setA.has(value));
    }
    /**
     * Validate Request
     */
    validateRequest(request, inboundAjv) {
        return inboundAjv.validate({
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
                sync: {
                    type: 'boolean',
                    default: false
                }
            },
            additionalProperties: false
        }, request);
    }
    /**
     * Validate Query Definition
     */
    validateQueryDefinition(definition, inboundAjv) {
        return inboundAjv.validate({
            type: 'object',
            properties: {
                name: {
                    type: 'string',
                    default: 'ERROR_MISSING_NAME'
                },
                statement: {
                    type: 'string',
                    default: ''
                },
                alias: {
                    type: 'object',
                    default: {}
                },
                properties: {
                    type: 'object',
                    default: {}
                },
                inboundSchema: {
                    type: 'object',
                    default: {}
                },
                outboundSchema: {
                    type: 'object',
                    default: {}
                },
                access: {
                    type: 'array',
                    default: []
                }
            },
            additionalProperties: false
        }, definition);
    }
    /**
     * Outbound
     */
    outbound(response, request, rows, definition, history) {
        const outboundAjv = new ajv_1.default({ useDefaults: true, removeAdditional: 'all' });
        // Do we have proper outbound query schema
        if (!outboundAjv.validate(definition.outboundSchema, rows)) {
            response.queries.push(Object.assign(Object.assign({}, this.getQueryName(request)), { error: {
                    errno: 1005,
                    code: 'ERROR_QUERY_OUTBOUND_VALIDATION',
                    details: outboundAjv.errors
                } }));
        }
        else {
            if (request.id)
                history[request.id] = rows;
            // Add succesfull query responses by id
            response.queries.push(Object.assign(Object.assign({}, this.getQueryName(request)), { results: rows }));
        }
    }
    /**
     * Query
     */
    query(request, definition, config, history = {}) {
        const hql = new hql_1.default();
        const data = Object.assign(Object.assign({}, (request.properties || {})), { $user: config.user, $history: history, $definition: definition });
        hql.registerHelpers(config.helpers);
        const statement = hql.compile(definition.statement, data);
        if (!config.query)
            throw new Error('config.query is required in either the main or middleware config.');
        return config.query(statement, hql.getParams());
    }
    /**
     * Get Request Name
     * @param {object} request
     */
    getQueryName(request) {
        if (request.id)
            return { id: request.id, name: request.name };
        return { name: request.name };
    }
    /**
     * Query Error
     */
    queryError(error, request, response, config) {
        // Do we have good sql statements?
        const err = Object.assign(Object.assign({}, this.getQueryName(request)), { error: { errno: 1006, code: 'ERROR_IMPROPER_QUERY_STATEMENT' } });
        if (config.env === 'production')
            response.queries.push(err);
        else {
            err.details = error.message;
            response.queries.push(err);
        }
    }
    /**
     * Query middleware
     * @param {object} config
     */
    middleware(config) {
        return (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            const response = yield this.execute(Object.assign({ queries: ((_a = req.body) === null || _a === void 0 ? void 0 : _a.queries) || [], user: req.user }, config));
            res.send(response);
        });
    }
    /**
     * Execute queries
     */
    execute(config) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const response = { queries: [], send: () => { } };
            const inboundAjv = new ajv_1.default({ useDefaults: true });
            const async = [];
            const history = {};
            // Set config defaults
            config.env = config.env || this.config.env;
            config.helpers = config.helpers || this.config.helpers;
            config.definitions = config.definitions || this.config.definitions;
            config.query = config.query || this.config.query;
            config.release = config.release || this.config.release;
            config.queries = config.queries || [];
            try {
                for (const query of config.queries) {
                    // Do we have proper query schema?
                    if (!this.validateRequest(query, inboundAjv)) {
                        response.queries.push(Object.assign(Object.assign({}, this.getQueryName(query)), { error: {
                                errno: 1000,
                                code: 'ERROR_REQUEST_VALIDATION',
                                details: inboundAjv.errors
                            } }));
                        continue;
                    }
                    // Do we have proper definition query schema?
                    const definition = (_a = config.definitions) === null || _a === void 0 ? void 0 : _a.find(q => q.name === query.name);
                    // Do we have sql?
                    if (!definition) {
                        response.queries.push(Object.assign(Object.assign({}, this.getQueryName(query)), { error: { errno: 1002, code: 'ERROR_QUERY_NOT_FOUND' } }));
                        continue;
                    }
                    if (!this.validateQueryDefinition(definition, inboundAjv)) {
                        response.queries.push(Object.assign(Object.assign({}, this.getQueryName(query)), { error: {
                                errno: 1001,
                                code: 'ERROR_QUERY_DEFINITION_VALIDATION',
                                details: inboundAjv.errors
                            } }));
                        continue;
                    }
                    // Do we have access rights?
                    if (!this.intersects(definition.access, ((_b = config.user) === null || _b === void 0 ? void 0 : _b.access) || [])) {
                        response.queries.push(Object.assign(Object.assign({}, this.getQueryName(query)), { error: { errno: 1003, code: 'ERROR_QUERY_NO_ACCESS' } }));
                        continue;
                    }
                    // Do we have proper inbound query schema?
                    if (!inboundAjv.validate(definition.inboundSchema, query.properties)) {
                        response.queries.push(Object.assign(Object.assign({}, this.getQueryName(query)), { error: {
                                errno: 1004,
                                code: 'ERROR_QUERY_INBOUND_VALIDATION',
                                details: inboundAjv.errors
                            } }));
                    }
                    else {
                        const queryPromise = this.query(query, definition, config, history)
                            .then((rows) => {
                            this.outbound(response, query, rows, definition, history);
                        })
                            .catch(error => this.queryError(error, query, response, config));
                        if (query.sync)
                            yield queryPromise;
                        else
                            async.push(queryPromise);
                    }
                }
                // Process all of the async queries here
                // The catch was defined above in the creation of the promise
                if (async.length)
                    yield Promise.all(async).catch(e => { });
            }
            catch (error) {
                // Do we have any uknown issues?
                const err = { error: { errno: 1007, code: 'ERROR_UNKNOWN' } };
                if (config.env === 'production')
                    response.queries.push(err);
                else {
                    err.details = error.message;
                    response.queries.push(err);
                }
            }
            finally {
                if (typeof config.release === 'function')
                    config.release(response);
            }
            return response;
        });
    }
}
/**
 * Init
 */
exports.default = (config) => {
    return new Superqequel(config);
};
