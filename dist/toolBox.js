/**
 * Get Request Model
 */
export function getRequestModel(request) {
    if (request.id)
        return { id: request.id, model: request.model };
    return { model: request.model };
}
