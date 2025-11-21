import { axiosFactory } from './http_client_axios_factory.js'
import https from 'https'
import Boom from '@hapi/boom'
import _ from 'lodash'
import unescape from 'unescape'
//import { createLogger } from './server/common/helpers/logging/logger.js'
import { createLogger } from '../../common/helpers/logging/logger.js'

const logger = createLogger()

const agentOptions = {
  keepAlive: true,
  maxSockets: 128,
  keepAliveMsecs: 3000
}

const regex = /^Bearer \S+$/
const httpsAgent = new https.Agent(agentOptions)

const logError = (err) => {
  const headers = _.mapValues(_.get(err, 'config.headers'), (value) =>
    typeof value === 'string' ? value.replace(regex, 'Bearer REDACTED') : value
  )
  logger.error(err.message, _.get(err, 'request._currentUrl'), headers)
}

const handleError = (err) => {
  logError(err)
  throw Boom.boomify(err, {
    statusCode: _.get(err, 'response.status', 500)
  })
}

function deepUnescapeJSON(object) {
  for (const propName in object) {
    let val = object[propName]

    if (typeof object[propName] === 'string') val = unescape(object[propName])

    if (typeof object[propName] === 'object') {
      val = deepUnescapeJSON(object[propName])
    }

    object[propName] = val
  }
  return object
}

/**
 * Creates the same responses as the request library. For compatibility.
 * @param response
 * @returns {{}}
 */
const toCommonResponse = (response) => {
  // Some times we get an object other times we get just an id number.
  if (
    !_.isObject(response.data) ||
    response.data instanceof Buffer ||
    _.isArray(response.data)
  ) {
    return response.data
  }
  const commonResponse = { ...response.data }
  const etag = _.get(response, 'headers.etag')
  if (!_.isNil(etag)) {
    commonResponse.etag = etag
  }
  return deepUnescapeJSON(commonResponse)
}

const request = (verb, options) => {
  return axiosFactory
    .getInstance()({
      method: verb,
      httpsAgent,
      ...options
    })
    .then(toCommonResponse)
    .catch(handleError)
}

export const GET = (options) => {
  return request('get', options)
}
