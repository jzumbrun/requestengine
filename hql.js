const Handlebars = require('handlebars')
const get = require('lodash/get')

/**
 * Hql
 * (H)andebars s(ql)
 */
class Hql {
  constructor (engine) {
    this.instance = Handlebars.create()
    this.HTMLEscapeExpression = this.instance.Utils.escapeExpression
    this.params = []
  }

  /**
   * Compile
   * Allows us to override the escape expression just for this compile call.
   * @param {string} statement
   * @param {object} data
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
    this.instance.Utils.escapeExpression = value => {
      return this.parameterize(value)
    }
  }

  parameterize(value) {

    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return this.arrayToList(value)
      } 
      else if (value.__alias__) {
        return this.objectToAlias(value)
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
  unRegisterEscapeExpression () {
    this.instance.Utils.escapeExpression = this.HTMLEscapeExpression
  }

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

  objectToAlias (object) {
    return this.parameterize(object.__alias__.column) + ' as ' + this.parameterize(object.__alias__.alias)
  }

  objectToValues (object) {
    let sql = ''

    for (const key in object) {
      sql += (sql.length === 0 ? '' : ', ') + this.parameterize(key) + ' = ' + this.parameterize(object[key])
    }

    return sql
  }

  alias (aliases, value) {
    let aliasValue = []
    value = Array.isArray(value) ? value : [value]
    for (const alias in aliases) {
      const column = aliases[alias]
      value.forEach((val) => {
        if(val === alias) aliasValue.push({ __alias__: { alias, column }})
      })
    }
    return (aliasValue.length === 1) ? aliasValue[0] : aliasValue 
  }

  /**
   * Register Helpers
   * @param {array} helpers
   */
  registerHelpers (helpers = []) {
    const $this = this
    const instance = $this.instance
    helpers.push({
      prefix: ':',
      functions: {
        // Alias Select statements
        as: function (value, context) {
          return $this.alias(context.data.root.$definition.alias, value, true)
        },
        ht: function (value, context) {
          return $this.HTMLEscapeExpression(value)
        }
      }
    })
    
    for (const helper of helpers) {
      // Set defaults
      helper.functions = helper.functions || []
      helper.prefix = helper.prefix || ''
      helper.context = helper?.context ?? true

      // Register a helper for every function
      for (const funk in helper.functions) {
        if (instance.Utils.isFunction(helper.functions[funk])) {
          if (helper.context) {
            // Native handlebars context use
            instance.registerHelper(`${helper.prefix}${funk}`, helper.functions[funk])
          } else {
            // Remove context from `this` and first arg
            // Useful for black box functions like lodash/underscore
            instance.registerHelper(`${helper.prefix}${funk}`, function (
              ...args
            ) {
              // Take handlebar's context from the beginning
              const context = args.pop()
              // Are we dealing with a block?
              if (instance.Utils.isFunction(context.fn)) {
                return helper.functions[funk](context.fn(this), ...args)
              }
              return helper.functions[funk](...args)
            })
          }
        }
      }
    }
  }
}

module.exports = Hql
