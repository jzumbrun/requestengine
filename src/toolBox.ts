import type { IRequest, IRequestModel } from '../types.js'

/**
 * Get Request Model
 */
export function getRequestModel (request: IRequest): IRequestModel {
  if (request.serial) return { serial: request.serial, model: request.model }
  return { model: request.model }
}