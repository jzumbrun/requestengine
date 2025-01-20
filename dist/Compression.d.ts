import type Engine from './Engine.js';
/**
 * Compression
 */
export default class Compression {
    private engine;
    private handlebars;
    private HTMLEscapeExpression;
    private params;
    constructor(engine: Engine);
    stroke<T>(): Promise<T>;
    static compressionStroke<T>(query: string, engine: Engine): Promise<T[]>;
    private getParams;
    private escapeIdentifier;
    /**
     * Compile
     * Allows us to override the escape expression just for this compile call.
     */
    private compile;
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
     * Order By
     */
    private orderBy;
    /**
     * Assign
     */
    private assign;
    /**
     * Register Tools
     */
    private registerToolBox;
}
//# sourceMappingURL=Compression.d.ts.map