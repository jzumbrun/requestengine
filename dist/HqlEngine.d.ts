import type { ITool, ICycle } from '../types';
/**
 * HqlEngine
 * (H)andebars s(ql)
 */
export default class HqlEngine {
    private instance;
    private HTMLEscapeExpression;
    private params;
    constructor();
    getParams(): unknown[];
    escapeIdentifier(str: string): string;
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
     * Object to Identifier
     */
    private objectToIdentifier;
    /**
     * Object to Values
     */
    private objectToValues;
    /**
     * Identifiers
     */
    identifiers(cycleIdentifiers: ICycle['identifiers'], value: unknown): unknown;
    /**
     * Register Tools
     */
    registerTools(tools?: ITool[]): void;
}
//# sourceMappingURL=HqlEngine.d.ts.map