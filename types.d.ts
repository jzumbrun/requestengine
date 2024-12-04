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
  compressionFirstStroke: typeof Compression['compressionFirstStroke']
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
  limiter?: Record<string, string[]>
}

export interface IRevolution {
  [key: string]: any
}

export interface IOperator {
  id: number | string
  keys: string[]
}

export interface IHTTPRequest {
  operator: IOperator
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

export interface IIntakeValves {
  intake: unknown
  operator?: IOperator
  revolution: IRevolution
  model: IEngineModel
  i: IIntakeValves['intake']
  o: IIntakeValves['operator']
  r: IIntakeValves['revolution']
  m: IIntakeValves['model']
}