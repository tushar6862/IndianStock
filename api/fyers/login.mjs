import { handleWeb } from '../../server/index.mjs'

export function GET(request) {
  return handleWeb(request)
}
