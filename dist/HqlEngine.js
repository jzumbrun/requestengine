'use strict'
var __importDefault = (this && this.__importDefault) || function (mod) {
  return (mod && mod.__esModule) ? mod : { default: mod }
}
Object.defineProperty(exports, '__esModule', { value: true })
// Import necessary modules
const handlebars_1 = __importDefault(require('handlebars'))
/**
 * HqlEngine
 * (H)andebars s(ql)
 */
class HqlEngine {
  constructor () {
    this.instance = handlebars_1.default.create()
    this.HTMLEscapeExpression = this.instance.Utils.escapeExpression
    this.params = []
  }

  getParams () {
    return this.params
  }

  escapeIdentifier (str) {
    return '"' + str.replace(/"/g, '""') + '"'
  }

  /**
     * Compile
     * Allows us to override the escape expression just for this compile call.
     */
  compile (statement, data) {
    this.params = []
    this.registerEscapeExpression()
    const compiled = this.instance.compile(statement)(data)
    this.unRegisterEscapeExpression()
    return compiled
  }

  /**
     * Register Escape Expression
     */
  registerEscapeExpression () {
    this.instance.Utils.escapeExpression = (value) => {
      return this.parameterize(value)
    }
  }

  /**
     * Parameterize
     */
  parameterize (value) {
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
      if (index > -1) { return '$' + (index + 1) }
      this.params.push(value)
      return '$' + this.params.length
    }
  }

  /**
     * Unregister Escape Expression
     */
  unRegisterEscapeExpression () {
    this.instance.Utils.escapeExpression = this.HTMLEscapeExpression
  }

  /**
     * Array to List
     */
  arrayToList (array) {
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
  objectToIdentifier ({ name, alias }) {
    return (alias)
      ? `${this.escapeIdentifier(name)} as ${this.escapeIdentifier(alias)}`
      : `${this.escapeIdentifier(name)}`
  }

  /**
     * Object to Values
     */
  objectToValues (object) {
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
  identifiers (definitionIdentifiers, value) {
    if (!definitionIdentifiers) { return value }
    const identifiers = []
    value = Array.isArray(value) ? value : [value]
    definitionIdentifiers.forEach(({ name, alias }) => {
      value.forEach((val) => {
        if (val === name || val === alias) { identifiers.push({ __identifier__: { name, alias } }) }
      })
    })
    return identifiers.length === 1 ? identifiers[0] : identifiers
  }

  /**
     * Register Helpers
     */
  registerHelpers (helpers = []) {
    var _a
    const $this = this
    const instance = $this.instance
    helpers.push({
      prefix: ':',
      functions: {
        // Identifiers Select statements
        id: function (value, context) {
          return $this.identifiers(context.data.root.$definition.identifiers, value)
        },
        ht: function (value) {
          return $this.HTMLEscapeExpression(value)
        }
      }
    })
    for (const helper of helpers) {
      // Set defaults
      helper.functions = helper.functions || {}
      helper.prefix = helper.prefix || ''
      helper.context = (_a = helper === null || helper === void 0 ? void 0 : helper.context) !== null && _a !== void 0 ? _a : true
      // Register a helper for every function
      for (const funk in helper.functions) {
        if (instance.Utils.isFunction(helper.functions[funk])) {
          if (helper.context) {
            // Native handlebars context use
            instance.registerHelper(`${helper.prefix}${funk}`, helper.functions[funk])
          } else {
            // Remove context from `this` and first arg
            // Useful for black box functions like lodash/underscore
            instance.registerHelper(`${helper.prefix}${funk}`, function (...args) {
              // Take handlebar's context from the beginning
              const context = args.pop()
              // Are we dealing with a block?
              if (instance.Utils.isFunction(context.fn)) {
                return helper.functions[funk](
                  // @ts-ignore ts(2683)
                  context.fn(this), ...args)
              }
              return helper.functions[funk](...args)
            })
          }
        }
      }
    }
  }
}
exports.default = HqlEngine
