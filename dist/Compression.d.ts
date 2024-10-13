import type { IEngine, ITool } from '../types.d.js';
import Cycle from './Cycle.js';
/**
 * Compression
 */
export default class Compression {
    private cycle;
    private handlebars;
    private HTMLEscapeExpression;
    private params;
    constructor(cycle: Cycle);
    stroke(): Promise<unknown>;
    static compression(query: string, cycle: Cycle): Promise<unknown>;
    private getParams;
    private escapeIdentifier;
    /**
     * Compile
     * Allows us to override the escape expression just for this compile call.
     */
    compile(statement: string, data: object): string;
    /**
     * Register Escape Expression
     */
    private registerEscapeExpression;
    /**
     * Parameterize
     */
    private parameterize;
    /**
     * Unregister Escape Expression
     */
    private unRegisterEscapeExpression;
    /**
     * Array to List
     */
    private arrayToList;
    /**
     * Object to Throttle
     */
    private objectToIdentifier;
    /**
     * Object to Values
     */
    private objectToValues;
    /**
     * Throttle To Identifiers
     */
    throttleToIdentifiers(enginesThrottle: IEngine['throttle'], value: unknown): unknown;
    /**
     * Register Tools
     */
    registerTools(tools?: ITool[]): void;
}
//# sourceMappingURL=Compression.d.ts.map