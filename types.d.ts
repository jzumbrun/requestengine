import type { AnySchema } from 'ajv'
import type Compression from './src/Compression.js'

export interface ICycle {
  tuning: ITuning,
  request: IRequest,
  response: IResponse,
  cycle: ICycle,
  odometer: IOdometer
}

export interface ITuning {
  engines?: IEngine[]
  env?: string
  tools?: ITool[]
  neutral?: (...args: any[]) => any
  drive?: (statement: string, data: any) => Promise<any>
}

export interface IEngine {
  model: string
  keys: string[]
  intake: AnySchema
  exhaust: AnySchema
  compression?: string
  power?: (strokes: IStroke, compression: Compression.compression) => any
  throttle?: string[]
}

export interface IOdometer {
  [key: string]: any
}

export interface IRider {
  id: number | string
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
  model: string
  intake?: unknown
  timing?: boolean
}

export interface IResponse {
  requests: any[]
}

export interface IRequestModel {
  serial?: string
  model?: string
}

export interface ITool { 
  prefix: string
  tools: Record<string, (...args: any[]) => any>
  context?: boolean
}