import type { IRequest } from '../types.js'

/**
 * Get Request Engine
 */
export function getRequestEngine (request: IRequest): Pick<IRequest, 'engine' | 'serial'> {
  if (request.serial) return { serial: request.serial, engine: request.engine }
  return { engine: request.engine }
}