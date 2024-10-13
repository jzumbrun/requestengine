// Import necessary modules
import Handlebars from 'handlebars';
/**
 * Compression
 */
export default class Compression {
    constructor(cycle) {
        this.cycle = cycle;
        this.handlebars = Handlebars.create();
        this.HTMLEscapeExpression = this.handlebars.Utils.escapeExpression;
        this.params = [];
    }
    stroke() {
        if (!this.cycle.engine.compression)
            throw new Error('Request engines requires a compress property.');
        const data = Object.assign(Object.assign({}, (this.cycle.request.properties || {})), { $rider: this.cycle.rider, $history: this.cycle.history, $engines: this.cycle.engine });
        this.registerTools(this.cycle.tuning.tools);
        const compiled = this.compile(this.cycle.engine.compression, data);
        if (!this.cycle.tuning.query)
            throw new Error('config.query is required in either the main or middleware config.');
        return this.cycle.tuning.query(compiled, this.getParams());
    }
    static compression(query, cycle) {
        cycle.engine.compression = query;
        const compression = new Compression(cycle);
        return compression.stroke();
    }
    getParams() {
        return this.params;
    }
    escapeIdentifier(str) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    /**
     * Compile
     * Allows us to override the escape expression just for this compile call.
     */
    compile(statement, data) {
        this.params = [];
        this.registerEscapeExpression();
        const compiled = this.handlebars.compile(statement)(data);
        this.unRegisterEscapeExpression();
        return compiled;
    }
    /**
     * Register Escape Expression
     */
    registerEscapeExpression() {
        this.handlebars.Utils.escapeExpression = (value) => {
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
            else if (value.__identifier__) {
                return this.objectToIdentifier(value.__identifier__);
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
        this.handlebars.Utils.escapeExpression = this.HTMLEscapeExpression;
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
     * Object to Throttle
     */
    objectToIdentifier({ name, alias }) {
        return (alias)
            ? `${this.escapeIdentifier(name)} as ${this.escapeIdentifier(alias)}`
            : `${this.escapeIdentifier(name)}`;
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
     * Throttle To Identifiers
     */
    throttleToIdentifiers(enginesThrottle, value) {
        if (!enginesThrottle)
            return value;
        let identifiers = [];
        value = Array.isArray(value) ? value : [value];
        enginesThrottle.forEach((throttle) => {
            const [name, alias] = throttle.split(' as ');
            value.forEach((val) => {
                if (val === name || val === alias)
                    identifiers.push({ __identifier__: { name, alias } });
            });
        });
        return identifiers.length === 1 ? identifiers[0] : identifiers;
    }
    /**
     * Register Tools
     */
    registerTools(tools = []) {
        var _a;
        const $this = this;
        const handlebars = $this.handlebars;
        tools.push({
            prefix: '|',
            tools: {
                // Identifiers Select statements
                id: function (value, context) {
                    return $this.throttleToIdentifiers(context.data.root.$engines.throttle, value);
                },
                ht: function (value) {
                    return $this.HTMLEscapeExpression(value);
                },
            },
        });
        for (const tool of tools) {
            // Set defaults
            tool.tools = tool.tools || {};
            tool.prefix = tool.prefix || '';
            tool.context = (_a = tool === null || tool === void 0 ? void 0 : tool.context) !== null && _a !== void 0 ? _a : true;
            // Register a tool for every function
            for (const funk in tool.tools) {
                if (handlebars.Utils.isFunction(tool.tools[funk])) {
                    if (tool.context) {
                        // Native handlebars context use
                        handlebars.registerHelper(`${tool.prefix}${funk}`, tool.tools[funk]);
                    }
                    else {
                        // Remove context from `this` and first arg
                        // Useful for black box tools like lodash/underscore
                        handlebars.registerHelper(`${tool.prefix}${funk}`, function (...args) {
                            // Take handlebar's context from the beginning
                            const context = args.pop();
                            // Are we dealing with a block?
                            if (handlebars.Utils.isFunction(context.fn)) {
                                return tool.tools[funk](
                                // @ts-ignore ts(2683)
                                context.fn(this), ...args);
                            }
                            return tool.tools[funk](...args);
                        });
                    }
                }
            }
        }
    }
}
