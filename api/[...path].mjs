import { handle } from '../server/index.mjs'

export default function handler(request, response) {
  return handle(request, response)
}
