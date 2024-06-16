import Ajv from 'ajv';
import type { IConfig, IDefinition, IHistory, IRequest, IResponse, IQueryName, IQuery } from '../types.d.ts';
export type * from '../types.d.ts';
export default class Supersequel {
    config: IConfig;
    constructor(config?: IConfig);
    intersects(a: any[], b: any[]): boolean;
    /**
     * Validate Request
     */
    validateRequest(request: IRequest, inboundAjv: Ajv): boolean;
    /**
     * Validate Query Definition
     */
    validateQueryDefinition(definition: IDefinition, inboundAjv: Ajv): boolean;
    /**
     * Outbound
     */
    outbound(response: IResponse, query: IQuery, definition: IDefinition, history: IHistory, data: unknown): void;
    /**
     * Query
     */
    query(request: IRequest, definition: IDefinition, config: IConfig, history?: IHistory): Promise<unknown>;
    /**
     * Get Request Name
     * @param {object} request
     */
    getQueryName(request: IRequest): IQueryName;
    /**
     * Query Error
     */
    queryError(error: Error, request: IRequest, response: IResponse, config: IConfig): void;
    /**
     * Query middleware
     * @param {object} config
     */
    middleware(config?: IConfig): (req: IRequest, res: IResponse) => Promise<void>;
    /**
     * Execute queries
     */
    execute(config: IConfig): Promise<IResponse>;
}
/**
 * Init
 */
export declare function initSupersequel(config: IConfig): Supersequel;
//# sourceMappingURL=index.d.ts.map