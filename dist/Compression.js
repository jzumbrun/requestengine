var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
        this.registerToolBox(this.engine.garage.toolbox);
        const compiled = this.compile();
        return this.engine.gear.drive(compiled, this.getParams());
    }
    static compressionStroke(query, engine) {
        engine.model.compression = query;
        const compression = new Compression(engine);
        return compression.stroke();
    }
    static compressionFirstStroke(query, engine) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield Compression.compressionStroke(query, engine);
            return Array.isArray(response) ? response[0] : response;
        });
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
            sql += (i === 0 ? '' : ', ') + (escape ? this.escapeIdentifier(val) : this.parameterize(val));
        });
        return sql;
    }
    /**
     * Object Set
     */
    objectSet(object) {
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
                set: function (value) {
                    return $this.objectSet(value);
                },
                keys: function (value) {
                    if (Array.isArray(value))
                        return $this.arrayToList(value, true);
                    return $this.arrayToList(Object.keys(value), true);
                },
                values: function (value) {
                    if (Array.isArray(value))
                        return $this.arrayToList(value);
                    return $this.arrayToList(Object.values(value));
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
