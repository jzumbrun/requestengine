export interface IConfig {
  definitions?: IDefinition[]
  env?: string
  query?: (statement: string, data: any) => Promise<any>
  release?: (...args: any[]) => any
  helpers?: IHelper[]
  user?: IUser
  queries?: IQuery[]
  body?: IQuery[]
}
  
export interface IRequest {
  id?: string
  name?: string
  properties?: any
  sync?: boolean
  user?: IUser
  body?: { queries: IQuery[] }
}

export interface IDefinition {
  name: string
  statement: string
  alias?: Record<string, string>
  properties?: any
  inboundSchema?: any
  outboundSchema?: any
  access: string[]
}

export interface IResponse {
  queries: any[]
  send: (response: any) => void
}

export interface IHistory {
  [key: string]: any
}

export interface IUser {
  id: number
  access: string[]
}

export interface IQuery {
  id?: string
  name: string
  properties?: any
  sync?: boolean
}

export interface IError {
  details?: string
  error: { errno: number, code: string }
}

export interface IQueryName {
  id?: string
  name?: string
}

export interface IHelper { 
  prefix: string
  functions: Record<string, (...args: any[]) => any >
  context?: boolean
}