import Handlebars, { Utils } from 'handlebars'
import { RequestError } from './errors/index.js'
import type { IToolBox } from './types.js'
import type Engine from './Engine.js'

/**
 * Compression
 */
export default class Compression {
  private engine: Engine
  private handlebars: typeof Handlebars
  private HTMLEscapeExpression: typeof Utils.escapeExpression
  private params: unknown[]

  constructor(engine: Engine) {
    this.engine = engine
    this.handlebars = Handlebars.create()
    this.HTMLEscapeExpression = this.handlebars.Utils.escapeExpression
    this.params = []
  }

  public stroke<T>(): Promise<T> {
    this.registerToolBox(this.engine.garage.toolbox)
    const compiled = this.compile()
    return this.engine.gear.drive!(compiled, this.getParams())
  }

  public static compressionStroke<T>(
    query: string,
    engine: Engine
  ): Promise<T[]> {
    engine.model.compression = query
    const compression = new Compression(engine)
    return compression.stroke<T[]>()
  }

  private getParams(): unknown[] {
    return this.params
  }

  private escapeIdentifier(str: string): string {
    return '"' + str.replace(/"/g, '""') + '"'
  }

  /**
   * Compile
   * Allows us to override the escape expression just for this compile call.
   */
  private compile(): string {
    this.params = []
    this.registerEscapeExpression()
    const compiled = this.handlebars.compile(this.engine.model.compression)(
      this.engine.intakeValves
    )
    this.unRegisterEscapeExpression()
    return compiled
  }

  /**
   * Register Escape Expression
   */
  private registerEscapeExpression(): void {
    this.handlebars.Utils.escapeExpression = (value: unknown) => {
      return this.parameterize(value)
    }
  }

  /**
   * Parameterize
   */
  private parameterize(value: any): string {
    // Ensure nulls, which are objects, do not fall to value.__tool__
    if (value && typeof value === 'object' && value.__tool__) {
      switch (value.__tool__) {
        case 'assign':
          if (typeof value.value !== 'object')
            throw new RequestError(
              this.engine.request,
              2510,
              'ERROR_COMPRESSION_PARAMETERIZE',
              { message: ':set must be an object' }
            )
          return this.assign(value.value)
        case 'columns':
          if (typeof value.value !== 'object')
            throw new RequestError(
              this.engine.request,
              2520,
              'ERROR_COMPRESSION_PARAMETERIZE',
              { message: ':columns must be an array or object' }
            )
          return Array.isArray(value.value)
            ? this.arrayToList(value.value, true)
            : this.arrayToList(Object.keys(value.value), true)
        case 'values':
          if (typeof value.value !== 'object')
            throw new RequestError(
              this.engine.request,
              2540,
              'ERROR_COMPRESSION_PARAMETERIZE',
              { message: ':values must be an array or object' }
            )
          return Array.isArray(value.value)
            ? this.arrayToList(value.value)
            : this.arrayToList(Object.values(value.value))
        case 'escape':
          if (typeof value.value === 'object')
            throw new RequestError(
              this.engine.request,
              2550,
              'ERROR_COMPRESSION_PARAMETERIZE',
              {
                message:
                  ':escape must be a string, number, bool, undefined or null',
              }
            )
          else if (typeof value.value === 'string') {
            return this.escapeIdentifier(value.value)
          } else if (
            typeof value.value === 'number' ||
            typeof value.value === 'boolean'
          ) {
            return String(value.value)
          }
          return 'NULL'
        case 'orderBy':
          if (typeof value.value !== 'object')
            throw new RequestError(
              this.engine.request,
              2560,
              'ERROR_COMPRESSION_PARAMETERIZE',
              { message: ':orderBy must be an object' }
            )
          return this.orderBy(value.value)
      }
    }
    const index = this.params.indexOf(value)
    if (index > -1) return '$' + (index + 1)
    this.params.push(value)
    return '$' + this.params.length
  }

  /**
   * Unregister Escape Expression
   */
  private unRegisterEscapeExpression(): void {
    this.handlebars.Utils.escapeExpression = this.HTMLEscapeExpression
  }

  /**
   * Array to List
   */
  private arrayToList(array: string[], escape = false): string {
    let sql = ''
    array.forEach((val, i) => {
      sql +=
        (i === 0 ? '' : ', ') +
        (escape ? this.escapeIdentifier(val) : this.parameterize(val))
    })
    return sql
  }

  /**
   * Order By
   */
  private orderBy(object: Record<string, any>): string {
    let sql = ''
    Object.keys(object).forEach((key: string, i) => {
      const dir = object[key].toUpperCase()
      if (dir !== 'ASC' && dir !== 'DESC') {
        throw new RequestError(
          this.engine.request,
          2561,
          'ERROR_COMPRESSION_PARAMETERIZE',
          { message: 'Order by must be ASC or DESC' }
        )
      }
      sql += (i === 0 ? '' : ', ') + `${this.escapeIdentifier(key)} ${dir}`
    })
    return sql
  }
  /**
   * Assign
   */
  private assign(object: Record<string, unknown>): string {
    let sql = ''
    for (const key in object) {
      sql +=
        (sql.length === 0 ? '' : ', ') +
        this.escapeIdentifier(key) +
        ' = ' +
        this.parameterize(object[key])
    }
    return sql
  }

  /**
   * Register Tools
   */
  private registerToolBox(toolBox: IToolBox[] = []): void {
    const $this = this
    const handlebars = $this.handlebars
    // Only add : once
    if (toolBox[toolBox.length - 1].prefix !== ':') {
      toolBox.push({
        prefix: ':',
        tools: {
          assign: function (value: unknown) {
            return { value, __tool__: 'assign' }
          },
          columns: function (value: unknown) {
            return { value, __tool__: 'columns' }
          },
          values: function (value: unknown) {
            return { value, __tool__: 'values' }
          },
          escape: function (value: unknown) {
            return { value, __tool__: 'escape' }
          },
          orderBy: function (value: unknown) {
            return { value, __tool__: 'orderBy' }
          },
        },
      })
    }

    for (const drawer of toolBox) {
      // Set defaults
      drawer.tools = drawer.tools || {}
      drawer.prefix = drawer.prefix || ''
      drawer.context = drawer?.context ?? true
      // Register a tool for every function
      for (const funk in drawer.tools) {
        if (handlebars.Utils.isFunction(drawer.tools[funk])) {
          if (drawer.context) {
            // Native handlebars context use
            handlebars.registerHelper(
              `${drawer.prefix}${funk}`,
              drawer.tools[funk]
            )
          } else {
            // Remove context from `this` and first arg
            // Useful for black box tools like lodash/underscore
            handlebars.registerHelper(
              `${drawer.prefix}${funk}`,
              function (...args: any[]) {
                // Take handlebar's context from the beginning
                const context = args.pop()
                // Are we dealing with a block?
                if (handlebars.Utils.isFunction(context.fn)) {
                  return drawer.tools[funk](
                    // @ts-ignore ts(2683)
                    context.fn(this),
                    ...args
                  )
                }
                return drawer.tools[funk](...args)
              }
            )
          }
        }
      }
    }
  }
}
