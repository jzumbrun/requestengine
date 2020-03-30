const Handlebars = require('handlebars')
const sqlstring = require('./sqlstring').factory()

class Factory {
  constructor () {
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
    statement = statement.trim()
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
      if (this.escaped.indexOf(value) === -1) return sqlstring.escape(value)
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
   * Register Helpers
   * @param {array} helpers
   */
  registerHelpers (helpers = []) {
    helpers.push({
      functions: {
        ':': value => {
          let escaped = sqlstring.escapeId(value)
          // Allow * to pass
          if (value[0] === '*') {
            escaped = value
          }
          // We do not want escape to run again
          this.escaped.push(escaped)
          return escaped
        },
        '?': value => {
          return this.HTMLEscapeExpression(value)
        }
      }
    })

    for (const helper of helpers) {
      // Set defaults
      helper.functions = helper.functions || []
      helper.prefix = helper.prefix || ''

      // Register a helper for every function
      for (const fn in helper.functions) {
        if (typeof helper.functions[fn] === 'function') {
          this.instance.registerHelper(`${helper.prefix}${fn}`, function (
            ...args
          ) {
            const context = args.pop()
            // Are we dealing with a block?
            if (typeof context.fn === 'function') {
              return helper.functions[fn](context.fn(this), ...args)
            }
            return helper.functions[fn](...args)
          })
        }
      }
    }
  }
}

module.exports = () => {
  return new Factory()
}
