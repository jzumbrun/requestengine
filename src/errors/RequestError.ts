import type { IRequest } from '../../types.d.ts'
import EngineError from './EngineError.js'

export default class RequestError extends EngineError {
  request: IRequest

  constructor(request: IRequest, errno: number, code: string, details?: any) {
    super(errno, code, details)
    this.request = request
  }
}