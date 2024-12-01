import type { IEngineModel, IRevolution, IToolBox, IOperator } from '../types.d.js'
import Engine from './Engine.js'
// Import necessary modules
import Handlebars, { Utils } from 'handlebars'

interface IIdentifierParameter {
  __identifier__: { name: string, alias: string }
}

interface ICompressionData {
  intake: unknown
  operator?: IOperator
  revolution: IRevolution
  model: IEngineModel
  i: ICompressionData['intake']
  o: ICompressionData['operator']
  r: ICompressionData['revolution']
  m: ICompressionData['model']
}

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

  public stroke<T> (): Promise<T> {
    const intake = this.engine.request.fuel
    const operator = this.engine.operator
    const revolution = this.engine.revolution
    const model = this.engine.model
    const data: ICompressionData = {
      intake, operator, revolution, model,
      i: intake, o: operator, r: revolution, m: model
    }
    this.registerToolBox(this.engine.garage.toolbox)
    const compiled = this.compile(this.engine.model.compression!, data)
    return this.engine.gear.drive!(compiled, this.getParams())
  }

  public static compressionStroke<T> (query: string, engine: Engine): Promise<T> {
    engine.model.compression = query
    const compression = new Compression(engine)
    return compression.stroke<T>() 
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
  private compile(statement: string, data: ICompressionData): string {
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
  private throttleToIdentifiers(engineModelThrottle: IEngineModel['throttle'], value: unknown): unknown {
    if(!engineModelThrottle) return value

    let identifiers: IIdentifierParameter[] = []
    value = Array.isArray(value) ? value : [value]
    engineModelThrottle.forEach((throttle: string) => {
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
  private registerToolBox(toolBox: IToolBox[] = []): void {
    const $this = this
    const handlebars = $this.handlebars
    toolBox.push({
      prefix: ':',
      tools: {
        // Throttle `select` statements
        throttle: function (value: unknown, context: { data: { root: { model: IEngineModel } } }) {
          return $this.throttleToIdentifiers(context.data.root.model.throttle, value)
        }
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
