import type { IEngine, ITool } from '../types.d.js'
import Cycle from './Cycle.js'
// Import necessary modules
import Handlebars, { Utils } from 'handlebars'

interface IIdentifierParameter {
  __identifier__: { name: string, alias: string }
}

/**
 * Compression
 */
export default class Compression {
  private cycle: Cycle
  private handlebars: typeof Handlebars 
  private HTMLEscapeExpression: typeof Utils.escapeExpression
  private params: unknown[]

  constructor(cycle: Cycle) {
    this.cycle = cycle
    this.handlebars = Handlebars.create()
    this.HTMLEscapeExpression = this.handlebars.Utils.escapeExpression
    this.params = []
    
  }

  public stroke (): Promise<unknown> {
    const data = {
      intake: this.cycle.request.fuel,
      rider: this.cycle.rider,
      odometer: this.cycle.odometer,
      engines: this.cycle.engine
    }
    this.registerTools(this.cycle.tuning.tools)
    const compiled = this.compile(this.cycle.engine.compression!, data)
    return this.cycle.tuning.drive!(compiled, this.getParams())
  }

  static compression (query: string, cycle: Cycle): Promise<unknown> {
    cycle.engine.compression = query
    const compression = new Compression(cycle)
    return compression.stroke()
  }

  private getParams(): unknown[] {
    return this.params
  }

  private escapeIdentifier (str: string): string {
    return '"' + str.replace(/"/g, '""') + '"'
  }

  /**
   * Compile
   * Allows us to override the escape expression just for this compile call.
   */
  public compile(statement: string, data: object): string {
    this.params = []
    this.registerEscapeExpression()
    const compiled = this.handlebars.compile(statement)(data)
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
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return this.arrayToList(value)
      } else if (value.__identifier__) {
        return this.objectToIdentifier(value.__identifier__)
      } else {
        return this.objectToValues(value)
      }
    } else {
      const index = this.params.indexOf(value)
      if (index > -1) return '$' + (index + 1)
      this.params.push(value)
      return '$' + this.params.length
    }
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
  private arrayToList(array: unknown[]): string {
    let sql = ''
    array.forEach((val, i) => {
      if (Array.isArray(val)) {
        sql += (i === 0 ? '' : ', ') + '(' + this.arrayToList(val) + ')'
      } else {
        sql += (i === 0 ? '' : ', ') + this.parameterize(val)
      }
    })
    return sql
  }

  /**
   * Object to Throttle
   */
  private objectToIdentifier({ name, alias }: IIdentifierParameter['__identifier__']): string {
    return (alias)
      ? `${this.escapeIdentifier(name)} as ${this.escapeIdentifier(alias)}`
      : `${this.escapeIdentifier(name)}`
  }

  /**
   * Object to Values
   */
  private objectToValues(object: Record<string, unknown>): string {
    let sql = ''
    for (const key in object) {
      sql +=
        (sql.length === 0 ? '' : ', ') +
        this.parameterize(key) +
        ' = ' +
        this.parameterize(object[key])
    }
    return sql
  }

  /**
   * Throttle To Identifiers
   */
  public throttleToIdentifiers(enginesThrottle: IEngine['throttle'], value: unknown): unknown {
    if(!enginesThrottle) return value

    let identifiers: IIdentifierParameter[] = []
    value = Array.isArray(value) ? value : [value]
    enginesThrottle.forEach((throttle: string) => {
      const [name, alias] = throttle.split(' as ') as [string, string]
      (value as unknown[]).forEach((val: unknown) => {
        if (val === name || val === alias) identifiers.push({ __identifier__: { name, alias } })
      })
    })
    return identifiers.length === 1 ? identifiers[0] : identifiers
  }

  /**
   * Register Tools
   */
  public registerTools(tools: ITool[] = []): void {
    const $this = this
    const handlebars = $this.handlebars
    tools.push({
      prefix: ':',
      tools: {
        // Identifiers Select statements
        throttle: function (value: unknown, context: { data: { root: { engines: IEngine } } }) {
          return $this.throttleToIdentifiers(context.data.root.engines.throttle, value)
        }
      },
    })

    for (const tool of tools) {
      // Set defaults
      tool.tools = tool.tools || {}
      tool.prefix = tool.prefix || ''
      tool.context = tool?.context ?? true
      // Register a tool for every function
      for (const funk in tool.tools) {
        if (handlebars.Utils.isFunction(tool.tools[funk])) {
          if (tool.context) {
            // Native handlebars context use
            handlebars.registerHelper(
              `${tool.prefix}${funk}`,
              tool.tools[funk]
            )
          } else {
            // Remove context from `this` and first arg
            // Useful for black box tools like lodash/underscore
            handlebars.registerHelper(
              `${tool.prefix}${funk}`,
              function (...args: any[]) {
                // Take handlebar's context from the beginning
                const context = args.pop()
                // Are we dealing with a block?
                if (handlebars.Utils.isFunction(context.fn)) {
                  return tool.tools[funk](
                    // @ts-ignore ts(2683)
                    context.fn(this),
                    ...args
                  )
                }
                return tool.tools[funk](...args)
              }
            )
          }
        }
      }
    }
  }
}
