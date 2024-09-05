import type { AnySchema } from 'ajv'

export interface IConfig {
  definitions?: IDefinition[]
  env?: string
  helpers?: IHelper[]
  user?: IUser
  requests?: IQuery[]
  body?: IQuery[]
  release?: (...args: any[]) => any
  query?: (statement: string, data: any) => Promise<any>
}

export interface IIdentifier {
  name: string
  alias?: string 
}

export interface IHandler {
  response: IResponse
  request: IRequest
  definition: IDefinition
  history: IHistory
  config: IConfig
  data?: any
}

export interface IDefinition {
  name: string
  hql?: string
  handler?: (context: IHandler) => any
  identifiers?: IIdentifier[]
  inboundSchema?: AnySchema
  outboundSchema?: AnySchema
  access: string[]
}

export interface IHistory {
  [key: string]: any
}

export interface IUser {
  id: number | string
  access: string[]
}

export interface IHTTPRequest {
  user?: IUser
  body?: { requests: IRequest[] }
}

export interface IHTTPResponse {
  send: (response: IResponse) => void
}

export interface IRequest {
  id?: string
  name: string
  properties?: any
  async?: boolean
}


export interface IResponse {
  requests: any[]
}

export interface IError {
  details?: string
  error: { errno: number, code: string }
}

export interface IRequestName {
  id?: string
  name?: string
}

export interface IHelper { 
  prefix: string
  functions: Record<string, (...args: any[]) => any >
  context?: boolean
}