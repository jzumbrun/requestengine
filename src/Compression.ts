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

  public static async compressionFirstStroke<T>(
    query: string,
    engine: Engine
  ): Promise<T> {
    const response = await Compression.compressionStroke<T>(query, engine)
    return Array.isArray(response) ? response[0] : response
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
    if (typeof value === 'object' && value.__tool__) {
      switch (value.__tool__) {
        case 'colvals':
          if (typeof value.value !== 'object')
            throw new RequestError(
              this.engine.request,
              2510,
              'ERROR_COMPRESSION_PARAMETERIZE',
              { message: ':colvals must be an object' }
            )
          return this.colvals(value.value)
        case 'cols':
          if (typeof value.value !== 'object')
            throw new RequestError(
              this.engine.request,
              2520,
              'ERROR_COMPRESSION_PARAMETERIZE',
              { message: ':cols must be an array or object' }
            )
          return Array.isArray(value.value)
            ? this.arrayToList(value.value, true)
            : this.arrayToList(Object.keys(value.value), true)
        case 'vals':
          if (typeof value.value !== 'object')
            throw new RequestError(
              this.engine.request,
              2530,
              'ERROR_COMPRESSION_PARAMETERIZE',
              { message: ':vals must be an array or object' }
            )
          return Array.isArray(value.value)
            ? this.arrayToList(value.value)
            : this.arrayToList(Object.values(value.value))
      }
    } else if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      Array.isArray(value)
    ) {
      const index = this.params.indexOf(value)
      if (index > -1) return '$' + (index + 1)
      this.params.push(value)
      return '$' + this.params.length
    }

    throw new RequestError(
      this.engine.request,
      2540,
      'ERROR_COMPRESSION_PARAMETERIZE',
      {
        message: 'objects, must use the :colvals, :cols, or :vals tool',
      }
    )
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
   * Colum values
   */
  private colvals(object: Record<string, unknown>): string {
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
    toolBox.push({
      prefix: ':',
      tools: {
        colvals: function (value: unknown) {
          return { value, __tool__: 'colvals' }
        },
        cols: function (value: unknown) {
          return { value, __tool__: 'cols' }
        },
        vals: function (value: unknown) {
          return { value, __tool__: 'vals' }
        },
      },
    })

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
