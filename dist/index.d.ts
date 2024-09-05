import Ajv from 'ajv';
import type { IConfig, IDefinition, IHistory, IRequest, IResponse, IHTTPRequest, IHTTPResponse, IRequestName } from '../types.d.ts';
export type * from '../types.d.ts';
export default class RequestEngine {
    config: IConfig;
    constructor(config?: IConfig);
    /**
     * Hql
     */
    static hql(request: IRequest, definition: IDefinition, config: IConfig, history?: IHistory): Promise<unknown>;
    intersects(a: any[], b: any[]): boolean;
    /**
     * Validate Request
     */
    validateRequest(request: IRequest, inboundAjv: Ajv): boolean;
    /**
     * Validate Request Definition
     */
    validateRequestDefinition(definition: IDefinition, inboundAjv: Ajv): boolean;
    /**
     * Outbound
     */
    outbound(response: IResponse, request: IRequest, definition: IDefinition, history: IHistory, data: unknown): void;
    /**
     * Get Request Name
     */
    getRequestName(request: IRequest): IRequestName;
    /**
     * Request Error
     */
    requestError(error: Error, request: IRequest, response: IResponse, config: IConfig): void;
    /**
     * Request middleware
     * @param {object} config
     */
    middleware(config?: IConfig): (req: IHTTPRequest, res: IHTTPResponse) => Promise<void>;
    /**
     * Execute queries
     */
    execute(config?: IConfig): Promise<IResponse>;
}
/**
 * Init
 */
export declare function initRequestEngine(config: IConfig): RequestEngine;
//# sourceMappingURL=index.d.ts.map