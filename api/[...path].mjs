import { handleWeb } from '../server/index.mjs'

export default {
  fetch(request) {
    return handleWeb(request)
  },
}
