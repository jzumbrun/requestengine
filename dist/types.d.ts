import type { AnySchema } from 'ajv';
import type Compression from './Compression.js';
import type Engine from './Engine.js';
import type { EngineError } from './errors/index.js';
export interface IGarage {
    engines: IEngineModel[];
    env?: string;
    toolbox?: IToolBox[];
}
export interface IPowerSystems {
    compressionStroke: (typeof Compression)['compressionStroke'];
    engineCycle: (typeof Engine)['engineCycle'];
}
export interface IGear {
    neutral?: (...args: any[]) => any;
    drive: (statement: string, data: any) => Promise<any>;
}
export interface IEngineModel {
    model: string;
    ignition: string[];
    intake: AnySchema;
    exhaust: AnySchema;
    compression?: string;
    power?: (engine: Engine, { compressionStroke, engineCycle }: IPowerSystems) => any;
    limiter?: Record<string, string[]>;
}
export interface IRevolution {
    [key: string]: any;
}
export interface IOperator {
    id: number | string;
    keys: string[];
}
export interface IHTTPRequest {
    operator: IOperator;
    body: IRequest[];
}
export interface IHTTPResponse {
    send: (response: IResponse[]) => void;
}
export interface IRequest {
    serial?: string;
    engine: string;
    fuel?: unknown;
    timing?: boolean;
}
export interface IResponse {
    serial?: string;
    engine: string;
    response?: unknown;
    error?: EngineError;
}
export interface IToolBox {
    tools: Record<string, (...args: any[]) => any>;
    prefix?: string;
    context?: boolean;
}
export interface IIntakeValves {
    intake: unknown;
    operator?: IOperator;
    revolution: IRevolution;
    model: IEngineModel;
}
//# sourceMappingURL=types.d.ts.map