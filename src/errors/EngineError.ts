export default class EngineError extends Error {
  errno: number
  code: string
  details?: any

  constructor(errno: number, code: string, details?: any) {
    super(code)
    this.errno = errno
    this.code = code
    this.details = details
  }
}