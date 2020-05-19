const Handlebars = require('handlebars')
const isObject = require('lodash/isObject')
const isArray = require('lodash/isArray')
const isFunction = require('lodash/isFunction')
const get = require('lodash/get')
const sqlstring = require('./sqlstring')

class Hbs {
  constructor (engine) {
    this.sqlstring = sqlstring(engine)
    this.instance = Handlebars.create()
    this.HTMLEscapeExpression = this.instance.Utils.escapeExpression
    this.escaped = []
  }

  /**
   * Compile
   * Allows us to override the escape expression just for this compile call.
   * @param {string} statement
   * @param {object} data
   */
  compile (statement, data) {
    this.escaped = []
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
      if (this.escaped.indexOf(value) === -1) return this.sqlstring.escape(value)
      return value
    }
  }

  /**
   * Unregister Escape Expression
   */
  unRegisterEscapeExpression () {
    this.instance.Utils.escapeExpression = this.HTMLEscapeExpression
  }

  /**
   * Alias the object props but let them
   * fall through to the sqlstring.objectToValues
   */
  aliasObjects (alias, value) {
    const cloned = Object.assign({}, value)
    for (const a in alias) {
      if (a in cloned) {
        cloned[alias[a]] = cloned[a]
        delete cloned[a]
      }
    }
    return cloned
  }

  /**
   * Escape the column identifiers, aka field names
   */
  escapeId (alias, value, aliasSelect = false) {
    let escaped = this.sqlstring.escapeId(value)

    for (const a in alias) {
      // Select statement alias
      if (aliasSelect) {
        escaped = escaped.replace(new RegExp(`\`${a}\``, 'g'), `\`${alias[a]}\` as \`${a}\``)
      } else {
        escaped = escaped.replace(new RegExp(`\`${a}\``, 'g'), `\`${alias[a]}\``)
      }
    }

    // Allow * to pass
    if (value[0] === '*') {
      escaped = value
    }
    // We do not want escape to run again
    this.escaped.push(escaped)
    return escaped
  }

  /**
   * Register Helpers
   * @param {array} helpers
   */
  registerHelpers (helpers = []) {
    const $this = this
    helpers.push({
      prefix: ':',
      functions: {
        // Alias Input/Update statements
        id: function (value, context) {
          if (!isArray(value) && isObject(value)) { return $this.aliasObjects(context.data.root.$definition.alias, value) }
          return $this.escapeId(context.data.root.$definition.alias, value)
        },
        // Alias Select statements
        as: function (value, context) {
          return $this.escapeId(context.data.root.$definition.alias, value, true)
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
      helper.context = get(helper, 'context', true)

      // Register a helper for every function
      for (const funk in helper.functions) {
        if (isFunction(helper.functions[funk])) {
          if (helper.context) {
            // Native handlebars context use
            this.instance.registerHelper(`${helper.prefix}${funk}`, helper.functions[funk])
          } else {
            // Remove context from `this` and first arg
            // Useful for black box functions like lodash/underscore
            this.instance.registerHelper(`${helper.prefix}${funk}`, function (
              ...args
            ) {
              // Take handlebar's context from the beginning
              const context = args.pop()
              // Are we dealing with a block?
              if (isFunction(context.fn)) {
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

module.exports = Hbs
