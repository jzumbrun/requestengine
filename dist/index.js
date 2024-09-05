'use strict'
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
  function adopt (value) { return value instanceof P ? value : new P(function (resolve) { resolve(value) }) }
  return new (P || (P = Promise))(function (resolve, reject) {
    function fulfilled (value) { try { step(generator.next(value)) } catch (e) { reject(e) } }
    function rejected (value) { try { step(generator.throw(value)) } catch (e) { reject(e) } }
    function step (result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected) }
    step((generator = generator.apply(thisArg, _arguments || [])).next())
  })
}
var __asyncValues = (this && this.__asyncValues) || function (o) {
  if (!Symbol.asyncIterator) throw new TypeError('Symbol.asyncIterator is not defined.')
  var m = o[Symbol.asyncIterator]; var i
  return m ? m.call(o) : (o = typeof __values === 'function' ? __values(o) : o[Symbol.iterator](), i = {}, verb('next'), verb('throw'), verb('return'), i[Symbol.asyncIterator] = function () { return this }, i)
  function verb (n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value) }) } }
  function settle (resolve, reject, d, v) { Promise.resolve(v).then(function (v) { resolve({ value: v, done: d }) }, reject) }
}
var __importDefault = (this && this.__importDefault) || function (mod) {
  return (mod && mod.__esModule) ? mod : { default: mod }
}
Object.defineProperty(exports, '__esModule', { value: true })
exports.initRequestEngine = initRequestEngine
const ajv_1 = __importDefault(require('ajv'))
const ajv_keywords_1 = __importDefault(require('ajv-keywords'))
const HqlEngine_1 = __importDefault(require('./HqlEngine'))
class RequestEngine {
  constructor (config = {}) {
    config.definitions = config.definitions || []
    config.env = process.env.NODE_ENV || 'production'
    config.release = config.release || undefined
    config.query = config.query || undefined
    this.config = config
  }

  /**
     * Hql
     */
  static hql (request, definition, config, history = {}) {
    if (!definition.hql) { throw new Error('Request definition requires a hql.') }
    const hqlEngine = new HqlEngine_1.default()
    const data = Object.assign(Object.assign({}, (request.properties || {})), { $user: config.user, $history: history, $definition: definition })
    hqlEngine.registerHelpers(config.helpers)
    const compiled = hqlEngine.compile(definition.hql, data)
    if (!config.query) { throw new Error('config.query is required in either the main or middleware config.') }
    return config.query(compiled, hqlEngine.getParams())
  }

  intersects (a, b) {
    const setA = new Set(a)
    return b.some(value => setA.has(value))
  }

