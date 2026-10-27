import { generateId } from 'ai'

// Every visit to / starts a new chat. Reading request.url keeps this out of the prerender
export function GET(request: Request) {
  return Response.redirect(new URL(`/chat/${generateId()}`, request.url), 307)
}
