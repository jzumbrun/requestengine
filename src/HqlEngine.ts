// Import necessary modules
import Handlebars, { Utils } from 'handlebars'
import type { IHelper, IDefinition, IIdentifier } from '../types'

interface IIdentifierParameter {
  __identifier__: IIdentifier
}

/**
 * HqlEngine
 * (H)andebars s(ql)
 */
export default class HqlEngine {
  private instance: typeof Handlebars 

  private HTMLEscapeExpression: typeof Utils.escapeExpression

  private params: unknown[]

  constructor() {
    this.instance = Handlebars.create()
    this.HTMLEscapeExpression = this.instance.Utils.escapeExpression
    this.params = []
  }

  getParams(): unknown[] {
    return this.params
  }

  escapeIdentifier (str: string): string {
    return '"' + str.replace(/"/g, '""') + '"'
  }

  /**
   * Compile
   * Allows us to override the escape expression just for this compile call.
   */
  public compile(statement: string, data: object): string {
    this.params = []
    this.registerEscapeExpression()
    const compiled = this.instance.compile(statement)(data)
    this.unRegisterEscapeExpression()
    return compiled
  }

  /**
   * Register Escape Expression
   */
  private registerEscapeExpression(): void {
    this.instance.Utils.escapeExpression = (value: unknown) => {
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
    this.instance.Utils.escapeExpression = this.HTMLEscapeExpression
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
   * Object to Identifier
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
   * Identifiers
   */
  public identifiers(definitionIdentifiers: IDefinition['identifiers'], value: unknown): unknown {
    if(!definitionIdentifiers) return value

    let identifiers: IIdentifierParameter[] = []
    value = Array.isArray(value) ? value : [value]
    definitionIdentifiers.forEach(({ name, alias }) => {
      (value as unknown[]).forEach((val: unknown) => {
        if (val === name || val === alias) identifiers.push({ __identifier__: { name, alias } })
      })
    })
    return identifiers.length === 1 ? identifiers[0] : identifiers
  }

  /**
   * Register Helpers
   */
  public registerHelpers(helpers: IHelper[] = []): void {
    const $this = this
    const instance = $this.instance
    helpers.push({
      prefix: ':',
      functions: {
        // Identifiers Select statements
        id: function (value: unknown, context: any) {
          return $this.identifiers(context.data.root.$definition.identifiers, value)
        },
        ht: function (value: unknown) {
          return $this.HTMLEscapeExpression(value as string)
        },
      },
    })

    for (const helper of helpers) {
      // Set defaults
      helper.functions = helper.functions || {}
      helper.prefix = helper.prefix || ''
      helper.context = helper?.context ?? true
      // Register a helper for every function
      for (const funk in helper.functions) {
        if (instance.Utils.isFunction(helper.functions[funk])) {
          if (helper.context) {
            // Native handlebars context use
            instance.registerHelper(
              `${helper.prefix}${funk}`,
              helper.functions[funk]
            )
          } else {
            // Remove context from `this` and first arg
            // Useful for black box functions like lodash/underscore
            instance.registerHelper(
              `${helper.prefix}${funk}`,
              function (...args: any[]) {
                // Take handlebar's context from the beginning
                const context = args.pop()
                // Are we dealing with a block?
                if (instance.Utils.isFunction(context.fn)) {
                  return helper.functions[funk](
                    // @ts-ignore ts(2683)
                    context.fn(this),
                    ...args
                  )
                }
                return helper.functions[funk](...args)
              }
            )
          }
        }
      }
    }
  }
}
