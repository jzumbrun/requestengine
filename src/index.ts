import Ajv from 'ajv'
import ajvKeywords from 'ajv-keywords'
import HqlEngine from './HqlEngine'
import type { IConfig, IDefinition, IError, 
  IHistory, IRequest, IResponse, IHTTPRequest, IHTTPResponse, IRequestName} from '../types.d.ts'

export type * from '../types.d.ts'

export default class RequestEngine {
  config: IConfig

  constructor (config: IConfig = {}) {
    config.definitions = config.definitions || []
    config.env = process.env.NODE_ENV || 'production'
    config.release = config.release || undefined
    config.query = config.query || undefined
    this.config = config

  }

  /**
   * Hql
   */
  static hql (request: IRequest, definition: IDefinition, config: IConfig, history: IHistory = {}): Promise<unknown> {
    if (!definition.hql) throw new Error('Request definition requires a hql.')
    const hqlEngine = new HqlEngine()
    const data = {
      ...(request.properties || {}),
      $user: config.user,
      $history: history,
      $definition: definition
    }
    hqlEngine.registerHelpers(config.helpers)
    const compiled = hqlEngine.compile(definition.hql, data)
    if (!config.query) throw new Error('config.query is required in either the main or middleware config.')
    return config.query(compiled, hqlEngine.getParams())
  }

  intersects (a: any[], b: any[]): boolean {
    const setA = new Set(a);
    return b.some(value => setA.has(value));
  }

  /**
   * Validate Request
   */
  validateRequest (request: IRequest, inboundAjv: Ajv): boolean {
    return inboundAjv.validate(
      {
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
      },
      request
    )
  }

  /**
   * Validate Request Definition
   */
  validateRequestDefinition (definition: IDefinition, inboundAjv: Ajv): boolean {
    return inboundAjv.validate(
      {
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
      },
      definition
    )
  }

  /**
   * Outbound
   */
  outbound (response: IResponse, request: IRequest, definition: IDefinition, history: IHistory, data: unknown ): void {
    const outboundAjv = new Ajv({ useDefaults: true, removeAdditional: 'all' })

    // Do we have proper outbound request schema
    if (definition.outboundSchema && !outboundAjv.validate(definition.outboundSchema, data)) {
      response.requests.push({
        ...this.getRequestName(request),
        error: {
          errno: 1005,
          code: 'ERROR_REQUEST_OUTBOUND_VALIDATION',
          details: outboundAjv.errors
        }
      })
    } else {
      if (request.id) history[request.id] = data
      // Add succesfull request responses by id
      response.requests.push({ ...this.getRequestName(request), results: data })
    }
  }

  /**
   * Get Request Name
   */
  getRequestName (request: IRequest): IRequestName {
    if (request.id) return { id: request.id, name: request.name }
    return { name: request.name }
  }

  /**
   * Request Error
   */
  requestError (error: Error, request: IRequest, response: IResponse, config: IConfig): void {
    // Do we have good sql hqls?
    const err: IError = {
      ...this.getRequestName(request),
      error: { errno: 1006, code: 'ERROR_IMPROPER_REQUEST_STATEMENT' }
    }
    if (config.env === 'production') response.requests.push(err)
    else {
      err.details = error.message
      response.requests.push(err)
    }
  }

  /**
   * Request middleware
   * @param {object} config
   */
  middleware (config: IConfig = {}) {
    return async (req: IHTTPRequest, res: IHTTPResponse) => {
      const response = await this.execute({
        requests: req.body?.requests || [],
        user: req.user,
        ...config
      })
      res.send(response)
    }
  }

  /**
   * Execute queries
   */
  async execute (config: IConfig = {}): Promise<IResponse> {

    const response: IResponse = { requests: [] }
    const inboundAjv = new Ajv({ useDefaults: true })
    ajvKeywords(inboundAjv)

    const async: Promise<void>[] = []
    const history: IHistory = {}

    // Set config defaults
    config.env = config.env || this.config.env
    config.helpers = config.helpers || this.config.helpers
    config.definitions = config.definitions || this.config.definitions
    config.query = config.query || this.config.query
    config.release = config.release || this.config.release
    config.requests = config.requests || []

    try {
      for await (const request of config.requests) {
        // Do we have proper request schema?
        if (!this.validateRequest(request, inboundAjv)) {
          response.requests.push({
            ...this.getRequestName(request),
            error: {
              errno: 1000,
              code: 'ERROR_REQUEST_VALIDATION',
              details: inboundAjv.errors
            }
          })
          continue
        }

        // Do we have proper definition request schema?
        const definition = config.definitions?.find(q => q.name === request.name)

        // Do we have sql?
        if (!definition) {
          response.requests.push({
            ...this.getRequestName(request),
            error: { errno: 1002, code: 'ERROR_REQUEST_NOT_FOUND' }
          })
          continue
        }

        if (!this.validateRequestDefinition(definition, inboundAjv)) {
          response.requests.push({
            ...this.getRequestName(request),
            error: {
              errno: 1001,
              code: 'ERROR_REQUEST_DEFINITION_VALIDATION',
              details: inboundAjv.errors
            }
          })
          continue
        }

        // Do we have access rights?
        if (!this.intersects(definition.access, config.user?.access || [])) {
          response.requests.push({
            ...this.getRequestName(request),
            error: { errno: 1003, code: 'ERROR_REQUEST_NO_ACCESS' }
          })
          continue
        }

        // Is the handler a function?
        if (definition.handler && typeof definition.handler !== 'function') {
          response.requests.push({
            ...this.getRequestName(request),
            error: { errno: 1008, code: 'ERROR_REQUEST_HANDLER_NOT_FUNCTION' }
          })
          continue
        }

        // Do we have both handler and hql?
        if (definition.handler && definition.hql) {
          response.requests.push({
            ...this.getRequestName(request),
            error: { errno: 1009, code: 'ERROR_REQUEST_HANDLER_AND_STATEMENT' }
          })
          continue
        }

        const requestPromise = new Promise<void>(async (resolve) => {
          try {
            // Do we have proper inbound request schema?
            let data: unknown
            if (definition.inboundSchema && !inboundAjv.validate(definition.inboundSchema, request.properties)) {
              response.requests.push({
                ...this.getRequestName(request),
                error: {
                  errno: 1004,
                  code: 'ERROR_REQUEST_INBOUND_VALIDATION',
                  details: inboundAjv.errors
                }
              })
            } else if (definition.handler) {
                data = await definition.handler({ response, request, definition, history, config, data })
                this.outbound(response, request, definition, history, data)
            } else {
              data = await RequestEngine.hql(request, definition, config, history)
              this.outbound(response, request, definition, history, data )
            }
          } catch (error: any) {
            this.requestError(error, request, response, config)
          } finally {
            resolve()
          }
        })
        if (!request.async) await requestPromise
        else async.push(requestPromise)
      }

      // Process all of the async queries here
      // The catch was defined above in the creation of the promise
      if (async.length) await Promise.all(async)
    } catch (error: any) {
      // Do we have any unknown issues?
      const err: IError = { error: { errno: 1007, code: 'ERROR_UNKNOWN' } }
      if (config.env === 'production') response.requests.push(err)
      else {
        err.details = error.message
        response.requests.push(err)
      }
    } finally {
      if (typeof config.release === 'function') config.release(response)
    }

    return response
  }
}

/**
 * Init
 */
export function initRequestEngine (config: IConfig) {
  return new RequestEngine(config)
}
