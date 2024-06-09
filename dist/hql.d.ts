import type { IHelper, IDefinition } from '../types';
/**
 * Hql
 * (H)andebars s(ql)
 */
export default class Hql {
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
    identifiers(definitionIdentifiers: IDefinition['identifiers'], value: unknown): unknown;
    /**
     * Register Helpers
     */
    registerHelpers(helpers?: IHelper[]): void;
}
//# sourceMappingURL=hql.d.ts.map