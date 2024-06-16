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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSupersequel = void 0;
const ajv_1 = __importDefault(require("ajv"));
const ajv_keywords_1 = __importDefault(require("ajv-keywords"));
const hql_1 = __importDefault(require("./hql"));
class Supersequel {
    constructor(config = {}) {
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
                async: {
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
                handler: {
                    typeof: 'function',
                    // Do not set default function
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
    outbound(response, query, definition, history, data) {
        const outboundAjv = new ajv_1.default({ useDefaults: true, removeAdditional: 'all' });
        // Do we have proper outbound query schema
        if (definition.outboundSchema && !outboundAjv.validate(definition.outboundSchema, data)) {
            response.queries.push(Object.assign(Object.assign({}, this.getQueryName(query)), { error: {
                    errno: 1005,
                    code: 'ERROR_QUERY_OUTBOUND_VALIDATION',
                    details: outboundAjv.errors
                } }));
        }
        else {
            if (query.id)
                history[query.id] = data;
            // Add succesfull query responses by id
            response.queries.push(Object.assign(Object.assign({}, this.getQueryName(query)), { results: data }));
        }
    }
    /**
     * Query
     */
    query(request, definition, config, history = {}) {
        if (!definition.statement)
            throw new Error('Query definition requires a statement.');
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
    middleware(config = {}) {
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
        var _a, e_1, _b, _c;
        var _d, _e;
        return __awaiter(this, void 0, void 0, function* () {
            const response = { queries: [], send: () => { } };
            const inboundAjv = new ajv_1.default({ useDefaults: true });
            (0, ajv_keywords_1.default)(inboundAjv);
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
                try {
                    for (var _f = true, _g = __asyncValues(config.queries), _h; _h = yield _g.next(), _a = _h.done, !_a;) {
                        _c = _h.value;
                        _f = false;
                        try {
                            const query = _c;
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
                            const definition = (_d = config.definitions) === null || _d === void 0 ? void 0 : _d.find(q => q.name === query.name);
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
                            if (!this.intersects(definition.access, ((_e = config.user) === null || _e === void 0 ? void 0 : _e.access) || [])) {
                                response.queries.push(Object.assign(Object.assign({}, this.getQueryName(query)), { error: { errno: 1003, code: 'ERROR_QUERY_NO_ACCESS' } }));
                                continue;
                            }
                            // Is the handler a function?
                            if (definition.handler && typeof definition.handler !== 'function') {
                                response.queries.push(Object.assign(Object.assign({}, this.getQueryName(query)), { error: { errno: 1008, code: 'ERROR_QUERY_HANDLER_NOT_FUNCTION' } }));
                                continue;
                            }
                            const queryPromise = new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
                                try {
                                    // Do we have proper inbound query schema?
                                    let data;
                                    if (definition.inboundSchema && !inboundAjv.validate(definition.inboundSchema, query.properties)) {
                                        response.queries.push(Object.assign(Object.assign({}, this.getQueryName(query)), { error: {
                                                errno: 1004,
                                                code: 'ERROR_QUERY_INBOUND_VALIDATION',
                                                details: inboundAjv.errors
                                            } }));
                                    }
                                    else if (definition.statement === '') {
                                        if (definition.handler)
                                            data = yield definition.handler({ response, query, definition, history, config, data });
                                        this.outbound(response, query, definition, history, data);
                                    }
                                    else {
                                        data = yield this.query(query, definition, config, history);
                                        if (definition.handler)
                                            data = yield definition.handler({ response, query, definition, history, config, data });
                                        this.outbound(response, query, definition, history, data);
                                    }
                                }
                                catch (error) {
                                    this.queryError(error, query, response, config);
                                }
                                finally {
                                    resolve();
                                }
                            }));
                            if (!query.async)
                                yield queryPromise;
                            else
                                async.push(queryPromise);
                        }
                        finally {
                            _f = true;
                        }
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (!_f && !_a && (_b = _g.return)) yield _b.call(_g);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
                // Process all of the async queries here
                // The catch was defined above in the creation of the promise
                if (async.length)
                    yield Promise.all(async);
            }
            catch (error) {
                // Do we have any unknown issues?
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
exports.default = Supersequel;
/**
 * Init
 */
function initSupersequel(config) {
    return new Supersequel(config);
}
exports.initSupersequel = initSupersequel;
