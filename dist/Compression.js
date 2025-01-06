import Handlebars from 'handlebars';
import { RequestError } from './errors/index.js';
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
        this.registerToolBox(this.engine.garage.toolbox);
        const compiled = this.compile();
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
    compile() {
        this.params = [];
        this.registerEscapeExpression();
        const compiled = this.handlebars.compile(this.engine.model.compression)(this.engine.intakeValves);
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
        if (typeof value === 'object' && value.__tool__) {
            switch (value.__tool__) {
                case 'colvals':
                    if (typeof value.value !== 'object')
                        throw new RequestError(this.engine.request, 2510, 'ERROR_COMPRESSION_PARAMETERIZE', { message: ':colvals must be an object' });
                    return this.colvals(value.value);
                case 'cols':
                    if (typeof value.value !== 'object')
                        throw new RequestError(this.engine.request, 2520, 'ERROR_COMPRESSION_PARAMETERIZE', { message: ':cols must be an array or object' });
                    return Array.isArray(value.value)
                        ? this.arrayToList(value.value, true)
                        : this.arrayToList(Object.keys(value.value), true);
                case 'vals':
                    if (typeof value.value !== 'object')
                        throw new RequestError(this.engine.request, 2530, 'ERROR_COMPRESSION_PARAMETERIZE', { message: ':vals must be an array or object' });
                    return Array.isArray(value.value)
                        ? this.arrayToList(value.value)
                        : this.arrayToList(Object.values(value.value));
            }
        }
        const index = this.params.indexOf(value);
        if (index > -1)
            return '$' + (index + 1);
        this.params.push(value);
        return '$' + this.params.length;
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
    arrayToList(array, escape = false) {
        let sql = '';
        array.forEach((val, i) => {
            sql +=
                (i === 0 ? '' : ', ') +
                    (escape ? this.escapeIdentifier(val) : this.parameterize(val));
        });
        return sql;
    }
    /**
     * Colum values
     */
    colvals(object) {
        let sql = '';
        for (const key in object) {
            sql +=
                (sql.length === 0 ? '' : ', ') +
                    this.escapeIdentifier(key) +
                    ' = ' +
                    this.parameterize(object[key]);
        }
        return sql;
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
                colvals: function (value) {
                    return { value, __tool__: 'colvals' };
                },
                cols: function (value) {
                    return { value, __tool__: 'cols' };
                },
                vals: function (value) {
                    return { value, __tool__: 'vals' };
                },
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
