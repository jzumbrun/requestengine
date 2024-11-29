// Import necessary modules
import Handlebars from 'handlebars';
/**
 * Compression
 */
export default class Compression {
    constructor(engine) {
        this.engine = engine;
        this.handlebars = Handlebars.create();
        this.HTMLEscapeExpression = this.handlebars.Utils.escapeExpression;
        this.params = [];
    }
    stroke() {
        const intake = this.engine.request.fuel;
        const operator = this.engine.operator;
        const revolution = this.engine.revolution;
        const model = this.engine.model;
        const data = {
            intake, operator, revolution, model,
            i: intake, o: operator, r: revolution, m: model
        };
        this.registerToolBox(this.engine.garage.toolbox);
        const compiled = this.compile(this.engine.model.compression, data);
        return this.engine.gear.drive(compiled, this.getParams());
    }
    static compressionStroke(query, engine) {
        engine.model.compression = query;
        const compression = new Compression(engine);
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
    throttleToIdentifiers(engineModelThrottle, value) {
        if (!engineModelThrottle)
            return value;
        let identifiers = [];
        value = Array.isArray(value) ? value : [value];
        engineModelThrottle.forEach((throttle) => {
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
    registerToolBox(toolBox = []) {
        var _a;
        const $this = this;
        const handlebars = $this.handlebars;
        toolBox.push({
            prefix: ':',
            tools: {
                // Throttle `select` statements
                throttle: function (value, context) {
                    return $this.throttleToIdentifiers(context.data.root.model.throttle, value);
                }
            },
        });
        for (const drawer of toolBox) {
            // Set defaults
            drawer.tools = drawer.tools || {};
            drawer.prefix = drawer.prefix || '';
            drawer.context = (_a = drawer === null || drawer === void 0 ? void 0 : drawer.context) !== null && _a !== void 0 ? _a : true;
            // Register a tool for every function
            for (const funk in drawer.tools) {
                if (handlebars.Utils.isFunction(drawer.tools[funk])) {
                    if (drawer.context) {
                        // Native handlebars context use
                        handlebars.registerHelper(`${drawer.prefix}${funk}`, drawer.tools[funk]);
                    }
                    else {
                        // Remove context from `this` and first arg
                        // Useful for black box tools like lodash/underscore
                        handlebars.registerHelper(`${drawer.prefix}${funk}`, function (...args) {
                            // Take handlebar's context from the beginning
                            const context = args.pop();
                            // Are we dealing with a block?
                            if (handlebars.Utils.isFunction(context.fn)) {
                                return drawer.tools[funk](
                                // @ts-ignore ts(2683)
                                context.fn(this), ...args);
                            }
                            return drawer.tools[funk](...args);
                        });
                    }
                }
            }
        }
    }
}