  /**
     * Validate Request
     */
  validateRequest (request, inboundAjv) {
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
    }, request)
  }

  /**
     * Validate Request Definition
     */
  validateRequestDefinition (definition, inboundAjv) {
    return inboundAjv.validate({
      type: 'object',
      properties: {
        name: {
          type: 'string',
          default: 'ERROR_MISSING_NAME'
        },
        hql: {
          type: 'string',
          default: ''
        },
        handler: {
          typeof: 'function'
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
            }
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
    }, definition)
  }

  /**
     * Outbound
     */
  outbound (response, request, definition, history, data) {
    const outboundAjv = new ajv_1.default({ useDefaults: true, removeAdditional: 'all' })
    // Do we have proper outbound request schema
    if (definition.outboundSchema && !outboundAjv.validate(definition.outboundSchema, data)) {
      response.requests.push(Object.assign(Object.assign({}, this.getRequestName(request)), {
        error: {
          errno: 1005,
          code: 'ERROR_REQUEST_OUTBOUND_VALIDATION',
          details: outboundAjv.errors
        }
      }))
    } else {
      if (request.id) { history[request.id] = data }
      // Add succesfull request responses by id
      response.requests.push(Object.assign(Object.assign({}, this.getRequestName(request)), { results: data }))
    }
  }

  /**
     * Get Request Name
     */
  getRequestName (request) {
    if (request.id) { return { id: request.id, name: request.name } }
    return { name: request.name }
  }

  /**
     * Request Error
     */
  requestError (error, request, response, config) {
    // Do we have good sql hqls?
    const err = Object.assign(Object.assign({}, this.getRequestName(request)), { error: { errno: 1006, code: 'ERROR_IMPROPER_REQUEST_STATEMENT' } })
    if (config.env === 'production') { response.requests.push(err) } else {
      err.details = error.message
      response.requests.push(err)
    }
  }

  /**
     * Request middleware
     * @param {object} config
     */
  middleware (config = {}) {
    return (req, res) => __awaiter(this, void 0, void 0, function * () {
      var _a
      const response = yield this.execute(Object.assign({ requests: ((_a = req.body) === null || _a === void 0 ? void 0 : _a.requests) || [], user: req.user }, config))
      res.send(response)
    })
  }

  /**
     * Execute queries
     */
  execute () {
    return __awaiter(this, arguments, void 0, function * (config = {}) {
      var _a, e_1, _b, _c
      var _d, _e
      const response = { requests: [] }
      const inboundAjv = new ajv_1.default({ useDefaults: true });
      (0, ajv_keywords_1.default)(inboundAjv)
      const async = []
      const history = {}
      // Set config defaults
      config.env = config.env || this.config.env
      config.helpers = config.helpers || this.config.helpers
      config.definitions = config.definitions || this.config.definitions
      config.query = config.query || this.config.query
      config.release = config.release || this.config.release
      config.requests = config.requests || []
      try {
        try {
          for (var _f = true, _g = __asyncValues(config.requests), _h; _h = yield _g.next(), _a = _h.done, !_a; _f = true) {
            _c = _h.value
            _f = false
            const request = _c
            // Do we have proper request schema?
            if (!this.validateRequest(request, inboundAjv)) {
              response.requests.push(Object.assign(Object.assign({}, this.getRequestName(request)), {
                error: {
                  errno: 1000,
                  code: 'ERROR_REQUEST_VALIDATION',
                  details: inboundAjv.errors
                }
              }))
              continue
            }
            // Do we have proper definition request schema?
            const definition = (_d = config.definitions) === null || _d === void 0 ? void 0 : _d.find(q => q.name === request.name)
            // Do we have sql?
            if (!definition) {
              response.requests.push(Object.assign(Object.assign({}, this.getRequestName(request)), { error: { errno: 1002, code: 'ERROR_REQUEST_NOT_FOUND' } }))
              continue
            }
            if (!this.validateRequestDefinition(definition, inboundAjv)) {
              response.requests.push(Object.assign(Object.assign({}, this.getRequestName(request)), {
                error: {
                  errno: 1001,
                  code: 'ERROR_REQUEST_DEFINITION_VALIDATION',
                  details: inboundAjv.errors
                }
              }))
              continue
            }
            // Do we have access rights?
            if (!this.intersects(definition.access, ((_e = config.user) === null || _e === void 0 ? void 0 : _e.access) || [])) {
              response.requests.push(Object.assign(Object.assign({}, this.getRequestName(request)), { error: { errno: 1003, code: 'ERROR_REQUEST_NO_ACCESS' } }))
              continue
            }
            // Is the handler a function?
            if (definition.handler && typeof definition.handler !== 'function') {
              response.requests.push(Object.assign(Object.assign({}, this.getRequestName(request)), { error: { errno: 1008, code: 'ERROR_REQUEST_HANDLER_NOT_FUNCTION' } }))
              continue
            }
            // Do we have both handler and hql?
            if (definition.handler && definition.hql) {
              response.requests.push(Object.assign(Object.assign({}, this.getRequestName(request)), { error: { errno: 1009, code: 'ERROR_REQUEST_HANDLER_AND_STATEMENT' } }))
              continue
            }
            const requestPromise = new Promise((resolve) => __awaiter(this, void 0, void 0, function * () {
              try {
                // Do we have proper inbound request schema?
                let data
                if (definition.inboundSchema && !inboundAjv.validate(definition.inboundSchema, request.properties)) {
                  response.requests.push(Object.assign(Object.assign({}, this.getRequestName(request)), {
                    error: {
                      errno: 1004,
                      code: 'ERROR_REQUEST_INBOUND_VALIDATION',
                      details: inboundAjv.errors
                    }
                  }))
                } else if (definition.handler) {
                  data = yield definition.handler({ response, request, definition, history, config, data })
                  this.outbound(response, request, definition, history, data)
                } else {
                  data = yield RequestEngine.hql(request, definition, config, history)
                  this.outbound(response, request, definition, history, data)
                }
              } catch (error) {
                this.requestError(error, request, response, config)
              } finally {
                resolve()
              }
            }))
            if (!request.async) { yield requestPromise } else { async.push(requestPromise) }
          }
        } catch (e_1_1) { e_1 = { error: e_1_1 } } finally {
          try {
            if (!_f && !_a && (_b = _g.return)) yield _b.call(_g)
          } finally { if (e_1) throw e_1.error }
        }
        // Process all of the async queries here
        // The catch was defined above in the creation of the promise
        if (async.length) { yield Promise.all(async) }
      } catch (error) {
        // Do we have any unknown issues?
        const err = { error: { errno: 1007, code: 'ERROR_UNKNOWN' } }
        if (config.env === 'production') { response.requests.push(err) } else {
          err.details = error.message
          response.requests.push(err)
        }
      } finally {
        if (typeof config.release === 'function') { config.release(response) }
      }
      return response
    })
  }
}
exports.default = RequestEngine
/**
 * Init
 */
function initRequestEngine (config) {
  return new RequestEngine(config)
}
