import { handleWeb } from '../../server/index.mjs'

export function POST(request) {
  return handleWeb(request)
}
