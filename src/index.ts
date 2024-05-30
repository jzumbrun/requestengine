import Ajv from 'ajv'
import Hql from './hql'
import type { IConfig, IDefinition, IError, 
  IHistory, IRequest, IResponse, IQueryName } from '../types'

class Superqequel {
  config: IConfig

  constructor (config: IConfig) {
    config.definitions = config.definitions || []
    config.env = process.env.NODE_ENV || 'production'
    config.query = config.query || undefined
    config.release = config.release || undefined
    this.config = config
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
          sync: {
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
   * Validate Query Definition
   */
  validateQueryDefinition (definition: IDefinition, inboundAjv: Ajv): boolean {
    return inboundAjv.validate(
      {
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
      },
      definition
    )
  }

  /**
   * Outbound
   */
  outbound (response: IResponse, request: IRequest, rows: unknown, definition: IDefinition, history: IHistory): void {
    const outboundAjv = new Ajv({ useDefaults: true, removeAdditional: 'all' })

    // Do we have proper outbound query schema
    if (!outboundAjv.validate(definition.outboundSchema, rows)) {
      response.queries.push({
        ...this.getQueryName(request),
        error: {
          errno: 1005,
          code: 'ERROR_QUERY_OUTBOUND_VALIDATION',
          details: outboundAjv.errors
        }
      })
    } else {
      if (request.id) history[request.id] = rows
      // Add succesfull query responses by id
      response.queries.push({ ...this.getQueryName(request), results: rows })
    }
  }

  /**
   * Query
   */
  query (request: IRequest, definition: IDefinition, config: IConfig, history: IHistory = {}): Promise<unknown> {

    const hql = new Hql()
    const data = {
      ...(request.properties || {}),
      $user: config.user,
      $history: history,
      $definition: definition
    }
    hql.registerHelpers(config.helpers)
    const statement = hql.compile(definition.statement, data)
    if (!config.query) throw new Error('config.query is required in either the main or middleware config.')
    return config.query(statement, hql.getParams())
  }

  /**
   * Get Request Name
   * @param {object} request
   */
  getQueryName (request: IRequest): IQueryName {
    if (request.id) return { id: request.id, name: request.name }
    return { name: request.name }
  }

  /**
   * Query Error
   */
  queryError (error: Error, request: IRequest, response: IResponse, config: IConfig): void {
    // Do we have good sql statements?
    const err: IError = {
      ...this.getQueryName(request),
      error: { errno: 1006, code: 'ERROR_IMPROPER_QUERY_STATEMENT' }
    }
    if (config.env === 'production') response.queries.push(err)
    else {
      err.details = error.message
      response.queries.push(err)
    }
  }

  /**
   * Query middleware
   * @param {object} config
   */
  middleware (config: IConfig) {
    return async (req: IRequest, res: IResponse) => {
      const response = await this.execute({
        queries: req.body?.queries || [],
        user: req.user,
        ...config
      })
      res.send(response)
    }
  }

  /**
   * Execute queries
   */
  async execute (config: IConfig): Promise<IResponse> {
    const response: IResponse = { queries: [], send: () => {} }
    const inboundAjv = new Ajv({ useDefaults: true })
    const async: Promise<void>[] = []
    const history: IHistory = {}

    // Set config defaults
    config.env = config.env || this.config.env
    config.helpers = config.helpers || this.config.helpers
    config.definitions = config.definitions || this.config.definitions
    config.query = config.query || this.config.query
    config.release = config.release || this.config.release
    config.queries = config.queries || []

    try {
      for (const query of config.queries) {
        // Do we have proper query schema?
        if (!this.validateRequest(query, inboundAjv)) {
          response.queries.push({
            ...this.getQueryName(query),
            error: {
              errno: 1000,
              code: 'ERROR_REQUEST_VALIDATION',
              details: inboundAjv.errors
            }
          })
          continue
        }

        // Do we have proper definition query schema?
        const definition = config.definitions?.find(q => q.name === query.name)

        // Do we have sql?
        if (!definition) {
          response.queries.push({
            ...this.getQueryName(query),
            error: { errno: 1002, code: 'ERROR_QUERY_NOT_FOUND' }
          })
          continue
        }

        if (!this.validateQueryDefinition(definition, inboundAjv)) {
          response.queries.push({
            ...this.getQueryName(query),
            error: {
              errno: 1001,
              code: 'ERROR_QUERY_DEFINITION_VALIDATION',
              details: inboundAjv.errors
            }
          })
          continue
        }

        // Do we have access rights?
        if (!this.intersects(definition.access, config.user?.access || [])) {
          response.queries.push({
            ...this.getQueryName(query),
            error: { errno: 1003, code: 'ERROR_QUERY_NO_ACCESS' }
          })
          continue
        }

        // Do we have proper inbound query schema?
        if (!inboundAjv.validate(definition.inboundSchema, query.properties)) {
          response.queries.push({
            ...this.getQueryName(query),
            error: {
              errno: 1004,
              code: 'ERROR_QUERY_INBOUND_VALIDATION',
              details: inboundAjv.errors
            }
          })
        } else {
          const queryPromise = this.query(
            query,
            definition,
            config,
            history
          )
          .then((rows: unknown) => {
            this.outbound(response, query, rows, definition, history)
          })
          .catch(error => this.queryError(error, query, response, config))

          if (query.sync) await queryPromise
          else async.push(queryPromise)
        }
      }

      // Process all of the async queries here
      // The catch was defined above in the creation of the promise
      if (async.length) await Promise.all(async).catch(e => {})
    } catch (error: any) {
      // Do we have any uknown issues?
      const err: IError = { error: { errno: 1007, code: 'ERROR_UNKNOWN' } }
      if (config.env === 'production') response.queries.push(err)
      else {
        err.details = error.message
        response.queries.push(err)
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
export default (config: IConfig) => {
  return new Superqequel(config)
}

