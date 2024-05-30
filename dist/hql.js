"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Import necessary modules
const handlebars_1 = __importDefault(require("handlebars"));
/**
 * Hql
 * (H)andebars s(ql)
 */
class Hql {
    constructor() {
        this.instance = handlebars_1.default.create();
        this.HTMLEscapeExpression = this.instance.Utils.escapeExpression;
        this.params = [];
    }
    getParams() {
        return this.params;
    }
    /**
     * Compile
     * Allows us to override the escape expression just for this compile call.
     */
    compile(statement, data) {
        this.params = [];
        this.registerEscapeExpression();
        const compiled = this.instance.compile(statement)(data);
        this.unRegisterEscapeExpression();
        return compiled;
    }
    /**
     * Register Escape Expression
     */
    registerEscapeExpression() {
        this.instance.Utils.escapeExpression = (value) => {
            return this.parameterize(value);
        };
    }
    /**
     * Parameterize
     */
    parameterize(value) {
        if (typeof value === 'object') {
            if (Array.isArray(value)) {
                return this.arrayToList(value);
            }
            else if (value.__alias__) {
                return this.objectToAlias(value);
            }
            else {
                return this.objectToValues(value);
            }
        }
        else {
            const index = this.params.indexOf(value);
            if (index > -1)
                return '$' + (index + 1);
            this.params.push(value);
            return '$' + this.params.length;
        }
    }
    /**
     * Unregister Escape Expression
     */
    unRegisterEscapeExpression() {
        this.instance.Utils.escapeExpression = this.HTMLEscapeExpression;
    }
    /**
     * Array to List
     */
    arrayToList(array) {
        let sql = '';
        array.forEach((val, i) => {
            if (Array.isArray(val)) {
                sql += (i === 0 ? '' : ', ') + '(' + this.arrayToList(val) + ')';
            }
            else {
                sql += (i === 0 ? '' : ', ') + this.parameterize(val);
            }
        });
        return sql;
    }
    /**
     * Object to Alias
     */
    objectToAlias(object) {
        return (this.parameterize(object.__alias__.column) +
            ' as ' +
            this.parameterize(object.__alias__.alias));
    }
    /**
     * Object to Values
     */
    objectToValues(object) {
        let sql = '';
        for (const key in object) {
            sql +=
                (sql.length === 0 ? '' : ', ') +
                    this.parameterize(key) +
                    ' = ' +
                    this.parameterize(object[key]);
        }
        return sql;
    }
    /**
     * Alias
     */
    alias(definitionAlias, value) {
        if (!definitionAlias)
            return value;
        let aliasValue = [];
        value = Array.isArray(value) ? value : [value];
        for (const alias in definitionAlias) {
            const column = definitionAlias[alias];
            value.forEach((val) => {
                if (val === alias)
                    aliasValue.push({ __alias__: { alias, column } });
            });
        }
        return aliasValue.length === 1 ? aliasValue[0] : aliasValue;
    }
    /**
     * Register Helpers
     */
    registerHelpers(helpers = []) {
        var _a;
        const $this = this;
        const instance = $this.instance;
        helpers.push({
            prefix: ':',
            functions: {
                // Alias Select statements
                as: function (value, context) {
                    return $this.alias(context.data.root.$definition.alias, value);
                },
                ht: function (value) {
                    return $this.HTMLEscapeExpression(value);
                },
            },
        });
        for (const helper of helpers) {
            // Set defaults
            helper.functions = helper.functions || {};
            helper.prefix = helper.prefix || '';
            helper.context = (_a = helper === null || helper === void 0 ? void 0 : helper.context) !== null && _a !== void 0 ? _a : true;
            // Register a helper for every function
            for (const funk in helper.functions) {
                if (instance.Utils.isFunction(helper.functions[funk])) {
                    if (helper.context) {
                        // Native handlebars context use
                        instance.registerHelper(`${helper.prefix}${funk}`, helper.functions[funk]);
                    }
                    else {
                        // Remove context from `this` and first arg
                        // Useful for black box functions like lodash/underscore
                        instance.registerHelper(`${helper.prefix}${funk}`, function (...args) {
                            // Take handlebar's context from the beginning
                            const context = args.pop();
                            // Are we dealing with a block?
                            if (instance.Utils.isFunction(context.fn)) {
                                return helper.functions[funk](
                                // @ts-ignore ts(2683)
                                context.fn(this), ...args);
                            }
                            return helper.functions[funk](...args);
                        });
                    }
                }
            }
        }
    }
}
exports.default = Hql;
