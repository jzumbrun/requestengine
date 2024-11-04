/**
 * Get Request Engine
 */
export function getRequestEngine(request) {
    if (request.serial)
        return { serial: request.serial, engine: request.engine };
    return { engine: request.engine };
}
