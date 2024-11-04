import type { AnySchema } from 'ajv'
import type Compression from './src/Compression.js'
import type Engine from './src/Engine.ts'
import type { EngineError } from './src/errors/index.js'


export interface IGarage {
  engines: IEngineModel[]
  env?: string
  toolbox?: IToolBox[]
}

export interface IPowerSystems {
  compressionStroke: typeof Compression['compressionStroke']
  engineCycle: typeof Engine['engineCycle']
}

export interface IGear {
  neutral?: (...args: any[]) => any
  drive: (statement: string, data: any) => Promise<any>
}

export interface IEngineModel {
  model: string
  ignition: string[]
  intake: AnySchema
  exhaust: AnySchema
  compression?: string
  power?: (engine: Engine, { compressionStroke, engineCycle }: IPowerSystems ) => any
  throttle?: string[]
}

export interface IOdometer {
  [key: string]: any
}

export interface IRider {
  license: number | string
  keys: string[]
}

export interface IHTTPRequest {
  rider: IRider
  body: { requests: IRequest[] }
}

export interface IHTTPResponse {
  send: (response: IResponse) => void
}

export interface IRequest {
  serial?: string
  engine: string
  fuel?: unknown
  timing?: boolean
}

export interface IResponse {
  requests: any[]
}

export interface IResult {
  serial?: string
  engine: string
  results?: unknown
  error? : EngineError
}

export interface IToolBox {
  tools: Record<string, (...args: any[]) => any>
  prefix?: string
  context?: boolean
}