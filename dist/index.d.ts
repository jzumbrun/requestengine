import Ajv from 'ajv';
import type { IConfig, IDefinition, IHistory, IRequest, IResponse, IQueryName } from '../types';
declare class Superqequel {
    config: IConfig;
    constructor(config: IConfig);
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
    outbound(response: IResponse, request: IRequest, rows: unknown, definition: IDefinition, history: IHistory): void;
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
    middleware(config: IConfig): (req: IRequest, res: IResponse) => Promise<void>;
    /**
     * Execute queries
     */
    execute(config: IConfig): Promise<IResponse>;
}
/**
 * Init
 */
declare const _default: (config: IConfig) => Superqequel;
export default _default;
//# sourceMappingURL=index.d.ts.map