(function(){function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s}return e})()({1:[function(require,module,exports){
'use strict';

var _templateObject = _taggedTemplateLiteral(['\n    <body>\n      <form onsubmit=', '>\n        <input type="text" name="word" placeholder="word" required>\n        <input type="text" name="definition" placeholder="definition" required>\n        <input type="text" name="context" placeholder="context">\n        <input type="submit" value="Save">\n      </form>\n    </body>\n  '], ['\n    <body>\n      <form onsubmit=', '>\n        <input type="text" name="word" placeholder="word" required>\n        <input type="text" name="definition" placeholder="definition" required>\n        <input type="text" name="context" placeholder="context">\n        <input type="submit" value="Save">\n      </form>\n    </body>\n  ']);

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var issueDB = require('issue-db')({
  owner: 'zeke',
  repo: 'new-words',
  token: 'fb774ce551c97c4b1cbfea59d66fe7bfda9850a7'
});

var html = require('choo/html');
var choo = require('choo');
var app = choo();
app.route('/', main);
app.mount('body');

function main() {
  return html(_templateObject, onsubmit);

  function onsubmit(e) {
    e.preventDefault();
    var form = e.currentTarget;
    var data = new FormData(form);
    var headers = new Headers({ 'Content-Type': 'application/json' });
    var body = {};
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = data.entries()[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var pair = _step.value;
        body[pair[0]] = pair[1];
      }
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator.return) {
          _iterator.return();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }

    console.log(body);
  }
}

},{"choo":45,"choo/html":44,"issue-db":50}],2:[function(require,module,exports){
module.exports = GitHubApi

const defaultsDeep = require('lodash/defaultsDeep')
const Hook = require('before-after-hook')

const parseClientOptions = require('./lib/parse-client-options')
const request = require('./lib/request')
const ENDPOINT_DEFAULTS = require('./lib/endpoint').DEFAULTS

const PLUGINS = [
  require('./lib/plugins/authentication'),
  require('./lib/plugins/endpoint-methods'),
  require('./lib/plugins/pagination')
]

function GitHubApi (options) {
  const defaults = defaultsDeep(parseClientOptions(options), ENDPOINT_DEFAULTS)

  const hook = new Hook()
  const api = {
    // NOTE: github.hook, github.plugin and github.request are experimental APIs
    //       at this point and can change at any time
    hook,
    plugin: (pluginFunction) => pluginFunction(api),
    request: (options) => api.hook('request', defaultsDeep(options, defaults), request)
  }

  PLUGINS.forEach(api.plugin)

  return api
}

},{"./lib/endpoint":7,"./lib/parse-client-options":8,"./lib/plugins/authentication":11,"./lib/plugins/endpoint-methods":13,"./lib/plugins/pagination":26,"./lib/request":29,"before-after-hook":36,"lodash/defaultsDeep":210}],3:[function(require,module,exports){
module.exports = {
  agent: undefined, // https://nodejs.org/api/https.html#https_class_https_agent
  headers: {},
  requestMedia: 'application/vnd.github.v3+json',
  timeout: 0,
  baseUrl: 'https://api.github.com'
}

},{}],4:[function(require,module,exports){
module.exports = addQueryParameters

function addQueryParameters (url, parameters) {
  const separator = /\?/.test(url) ? '&' : '?'
  const names = Object.keys(parameters)

  if (names.length === 0) {
    return url
  }

  return url + separator + names
    .map(name => {
      if (name === 'q') {
        return 'q=' + parameters.q.split('+')
          .map(encodeURIComponent)
          .join('+')
      }

      return `${name}=${encodeURIComponent(parameters[name])}`
    })
    .join('&')
}

},{}],5:[function(require,module,exports){
const pkg = require('../../package.json')

module.exports = {
  method: 'get',
  baseUrl: 'https://api.github.com',
  headers: {
    accept: 'application/vnd.github.v3+json',
    'user-agent': `octokit/rest.js v${pkg.version}`
  },
  request: {}
}

},{"../../package.json":34}],6:[function(require,module,exports){
module.exports = extractUrlVariableName

const flatten = require('lodash/flatten')

const urlVariableRegex = /\{[^}]+\}/g
function extractUrlVariableName (url) {
  const matches = url.match(urlVariableRegex)

  if (!matches) {
    return []
  }

  return flatten(matches.map(removeNonChars))
}

function removeNonChars (variableName) {
  return variableName.replace(/^\W+|\W+$/g, '').split(/,/)
}

},{"lodash/flatten":212}],7:[function(require,module,exports){
'use strict'

module.exports = restEndpoint

const defaultsDeep = require('lodash/defaultsDeep')
const intersection = require('lodash/intersection')
const mapKeys = require('lodash/mapKeys')
const omit = require('lodash/omit')
const urlTemplate = require('url-template')

const addQueryParameters = require('./add-query-parameters')
const extractUrlVariableNames = require('./extract-url-variable-names')

const DEFAULTS = module.exports.DEFAULTS = require('./defaults')
const NON_PARAMETERS = [
  'request',
  'baseUrl'
]

function restEndpoint (options) {
  // lowercase header names (#760)
  options.headers = mapKeys(options.headers, (value, key) => key.toLowerCase())

  options = defaultsDeep({}, options, DEFAULTS)

  let method = options.method.toLowerCase()
  let baseUrl = options.baseUrl
  let url = options.url
  let body = options.body
  let headers = options.headers
  let remainingOptions = omit(options, ['method', 'baseUrl', 'url', 'headers'])

  // replace :varname with {varname} to make it RFC 6570 compatible
  url = url.replace(/:([a-z]\w+)/g, '{+$1}')

  // extract variable names from URL to calculate remaining variables later
  const urlVariableNames = extractUrlVariableNames(url)

  url = urlTemplate.parse(url).expand(remainingOptions)

  if (!/^http/.test(url)) {
    url = (baseUrl) + url
  }

  const requestOptions = remainingOptions.request
  remainingOptions = omit(remainingOptions, intersection(Object.keys(options), urlVariableNames).concat(NON_PARAMETERS))

  if (method === 'get' || method === 'head') {
    url = addQueryParameters(url, remainingOptions)
  } else {
    if ('input' in remainingOptions) {
      body = remainingOptions.input
    } else {
      body = Object.keys(remainingOptions).length ? remainingOptions : undefined
    }
  }

  return Object.assign(requestOptions, {
    method,
    url,
    headers,
    body
  })
}

},{"./add-query-parameters":4,"./defaults":5,"./extract-url-variable-names":6,"lodash/defaultsDeep":210,"lodash/intersection":216,"lodash/mapKeys":234,"lodash/omit":237,"url-template":262}],8:[function(require,module,exports){
(function (process){
module.exports = parseOptions

const defaults = require('lodash/defaults')
const pick = require('lodash/pick')

const getRequestAgent = require('./get-request-agent')
const DEFAULTS = require('./defaults')
const OPTION_NAMES = [
  'timeout',
  'baseUrl',
  'agent',
  'headers',
  'requestMedia'
]

function parseOptions (userOptions) {
  if (!userOptions) {
    userOptions = {}
  }

  if ('followRedirects' in userOptions) {
    console.warn('DEPRECATED: followRedirects option is no longer supported. All redirects are followed correctly')
  }

  if ('protocol' in userOptions) {
    console.warn('DEPRECATED: protocol option is no longer supported')
  }

  if ('host' in userOptions) {
    console.warn('DEPRECATED: host option is no longer supported')
  }

  if ('port' in userOptions) {
    console.warn('DEPRECATED: port option is no longer supported')
  }

  if ('pathPrefix' in userOptions) {
    console.warn('DEPRECATED: pathPrefix option is no longer supported')
  }

  if ('Promise' in userOptions) {
    console.warn('DEPRECATED: Promise option is no longer supported. The native Promise API is used')
  }

  const options = defaults(pick(userOptions, OPTION_NAMES), DEFAULTS)

  const clientDefaults = {
    baseUrl: options.baseUrl,
    headers: options.headers,
    request: {
      timeout: options.timeout
    }
  }
  if (userOptions.protocol) {
    clientDefaults.baseUrl = `${userOptions.protocol}://${userOptions.host}`

    if (userOptions.port) {
      clientDefaults.baseUrl += `:${userOptions.port}`
    }

    // Check if a prefix is passed in the options and strip any leading or trailing slashes from it.
    if (userOptions.pathPrefix) {
      clientDefaults.baseUrl += '/' + userOptions.pathPrefix.replace(/(^[/]+|[/]+$)/g, '')
    }
  }
  /* istanbul ignore else */

  if (!process.browser) {
    clientDefaults.request.agent = getRequestAgent(clientDefaults.baseUrl, userOptions)
  }

  return clientDefaults
}

}).call(this,require('_process'))
},{"./defaults":3,"./get-request-agent":42,"_process":259,"lodash/defaults":209,"lodash/pick":238}],9:[function(require,module,exports){
module.exports = authenticate

function authenticate (state, options) {
  if (!options) {
    state.auth = false
    return
  }

  switch (options.type) {
    case 'basic':
      if (!options.username || !options.password) {
        throw new Error('Basic authentication requires both a username and password to be set')
      }
      break

    case 'oauth':
      if (!options.token && !(options.key && options.secret)) {
        throw new Error('OAuth2 authentication requires a token or key & secret to be set')
      }
      break

    case 'token':
    case 'integration':
      if (!options.token) {
        throw new Error('Token authentication requires a token to be set')
      }
      break

    default:
      throw new Error("Invalid authentication type, must be 'basic', 'integration', or 'oauth'")
  }

  state.auth = options
}

},{}],10:[function(require,module,exports){
module.exports = authenticationBeforeRequest

const btoa = require('btoa-lite')

function authenticationBeforeRequest (state, options) {
  if (!state.auth.type) {
    return
  }

  if (state.auth.type === 'basic') {
    const hash = btoa(`${state.auth.username}:${state.auth.password}`)
    options.headers['authorization'] = `Basic ${hash}`
    return
  }

  if (state.auth.type === 'token') {
    options.headers['authorization'] = `token ${state.auth.token}`
    return
  }

  if (state.auth.type === 'integration') {
    options.headers['authorization'] = `Bearer ${state.auth.token}`
    options.headers['accept'] = 'application/vnd.github.machine-man-preview+json'
    return
  }

  options.url += options.url.indexOf('?') === -1 ? '?' : '&'

  if (state.auth.token) {
    options.url += `access_token=${encodeURIComponent(state.auth.token)}`
    return
  }

  const key = encodeURIComponent(state.auth.key)
  const secret = encodeURIComponent(state.auth.secret)
  options.url += `client_id=${key}&client_secret=${secret}`
}

},{"btoa-lite":43}],11:[function(require,module,exports){
module.exports = authenticationPlugin

const authenticate = require('./authenticate')
const beforeRequest = require('./before-request')

function authenticationPlugin (octokit) {
  const state = {
    auth: false
  }
  octokit.authenticate = authenticate.bind(null, state)
  octokit.hook.before('request', beforeRequest.bind(null, state))
}

},{"./authenticate":9,"./before-request":10}],12:[function(require,module,exports){
module.exports = deprecate

function deprecate (func, message) {
  return function () {
    const caller = (new Error()).stack.split('\n')[2]
    console.warn('DEPRECATED: ' + message)
    console.warn(caller)

    return func.apply(null, arguments)
  }
}

},{}],13:[function(require,module,exports){
module.exports = apiPlugin

const pick = require('lodash/pick')

const method = require('./method')
const deprecate = require('./deprecate')

const ENDPOINT_DEFAULTS = require('../../routes.json')

function apiPlugin (octokit) {
  Object.keys(ENDPOINT_DEFAULTS).forEach(namespaceName => {
    octokit[namespaceName] = {}

    Object.keys(ENDPOINT_DEFAULTS[namespaceName]).forEach(apiName => {
      const apiOptions = ENDPOINT_DEFAULTS[namespaceName][apiName]
      const endpointDefaults = pick(apiOptions, ['method', 'url', 'headers', 'request'])

      octokit[namespaceName][apiName] = method.bind(null, octokit, endpointDefaults, apiOptions.params)

      // log deprecation warning for APIs flagged as deprecated
      if (apiOptions.deprecated) {
        octokit[namespaceName][apiName] = deprecate(
          octokit[namespaceName][apiName],
          apiOptions.deprecated
        )
      }
    })
  })
}

},{"../../routes.json":31,"./deprecate":12,"./method":14,"lodash/pick":238}],14:[function(require,module,exports){
module.exports = apiMethod

const clone = require('lodash/clone')
const defaultsDeep = require('lodash/defaultsDeep')
const mapKeys = require('lodash/mapKeys')

const validate = require('./validate')

function apiMethod (octokit, endpointDefaults, endpointParams, options, callback) {
  // Do not alter passed options (#786)
  options = clone(options) || {}

  // lowercase header names (#760)
  options.headers = mapKeys(options.headers, (value, key) => key.toLowerCase())

  const endpointOptions = defaultsDeep(options, endpointDefaults)

  const promise = Promise.resolve(endpointOptions)
    .then(validate.bind(null, endpointParams))
    .then(octokit.request)

  if (callback) {
    promise.then(callback.bind(null, null), callback)
    return
  }

  return promise
}

},{"./validate":15,"lodash/clone":207,"lodash/defaultsDeep":210,"lodash/mapKeys":234}],15:[function(require,module,exports){
'use strict'

module.exports = validate

const set = require('lodash/set')
const HttpError = require('../../request/http-error')

function validate (endpointParams, options) {
  Object.keys(endpointParams).forEach(parameterName => {
    const parameter = endpointParams[parameterName]
    const expectedType = parameter.type
    let value = options[parameterName]

    const paramIsPresent = parameterName in options
    const paramIsNull = value === null

    if (!parameter.required && !paramIsPresent) {
      return
    }

    if (parameter['allow-null'] === true && paramIsNull) {
      return
    }

    if ((parameter.required && !paramIsPresent) ||
        (parameter['allow-null'] === false && paramIsNull)) {
      throw new HttpError(`Empty value for parameter '${parameterName}': ${value}`, 400)
    }

    if (parameter.enum) {
      if (parameter.enum.indexOf(value) === -1) {
        throw new HttpError(`Invalid value for parameter '${parameterName}': ${value}`, 400)
      }
    }

    if (parameter.validation) {
      const regex = new RegExp(parameter.validation)
      if (!regex.test(value)) {
        throw new HttpError(`Invalid value for parameter '${parameterName}': ${value}`, 400)
      }
    }

    if (expectedType === 'number') {
      value = parseInt(value, 10)
      if (isNaN(value)) {
        throw new HttpError(`Invalid value for parameter '${parameterName}': ${options[parameterName]} is NaN`, 400)
      }
    }

    if (expectedType === 'json' && typeof value === 'string') {
      try {
        value = JSON.parse(value)
      } catch (exception) {
        throw new HttpError(`JSON parse error of value for parameter '${parameterName}': ${value}`, 400)
      }
    }

    set(options, parameter.mapTo || parameterName, value)
  })

  return options
}

},{"../../request/http-error":28,"lodash/set":240}],16:[function(require,module,exports){
module.exports = getFirstPage

const getPage = require('./get-page')

function getFirstPage (octokit, link, headers, callback) {
  return getPage(octokit, link, 'first', headers, callback)
}

},{"./get-page":20}],17:[function(require,module,exports){
module.exports = getLastPage

const getPage = require('./get-page')

function getLastPage (octokit, link, headers, callback) {
  return getPage(octokit, link, 'last', headers, callback)
}

},{"./get-page":20}],18:[function(require,module,exports){
module.exports = getNextPage

const getPage = require('./get-page')

function getNextPage (octokit, link, headers, callback) {
  return getPage(octokit, link, 'next', headers, callback)
}

},{"./get-page":20}],19:[function(require,module,exports){
module.exports = getPageLinks

function getPageLinks (link) {
  link = link.link || link.meta.link || ''

  const links = {}

  // link format:
  // '<https://api.github.com/users/aseemk/followers?page=2>; rel="next", <https://api.github.com/users/aseemk/followers?page=2>; rel="last"'
  link.replace(/<([^>]*)>;\s*rel="([\w]*)"/g, (m, uri, type) => {
    links[type] = uri
  })

  return links
}

},{}],20:[function(require,module,exports){
module.exports = getPage

const HttpError = require('../../request/http-error')
const getPageLinks = require('./get-page-links')

function getPage (octokit, link, which, headers, callback) {
  if (typeof headers === 'function') {
    callback = headers
    headers = null
  }

  const url = getPageLinks(link)[which]

  if (!url) {
    const urlError = new HttpError(`No ${which} page found`, 404)
    if (callback) {
      return callback(urlError)
    }
    return Promise.reject(urlError)
  }

  const requestOptions = {
    url,
    headers: applyAcceptHeader(link, headers)
  }

  const promise = octokit.request(requestOptions)

  if (callback) {
    promise.then(callback.bind(null, null), callback)
    return
  }

  return promise
}

function applyAcceptHeader (res, headers) {
  const previous = res.meta && res.meta['x-github-media-type']

  if (!previous || (headers && headers.accept)) {
    return headers
  }
  headers = headers || {}
  headers.accept = `application/vnd.${previous.replace('; format=', '+')}`
  return headers
}

},{"../../request/http-error":28,"./get-page-links":19}],21:[function(require,module,exports){
module.exports = getPreviousPage

const getPage = require('./get-page')

function getPreviousPage (octokit, link, headers, callback) {
  return getPage(octokit, link, 'prev', headers, callback)
}

},{"./get-page":20}],22:[function(require,module,exports){
module.exports = hasFirstPage

const getPageLinks = require('./get-page-links')

function hasFirstPage (link) {
  return getPageLinks(link).first
}

},{"./get-page-links":19}],23:[function(require,module,exports){
module.exports = hasLastPage

const getPageLinks = require('./get-page-links')

function hasLastPage (link) {
  return getPageLinks(link).last
}

},{"./get-page-links":19}],24:[function(require,module,exports){
module.exports = hasNextPage

const getPageLinks = require('./get-page-links')

function hasNextPage (link) {
  return getPageLinks(link).next
}

},{"./get-page-links":19}],25:[function(require,module,exports){
module.exports = hasPreviousPage

const getPageLinks = require('./get-page-links')

function hasPreviousPage (link) {
  return getPageLinks(link).prev
}

},{"./get-page-links":19}],26:[function(require,module,exports){
module.exports = paginationPlugin

function paginationPlugin (octokit) {
  octokit.getFirstPage = require('./get-first-page').bind(null, octokit)
  octokit.getLastPage = require('./get-last-page').bind(null, octokit)
  octokit.getNextPage = require('./get-next-page').bind(null, octokit)
  octokit.getPreviousPage = require('./get-previous-page').bind(null, octokit)
  octokit.hasFirstPage = require('./has-first-page')
  octokit.hasLastPage = require('./has-last-page')
  octokit.hasNextPage = require('./has-next-page')
  octokit.hasPreviousPage = require('./has-previous-page')
}

},{"./get-first-page":16,"./get-last-page":17,"./get-next-page":18,"./get-previous-page":21,"./has-first-page":22,"./has-last-page":23,"./has-next-page":24,"./has-previous-page":25}],27:[function(require,module,exports){
module.exports = getBufferResponse

function getBufferResponse (response) {
  return response.arrayBuffer()
}

},{}],28:[function(require,module,exports){
'use strict'

const STATUS_CODES = {
  304: 'Not Modified', // See PR #673 (https://github.com/octokit/rest.js/pull/673)
  400: 'Bad Request',
  404: 'Not Found',
  500: 'Internal Server Error',
  504: 'Gateway Timeout'
}

module.exports = class HttpError extends Error {
  constructor (message, code, headers) {
    super(message)
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    /* istanbul ignore else */
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
    this.name = 'HttpError'
    this.code = code
    this.status = STATUS_CODES[code]
    this.headers = headers
  }

  toString () {
    return this.message
  }

  toJSON () {
    return {
      code: this.code,
      status: this.status,
      message: this.message
    }
  }
}

},{}],29:[function(require,module,exports){
module.exports = restRequest

const restEndpoint = require('../endpoint')
const request = require('./request')

function restRequest (endpointOptions) {
  const requestOptions = restEndpoint(endpointOptions)
  return request(requestOptions)
}

},{"../endpoint":7,"./request":30}],30:[function(require,module,exports){
'use strict'

module.exports = request

const fetch = require('node-fetch')
const debug = require('debug')('octokit:rest')
const defaults = require('lodash/defaults')
const isPlainObject = require('lodash/isPlainObject')
const pick = require('lodash/pick')

const getBuffer = require('./get-buffer-response')
const HttpError = require('./http-error')

function request (requestOptions) {
  debug('REQUEST:', requestOptions)

  // calculate content length unless body is a stream, in which case the
  // content length is already set per option
  if (requestOptions.body) {
    defaults(requestOptions.headers, {
      'content-type': 'application/json; charset=utf-8'
    })
  }

  // https://fetch.spec.whatwg.org/#methods
  requestOptions.method = requestOptions.method.toUpperCase()

  // GitHub expects "content-length: 0" header for PUT/PATCH requests without body
  // fetch does not allow to set `content-length` header, but we can set body to an empty string
  if (['PATCH', 'PUT'].indexOf(requestOptions.method) >= 0 && !requestOptions.body) {
    requestOptions.body = ''
  }

  if (isPlainObject(requestOptions.body) || Array.isArray(requestOptions.body)) {
    requestOptions.body = JSON.stringify(requestOptions.body)
  }

  let headers = {}
  return fetch(requestOptions.url, pick(requestOptions, 'method', 'body', 'headers', 'timeout', 'agent'))

    .then(response => {
      const contentType = response.headers.get('content-type')

      for (const keyAndValue of response.headers.entries()) {
        headers[keyAndValue[0]] = keyAndValue[1]
      }

      if (response.status === 204) {
        return
      }

      if (response.status >= 400) {
        return response.text()

          .then(message => {
            throw new HttpError(message, response.status, headers)
          })
      }

      if (/application\/json/.test(contentType)) {
        return response.json()
      }

      if (!contentType || /^text\/|charset=utf-8$/.test(contentType)) {
        return response.text()
      }

      return getBuffer(response)
    })

    .then(data => {
      return {
        data,
        meta: headers
      }
    })

    .catch(error => {
      if (error instanceof HttpError) {
        throw error
      }

      throw new HttpError(error.message, 500, headers)
    })
}

},{"./get-buffer-response":27,"./http-error":28,"debug":32,"lodash/defaults":209,"lodash/isPlainObject":227,"lodash/pick":238,"node-fetch":258}],31:[function(require,module,exports){
module.exports={
  "authorization": {
    "get": {
      "url": "/authorizations/:id",
      "method": "GET",
      "params": {
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Get a single authorization."
    },
    "create": {
      "url": "/authorizations",
      "method": "POST",
      "params": {
        "scopes": {
          "type": "string[]",
          "description": "A list of scopes that this authorization is in."
        },
        "note": {
          "type": "string",
          "description": "A note to remind you what the OAuth token is for."
        },
        "note_url": {
          "type": "string",
          "description": "A URL to remind you what app the OAuth token is for."
        },
        "client_id": {
          "type": "string",
          "description": "The 20 character OAuth app client key for which to create the token."
        },
        "client_secret": {
          "type": "string",
          "description": "The 40 character OAuth app client secret for which to create the token."
        },
        "fingerprint": {
          "type": "string",
          "description": "A unique string to distinguish an authorization from others created for the same client ID and user."
        }
      },
      "description": "Create a new authorization."
    },
    "update": {
      "url": "/authorizations/:id",
      "method": "PATCH",
      "params": {
        "id": {
          "type": "string",
          "required": true
        },
        "scopes": {
          "type": "string[]",
          "description": "A list of scopes that this authorization is in."
        },
        "add_scopes": {
          "type": "string[]",
          "description": "A list of scopes to add to this authorization."
        },
        "remove_scopes": {
          "type": "string[]",
          "description": "A list of scopes to remove from this authorization."
        },
        "note": {
          "type": "string",
          "description": "A note to remind you what the OAuth token is for."
        },
        "note_url": {
          "type": "string",
          "description": "A URL to remind you what app the OAuth token is for."
        },
        "fingerprint": {
          "type": "string",
          "description": "A unique string to distinguish an authorization from others created for the same client ID and user."
        }
      },
      "description": "Update an existing authorization."
    },
    "delete": {
      "url": "/authorizations/:id",
      "method": "DELETE",
      "params": {
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Delete an authorization."
    },
    "check": {
      "url": "/applications/:client_id/tokens/:access_token",
      "method": "GET",
      "params": {
        "client_id": {
          "type": "string",
          "description": "The 20 character OAuth app client key for which to create the token."
        },
        "access_token": {
          "type": "string",
          "required": true,
          "description": "OAuth token"
        }
      },
      "description": "Check an authorization"
    },
    "reset": {
      "url": "/applications/:client_id/tokens/:access_token",
      "method": "POST",
      "params": {
        "client_id": {
          "type": "string",
          "description": "The 20 character OAuth app client key for which to create the token."
        },
        "access_token": {
          "type": "string",
          "required": true,
          "description": "OAuth token"
        }
      },
      "description": "Reset an authorization"
    },
    "revoke": {
      "url": "/applications/:client_id/tokens/:access_token",
      "method": "DELETE",
      "params": {
        "client_id": {
          "type": "string",
          "description": "The 20 character OAuth app client key for which to create the token."
        },
        "access_token": {
          "type": "string",
          "required": true,
          "description": "OAuth token"
        }
      },
      "description": "Revoke an authorization for an application"
    },
    "getGrants": {
      "url": "/applications/grants",
      "method": "GET",
      "params": {
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List your grants."
    },
    "getGrant": {
      "url": "/applications/grants/:id",
      "method": "GET",
      "params": {
        "id": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "Get a single grant."
    },
    "deleteGrant": {
      "url": "/applications/grants/:id",
      "method": "DELETE",
      "params": {
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Delete a grant."
    },
    "getAll": {
      "url": "/authorizations",
      "method": "GET",
      "params": {
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List your authorizations."
    },
    "getOrCreateAuthorizationForApp": {
      "url": "/authorizations/clients/:client_id",
      "method": "PUT",
      "params": {
        "client_id": {
          "type": "string",
          "description": "The 20 character OAuth app client key for which to create the token."
        },
        "client_secret": {
          "type": "string",
          "required": true,
          "description": "The 40 character OAuth app client secret associated with the client ID specified in the URL."
        },
        "scopes": {
          "type": "string[]",
          "description": "A list of scopes that this authorization is in."
        },
        "note": {
          "type": "string",
          "description": "A note to remind you what the OAuth token is for."
        },
        "note_url": {
          "type": "string",
          "description": "A URL to remind you what app the OAuth token is for."
        },
        "fingerprint": {
          "type": "string",
          "description": "A unique string to distinguish an authorization from others created for the same client ID and user."
        }
      },
      "description": "Get or create an authorization for a specific app."
    },
    "getOrCreateAuthorizationForAppAndFingerprint": {
      "url": "/authorizations/clients/:client_id/:fingerprint",
      "method": "PUT",
      "params": {
        "client_id": {
          "type": "string",
          "description": "The 20 character OAuth app client key for which to create the token."
        },
        "fingerprint": {
          "type": "string",
          "description": "A unique string to distinguish an authorization from others created for the same client ID and user."
        },
        "client_secret": {
          "type": "string",
          "required": true,
          "description": "The 40 character OAuth app client secret associated with the client ID specified in the URL."
        },
        "scopes": {
          "type": "string[]",
          "description": "A list of scopes that this authorization is in."
        },
        "note": {
          "type": "string",
          "description": "A note to remind you what the OAuth token is for."
        },
        "note_url": {
          "type": "string",
          "description": "A URL to remind you what app the OAuth token is for."
        }
      },
      "description": "Get or create an authorization for a specific app and fingerprint."
    },
    "revokeGrant": {
      "url": "/applications/:client_id/grants/:access_token",
      "method": "DELETE",
      "params": {
        "client_id": {
          "type": "string",
          "description": "The 20 character OAuth app client key for which to create the token."
        },
        "access_token": {
          "type": "string",
          "required": true,
          "description": "OAuth token"
        }
      },
      "description": "Revoke a grant for an application"
    }
  },
  "activity": {
    "getEvents": {
      "url": "/events",
      "method": "GET",
      "params": {
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List public events"
    },
    "getEventsForRepo": {
      "url": "/repos/:owner/:repo/events",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List repository events"
    },
    "getEventsForRepoIssues": {
      "url": "/repos/:owner/:repo/issues/events",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List issue events for a repository"
    },
    "getEventsForRepoNetwork": {
      "url": "/networks/:owner/:repo/events",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List public events for a network of repositories"
    },
    "getEventsForOrg": {
      "url": "/orgs/:org/events",
      "method": "GET",
      "params": {
        "org": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List public events for an organization"
    },
    "getEventsReceived": {
      "url": "/users/:username/received_events",
      "method": "GET",
      "params": {
        "username": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List events that a user has received"
    },
    "getEventsReceivedPublic": {
      "url": "/users/:username/received_events/public",
      "method": "GET",
      "params": {
        "username": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List public events that a user has received"
    },
    "getEventsForUser": {
      "url": "/users/:username/events",
      "method": "GET",
      "params": {
        "username": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List events performed by a user"
    },
    "getEventsForUserPublic": {
      "url": "/users/:username/events/public",
      "method": "GET",
      "params": {
        "username": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List public events performed by a user"
    },
    "getEventsForUserOrg": {
      "url": "/users/:username/events/orgs/:org",
      "method": "GET",
      "params": {
        "username": {
          "type": "string",
          "required": true
        },
        "org": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List events for a user's organization"
    },
    "getFeeds": {
      "url": "/feeds",
      "method": "GET",
      "params": {},
      "description": "Get all feeds available for the authenticated user."
    },
    "getNotifications": {
      "url": "/notifications",
      "method": "GET",
      "params": {
        "all": {
          "type": "boolean",
          "default": "false",
          "description": "If true, show notifications marked as read. Default: false"
        },
        "participating": {
          "type": "boolean",
          "default": "false",
          "description": "If true, only shows notifications in which the user is directly participating or mentioned. Default: false"
        },
        "since": {
          "type": "date",
          "description": "Timestamp in ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ"
        },
        "before": {
          "type": "string",
          "description": "Only show notifications updated before the given time. This is a timestamp in ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ."
        }
      },
      "description": "Get all notifications for the current user, grouped by repository."
    },
    "getNotificationsForUser": {
      "url": "/repos/:owner/:repo/notifications",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "all": {
          "type": "boolean",
          "default": "false",
          "description": "If true, show notifications marked as read. Default: false"
        },
        "participating": {
          "type": "boolean",
          "default": "false",
          "description": "If true, only shows notifications in which the user is directly participating or mentioned. Default: false"
        },
        "since": {
          "type": "date",
          "description": "Timestamp in ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ"
        },
        "before": {
          "type": "string",
          "description": "Only show notifications updated before the given time. This is a timestamp in ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ."
        }
      },
      "description": "Get all notifications for the given user."
    },
    "markNotificationsAsRead": {
      "url": "/notifications",
      "method": "PUT",
      "params": {
        "last_read_at": {
          "type": "string",
          "default": "Time.now",
          "description": "Describes the last point that notifications were checked. Anything updated since this time will not be updated. This is a timestamp in ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ. Default: Time.now"
        }
      },
      "description": "Mark notifications as read for authenticated user."
    },
    "markNotificationsAsReadForRepo": {
      "url": "/repos/:owner/:repo/notifications",
      "method": "PUT",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "last_read_at": {
          "type": "string",
          "default": "Time.now",
          "description": "Describes the last point that notifications were checked. Anything updated since this time will not be updated. This is a timestamp in ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ. Default: Time.now"
        }
      },
      "description": "Mark notifications in a repo as read."
    },
    "getNotificationThread": {
      "url": "/notifications/threads/:id",
      "method": "GET",
      "params": {
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "View a single notification thread."
    },
    "markNotificationThreadAsRead": {
      "url": "/notifications/threads/:id",
      "method": "PATCH",
      "params": {
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Mark a notification thread as read."
    },
    "checkNotificationThreadSubscription": {
      "url": "/notifications/threads/:id/subscription",
      "method": "GET",
      "params": {
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Check to see if the current user is subscribed to a thread."
    },
    "setNotificationThreadSubscription": {
      "url": "/notifications/threads/:id/subscription",
      "method": "PUT",
      "params": {
        "id": {
          "type": "string",
          "required": true
        },
        "subscribed": {
          "type": "boolean",
          "description": "Determines if notifications should be received from this thread"
        },
        "ignored": {
          "type": "boolean",
          "description": "Determines if all notifications should be blocked from this thread"
        }
      },
      "description": "This lets you subscribe or unsubscribe from a conversation. Unsubscribing from a conversation mutes all future notifications (until you comment or get @mentioned once more)."
    },
    "deleteNotificationThreadSubscription": {
      "url": "/notifications/threads/:id/subscription",
      "method": "DELETE",
      "params": {
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Delete a notification thread subscription."
    },
    "getStargazersForRepo": {
      "url": "/repos/:owner/:repo/stargazers",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.v3.star+json"
      },
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List Stargazers"
    },
    "getStarredReposForUser": {
      "url": "/users/:username/starred",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.v3.star+json"
      },
      "params": {
        "username": {
          "type": "string",
          "required": true
        },
        "sort": {
          "type": "string",
          "enum": [
            "created",
            "updated"
          ],
          "default": "created"
        },
        "direction": {
          "type": "string",
          "enum": [
            "asc",
            "desc"
          ],
          "default": "desc"
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List repositories being starred by a user"
    },
    "getStarredRepos": {
      "url": "/user/starred",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.v3.star+json"
      },
      "params": {
        "sort": {
          "type": "string",
          "enum": [
            "created",
            "updated"
          ],
          "default": "created"
        },
        "direction": {
          "type": "string",
          "enum": [
            "asc",
            "desc"
          ],
          "default": "desc"
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List repositories being starred by the authenticated user"
    },
    "checkStarringRepo": {
      "url": "/user/starred/:owner/:repo",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "Check if you are starring a repository"
    },
    "starRepo": {
      "url": "/user/starred/:owner/:repo",
      "method": "PUT",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        }
      },
      "description": "Star a repository"
    },
    "unstarRepo": {
      "url": "/user/starred/:owner/:repo",
      "method": "DELETE",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        }
      },
      "description": "Unstar a repository"
    },
    "getWatchersForRepo": {
      "url": "/repos/:owner/:repo/subscribers",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "Get watchers for repository."
    },
    "getWatchedReposForUser": {
      "url": "/users/:username/subscriptions",
      "method": "GET",
      "params": {
        "username": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List repositories being watched by a user."
    },
    "getWatchedRepos": {
      "url": "/user/subscriptions",
      "method": "GET",
      "params": {
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List repositories being watched by the authenticated user."
    },
    "getRepoSubscription": {
      "url": "/repos/:owner/:repo/subscription",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "Get a Repository Subscription."
    },
    "setRepoSubscription": {
      "url": "/repos/:owner/:repo/subscription",
      "method": "PUT",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "subscribed": {
          "type": "boolean",
          "description": "Determines if notifications should be received from this repository."
        },
        "ignored": {
          "type": "boolean",
          "description": "Determines if all notifications should be blocked from this repository."
        }
      },
      "description": "Set a Repository Subscription"
    },
    "unwatchRepo": {
      "url": "/repos/:owner/:repo/subscription",
      "method": "DELETE",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        }
      },
      "description": "Unwatch a repository."
    }
  },
  "gists": {
    "get": {
      "url": "/gists/:id",
      "method": "GET",
      "params": {
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Get a single gist"
    },
    "create": {
      "url": "/gists",
      "method": "POST",
      "params": {
        "files": {
          "type": "json",
          "required": true,
          "description": "Files that make up this gist. The key of which should be a required string filename and the value another required hash with parameters: 'content'"
        },
        "description": {
          "type": "string"
        },
        "public": {
          "type": "boolean",
          "required": true
        }
      },
      "description": "Create a gist"
    },
    "edit": {
      "url": "/gists/:id",
      "method": "PATCH",
      "params": {
        "id": {
          "type": "string",
          "required": true
        },
        "description": {
          "type": "string"
        },
        "files": {
          "type": "json",
          "required": true,
          "description": "Files that make up this gist. The key of which should be a required string filename and the value another required hash with parameters: 'content'"
        },
        "content": {
          "type": "string",
          "description": "Updated file contents."
        },
        "filename": {
          "type": "string",
          "description": "New name for this file."
        }
      },
      "description": "Edit a gist"
    },
    "star": {
      "url": "/gists/:id/star",
      "method": "PUT",
      "params": {
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Star a gist"
    },
    "unstar": {
      "url": "/gists/:id/star",
      "method": "DELETE",
      "params": {
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Unstar a gist"
    },
    "fork": {
      "url": "/gists/:id/forks",
      "method": "POST",
      "params": {
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Fork a gist"
    },
    "delete": {
      "url": "/gists/:id",
      "method": "DELETE",
      "params": {
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Delete a gist"
    },
    "getForUser": {
      "url": "/users/:username/gists",
      "method": "GET",
      "params": {
        "username": {
          "type": "string",
          "required": true
        },
        "since": {
          "type": "date",
          "description": "Timestamp in ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ"
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List a user's gists"
    },
    "getAll": {
      "url": "/gists",
      "method": "GET",
      "params": {
        "since": {
          "type": "date",
          "description": "Timestamp in ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ"
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List the authenticated user's gists or if called anonymously, this will return all public gists"
    },
    "getPublic": {
      "url": "/gists/public",
      "method": "GET",
      "params": {
        "since": {
          "type": "date",
          "description": "Timestamp in ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ"
        }
      },
      "description": "List all public gists"
    },
    "getStarred": {
      "url": "/gists/starred",
      "method": "GET",
      "params": {
        "since": {
          "type": "date",
          "description": "Timestamp in ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ"
        }
      },
      "description": "List the authenticated user's starred gists"
    },
    "getRevision": {
      "url": "/gists/:id/:sha",
      "method": "GET",
      "params": {
        "id": {
          "type": "string",
          "required": true
        },
        "sha": {
          "type": "string",
          "required": true
        }
      },
      "description": "Get a specific revision of a gist"
    },
    "getCommits": {
      "url": "/gists/:id/commits",
      "method": "GET",
      "params": {
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "List gist commits"
    },
    "checkStar": {
      "url": "/gists/:id/star",
      "method": "GET",
      "params": {
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Check if a gist is starred"
    },
    "getForks": {
      "url": "/gists/:id/forks",
      "method": "GET",
      "params": {
        "id": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List gist forks"
    },
    "getComments": {
      "url": "/gists/:gist_id/comments",
      "method": "GET",
      "params": {
        "gist_id": {
          "type": "string",
          "required": true,
          "description": "Id (SHA1 hash) of the gist."
        }
      },
      "description": "List comments on a gist"
    },
    "getComment": {
      "url": "/gists/:gist_id/comments/:id",
      "method": "GET",
      "params": {
        "gist_id": {
          "type": "string",
          "required": true,
          "description": "Id (SHA1 hash) of the gist."
        },
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Get a single comment"
    },
    "createComment": {
      "url": "/gists/:gist_id/comments",
      "method": "POST",
      "params": {
        "gist_id": {
          "type": "string",
          "required": true,
          "description": "Id (SHA1 hash) of the gist."
        },
        "body": {
          "type": "string",
          "required": true
        }
      },
      "description": "Create a comment"
    },
    "editComment": {
      "url": "/gists/:gist_id/comments/:id",
      "method": "PATCH",
      "params": {
        "gist_id": {
          "type": "string",
          "required": true,
          "description": "Id (SHA1 hash) of the gist."
        },
        "id": {
          "type": "string",
          "required": true
        },
        "body": {
          "type": "string",
          "required": true
        }
      },
      "description": "Edit a comment"
    },
    "deleteComment": {
      "url": "/gists/:gist_id/comments/:id",
      "method": "DELETE",
      "params": {
        "gist_id": {
          "type": "string",
          "required": true,
          "description": "Id (SHA1 hash) of the gist."
        },
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Delete a comment"
    }
  },
  "gitdata": {
    "getBlob": {
      "url": "/repos/:owner/:repo/git/blobs/:sha",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "sha": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "Get a Blob"
    },
    "createBlob": {
      "url": "/repos/:owner/:repo/git/blobs",
      "method": "POST",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "content": {
          "type": "string",
          "required": true,
          "allow-empty": true
        },
        "encoding": {
          "type": "string",
          "required": true
        }
      },
      "description": "Create a Blob"
    },
    "getCommit": {
      "url": "/repos/:owner/:repo/git/commits/:sha",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "sha": {
          "type": "string",
          "required": true
        }
      },
      "description": "Get a Commit"
    },
    "createCommit": {
      "url": "/repos/:owner/:repo/git/commits",
      "method": "POST",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "message": {
          "type": "string",
          "required": true,
          "description": "String of the commit message"
        },
        "tree": {
          "type": "string",
          "required": true,
          "description": "String of the SHA of the tree object this commit points to"
        },
        "parents": {
          "type": "string[]",
          "required": true,
          "description": "Array of the SHAs of the commits that were the parents of this commit. If omitted or empty, the commit will be written as a root commit. For a single parent, an array of one SHA should be provided, for a merge commit, an array of more than one should be provided."
        },
        "author": {
          "type": "json"
        },
        "committer": {
          "type": "json"
        }
      },
      "description": "Create a Commit"
    },
    "getCommitSignatureVerification": {
      "url": "/repos/:owner/:repo/git/commits/:sha",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "sha": {
          "type": "string",
          "required": true
        }
      },
      "description": "Get a Commit Signature Verification. (In preview period. See README.)"
    },
    "getReference": {
      "url": "/repos/:owner/:repo/git/refs/:ref",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "ref": {
          "type": "string",
          "required": true,
          "allow-empty": true,
          "description": "String of the name of the fully qualified reference (ie: heads/master). If it doesn’t have at least one slash, it will be rejected."
        }
      },
      "description": "Get a Reference"
    },
    "getReferences": {
      "url": "/repos/:owner/:repo/git/refs",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "Get all References"
    },
    "getTags": {
      "url": "/repos/:owner/:repo/git/refs/tags",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "Get all tag References"
    },
    "createReference": {
      "url": "/repos/:owner/:repo/git/refs",
      "method": "POST",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "ref": {
          "type": "string",
          "required": true,
          "description": "The name of the fully qualified reference (ie: refs/heads/master). If it doesn't start with 'refs' and have at least two slashes, it will be rejected. NOTE: After creating the reference, on calling (get|update|delete)Reference, drop the leading 'refs/' when providing the 'ref' param."
        },
        "sha": {
          "type": "string",
          "required": true
        }
      },
      "description": "Create a Reference"
    },
    "updateReference": {
      "url": "/repos/:owner/:repo/git/refs/:ref",
      "method": "PATCH",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "ref": {
          "type": "string",
          "required": true,
          "allow-empty": true,
          "description": "String of the name of the fully qualified reference (ie: heads/master). If it doesn’t have at least one slash, it will be rejected."
        },
        "sha": {
          "type": "string",
          "required": true
        },
        "force": {
          "type": "boolean",
          "default": "false",
          "description": "Boolean indicating whether to force the update or to make sure the update is a fast-forward update. The default is false, so leaving this out or setting it to false will make sure you’re not overwriting work."
        }
      },
      "description": "Update a Reference"
    },
    "deleteReference": {
      "url": "/repos/:owner/:repo/git/refs/:ref",
      "method": "DELETE",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "ref": {
          "type": "string",
          "required": true,
          "allow-empty": true,
          "description": "String of the name of the fully qualified reference (ie: heads/master). If it doesn’t have at least one slash, it will be rejected."
        }
      },
      "description": "Delete a Reference"
    },
    "getTag": {
      "url": "/repos/:owner/:repo/git/tags/:sha",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "sha": {
          "type": "string",
          "required": true
        }
      },
      "description": "Get a Tag"
    },
    "createTag": {
      "url": "/repos/:owner/:repo/git/tags",
      "method": "POST",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "tag": {
          "type": "string",
          "required": true,
          "description": "String of the tag"
        },
        "message": {
          "type": "string",
          "required": true,
          "description": "String of the tag message"
        },
        "object": {
          "type": "string",
          "required": true,
          "description": "String of the SHA of the git object this is tagging"
        },
        "type": {
          "type": "string",
          "required": true,
          "description": "String of the type of the object we’re tagging. Normally this is a commit but it can also be a tree or a blob."
        },
        "tagger": {
          "type": "json",
          "required": true,
          "description": "JSON object that contains the following keys: `name` - String of the name of the author of the tag, `email` - String of the email of the author of the tag, `date` - Timestamp of when this object was tagged"
        }
      },
      "description": "Create a Tag Object"
    },
    "getTagSignatureVerification": {
      "url": "/repos/:owner/:repo/git/tags/:sha",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "sha": {
          "type": "string",
          "required": true
        }
      },
      "description": "Get a Tag Signature Verification. (In preview period. See README.)"
    },
    "getTree": {
      "url": "/repos/:owner/:repo/git/trees/:sha",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "sha": {
          "type": "string",
          "required": true
        },
        "recursive": {
          "type": "boolean"
        }
      },
      "description": "Get a Tree"
    },
    "createTree": {
      "url": "/repos/:owner/:repo/git/trees",
      "method": "POST",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "tree": {
          "type": "json",
          "required": true,
          "description": "Array of Hash objects (of path, mode, type and sha) specifying a tree structure"
        },
        "base_tree": {
          "type": "string",
          "description": "String of the SHA1 of the tree you want to update with new data"
        }
      },
      "description": "Create a Tree"
    }
  },
  "integrations": {
    "getInstallations": {
      "url": "/app/installations",
      "method": "GET",
      "deprecated": "`integrations` has been renamed to `apps`",
      "headers": {
        "accept": "application/vnd.github.machine-man-preview"
      },
      "params": {
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List the app's installations. (In preview period. See README.)"
    },
    "createInstallationToken": {
      "url": "/installations/:installation_id/access_tokens",
      "method": "POST",
      "deprecated": "`integrations` has been renamed to `apps`",
      "headers": {
        "accept": "application/vnd.github.machine-man-preview"
      },
      "params": {
        "installation_id": {
          "type": "string",
          "required": true
        },
        "user_id": {
          "type": "string",
          "description": "The id of the user for whom the app is acting on behalf of."
        }
      },
      "description": "Create a new installation token. (In preview period. See README.)"
    },
    "getInstallationRepositories": {
      "url": "/installation/repositories",
      "method": "GET",
      "deprecated": "`integrations` has been renamed to `apps`",
      "headers": {
        "accept": "application/vnd.github.machine-man-preview"
      },
      "params": {
        "user_id": {
          "type": "string",
          "description": "The integer ID of a user, to filter results to repositories that are visible to both the installation and the given user."
        }
      },
      "description": "List repositories that are accessible to the authenticated installation. (In preview period. See README.)"
    },
    "addRepoToInstallation": {
      "url": "/installations/:installation_id/repositories/:repository_id",
      "method": "PUT",
      "deprecated": "`integrations` has been renamed to `apps`",
      "headers": {
        "accept": "application/vnd.github.machine-man-preview"
      },
      "params": {
        "installation_id": {
          "type": "string",
          "required": true
        },
        "repository_id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Add a single repository to an installation. (In preview period. See README.)"
    },
    "removeRepoFromInstallation": {
      "url": "/installations/:installation_id/repositories/:repository_id",
      "method": "DELETE",
      "deprecated": "`integrations` has been renamed to `apps`",
      "headers": {
        "accept": "application/vnd.github.machine-man-preview"
      },
      "params": {
        "installation_id": {
          "type": "string",
          "required": true
        },
        "repository_id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Remove a single repository from an installation. (In preview period. See README.)"
    }
  },
  "apps": {
    "get": {
      "url": "/app",
      "method": "GET",
      "params": {},
      "description": "Get the authenticated GitHub App. (In preview period. See README.)"
    },
    "getForSlug": {
      "url": "/apps/:app_slug",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.machine-man-preview"
      },
      "params": {
        "app_slug": {
          "type": "string",
          "required": true,
          "description": "The URL-friendly name of your GitHub App. You can find this on the settings page for your GitHub App (e.g., https://github.com/settings/apps/:app_slug)."
        }
      },
      "description": "Get a single GitHub App. (In preview period. See README.)"
    },
    "getInstallations": {
      "url": "/app/installations",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.machine-man-preview"
      },
      "params": {
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List the app's installations. (In preview period. See README.)"
    },
    "getInstallation": {
      "url": "/app/installations/:installation_id",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.machine-man-preview"
      },
      "params": {
        "installation_id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Get a single installation. (In preview period. See README.)"
    },
    "createInstallationToken": {
      "url": "/installations/:installation_id/access_tokens",
      "method": "POST",
      "headers": {
        "accept": "application/vnd.github.machine-man-preview"
      },
      "params": {
        "installation_id": {
          "type": "string",
          "required": true
        },
        "user_id": {
          "type": "string",
          "description": "The id of the user for whom the app is acting on behalf of."
        }
      },
      "description": "Create a new installation token. (In preview period. See README.)"
    },
    "getInstallationRepositories": {
      "url": "/installation/repositories",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.machine-man-preview"
      },
      "params": {
        "user_id": {
          "type": "string",
          "description": "The integer ID of a user, to filter results to repositories that are visible to both the installation and the given user."
        }
      },
      "description": "List repositories that are accessible to the authenticated installation. (In preview period. See README.)"
    },
    "addRepoToInstallation": {
      "url": "/installations/:installation_id/repositories/:repository_id",
      "method": "PUT",
      "headers": {
        "accept": "application/vnd.github.machine-man-preview"
      },
      "params": {
        "installation_id": {
          "type": "string",
          "required": true
        },
        "repository_id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Add a single repository to an installation. (In preview period. See README.)"
    },
    "removeRepoFromInstallation": {
      "url": "/installations/:installation_id/repositories/:repository_id",
      "method": "DELETE",
      "headers": {
        "accept": "application/vnd.github.machine-man-preview"
      },
      "params": {
        "installation_id": {
          "type": "string",
          "required": true
        },
        "repository_id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Remove a single repository from an installation. (In preview period. See README.)"
    },
    "getMarketplaceListingPlans": {
      "url": "/marketplace_listing/plans",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.valkyrie-preview+json"
      },
      "params": {
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List all plans for your Marketplace listing. (In preview period. See README.)"
    },
    "getMarketplaceListingStubbedPlans": {
      "url": "/marketplace_listing/stubbed/plans",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.valkyrie-preview+json"
      },
      "params": {
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List all stubbed plans for your Marketplace listing. (In preview period. See README.)"
    },
    "getMarketplaceListingPlanAccounts": {
      "url": "/marketplace_listing/plans/:id/accounts",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.valkyrie-preview+json"
      },
      "params": {
        "id": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List all GitHub accounts (user or organization) on a specific plan. (In preview period. See README.)"
    },
    "getMarketplaceListingStubbedPlanAccounts": {
      "url": "/marketplace_listing/stubbed/plans/:id/accounts",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.valkyrie-preview+json"
      },
      "params": {
        "id": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List all GitHub accounts (user or organization) on a specific stubbed plan. (In preview period. See README.)"
    },
    "checkMarketplaceListingAccount": {
      "url": "/marketplace_listing/accounts/:id",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.valkyrie-preview+json"
      },
      "params": {
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Check if a GitHub account is associated with any Marketplace listing. (In preview period. See README.)"
    },
    "checkMarketplaceListingStubbedAccount": {
      "url": "/marketplace_listing/stubbed/accounts/:id",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.valkyrie-preview+json"
      },
      "params": {
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Check if a stubbed GitHub account is associated with any Marketplace listing. (In preview period. See README.)"
    }
  },
  "issues": {
    "get": {
      "url": "/repos/:owner/:repo/issues/:number",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.squirrel-girl-preview"
      },
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "number": {
          "type": "number",
          "required": true
        }
      },
      "description": "Get a single issue"
    },
    "create": {
      "url": "/repos/:owner/:repo/issues",
      "method": "POST",
      "headers": {
        "accept": "application/vnd.github.squirrel-girl-preview"
      },
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "title": {
          "type": "string",
          "required": true
        },
        "body": {
          "type": "string"
        },
        "assignee": {
          "type": "string",
          "description": "Login for the user that this issue should be assigned to."
        },
        "milestone": {
          "type": "number",
          "description": "Milestone to associate this issue with."
        },
        "labels": {
          "type": "string[]",
          "description": "Array of strings - Labels to associate with this issue."
        },
        "assignees": {
          "type": "string[]",
          "description": "Logins for Users to assign to this issue. NOTE: Only users with push access can set assignees for new issues. Assignees are silently dropped otherwise."
        }
      },
      "description": "Create an issue"
    },
    "edit": {
      "url": "/repos/:owner/:repo/issues/:number",
      "method": "PATCH",
      "headers": {
        "accept": "application/vnd.github.squirrel-girl-preview"
      },
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "number": {
          "type": "number",
          "required": true
        },
        "title": {
          "type": "string"
        },
        "body": {
          "type": "string"
        },
        "assignee": {
          "type": "string",
          "description": "Login for the user that this issue should be assigned to."
        },
        "state": {
          "type": "string",
          "enum": [
            "open",
            "closed"
          ],
          "default": "open",
          "description": "open or closed"
        },
        "milestone": {
          "type": "number",
          "description": "Milestone to associate this issue with.",
          "allow-null": true
        },
        "labels": {
          "type": "string[]",
          "description": "Array of strings - Labels to associate with this issue."
        },
        "assignees": {
          "type": "string[]",
          "description": "Logins for Users to assign to this issue. NOTE: Only users with push access can set assignees for new issues. Assignees are silently dropped otherwise."
        }
      },
      "description": "Edit an issue"
    },
    "lock": {
      "url": "/repos/:owner/:repo/issues/:number/lock",
      "method": "PUT",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "number": {
          "type": "number",
          "required": true
        }
      },
      "description": "Users with push access can lock an issue's conversation."
    },
    "unlock": {
      "url": "/repos/:owner/:repo/issues/:number/lock",
      "method": "DELETE",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "number": {
          "type": "number",
          "required": true
        }
      },
      "description": "Users with push access can unlock an issue's conversation."
    },
    "getAll": {
      "url": "/issues",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.squirrel-girl-preview"
      },
      "params": {
        "filter": {
          "type": "string",
          "enum": [
            "all",
            "assigned",
            "created",
            "mentioned",
            "subscribed"
          ],
          "default": "assigned",
          "description": "Which sort of issue to return."
        },
        "state": {
          "type": "string",
          "enum": [
            "open",
            "closed",
            "all"
          ],
          "default": "open",
          "description": "State of the issues to return."
        },
        "labels": {
          "type": "string",
          "description": "String list of comma separated label names. Example: bug,ui,@high"
        },
        "sort": {
          "type": "string",
          "enum": [
            "created",
            "updated",
            "comments"
          ],
          "default": "created"
        },
        "direction": {
          "type": "string",
          "enum": [
            "asc",
            "desc"
          ],
          "default": "desc"
        },
        "since": {
          "type": "date",
          "description": "Timestamp in ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ"
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List all issues across all the authenticated user's visible repositories including owned repositories, member repositories, and organization repositories"
    },
    "getForUser": {
      "url": "/user/issues",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.squirrel-girl-preview"
      },
      "params": {
        "filter": {
          "type": "string",
          "enum": [
            "all",
            "assigned",
            "created",
            "mentioned",
            "subscribed"
          ]
        },
        "state": {
          "type": "string",
          "enum": [
            "open",
            "closed",
            "all"
          ],
          "default": "open",
          "description": "open, closed, or all"
        },
        "labels": {
          "type": "string",
          "description": "String list of comma separated Label names. Example: bug,ui,@high"
        },
        "sort": {
          "type": "string",
          "enum": [
            "created",
            "updated",
            "comments"
          ],
          "default": "created"
        },
        "direction": {
          "type": "string",
          "enum": [
            "asc",
            "desc"
          ],
          "default": "desc"
        },
        "since": {
          "type": "date",
          "description": "Timestamp in ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ"
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List all issues across owned and member repositories for the authenticated user"
    },
    "getForOrg": {
      "url": "/orgs/:org/issues",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.squirrel-girl-preview"
      },
      "params": {
        "org": {
          "type": "string",
          "required": true
        },
        "filter": {
          "type": "string",
          "enum": [
            "all",
            "assigned",
            "created",
            "mentioned",
            "subscribed"
          ]
        },
        "state": {
          "type": "string",
          "enum": [
            "open",
            "closed",
            "all"
          ],
          "default": "open",
          "description": "open, closed, or all"
        },
        "labels": {
          "type": "string",
          "description": "String list of comma separated Label names. Example: bug,ui,@high"
        },
        "sort": {
          "type": "string",
          "enum": [
            "created",
            "updated",
            "comments"
          ],
          "default": "created"
        },
        "direction": {
          "type": "string",
          "enum": [
            "asc",
            "desc"
          ],
          "default": "desc"
        },
        "since": {
          "type": "date",
          "description": "Timestamp in ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ"
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List all issues for a given organization for the authenticated user"
    },
    "getForRepo": {
      "url": "/repos/:owner/:repo/issues",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.squirrel-girl-preview"
      },
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "milestone": {
          "type": "string",
          "validation": "^([0-9]+|none|\\*)$"
        },
        "state": {
          "type": "string",
          "enum": [
            "open",
            "closed",
            "all"
          ],
          "default": "open",
          "description": "open, closed, or all"
        },
        "assignee": {
          "type": "string",
          "description": "String User login, `none` for Issues with no assigned User. `*` for Issues with any assigned User."
        },
        "creator": {
          "type": "string",
          "description": "The user that created the issue."
        },
        "mentioned": {
          "type": "string",
          "description": "String User login."
        },
        "labels": {
          "type": "string",
          "description": "String list of comma separated Label names. Example: bug,ui,@high"
        },
        "sort": {
          "type": "string",
          "enum": [
            "created",
            "updated",
            "comments"
          ],
          "default": "created"
        },
        "direction": {
          "type": "string",
          "enum": [
            "asc",
            "desc"
          ],
          "default": "desc"
        },
        "since": {
          "type": "date",
          "description": "Timestamp in ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ"
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List issues for a repository"
    },
    "getAssignees": {
      "url": "/repos/:owner/:repo/assignees",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        }
      },
      "description": "List assignees"
    },
    "checkAssignee": {
      "url": "/repos/:owner/:repo/assignees/:assignee",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "assignee": {
          "type": "string",
          "required": true,
          "description": "Login for the user that this issue should be assigned to."
        }
      },
      "description": "Check assignee"
    },
    "addAssigneesToIssue": {
      "url": "/repos/:owner/:repo/issues/:number/assignees",
      "method": "POST",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "number": {
          "type": "number",
          "required": true
        },
        "assignees": {
          "type": "string[]",
          "required": true,
          "description": "Logins for the users that should be added to the issue."
        }
      },
      "description": "Add assignees to an issue."
    },
    "removeAssigneesFromIssue": {
      "url": "/repos/:owner/:repo/issues/:number/assignees",
      "method": "DELETE",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "number": {
          "type": "number",
          "required": true
        },
        "body": {
          "type": "json",
          "required": true
        }
      },
      "description": "Remove assignees from an issue."
    },
    "getComments": {
      "url": "/repos/:owner/:repo/issues/:number/comments",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.squirrel-girl-preview"
      },
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "number": {
          "type": "number",
          "required": true
        },
        "since": {
          "type": "date",
          "description": "Timestamp in ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ"
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List comments on an issue"
    },
    "getCommentsForRepo": {
      "url": "/repos/:owner/:repo/issues/comments",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.squirrel-girl-preview"
      },
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "sort": {
          "type": "string",
          "enum": [
            "created",
            "updated"
          ],
          "default": "created"
        },
        "direction": {
          "type": "string",
          "enum": [
            "asc",
            "desc"
          ],
          "default": "desc"
        },
        "since": {
          "type": "date",
          "description": "Timestamp in ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ"
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List comments in a repository"
    },
    "getComment": {
      "url": "/repos/:owner/:repo/issues/comments/:id",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.squirrel-girl-preview"
      },
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Get a single comment"
    },
    "createComment": {
      "url": "/repos/:owner/:repo/issues/:number/comments",
      "method": "POST",
      "headers": {
        "accept": "application/vnd.github.squirrel-girl-preview"
      },
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "number": {
          "type": "number",
          "required": true
        },
        "body": {
          "type": "string",
          "required": true
        }
      },
      "description": "Create a comment"
    },
    "editComment": {
      "url": "/repos/:owner/:repo/issues/comments/:id",
      "method": "PATCH",
      "headers": {
        "accept": "application/vnd.github.squirrel-girl-preview"
      },
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "id": {
          "type": "string",
          "required": true
        },
        "body": {
          "type": "string",
          "required": true
        }
      },
      "description": "Edit a comment"
    },
    "deleteComment": {
      "url": "/repos/:owner/:repo/issues/comments/:id",
      "method": "DELETE",
      "headers": {
        "accept": "application/vnd.github.squirrel-girl-preview"
      },
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Delete a comment"
    },
    "getEvents": {
      "url": "/repos/:owner/:repo/issues/:issue_number/events",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "issue_number": {
          "type": "number",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List events for an issue"
    },
    "getEventsForRepo": {
      "url": "/repos/:owner/:repo/issues/events",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List events for a repository"
    },
    "getEvent": {
      "url": "/repos/:owner/:repo/issues/events/:id",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Get a single event"
    },
    "getLabels": {
      "url": "/repos/:owner/:repo/labels",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List all labels for this repository"
    },
    "getLabel": {
      "url": "/repos/:owner/:repo/labels/:name",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "name": {
          "type": "string",
          "required": true
        }
      },
      "description": "Get a single label"
    },
    "createLabel": {
      "url": "/repos/:owner/:repo/labels",
      "method": "POST",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "name": {
          "type": "string",
          "required": true
        },
        "color": {
          "type": "string",
          "required": true,
          "description": "6 character hex code, without a leading #."
        }
      },
      "description": "Create a label"
    },
    "updateLabel": {
      "url": "/repos/:owner/:repo/labels/:oldname",
      "method": "PATCH",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "oldname": {
          "type": "string",
          "required": true,
          "description": "The old name of the label."
        },
        "name": {
          "type": "string",
          "required": true,
          "description": "The new name of the label."
        },
        "color": {
          "type": "string",
          "required": true,
          "description": "6 character hex code, without a leading #."
        }
      },
      "description": "Update a label"
    },
    "deleteLabel": {
      "url": "/repos/:owner/:repo/labels/:name",
      "method": "DELETE",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "name": {
          "type": "string",
          "required": true
        }
      },
      "description": "Delete a label"
    },
    "getIssueLabels": {
      "url": "/repos/:owner/:repo/issues/:number/labels",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "number": {
          "type": "number",
          "required": true
        }
      },
      "description": "List labels on an issue"
    },
    "addLabels": {
      "url": "/repos/:owner/:repo/issues/:number/labels",
      "method": "POST",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "number": {
          "type": "number",
          "required": true
        },
        "labels": {
          "type": "string[]",
          "required": true,
          "mapTo": "input"
        }
      },
      "description": "Add labels to an issue"
    },
    "removeLabel": {
      "url": "/repos/:owner/:repo/issues/:number/labels/:name",
      "method": "DELETE",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "number": {
          "type": "number",
          "required": true
        },
        "name": {
          "type": "string",
          "required": true
        }
      },
      "description": "Remove a label from an issue"
    },
    "replaceAllLabels": {
      "url": "/repos/:owner/:repo/issues/:number/labels",
      "method": "PUT",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "number": {
          "type": "number",
          "required": true
        },
        "labels": {
          "type": "string[]",
          "required": true,
          "mapTo": "input",
          "description": "Sending an empty array ([]) will remove all Labels from the Issue."
        }
      },
      "description": "Replace all labels for an issue"
    },
    "removeAllLabels": {
      "url": "/repos/:owner/:repo/issues/:number/labels",
      "method": "DELETE",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "number": {
          "type": "number",
          "required": true
        }
      },
      "description": "Remove all labels from an issue"
    },
    "getMilestoneLabels": {
      "url": "/repos/:owner/:repo/milestones/:number/labels",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "number": {
          "type": "number",
          "required": true
        }
      },
      "description": "Get labels for every issue in a milestone"
    },
    "getMilestones": {
      "url": "/repos/:owner/:repo/milestones",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "state": {
          "type": "string",
          "enum": [
            "open",
            "closed",
            "all"
          ],
          "default": "open"
        },
        "sort": {
          "type": "string",
          "enum": [
            "due_on",
            "completeness"
          ],
          "default": "due_on",
          "description": "due_on, completeness, default: due_on"
        },
        "direction": {
          "type": "string",
          "enum": [
            "asc",
            "desc"
          ],
          "default": "asc"
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List milestones for a repository"
    },
    "getMilestone": {
      "url": "/repos/:owner/:repo/milestones/:number",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "number": {
          "type": "number",
          "required": true
        }
      },
      "description": "Get a single milestone"
    },
    "createMilestone": {
      "url": "/repos/:owner/:repo/milestones",
      "method": "POST",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "title": {
          "type": "string",
          "required": true
        },
        "state": {
          "type": "string",
          "enum": [
            "open",
            "closed",
            "all"
          ],
          "default": "open"
        },
        "description": {
          "type": "string"
        },
        "due_on": {
          "type": "date",
          "description": "Timestamp in ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ"
        }
      },
      "description": "Create a milestone"
    },
    "updateMilestone": {
      "url": "/repos/:owner/:repo/milestones/:number",
      "method": "PATCH",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "number": {
          "type": "number",
          "required": true
        },
        "title": {
          "type": "string",
          "required": true
        },
        "state": {
          "type": "string",
          "enum": [
            "open",
            "closed",
            "all"
          ],
          "default": "open"
        },
        "description": {
          "type": "string"
        },
        "due_on": {
          "type": "date",
          "description": "Timestamp in ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ"
        }
      },
      "description": "Update a milestone"
    },
    "deleteMilestone": {
      "url": "/repos/:owner/:repo/milestones/:number",
      "method": "DELETE",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "number": {
          "type": "number",
          "required": true
        }
      },
      "description": "Delete a milestone"
    },
    "getEventsTimeline": {
      "url": "/repos/:owner/:repo/issues/:issue_number/timeline",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.mockingbird-preview"
      },
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "issue_number": {
          "type": "number",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List events for an issue. (In preview period. See README.)"
    }
  },
  "migrations": {
    "startMigration": {
      "url": "/orgs/:org/migrations",
      "method": "POST",
      "headers": {
        "accept": "application/vnd.github.wyandotte-preview+json"
      },
      "params": {
        "org": {
          "type": "string",
          "required": true
        },
        "repositories": {
          "type": "string[]",
          "required": true,
          "description": "A list of arrays indicating which repositories should be migrated."
        },
        "lock_repositories": {
          "type": "boolean",
          "default": "false",
          "description": "Indicates whether repositories should be locked (to prevent manipulation) while migrating data. Default: false."
        },
        "exclude_attachments": {
          "type": "boolean",
          "default": "false",
          "description": "Indicates whether attachments should be excluded from the migration (to reduce migration archive file size). Default: false."
        }
      },
      "description": "Start a migration. (In preview period. See README.)"
    },
    "getMigrations": {
      "url": "/orgs/:org/migrations",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.wyandotte-preview+json"
      },
      "params": {
        "org": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "Get a list of migrations. (In preview period. See README.)"
    },
    "getMigrationStatus": {
      "url": "/orgs/:org/migrations/:id",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.wyandotte-preview+json"
      },
      "params": {
        "org": {
          "type": "string",
          "required": true
        },
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Get the status of a migration. (In preview period. See README.)"
    },
    "getMigrationArchiveLink": {
      "url": "/orgs/:org/migrations/:id/archive",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.wyandotte-preview+json"
      },
      "params": {
        "org": {
          "type": "string",
          "required": true
        },
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Get the URL to a migration archive. (In preview period. See README.)"
    },
    "deleteMigrationArchive": {
      "url": "/orgs/:org/migrations/:id/archive",
      "method": "DELETE",
      "headers": {
        "accept": "application/vnd.github.wyandotte-preview+json"
      },
      "params": {
        "org": {
          "type": "string",
          "required": true
        },
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Delete a migration archive. (In preview period. See README.)"
    },
    "unlockRepoLockedForMigration": {
      "url": "/orgs/:org/migrations/:id/repos/:repo_name/lock",
      "method": "DELETE",
      "headers": {
        "accept": "application/vnd.github.wyandotte-preview+json"
      },
      "params": {
        "org": {
          "type": "string",
          "required": true
        },
        "id": {
          "type": "string",
          "required": true
        },
        "repo_name": {
          "type": "string",
          "required": true
        }
      },
      "description": "Unlock a repository that was locked for migration. (In preview period. See README.)"
    },
    "startImport": {
      "url": "/repos/:owner/:repo/import",
      "method": "PUT",
      "headers": {
        "accept": "application/vnd.github.barred-rock-preview"
      },
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "vcs_url": {
          "type": "string",
          "required": true,
          "description": "The URL of the originating repository."
        },
        "vcs": {
          "type": "string",
          "enum": [
            "subversion",
            "git",
            "mercurial",
            "tfvc"
          ],
          "description": "The originating VCS type. Please be aware that without this parameter, the import job will take additional time to detect the VCS type before beginning the import. This detection step will be reflected in the response."
        },
        "vcs_username": {
          "type": "string",
          "description": "If authentication is required, the username to provide to vcs_url."
        },
        "vcs_password": {
          "type": "string",
          "description": "If authentication is required, the password to provide to vcs_url."
        },
        "tfvc_project": {
          "type": "string",
          "description": "For a tfvc import, the name of the project that is being imported."
        }
      },
      "description": "Start an import. (In preview period. See README.)"
    },
    "getImportProgress": {
      "url": "/repos/:owner/:repo/import",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.barred-rock-preview"
      },
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        }
      },
      "description": "Get import progress. (In preview period. See README.)"
    },
    "updateImport": {
      "url": "/repos/:owner/:repo/import",
      "method": "PATCH",
      "headers": {
        "accept": "application/vnd.github.barred-rock-preview"
      },
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "vcs_username": {
          "type": "string",
          "description": "The username to provide to the originating repository."
        },
        "vcs_password": {
          "type": "string",
          "description": "The password to provide to the originating repository."
        }
      },
      "description": "Update existing import. (In preview period. See README.)"
    },
    "getImportCommitAuthors": {
      "url": "/repos/:owner/:repo/import/authors",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.barred-rock-preview"
      },
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "since": {
          "type": "string",
          "description": "Only authors found after this id are returned. Provide the highest author ID you've seen so far. New authors may be added to the list at any point while the importer is performing the raw step."
        }
      },
      "description": "Get import commit authors. (In preview period. See README.)"
    },
    "mapImportCommitAuthor": {
      "url": "/repos/:owner/:repo/import/authors/:author_id",
      "method": "PATCH",
      "headers": {
        "accept": "application/vnd.github.barred-rock-preview"
      },
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "author_id": {
          "type": "string",
          "required": true,
          "description": "The commit author id."
        },
        "email": {
          "type": "string",
          "description": "The new Git author email."
        },
        "name": {
          "type": "string",
          "description": "The new Git author name."
        }
      },
      "description": "Map a commit author. (In preview period. See README.)"
    },
    "setImportLfsPreference": {
      "url": "/:owner/:name/import/lfs",
      "method": "PATCH",
      "headers": {
        "accept": "application/vnd.github.barred-rock-preview"
      },
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "name": {
          "type": "string",
          "required": true
        },
        "use_lfs": {
          "type": "string",
          "required": true,
          "description": "Can be one of `opt_in` (large files will be stored using Git LFS) or `opt_out` (large files will be removed during the import)."
        }
      },
      "description": "Set import LFS preference. (In preview period. See README.)"
    },
    "getLargeImportFiles": {
      "url": "/:owner/:name/import/large_files",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.barred-rock-preview"
      },
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "name": {
          "type": "string",
          "required": true
        }
      },
      "description": "List files larger than 100MB found during the import. (In preview period. See README.)"
    },
    "cancelImport": {
      "url": "/repos/:owner/:repo/import",
      "method": "DELETE",
      "headers": {
        "accept": "application/vnd.github.barred-rock-preview"
      },
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        }
      },
      "description": "Cancel an import. (In preview period. See README.)"
    }
  },
  "misc": {
    "getCodesOfConduct": {
      "url": "/codes_of_conduct",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.scarlet-witch-preview+json"
      },
      "params": {},
      "description": "List all codes of conduct. (In preview period. See README.)"
    },
    "getCodeOfConduct": {
      "url": "/codes_of_conduct/:key",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.scarlet-witch-preview+json"
      },
      "params": {
        "key": {
          "type": "string",
          "required": true,
          "description": "Ex: contributor_covenant"
        }
      },
      "description": "Get an code of conduct. (In preview period. See README.)"
    },
    "getRepoCodeOfConduct": {
      "url": "/repos/:owner/:repo/community/code_of_conduct",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.scarlet-witch-preview+json"
      },
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        }
      },
      "description": "Get the contents of a repository's code of conduct. (In preview period. See README.)"
    },
    "getEmojis": {
      "url": "/emojis",
      "method": "GET",
      "params": {},
      "description": "Lists all the emojis available to use on GitHub."
    },
    "getGitignoreTemplates": {
      "url": "/gitignore/templates",
      "method": "GET",
      "params": {},
      "description": "Lists available gitignore templates"
    },
    "getGitignoreTemplate": {
      "url": "/gitignore/templates/:name",
      "method": "GET",
      "params": {
        "name": {
          "type": "string",
          "required": true,
          "description": "The name of the .gitignore template to get e.g. 'C'"
        }
      },
      "description": "Get a single gitignore template"
    },
    "getLicenses": {
      "url": "/licenses",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.drax-preview+json"
      },
      "params": {},
      "description": "List all licenses. (In preview period. See README.)"
    },
    "getLicense": {
      "url": "/licenses/:license",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.drax-preview+json"
      },
      "params": {
        "license": {
          "type": "string",
          "required": true,
          "description": "Ex: /licenses/mit"
        }
      },
      "description": "Get an individual license. (In preview period. See README.)"
    },
    "getRepoLicense": {
      "url": "/repos/:owner/:repo/license",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.drax-preview+json"
      },
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        }
      },
      "description": "Get the contents of a repository's license. (In preview period. See README.)"
    },
    "renderMarkdown": {
      "url": "/markdown",
      "method": "POST",
      "params": {
        "text": {
          "type": "string",
          "required": true,
          "description": "The Markdown text to render"
        },
        "mode": {
          "type": "string",
          "enum": [
            "markdown",
            "gfm"
          ],
          "default": "markdown",
          "description": "The rendering mode, `markdown` to render a document as plain Markdown, just like README files are rendered. `gfm` to render a document as user-content, e.g. like user comments or issues are rendered. In GFM mode, hard line breaks are always taken into account, and issue and user mentions are linked accordingly."
        },
        "context": {
          "type": "string",
          "description": "The repository context. Only taken into account when rendering as `gfm`"
        }
      },
      "description": "Render an arbitrary Markdown document"
    },
    "renderMarkdownRaw": {
      "url": "/markdown/raw",
      "method": "POST",
      "headers": {
        "content-type": "text/plain; charset=utf-8"
      },
      "params": {
        "data": {
          "type": "string",
          "required": true,
          "mapTo": "input",
          "description": "Raw data to send as the body of the request"
        }
      },
      "description": "Render a Markdown document in raw mode"
    },
    "getMeta": {
      "url": "/meta",
      "method": "GET",
      "params": {},
      "description": "This endpoint provides information about GitHub.com, the service. Or, if you access this endpoint on your organization's GitHub Enterprise installation, this endpoint provides information about that installation."
    },
    "getRateLimit": {
      "url": "/rate_limit",
      "method": "GET",
      "params": {},
      "description": "Get your current rate limit status"
    }
  },
  "orgs": {
    "get": {
      "url": "/orgs/:org",
      "method": "GET",
      "params": {
        "org": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "Get an organization"
    },
    "update": {
      "url": "/orgs/:org",
      "method": "PATCH",
      "params": {
        "org": {
          "type": "string",
          "required": true
        },
        "billing_email": {
          "type": "string",
          "description": "Billing email address. This address is not publicized."
        },
        "company": {
          "type": "string",
          "description": "The company name."
        },
        "email": {
          "type": "string",
          "description": "The publicly visible email address."
        },
        "location": {
          "type": "string",
          "description": "The location."
        },
        "name": {
          "type": "string",
          "description": "The shorthand name of the company."
        },
        "description": {
          "type": "string",
          "description": "The description of the company."
        },
        "default_repository_permission": {
          "type": "string",
          "enum": [
            "read",
            "write",
            "admin",
            "none"
          ],
          "default": "read",
          "description": "Default permission level members have for organization repositories."
        },
        "members_can_create_repositories": {
          "type": "boolean",
          "default": true,
          "description": "Toggles ability of non-admin organization members to create repositories."
        }
      },
      "description": "Edit an organization"
    },
    "getAll": {
      "url": "/organizations",
      "method": "GET",
      "params": {
        "since": {
          "type": "string",
          "description": "The integer ID of the last Organization that you've seen."
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List all organizations"
    },
    "getForUser": {
      "url": "/users/:username/orgs",
      "method": "GET",
      "params": {
        "username": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List public organization memberships for the specified user."
    },
    "getMembers": {
      "url": "/orgs/:org/members",
      "method": "GET",
      "params": {
        "org": {
          "type": "string",
          "required": true
        },
        "filter": {
          "type": "string",
          "enum": [
            "all",
            "2fa_disabled"
          ],
          "default": "all",
          "description": "Filter members returned in the list."
        },
        "role": {
          "type": "string",
          "enum": [
            "all",
            "admin",
            "member"
          ],
          "default": "all",
          "description": "Filter members returned by their role."
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "Members list"
    },
    "checkMembership": {
      "url": "/orgs/:org/members/:username",
      "method": "GET",
      "params": {
        "org": {
          "type": "string",
          "required": true
        },
        "username": {
          "type": "string",
          "required": true
        }
      },
      "description": "Check membership"
    },
    "removeMember": {
      "url": "/orgs/:org/members/:username",
      "method": "DELETE",
      "params": {
        "org": {
          "type": "string",
          "required": true
        },
        "username": {
          "type": "string",
          "required": true
        }
      },
      "description": "Remove a member"
    },
    "getPublicMembers": {
      "url": "/orgs/:org/public_members",
      "method": "GET",
      "params": {
        "org": {
          "type": "string",
          "required": true
        }
      },
      "description": "Public members list"
    },
    "checkPublicMembership": {
      "url": "/orgs/:org/public_members/:username",
      "method": "GET",
      "params": {
        "org": {
          "type": "string",
          "required": true
        },
        "username": {
          "type": "string",
          "required": true
        }
      },
      "description": "Check public membership"
    },
    "publicizeMembership": {
      "url": "/orgs/:org/public_members/:username",
      "method": "PUT",
      "params": {
        "org": {
          "type": "string",
          "required": true
        },
        "username": {
          "type": "string",
          "required": true
        }
      },
      "description": "Publicize a user's membership"
    },
    "concealMembership": {
      "url": "/orgs/:org/public_members/:username",
      "method": "DELETE",
      "params": {
        "org": {
          "type": "string",
          "required": true
        },
        "username": {
          "type": "string",
          "required": true
        }
      },
      "description": "Conceal a user's membership"
    },
    "getOrgMembership": {
      "url": "/orgs/:org/memberships/:username",
      "method": "GET",
      "params": {
        "org": {
          "type": "string",
          "required": true
        },
        "username": {
          "type": "string",
          "required": true
        }
      },
      "description": "Get organization membership"
    },
    "addOrgMembership": {
      "url": "/orgs/:org/memberships/:username",
      "method": "PUT",
      "params": {
        "org": {
          "type": "string",
          "required": true
        },
        "username": {
          "type": "string",
          "required": true
        },
        "role": {
          "type": "string",
          "required": true,
          "enum": [
            "admin",
            "member"
          ],
          "default": "member",
          "description": "The role to give the user in the organization."
        }
      },
      "description": "Add or update organization membership"
    },
    "removeOrgMembership": {
      "url": "/orgs/:org/memberships/:username",
      "method": "DELETE",
      "params": {
        "org": {
          "type": "string",
          "required": true
        },
        "username": {
          "type": "string",
          "required": true
        }
      },
      "description": "Remove organization membership"
    },
    "getPendingOrgInvites": {
      "url": "/orgs/:org/invitations",
      "method": "GET",
      "params": {
        "org": {
          "type": "string",
          "required": true
        }
      },
      "description": "List pending organization invites."
    },
    "getOutsideCollaborators": {
      "url": "/orgs/:org/outside_collaborators",
      "method": "GET",
      "params": {
        "org": {
          "type": "string",
          "required": true
        },
        "filter": {
          "type": "string",
          "enum": [
            "all",
            "2fa_disabled"
          ],
          "default": "all",
          "description": "Filter the list of outside collaborators."
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List all users who are outside collaborators of an organization."
    },
    "removeOutsideCollaborator": {
      "url": "/orgs/:org/outside_collaborators/:username",
      "method": "DELETE",
      "params": {
        "org": {
          "type": "string",
          "required": true
        },
        "username": {
          "type": "string",
          "required": true
        }
      },
      "description": "Remove outside collaborator."
    },
    "convertMemberToOutsideCollaborator": {
      "url": "/orgs/:org/outside_collaborators/:username",
      "method": "PUT",
      "params": {
        "org": {
          "type": "string",
          "required": true
        },
        "username": {
          "type": "string",
          "required": true
        }
      },
      "description": "Convert member to outside collaborator."
    },
    "getTeams": {
      "url": "/orgs/:org/teams",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.hellcat-preview+json"
      },
      "params": {
        "org": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List teams"
    },
    "getTeam": {
      "url": "/teams/:id",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.hellcat-preview+json"
      },
      "params": {
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Get team"
    },
    "createTeam": {
      "url": "/orgs/:org/teams",
      "method": "POST",
      "headers": {
        "accept": "application/vnd.github.hellcat-preview+json"
      },
      "params": {
        "org": {
          "type": "string",
          "required": true
        },
        "name": {
          "type": "string",
          "required": true
        },
        "description": {
          "type": "string",
          "description": "The description of the team."
        },
        "maintainers": {
          "type": "string[]",
          "description": "The logins of organization members to add as maintainers of the team."
        },
        "repo_names": {
          "type": "string[]",
          "description": "The full name (e.g., \"organization-name/repository-name\") of repositories to add the team to."
        },
        "privacy": {
          "type": "string",
          "enum": [
            "secret",
            "closed"
          ],
          "default": "secret",
          "description": "The level of privacy this team should have."
        },
        "parent_team_id": {
          "type": "number",
          "description": "The ID of a team to set as the parent team."
        }
      },
      "description": "Create team"
    },
    "editTeam": {
      "url": "/teams/:id",
      "method": "PATCH",
      "headers": {
        "accept": "application/vnd.github.hellcat-preview+json"
      },
      "params": {
        "id": {
          "type": "string",
          "required": true
        },
        "name": {
          "type": "string",
          "required": true
        },
        "description": {
          "type": "string",
          "description": "The description of the team."
        },
        "privacy": {
          "type": "string",
          "enum": [
            "secret",
            "closed"
          ],
          "default": "secret",
          "description": "The level of privacy this team should have."
        },
        "parent_team_id": {
          "type": "number",
          "description": "The ID of a team to set as the parent team."
        }
      },
      "description": "Edit team"
    },
    "deleteTeam": {
      "url": "/teams/:id",
      "method": "DELETE",
      "headers": {
        "accept": "application/vnd.github.hellcat-preview+json"
      },
      "params": {
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Delete team"
    },
    "getTeamMembers": {
      "url": "/teams/:id/members",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.hellcat-preview+json"
      },
      "params": {
        "id": {
          "type": "string",
          "required": true
        },
        "role": {
          "type": "string",
          "enum": [
            "member",
            "maintainer",
            "all"
          ],
          "default": "all",
          "description": "Filters members returned by their role in the team."
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List team members"
    },
    "getChildTeams": {
      "url": "/teams/:id/teams",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.hellcat-preview+json"
      },
      "params": {
        "id": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List child teams"
    },
    "getTeamMembership": {
      "url": "/teams/:id/memberships/:username",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.hellcat-preview+json"
      },
      "params": {
        "id": {
          "type": "string",
          "required": true
        },
        "username": {
          "type": "string",
          "required": true
        }
      },
      "description": "Get team membership"
    },
    "addTeamMembership": {
      "url": "/teams/:id/memberships/:username",
      "method": "PUT",
      "headers": {
        "accept": "application/vnd.github.hellcat-preview+json"
      },
      "params": {
        "id": {
          "type": "string",
          "required": true
        },
        "username": {
          "type": "string",
          "required": true
        },
        "role": {
          "type": "string",
          "enum": [
            "member",
            "maintainer"
          ],
          "default": "member",
          "description": "The role that this user should have in the team."
        }
      },
      "description": "Add team membership"
    },
    "removeTeamMembership": {
      "url": "/teams/:id/memberships/:username",
      "method": "DELETE",
      "headers": {
        "accept": "application/vnd.github.hellcat-preview+json"
      },
      "params": {
        "id": {
          "type": "string",
          "required": true
        },
        "username": {
          "type": "string",
          "required": true
        }
      },
      "description": "Remove team membership"
    },
    "getTeamRepos": {
      "url": "/teams/:id/repos",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.hellcat-preview+json"
      },
      "params": {
        "id": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "Get team repos"
    },
    "getPendingTeamInvites": {
      "url": "/teams/:id/invitations",
      "method": "GET",
      "params": {
        "id": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List pending team invitations."
    },
    "checkTeamRepo": {
      "url": "/teams/:id/repos/:owner/:repo",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.hellcat-preview+json"
      },
      "params": {
        "id": {
          "type": "string",
          "required": true
        },
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        }
      },
      "description": "Check if a team manages a repository"
    },
    "addTeamRepo": {
      "url": "/teams/:id/repos/:org/:repo",
      "method": "PUT",
      "headers": {
        "accept": "application/vnd.github.hellcat-preview+json"
      },
      "params": {
        "id": {
          "type": "string",
          "required": true
        },
        "org": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "permission": {
          "type": "string",
          "enum": [
            "pull",
            "push",
            "admin"
          ],
          "description": "`pull` - team members can pull, but not push or administer this repository, `push` - team members can pull and push, but not administer this repository, `admin` - team members can pull, push and administer this repository."
        }
      },
      "description": "Add team repository"
    },
    "deleteTeamRepo": {
      "url": "/teams/:id/repos/:owner/:repo",
      "method": "DELETE",
      "headers": {
        "accept": "application/vnd.github.hellcat-preview+json"
      },
      "params": {
        "id": {
          "type": "string",
          "required": true
        },
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        }
      },
      "description": "Remove team repository"
    },
    "getHooks": {
      "url": "/orgs/:org/hooks",
      "method": "GET",
      "params": {
        "org": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List hooks"
    },
    "getHook": {
      "url": "/orgs/:org/hooks/:id",
      "method": "GET",
      "params": {
        "org": {
          "type": "string",
          "required": true
        },
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Get single hook"
    },
    "createHook": {
      "url": "/orgs/:org/hooks",
      "method": "POST",
      "params": {
        "org": {
          "type": "string",
          "required": true
        },
        "name": {
          "type": "string",
          "required": true,
          "description": "Must be passed as \"web\"."
        },
        "config": {
          "type": "json",
          "required": true,
          "description": "Key/value pairs to provide settings for this webhook"
        },
        "events": {
          "type": "string[]",
          "default": "[\"push\"]",
          "description": "Determines what events the hook is triggered for. Default: [\"push\"]."
        },
        "active": {
          "type": "boolean",
          "description": "Determines whether the hook is actually triggered on pushes."
        }
      },
      "description": "Create a hook"
    },
    "editHook": {
      "url": "/orgs/:org/hooks/:id",
      "method": "PATCH",
      "params": {
        "org": {
          "type": "string",
          "required": true
        },
        "id": {
          "type": "string",
          "required": true
        },
        "config": {
          "type": "json",
          "required": true,
          "description": "Key/value pairs to provide settings for this webhook"
        },
        "events": {
          "type": "string[]",
          "default": "[\"push\"]",
          "description": "Determines what events the hook is triggered for. Default: [\"push\"]."
        },
        "active": {
          "type": "boolean",
          "description": "Determines whether the hook is actually triggered on pushes."
        }
      },
      "description": "Edit a hook"
    },
    "pingHook": {
      "url": "/orgs/:org/hooks/:id/pings",
      "method": "POST",
      "params": {
        "org": {
          "type": "string",
          "required": true
        },
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Ping a hook"
    },
    "deleteHook": {
      "url": "/orgs/:org/hooks/:id",
      "method": "DELETE",
      "params": {
        "org": {
          "type": "string",
          "required": true
        },
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Delete a hook"
    },
    "getBlockedUsers": {
      "url": "/orgs/:org/blocks",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.giant-sentry-fist-preview+json"
      },
      "params": {
        "org": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List blocked users. (In preview period. See README.)"
    },
    "checkBlockedUser": {
      "url": "/orgs/:org/blocks/:username",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.giant-sentry-fist-preview+json"
      },
      "params": {
        "org": {
          "type": "string",
          "required": true
        },
        "username": {
          "type": "string",
          "required": true
        }
      },
      "description": "Check whether you've blocked a user. (In preview period. See README.)"
    },
    "blockUser": {
      "url": "/orgs/:org/blocks/:username",
      "method": "PUT",
      "headers": {
        "accept": "application/vnd.github.giant-sentry-fist-preview+json"
      },
      "params": {
        "org": {
          "type": "string",
          "required": true
        },
        "username": {
          "type": "string",
          "required": true
        }
      },
      "description": "Block a user. (In preview period. See README.)"
    },
    "unblockUser": {
      "url": "/orgs/:org/blocks/:username",
      "method": "DELETE",
      "headers": {
        "accept": "application/vnd.github.giant-sentry-fist-preview+json"
      },
      "params": {
        "org": {
          "type": "string",
          "required": true
        },
        "username": {
          "type": "string",
          "required": true
        }
      },
      "description": "Unblock a user. (In preview period. See README.)"
    }
  },
  "projects": {
    "getRepoProjects": {
      "url": "/repos/:owner/:repo/projects",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.inertia-preview+json"
      },
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "state": {
          "type": "string",
          "enum": [
            "open",
            "closed",
            "all"
          ],
          "default": "open"
        }
      },
      "description": "List repository projects. (In preview period. See README.)"
    },
    "getOrgProjects": {
      "url": "/orgs/:org/projects",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.inertia-preview+json"
      },
      "params": {
        "org": {
          "type": "string",
          "required": true
        },
        "state": {
          "type": "string",
          "enum": [
            "open",
            "closed",
            "all"
          ],
          "default": "open"
        }
      },
      "description": "List organization projects. (In preview period. See README.)"
    },
    "getProject": {
      "url": "/projects/:id",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.inertia-preview+json"
      },
      "params": {
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Get a project. (In preview period. See README.)"
    },
    "createRepoProject": {
      "url": "/repos/:owner/:repo/projects",
      "method": "POST",
      "headers": {
        "accept": "application/vnd.github.inertia-preview+json"
      },
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "name": {
          "type": "string",
          "required": true
        },
        "body": {
          "type": "string"
        }
      },
      "description": "Create a repository project. (In preview period. See README.)"
    },
    "createOrgProject": {
      "url": "/orgs/:org/projects",
      "method": "POST",
      "headers": {
        "accept": "application/vnd.github.inertia-preview+json"
      },
      "params": {
        "org": {
          "type": "string",
          "required": true
        },
        "name": {
          "type": "string",
          "required": true
        },
        "body": {
          "type": "string"
        }
      },
      "description": "Create an organization project. (In preview period. See README.)"
    },
    "updateProject": {
      "url": "/projects/:id",
      "method": "PATCH",
      "headers": {
        "accept": "application/vnd.github.inertia-preview+json"
      },
      "params": {
        "id": {
          "type": "string",
          "required": true
        },
        "name": {
          "type": "string",
          "required": true
        },
        "body": {
          "type": "string"
        },
        "state": {
          "type": "string",
          "enum": [
            "open",
            "closed",
            "all"
          ],
          "default": "open"
        }
      },
      "description": "Update a project. (In preview period. See README.)"
    },
    "deleteProject": {
      "url": "/projects/:id",
      "method": "DELETE",
      "headers": {
        "accept": "application/vnd.github.inertia-preview+json"
      },
      "params": {
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Delete a project. (In preview period. See README.)"
    },
    "getProjectCards": {
      "url": "/projects/columns/:column_id/cards",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.inertia-preview+json"
      },
      "params": {
        "column_id": {
          "type": "string",
          "required": true
        }
      },
      "description": "List project cards. (In preview period. See README.)"
    },
    "getProjectCard": {
      "url": "/projects/columns/cards/:id",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.inertia-preview+json"
      },
      "params": {
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Get project card. (In preview period. See README.)"
    },
    "createProjectCard": {
      "url": "/projects/columns/:column_id/cards",
      "method": "POST",
      "headers": {
        "accept": "application/vnd.github.inertia-preview+json"
      },
      "params": {
        "column_id": {
          "type": "string",
          "required": true
        },
        "note": {
          "type": "string",
          "description": "The note of the card."
        },
        "content_id": {
          "type": "string",
          "description": "The id of the Issue or Pull Request to associate with this card."
        },
        "content_type": {
          "type": "string",
          "description": "The type of content to associate with this card. Can be either 'Issue' or 'PullRequest'."
        }
      },
      "description": "Create a project card. (In preview period. See README.)"
    },
    "updateProjectCard": {
      "url": "/projects/columns/cards/:id",
      "method": "PATCH",
      "headers": {
        "accept": "application/vnd.github.inertia-preview+json"
      },
      "params": {
        "id": {
          "type": "string",
          "required": true
        },
        "note": {
          "type": "string",
          "description": "The note of the card."
        }
      },
      "description": "Update a project card. (In preview period. See README.)"
    },
    "deleteProjectCard": {
      "url": "/projects/columns/cards/:id",
      "method": "DELETE",
      "headers": {
        "accept": "application/vnd.github.inertia-preview+json"
      },
      "params": {
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Delete a project card. (In preview period. See README.)"
    },
    "moveProjectCard": {
      "url": "/projects/columns/cards/:id/moves",
      "method": "POST",
      "headers": {
        "accept": "application/vnd.github.inertia-preview+json"
      },
      "params": {
        "id": {
          "type": "string",
          "required": true
        },
        "position": {
          "type": "string",
          "required": true,
          "validation": "^(top|bottom|after:\\d+)$",
          "description": "Can be one of top, bottom, or after:<card-id>, where <card-id> is the id value of a card in the same project."
        },
        "column_id": {
          "type": "string",
          "description": "The id value of a column in the same project."
        }
      },
      "description": "Move a project card. (In preview period. See README.)"
    },
    "getProjectColumns": {
      "url": "/projects/:project_id/columns",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.inertia-preview+json"
      },
      "params": {
        "project_id": {
          "type": "string",
          "required": true
        }
      },
      "description": "List project columns. (In preview period. See README.)"
    },
    "getProjectColumn": {
      "url": "/projects/columns/:id",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.inertia-preview+json"
      },
      "params": {
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Get a project column. (In preview period. See README.)"
    },
    "createProjectColumn": {
      "url": "/projects/:project_id/columns",
      "method": "POST",
      "headers": {
        "accept": "application/vnd.github.inertia-preview+json"
      },
      "params": {
        "project_id": {
          "type": "string",
          "required": true
        },
        "name": {
          "type": "string",
          "required": true
        }
      },
      "description": "Create a project column. (In preview period. See README.)"
    },
    "updateProjectColumn": {
      "url": "/projects/columns/:id",
      "method": "PATCH",
      "headers": {
        "accept": "application/vnd.github.inertia-preview+json"
      },
      "params": {
        "id": {
          "type": "string",
          "required": true
        },
        "name": {
          "type": "string",
          "required": true
        }
      },
      "description": "Update a project column. (In preview period. See README.)"
    },
    "deleteProjectColumn": {
      "url": "/projects/columns/:id",
      "method": "DELETE",
      "headers": {
        "accept": "application/vnd.github.inertia-preview+json"
      },
      "params": {
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Delete a project column. (In preview period. See README.)"
    },
    "moveProjectColumn": {
      "url": "/projects/columns/:id/moves",
      "method": "POST",
      "headers": {
        "accept": "application/vnd.github.inertia-preview+json"
      },
      "params": {
        "id": {
          "type": "string",
          "required": true
        },
        "position": {
          "type": "string",
          "required": true,
          "validation": "^(first|last|after:\\d+)$",
          "description": "Can be one of first, last, or after:<column-id>, where <column-id> is the id value of a column in the same project."
        }
      },
      "description": "Move a project column. (In preview period. See README.)"
    }
  },
  "pullRequests": {
    "get": {
      "url": "/repos/:owner/:repo/pulls/:number",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "number": {
          "type": "number",
          "required": true
        }
      },
      "description": "Get a single pull request"
    },
    "create": {
      "url": "/repos/:owner/:repo/pulls",
      "method": "POST",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "head": {
          "type": "string",
          "required": true,
          "description": "The branch (or git ref) where your changes are implemented."
        },
        "base": {
          "type": "string",
          "required": true,
          "description": "The branch (or git ref) you want your changes pulled into. This should be an existing branch on the current repository. You cannot submit a pull request to one repo that requests a merge to a base of another repo."
        },
	"title": {
	  "type": "string",
	  "required": true,
	  "description": "The title of the pull request."
	},
	"body": {
	  "type": "string",
	  "description": "The contents of the pull request."
	},
	"maintainer_can_modify": {
	  "type": "boolean",
	  "description": "Indicates whether maintainers can modify the pull request."
	}
      },
      "description": "Create a pull request"
    },
    "update": {
      "url": "/repos/:owner/:repo/pulls/:number",
      "method": "PATCH",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "number": {
          "type": "number",
          "required": true
        },
        "title": {
          "type": "string",
          "description": "The title of the pull request."
        },
        "body": {
          "type": "string",
          "description": "The contents of the pull request."
        },
        "state": {
          "type": "string",
          "enum": [
            "open",
            "closed"
          ],
          "description": "open or closed"
        },
        "base": {
          "type": "string",
          "description": "The branch (or git ref) you want your changes pulled into. This should be an existing branch on the current repository. You cannot submit a pull request to one repo that requests a merge to a base of another repo."
        },
        "maintainer_can_modify": {
          "type": "boolean",
          "default": "true",
          "description": "Indicates whether maintainers can modify the pull request."
        }
      },
      "description": "Update a pull request"
    },
    "merge": {
      "url": "/repos/:owner/:repo/pulls/:number/merge",
      "method": "PUT",
      "headers": {
        "accept": "application/vnd.github.polaris-preview"
      },
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "number": {
          "type": "number",
          "required": true
        },
        "commit_title": {
          "type": "string",
          "description": "Title for the automatic commit message. (In preview period. See README.)"
        },
        "commit_message": {
          "type": "string",
          "description": "Extra detail to append to automatic commit message."
        },
        "sha": {
          "type": "string",
          "description": "SHA that pull request head must match to allow merge"
        },
        "merge_method": {
          "type": "string",
          "enum": [
            "merge",
            "squash",
            "rebase"
          ],
          "default": "merge",
          "description": "Merge method to use. Possible values are `merge`, `squash`, or `rebase`. (In preview period. See README.)"
        }
      },
      "description": "Merge a pull request (Merge Button)"
    },
    "getAll": {
      "url": "/repos/:owner/:repo/pulls",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "state": {
          "type": "string",
          "enum": [
            "open",
            "closed",
            "all"
          ],
          "default": "open"
        },
        "head": {
          "type": "string",
          "description": "Filter pulls by head user and branch name in the format of user:ref-name. Example: github:new-script-format."
        },
        "base": {
          "type": "string",
          "description": "Filter pulls by base branch name. Example: gh-pages."
        },
        "sort": {
          "type": "string",
          "enum": [
            "created",
            "updated",
            "popularity",
            "long-running"
          ],
          "default": "created",
          "description": "Possible values are: `created`, `updated`, `popularity`, `long-running`, Default: `created`"
        },
        "direction": {
          "type": "string",
          "enum": [
            "asc",
            "desc"
          ],
          "default": "desc"
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List pull requests"
    },
    "createFromIssue": {
      "url": "/repos/:owner/:repo/pulls",
      "method": "POST",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "issue": {
          "type": "number",
          "required": true,
          "description": "The issue number in this repository to turn into a Pull Request."
        },
        "head": {
          "type": "string",
          "required": true,
          "description": "The branch (or git ref) where your changes are implemented."
        },
        "base": {
          "type": "string",
          "required": true,
          "description": "The branch (or git ref) you want your changes pulled into. This should be an existing branch on the current repository. You cannot submit a pull request to one repo that requests a merge to a base of another repo."
        }
      },
      "description": "Create a pull request from an existing issue"
    },
    "getCommits": {
      "url": "/repos/:owner/:repo/pulls/:number/commits",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "number": {
          "type": "number",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List commits on a pull request"
    },
    "getFiles": {
      "url": "/repos/:owner/:repo/pulls/:number/files",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "number": {
          "type": "number",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List pull requests files"
    },
    "checkMerged": {
      "url": "/repos/:owner/:repo/pulls/:number/merge",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.polaris-preview"
      },
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "number": {
          "type": "number",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "Get if a pull request has been merged"
    },
    "getReviews": {
      "url": "/repos/:owner/:repo/pulls/:number/reviews",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "number": {
          "type": "number",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List reviews on a pull request."
    },
    "getReview": {
      "url": "/repos/:owner/:repo/pulls/:number/reviews/:id",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "number": {
          "type": "number",
          "required": true
        },
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Get a single pull request review."
    },
    "deletePendingReview": {
      "url": "/repos/:owner/:repo/pulls/:number/reviews/:id",
      "method": "DELETE",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "number": {
          "type": "number",
          "required": true
        },
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Delete a pending pull request review."
    },
    "getReviewComments": {
      "url": "/repos/:owner/:repo/pulls/:number/reviews/:id/comments",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "number": {
          "type": "number",
          "required": true
        },
        "id": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "Get comments for a pull request review."
    },
    "createReview": {
      "url": "/repos/:owner/:repo/pulls/:number/reviews",
      "method": "POST",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "number": {
          "type": "number",
          "required": true
        },
        "commit_id": {
          "type": "string",
          "description": "Sha of the commit to comment on."
        },
        "body": {
          "type": "string",
          "description": "The body text of the pull request review."
        },
        "event": {
          "type": "string",
          "enum": [
            "APPROVE",
            "REQUEST_CHANGES",
            "COMMENT",
            "PENDING"
          ],
          "default": "PENDING",
          "description": "The event to perform on the review upon submission, can be one of APPROVE, REQUEST_CHANGES, or COMMENT. If left blank, the review will be in the PENDING state."
        },
        "comments": {
          "type": "string[]",
          "description": "An array of draft review comment objects. Draft review comments must include a `path`, `position`, and `body`."
        }
      },
      "description": "Create a pull request review."
    },
    "submitReview": {
      "url": "/repos/:owner/:repo/pulls/:number/reviews/:id/events",
      "method": "POST",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "number": {
          "type": "number",
          "required": true
        },
        "id": {
          "type": "string",
          "required": true
        },
        "body": {
          "type": "string",
          "description": "The body text of the pull request review."
        },
        "event": {
          "type": "string",
          "enum": [
            "APPROVE",
            "REQUEST_CHANGES",
            "COMMENT",
            "PENDING"
          ],
          "default": "PENDING",
          "description": "The event to perform on the review upon submission, can be one of APPROVE, REQUEST_CHANGES, or COMMENT. If left blank, the review will be in the PENDING state."
        }
      },
      "description": "Submit a pull request review."
    },
    "dismissReview": {
      "url": "/repos/:owner/:repo/pulls/:number/reviews/:id/dismissals",
      "method": "PUT",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "number": {
          "type": "number",
          "required": true
        },
        "id": {
          "type": "string",
          "required": true
        },
        "message": {
          "type": "string",
          "description": "The message for the pull request review dismissal."
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "Dismiss a pull request review."
    },
    "getComments": {
      "url": "/repos/:owner/:repo/pulls/:number/comments",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.squirrel-girl-preview"
      },
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "number": {
          "type": "number",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List comments on a pull request"
    },
    "getCommentsForRepo": {
      "url": "/repos/:owner/:repo/pulls/comments",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.squirrel-girl-preview"
      },
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "sort": {
          "type": "string",
          "enum": [
            "created",
            "updated"
          ],
          "default": "created",
          "description": "Possible values are: `created`, `updated`, Default: `created`"
        },
        "direction": {
          "type": "string",
          "enum": [
            "asc",
            "desc"
          ],
          "default": "desc"
        },
        "since": {
          "type": "date",
          "description": "Timestamp in ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ"
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List comments in a repository"
    },
    "getComment": {
      "url": "/repos/:owner/:repo/pulls/comments/:id",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.squirrel-girl-preview"
      },
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Get a single comment"
    },
    "createComment": {
      "url": "/repos/:owner/:repo/pulls/:number/comments",
      "method": "POST",
      "headers": {
        "accept": "application/vnd.github.squirrel-girl-preview"
      },
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "number": {
          "type": "number",
          "required": true
        },
        "body": {
          "type": "string",
          "required": true
        },
        "commit_id": {
          "type": "string",
          "required": true
        },
        "path": {
          "type": "string",
          "required": true
        },
        "position": {
          "type": "number",
          "required": true
        }
      },
      "description": "Create a comment"
    },
    "createCommentReply": {
      "url": "/repos/:owner/:repo/pulls/:number/comments",
      "method": "POST",
      "headers": {
        "accept": "application/vnd.github.squirrel-girl-preview"
      },
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "number": {
          "type": "number",
          "required": true
        },
        "body": {
          "type": "string",
          "required": true
        },
        "in_reply_to": {
          "type": "number",
          "required": true,
          "description": "The comment id to reply to."
        }
      },
      "description": "Reply to existing pull request comment"
    },
    "editComment": {
      "url": "/repos/:owner/:repo/pulls/comments/:id",
      "method": "PATCH",
      "headers": {
        "accept": "application/vnd.github.squirrel-girl-preview"
      },
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "id": {
          "type": "string",
          "required": true
        },
        "body": {
          "type": "string",
          "required": true
        }
      },
      "description": "Edit a comment"
    },
    "deleteComment": {
      "url": "/repos/:owner/:repo/pulls/comments/:id",
      "method": "DELETE",
      "headers": {
        "accept": "application/vnd.github.squirrel-girl-preview"
      },
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Delete a comment"
    },
    "getReviewRequests": {
      "url": "/repos/:owner/:repo/pulls/:number/requested_reviewers",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.thor-preview+json"
      },
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "number": {
          "type": "number",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List review requests. (In preview period. See README.)"
    },
    "createReviewRequest": {
      "url": "/repos/:owner/:repo/pulls/:number/requested_reviewers",
      "method": "POST",
      "headers": {
        "accept": "application/vnd.github.thor-preview+json"
      },
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "number": {
          "type": "number",
          "required": true
        },
        "reviewers": {
          "type": "string[]",
          "description": "An array of user logins that will be requested."
        },
        "team_reviewers": {
          "type": "string[]",
          "description": "An array of team slugs that will be requested."
        }
      },
      "description": "Create a review request. (In preview period. See README.)"
    },
    "deleteReviewRequest": {
      "url": "/repos/:owner/:repo/pulls/:number/requested_reviewers",
      "method": "DELETE",
      "headers": {
        "accept": "application/vnd.github.thor-preview+json"
      },
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "number": {
          "type": "number",
          "required": true
        },
        "reviewers": {
          "type": "string[]",
          "description": "An array of user logins that will be requested."
        },
        "team_reviewers": {
          "type": "string[]",
          "description": "An array of team slugs that will be requested."
        }
      },
      "description": "Delete a review request. (In preview period. See README.)"
    }
  },
  "reactions": {
    "delete": {
      "url": "/reactions/:id",
      "method": "DELETE",
      "headers": {
        "accept": "application/vnd.github.squirrel-girl-preview"
      },
      "params": {
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Delete a reaction. (In preview period. See README.)"
    },
    "getForCommitComment": {
      "url": "/repos/:owner/:repo/comments/:id/reactions",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.squirrel-girl-preview"
      },
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "id": {
          "type": "string",
          "required": true
        },
        "content": {
          "type": "string",
          "enum": [
            "+1",
            "-1",
            "laugh",
            "confused",
            "heart",
            "hooray"
          ],
          "description": "Indicates which type of reaction to return."
        }
      },
      "description": "List reactions for a commit comment. (In preview period. See README.)"
    },
    "createForCommitComment": {
      "url": "/repos/:owner/:repo/comments/:id/reactions",
      "method": "POST",
      "headers": {
        "accept": "application/vnd.github.squirrel-girl-preview"
      },
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "id": {
          "type": "string",
          "required": true
        },
        "content": {
          "type": "string",
          "required": true,
          "enum": [
            "+1",
            "-1",
            "laugh",
            "confused",
            "heart",
            "hooray"
          ],
          "description": "The reaction type."
        }
      },
      "description": "Create reaction for a commit comment. (In preview period. See README.)"
    },
    "getForIssue": {
      "url": "/repos/:owner/:repo/issues/:number/reactions",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.squirrel-girl-preview"
      },
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "number": {
          "type": "number",
          "required": true
        },
        "content": {
          "type": "string",
          "enum": [
            "+1",
            "-1",
            "laugh",
            "confused",
            "heart",
            "hooray"
          ],
          "description": "Indicates which type of reaction to return."
        }
      },
      "description": "List reactions for an issue. (In preview period. See README.)"
    },
    "createForIssue": {
      "url": "/repos/:owner/:repo/issues/:number/reactions",
      "method": "POST",
      "headers": {
        "accept": "application/vnd.github.squirrel-girl-preview"
      },
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "number": {
          "type": "number",
          "required": true
        },
        "content": {
          "type": "string",
          "required": true,
          "enum": [
            "+1",
            "-1",
            "laugh",
            "confused",
            "heart",
            "hooray"
          ],
          "description": "The reaction type."
        }
      },
      "description": "Create reaction for an issue. (In preview period. See README.)"
    },
    "getForIssueComment": {
      "url": "/repos/:owner/:repo/issues/comments/:id/reactions",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.squirrel-girl-preview"
      },
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "id": {
          "type": "string",
          "required": true
        },
        "content": {
          "type": "string",
          "enum": [
            "+1",
            "-1",
            "laugh",
            "confused",
            "heart",
            "hooray"
          ],
          "description": "Indicates which type of reaction to return."
        }
      },
      "description": "List reactions for an issue comment. (In preview period. See README.)"
    },
    "createForIssueComment": {
      "url": "/repos/:owner/:repo/issues/comments/:id/reactions",
      "method": "POST",
      "headers": {
        "accept": "application/vnd.github.squirrel-girl-preview"
      },
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "id": {
          "type": "string",
          "required": true
        },
        "content": {
          "type": "string",
          "required": true,
          "enum": [
            "+1",
            "-1",
            "laugh",
            "confused",
            "heart",
            "hooray"
          ],
          "description": "The reaction type."
        }
      },
      "description": "Create reaction for an issue comment. (In preview period. See README.)"
    },
    "getForPullRequestReviewComment": {
      "url": "/repos/:owner/:repo/pulls/comments/:id/reactions",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.squirrel-girl-preview"
      },
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "id": {
          "type": "string",
          "required": true
        },
        "content": {
          "type": "string",
          "enum": [
            "+1",
            "-1",
            "laugh",
            "confused",
            "heart",
            "hooray"
          ],
          "description": "Indicates which type of reaction to return."
        }
      },
      "description": "List reactions for a pull request review comment. (In preview period. See README.)"
    },
    "createForPullRequestReviewComment": {
      "url": "/repos/:owner/:repo/pulls/comments/:id/reactions",
      "method": "POST",
      "headers": {
        "accept": "application/vnd.github.squirrel-girl-preview"
      },
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "id": {
          "type": "string",
          "required": true
        },
        "content": {
          "type": "string",
          "required": true,
          "enum": [
            "+1",
            "-1",
            "laugh",
            "confused",
            "heart",
            "hooray"
          ],
          "description": "The reaction type."
        }
      },
      "description": "Create reaction for a pull request review comment. (In preview period. See README.)"
    }
  },
  "repos": {
    "create": {
      "url": "/user/repos",
      "method": "POST",
      "params": {
        "name": {
          "type": "string",
          "required": true
        },
        "description": {
          "type": "string"
        },
        "homepage": {
          "type": "string"
        },
        "private": {
          "type": "boolean",
          "default": "false",
          "description": "True to create a private repository, false to create a public one. Creating private repositories requires a paid GitHub account. Default is false."
        },
        "has_issues": {
          "type": "boolean",
          "default": "true",
          "description": "True to enable issues for this repository, false to disable them. Default is true."
        },
        "has_projects": {
          "type": "boolean",
          "default": "true",
          "description": "True to enable projects for this repository, false to disable them. Default is true."
        },
        "has_wiki": {
          "type": "boolean",
          "default": "true",
          "description": "True to enable the wiki for this repository, false to disable it. Default is true."
        },
        "team_id": {
          "type": "number",
          "description": "The id of the team that will be granted access to this repository. This is only valid when creating a repository in an organization."
        },
        "auto_init": {
          "type": "boolean",
          "default": "false",
          "description": "True to create an initial commit with empty README. Default is false"
        },
        "gitignore_template": {
          "type": "string",
          "description": "Desired language or platform .gitignore template to apply. Ignored if auto_init parameter is not provided."
        },
        "license_template": {
          "type": "string",
          "description": "Desired LICENSE template to apply. Use the name of the template without the extension. For example, \"mit\" or \"mozilla\"."
        },
        "allow_squash_merge": {
          "type": "boolean",
          "default": "true",
          "description": "Either true to allow squash-merging pull requests, or false to prevent squash-merging. Default: true. (In preview period. See README.)"
        },
        "allow_merge_commit": {
          "type": "boolean",
          "default": "true",
          "description": "Either true to allow merging pull requests with a merge commit, or false to prevent merging pull requests with merge commits. Default: true. (In preview period. See README.)"
        },
        "allow_rebase_merge": {
          "type": "boolean",
          "default": "true",
          "description": "Either true to allow rebase-merging pull requests, or false to prevent rebase-merging. Default: true. (In preview period. See README.)"
        }
      },
      "description": "Create a new repository for the authenticated user."
    },
    "get": {
      "url": "/repos/:owner/:repo",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.drax-preview+json"
      },
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        }
      },
      "description": "Get a repo for a user."
    },
    "edit": {
      "url": "/repos/:owner/:repo",
      "method": "PATCH",
      "headers": {
        "accept": "application/vnd.github.drax-preview+json"
      },
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "name": {
          "type": "string",
          "required": true
        },
        "description": {
          "type": "string"
        },
        "homepage": {
          "type": "string"
        },
        "private": {
          "type": "boolean",
          "default": "false",
          "description": "True to create a private repository, false to create a public one. Creating private repositories requires a paid GitHub account. Default is false."
        },
        "has_issues": {
          "type": "boolean",
          "default": "true",
          "description": "True to enable issues for this repository, false to disable them. Default is true."
        },
        "has_projects": {
          "type": "boolean",
          "default": "true",
          "description": "True to enable projects for this repository, false to disable them. Default is true."
        },
        "has_wiki": {
          "type": "boolean",
          "default": "true",
          "description": "True to enable the wiki for this repository, false to disable it. Default is true."
        },
        "default_branch": {
          "type": "string",
          "description": "Updates the default branch for this repository."
        },
        "allow_squash_merge": {
          "type": "boolean",
          "default": "true",
          "description": "Either true to allow squash-merging pull requests, or false to prevent squash-merging. Default: true. (In preview period. See README.)"
        },
        "allow_merge_commit": {
          "type": "boolean",
          "default": "true",
          "description": "Either true to allow merging pull requests with a merge commit, or false to prevent merging pull requests with merge commits. Default: true. (In preview period. See README.)"
        },
        "allow_rebase_merge": {
          "type": "boolean",
          "default": "true",
          "description": "Either true to allow rebase-merging pull requests, or false to prevent rebase-merging. Default: true. (In preview period. See README.)"
        }
      },
      "description": "Update a repo."
    },
    "delete": {
      "url": "/repos/:owner/:repo",
      "method": "DELETE",
      "headers": {
        "accept": "application/vnd.github.drax-preview+json"
      },
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        }
      },
      "description": "Delete a repository."
    },
    "fork": {
      "url": "/repos/:owner/:repo/forks",
      "method": "POST",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "organization": {
          "type": "string",
          "description": "Optional parameter to specify the organization name if forking into an organization."
        }
      },
      "description": "Create a fork."
    },
    "merge": {
      "url": "/repos/:owner/:repo/merges",
      "method": "POST",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "base": {
          "type": "string",
          "required": true,
          "description": "The branch (or git ref) you want your changes pulled into. This should be an existing branch on the current repository. You cannot submit a pull request to one repo that requests a merge to a base of another repo."
        },
        "head": {
          "type": "string",
          "required": true,
          "description": "The branch (or git ref) where your changes are implemented."
        },
        "commit_message": {
          "type": "string",
          "description": "Commit message to use for the merge commit. If omitted, a default message will be used."
        }
      },
      "description": "Perform a merge."
    },
    "getAll": {
      "url": "/user/repos",
      "method": "GET",
      "params": {
        "visibility": {
          "type": "string",
          "enum": [
            "all",
            "public",
            "private"
          ],
          "default": "all",
          "description": "Can be one of `all`, `public`, or `private`. Default: `all`."
        },
        "affiliation": {
          "type": "string",
          "default": "owner,collaborator,organization_member",
          "description": "Comma-separated list of values. Can include: `owner`, `collaborator`, `organization_member`."
        },
        "type": {
          "type": "string",
          "enum": [
            "all",
            "owner",
            "public",
            "private",
            "member"
          ],
          "default": "all",
          "description": "Possible values: `all`, `owner`, `public`, `private`, `member`. Default: `all`."
        },
        "sort": {
          "type": "string",
          "enum": [
            "created",
            "updated",
            "pushed",
            "full_name"
          ],
          "default": "full_name",
          "description": "Possible values: `created`, `updated`, `pushed`, `full_name`. Default: `full_name`."
        },
        "direction": {
          "type": "string",
          "enum": [
            "asc",
            "desc"
          ],
          "default": "desc"
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List your repositories"
    },
    "getForUser": {
      "url": "/users/:username/repos",
      "method": "GET",
      "params": {
        "username": {
          "type": "string",
          "required": true
        },
        "type": {
          "type": "string",
          "enum": [
            "all",
            "owner",
            "member"
          ],
          "default": "owner",
          "description": "Possible values: `all`, `owner`, `member`. Default: `owner`."
        },
        "sort": {
          "type": "string",
          "enum": [
            "created",
            "updated",
            "pushed",
            "full_name"
          ],
          "default": "full_name",
          "description": "Possible values: `created`, `updated`, `pushed`, `full_name`. Default: `full_name`."
        },
        "direction": {
          "type": "string",
          "enum": [
            "asc",
            "desc"
          ],
          "default": "desc"
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List public repositories for the specified user."
    },
    "getForOrg": {
      "url": "/orgs/:org/repos",
      "method": "GET",
      "params": {
        "org": {
          "type": "string",
          "required": true
        },
        "type": {
          "type": "string",
          "enum": [
            "all",
            "public",
            "private",
            "forks",
            "sources",
            "member"
          ],
          "default": "all",
          "description": "Possible values: `all`, `public`, `private`, `forks`, `sources`, `member`. Default: `all`."
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List repositories for the specified org."
    },
    "getPublic": {
      "url": "/repositories",
      "method": "GET",
      "params": {
        "since": {
          "type": "string",
          "description": "The integer ID of the last Repository that you've seen."
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List all public repositories"
    },
    "createForOrg": {
      "url": "/orgs/:org/repos",
      "method": "POST",
      "params": {
        "org": {
          "type": "string",
          "required": true
        },
        "name": {
          "type": "string",
          "required": true
        },
        "description": {
          "type": "string"
        },
        "homepage": {
          "type": "string"
        },
        "private": {
          "type": "boolean",
          "default": "false",
          "description": "True to create a private repository, false to create a public one. Creating private repositories requires a paid GitHub account. Default is false."
        },
        "has_issues": {
          "type": "boolean",
          "default": "true",
          "description": "True to enable issues for this repository, false to disable them. Default is true."
        },
        "has_projects": {
          "type": "boolean",
          "default": "true",
          "description": "True to enable projects for this repository, false to disable them. Default is true."
        },
        "has_wiki": {
          "type": "boolean",
          "default": "true",
          "description": "True to enable the wiki for this repository, false to disable it. Default is true."
        },
        "team_id": {
          "type": "number",
          "description": "The id of the team that will be granted access to this repository. This is only valid when creating a repository in an organization."
        },
        "auto_init": {
          "type": "boolean",
          "default": "false",
          "description": "True to create an initial commit with empty README. Default is false"
        },
        "gitignore_template": {
          "type": "string",
          "description": "Desired language or platform .gitignore template to apply. Ignored if auto_init parameter is not provided."
        },
        "license_template": {
          "type": "string",
          "description": "Desired LICENSE template to apply. Use the name of the template without the extension. For example, \"mit\" or \"mozilla\"."
        },
        "allow_squash_merge": {
          "type": "boolean",
          "default": "true",
          "description": "Either true to allow squash-merging pull requests, or false to prevent squash-merging. Default: true. (In preview period. See README.)"
        },
        "allow_merge_commit": {
          "type": "boolean",
          "default": "true",
          "description": "Either true to allow merging pull requests with a merge commit, or false to prevent merging pull requests with merge commits. Default: true. (In preview period. See README.)"
        },
        "allow_rebase_merge": {
          "type": "boolean",
          "default": "true",
          "description": "Either true to allow rebase-merging pull requests, or false to prevent rebase-merging. Default: true. (In preview period. See README.)"
        }
      },
      "description": "Create a new repository for an organization."
    },
    "getById": {
      "url": "/repositories/:id",
      "method": "GET",
      "params": {
        "id": {
          "type": "string",
          "required": true,
          "description": "Numerical ID of the repository."
        }
      },
      "description": "Get a single repo by id."
    },
    "getTopics": {
      "url": "/repos/:owner/:repo/topics",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.mercy-preview+json"
      },
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List all topics for a repository. (In preview period. See README.)"
    },
    "replaceTopics": {
      "url": "/repos/:owner/:repo/topics",
      "method": "PUT",
      "headers": {
        "accept": "application/vnd.github.mercy-preview+json"
      },
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "names": {
          "type": "string[]",
          "required": true,
          "description": "An array of topics to add to the repository. Pass one or more topics to replace the set of existing topics. Send an empty array ([]) to clear all topics from the repository."
        }
      },
      "description": "Replace all topics for a repository. (In preview period. See README.)"
    },
    "getContributors": {
      "url": "/repos/:owner/:repo/contributors",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "anon": {
          "type": "boolean",
          "description": "Set to 1 or true to include anonymous contributors in results."
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "Get contributors for the specified repository."
    },
    "getLanguages": {
      "url": "/repos/:owner/:repo/languages",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "Get languages for the specified repository."
    },
    "getTeams": {
      "url": "/repos/:owner/:repo/teams",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "Get teams for the specified repository."
    },
    "getTags": {
      "url": "/repos/:owner/:repo/tags",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "Get tags for the specified repository."
    },
    "getBranches": {
      "url": "/repos/:owner/:repo/branches",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "protected": {
          "type": "boolean",
          "description": "Set to true to only return protected branches"
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List branches."
    },
    "getBranch": {
      "url": "/repos/:owner/:repo/branches/:branch",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "branch": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "Get branch."
    },
    "getBranchProtection": {
      "url": "/repos/:owner/:repo/branches/:branch/protection",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "branch": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "Get branch protection."
    },
    "updateBranchProtection": {
      "url": "/repos/:owner/:repo/branches/:branch/protection",
      "method": "PUT",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "branch": {
          "type": "string",
          "required": true
        },
        "required_status_checks": {
          "type": "json",
          "required": true,
          "allow-null": true,
          "description": "JSON object that contains the following keys: `include_admins` - Enforce required status checks for repository administrators, `strict` - Require branches to be up to date before merging, `contexts` - The list of status checks to require in order to merge into this branch. This object can have the value of `null` for disabled."
        },
        "required_pull_request_reviews": {
          "type": "json",
          "required": true,
          "allow-null": true,
          "description": "JSON object that contains the following keys: `include_admins` - Enforce required status checks for repository administrators."
        },
        "dismissal_restrictions": {
          "type": "json",
          "allow-null": true,
          "description": "JSON object that contains the following keys: `users` - The list of user logins with dismissal access, `teams` - The list of team slugs with dismissal access. This object can have the value of `null` for disabled."
        },
        "restrictions": {
          "type": "json",
          "required": true,
          "allow-null": true,
          "description": "JSON object that contains the following keys: `users` - The list of user logins with push access, `teams` - The list of team slugs with push access. This object can have the value of `null` for disabled."
        },
        "enforce_admins": {
          "type": "boolean",
          "required": true,
          "allow-null": false,
          "description": "Enforces required status checks for repository administrators."
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "Update branch protection."
    },
    "removeBranchProtection": {
      "url": "/repos/:owner/:repo/branches/:branch/protection",
      "method": "DELETE",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "branch": {
          "type": "string",
          "required": true
        }
      },
      "description": "Remove branch protection."
    },
    "getProtectedBranchRequiredStatusChecks": {
      "url": "/repos/:owner/:repo/branches/:branch/protection/required_status_checks",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "branch": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "Get required status checks of protected branch."
    },
    "updateProtectedBranchRequiredStatusChecks": {
      "url": "/repos/:owner/:repo/branches/:branch/protection/required_status_checks",
      "method": "PATCH",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "branch": {
          "type": "string",
          "required": true
        },
        "strict": {
          "type": "boolean",
          "description": "Require branches to be up to date before merging."
        },
        "contexts": {
          "type": "string[]",
          "description": "The list of status checks to require in order to merge into this branch."
        }
      },
      "description": "Update required status checks of protected branch."
    },
    "removeProtectedBranchRequiredStatusChecks": {
      "url": "/repos/:owner/:repo/branches/:branch/protection/required_status_checks",
      "method": "DELETE",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "branch": {
          "type": "string",
          "required": true
        }
      },
      "description": "Remove required status checks of protected branch."
    },
    "getProtectedBranchRequiredStatusChecksContexts": {
      "url": "/repos/:owner/:repo/branches/:branch/protection/required_status_checks/contexts",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "branch": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List required status checks contexts of protected branch."
    },
    "replaceProtectedBranchRequiredStatusChecksContexts": {
      "url": "/repos/:owner/:repo/branches/:branch/protection/required_status_checks/contexts",
      "method": "PUT",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "branch": {
          "type": "string",
          "required": true
        },
        "contexts": {
          "type": "string[]",
          "required": true,
          "mapTo": "input",
          "description": "An array of protected branch required status checks contexts (e.g. continuous-integration/jenkins)."
        }
      },
      "description": "Replace required status checks contexts of protected branch."
    },
    "addProtectedBranchRequiredStatusChecksContexts": {
      "url": "/repos/:owner/:repo/branches/:branch/protection/required_status_checks/contexts",
      "method": "POST",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "branch": {
          "type": "string",
          "required": true
        },
        "contexts": {
          "type": "string[]",
          "required": true,
          "mapTo": "input",
          "description": "An array of protected branch required status checks contexts (e.g. continuous-integration/jenkins)."
        }
      },
      "description": "Add required status checks contexts of protected branch."
    },
    "removeProtectedBranchRequiredStatusChecksContexts": {
      "url": "/repos/:owner/:repo/branches/:branch/protection/required_status_checks/contexts",
      "method": "DELETE",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "branch": {
          "type": "string",
          "required": true
        },
        "contexts": {
          "type": "string[]",
          "required": true,
          "mapTo": "input",
          "description": "An array of protected branch required status checks contexts (e.g. continuous-integration/jenkins)."
        }
      },
      "description": "Remove required status checks contexts of protected branch."
    },
    "getProtectedBranchPullRequestReviewEnforcement": {
      "url": "/repos/:owner/:repo/branches/:branch/protection/required_pull_request_reviews",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "branch": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "Get pull request review enforcement of protected branch."
    },
    "updateProtectedBranchPullRequestReviewEnforcement": {
      "url": "/repos/:owner/:repo/branches/:branch/protection/required_pull_request_reviews",
      "method": "PATCH",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "branch": {
          "type": "string",
          "required": true
        },
        "dismissal_restrictions": {
          "type": "json",
          "allow-null": true,
          "description": "JSON object that contains the following keys: `users` - The list of user logins with dismissal access, `teams` - The list of team slugs with dismissal access. This object can have the value of `null` for disabled."
        },
        "dismiss_stale_reviews": {
          "type": "boolean",
          "description": "Dismiss approved reviews automatically when a new commit is pushed."
        },
        "require_code_owner_reviews": {
          "type": "boolean",
          "description": "Blocks merge until code owners have reviewed."
        }
      },
      "description": "Update pull request review enforcement of protected branch."
    },
    "removeProtectedBranchPullRequestReviewEnforcement": {
      "url": "/repos/:owner/:repo/branches/:branch/protection/required_pull_request_reviews",
      "method": "DELETE",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "branch": {
          "type": "string",
          "required": true
        }
      },
      "description": "Remove pull request review enforcement of protected branch."
    },
    "getProtectedBranchAdminEnforcement": {
      "url": "/repos/:owner/:repo/branches/:branch/protection/enforce_admins",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "branch": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "Get admin enforcement of protected branch."
    },
    "addProtectedBranchAdminEnforcement": {
      "url": "/repos/:owner/:repo/branches/:branch/protection/enforce_admins",
      "method": "POST",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "branch": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "Add admin enforcement of protected branch."
    },
    "removeProtectedBranchAdminEnforcement": {
      "url": "/repos/:owner/:repo/branches/:branch/protection/enforce_admins",
      "method": "DELETE",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "branch": {
          "type": "string",
          "required": true
        }
      },
      "description": "Remove admin enforcement of protected branch."
    },
    "getProtectedBranchRestrictions": {
      "url": "/repos/:owner/:repo/branches/:branch/protection/restrictions",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "branch": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "Get restrictions of protected branch."
    },
    "removeProtectedBranchRestrictions": {
      "url": "/repos/:owner/:repo/branches/:branch/protection/restrictions",
      "method": "DELETE",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "branch": {
          "type": "string",
          "required": true
        }
      },
      "description": "Remove restrictions of protected branch."
    },
    "getProtectedBranchTeamRestrictions": {
      "url": "/repos/:owner/:repo/branches/:branch/protection/restrictions/teams",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "branch": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List team restrictions of protected branch."
    },
    "replaceProtectedBranchTeamRestrictions": {
      "url": "/repos/:owner/:repo/branches/:branch/protection/restrictions/teams",
      "method": "PUT",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "branch": {
          "type": "string",
          "required": true
        },
        "teams": {
          "type": "string[]",
          "required": true,
          "mapTo": "input",
          "description": "An array of team slugs (e.g. justice-league)."
        }
      },
      "description": "Replace team restrictions of protected branch."
    },
    "addProtectedBranchTeamRestrictions": {
      "url": "/repos/:owner/:repo/branches/:branch/protection/restrictions/teams",
      "method": "POST",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "branch": {
          "type": "string",
          "required": true
        },
        "teams": {
          "type": "string[]",
          "required": true,
          "mapTo": "input",
          "description": "An array of team slugs (e.g. justice-league)."
        }
      },
      "description": "Add team restrictions of protected branch."
    },
    "removeProtectedBranchTeamRestrictions": {
      "url": "/repos/:owner/:repo/branches/:branch/protection/restrictions/teams",
      "method": "DELETE",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "branch": {
          "type": "string",
          "required": true
        },
        "teams": {
          "type": "string[]",
          "required": true,
          "mapTo": "input",
          "description": "An array of team slugs (e.g. justice-league)."
        }
      },
      "description": "Remove team restrictions of protected branch."
    },
    "getProtectedBranchUserRestrictions": {
      "url": "/repos/:owner/:repo/branches/:branch/protection/restrictions/users",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "branch": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List user restrictions of protected branch."
    },
    "replaceProtectedBranchUserRestrictions": {
      "url": "/repos/:owner/:repo/branches/:branch/protection/restrictions/users",
      "method": "PUT",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "branch": {
          "type": "string",
          "required": true
        },
        "users": {
          "type": "string[]",
          "required": true,
          "mapTo": "input",
          "description": "An array of team slugs (e.g. justice-league)."
        }
      },
      "description": "Replace user restrictions of protected branch."
    },
    "addProtectedBranchUserRestrictions": {
      "url": "/repos/:owner/:repo/branches/:branch/protection/restrictions/users",
      "method": "POST",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "branch": {
          "type": "string",
          "required": true
        },
        "users": {
          "type": "string[]",
          "required": true,
          "mapTo": "input",
          "description": "An array of team slugs (e.g. justice-league)."
        }
      },
      "description": "Add user restrictions of protected branch."
    },
    "removeProtectedBranchUserRestrictions": {
      "url": "/repos/:owner/:repo/branches/:branch/protection/restrictions/users",
      "method": "DELETE",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "branch": {
          "type": "string",
          "required": true
        },
        "users": {
          "type": "string[]",
          "required": true,
          "mapTo": "input",
          "description": "An array of team slugs (e.g. justice-league)."
        }
      },
      "description": "Remove user restrictions of protected branch."
    },
    "getCollaborators": {
      "url": "/repos/:owner/:repo/collaborators",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "affiliation": {
          "type": "string",
          "enum": [
            "outside",
            "all",
            "direct"
          ],
          "default": "all",
          "description": "Filter collaborators returned by their affiliation."
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List collaborators"
    },
    "checkCollaborator": {
      "url": "/repos/:owner/:repo/collaborators/:username",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "username": {
          "type": "string",
          "required": true
        }
      },
      "description": "Check if user is a collaborator."
    },
    "reviewUserPermissionLevel": {
      "url": "/repos/:owner/:repo/collaborators/:username/permission",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "username": {
          "type": "string",
          "required": true
        }
      },
      "description": "Review a user's permission level."
    },
    "addCollaborator": {
      "url": "/repos/:owner/:repo/collaborators/:username",
      "method": "PUT",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "username": {
          "type": "string",
          "required": true
        },
        "permission": {
          "type": "string",
          "enum": [
            "pull",
            "push",
            "admin"
          ],
          "default": "push",
          "description": "`pull` - can pull, but not push to or administer this repository, `push` - can pull and push, but not administer this repository, `admin` - can pull, push and administer this repository."
        }
      },
      "description": "Add user as a collaborator"
    },
    "removeCollaborator": {
      "url": "/repos/:owner/:repo/collaborators/:username",
      "method": "DELETE",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "username": {
          "type": "string",
          "required": true
        }
      },
      "description": "Remove user as a collaborator."
    },
    "getAllCommitComments": {
      "url": "/repos/:owner/:repo/comments",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List commit comments for a repository."
    },
    "getCommitComments": {
      "url": "/repos/:owner/:repo/commits/:ref/comments",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "ref": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List comments for a single commit."
    },
    "createCommitComment": {
      "url": "/repos/:owner/:repo/commits/:sha/comments",
      "method": "POST",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "sha": {
          "type": "string",
          "required": true
        },
        "body": {
          "type": "string",
          "required": true
        },
        "path": {
          "type": "string",
          "description": "Relative path of the file to comment on."
        },
        "position": {
          "type": "number",
          "description": "Line index in the diff to comment on."
        }
      },
      "description": "Create a commit comment."
    },
    "getCommitComment": {
      "url": "/repos/:owner/:repo/comments/:id",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Get a single commit comment."
    },
    "updateCommitComment": {
      "url": "/repos/:owner/:repo/comments/:id",
      "method": "PATCH",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "id": {
          "type": "string",
          "required": true
        },
        "body": {
          "type": "string",
          "required": true
        }
      },
      "description": "Update a commit comment."
    },
    "deleteCommitComment": {
      "url": "/repos/:owner/:repo/comments/:id",
      "method": "DELETE",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Delete a commit comment."
    },
    "getCommunityProfileMetrics": {
      "url": "/repos/:owner/:name/community/profile",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.black-panther-preview+json"
      },
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "name": {
          "type": "string",
          "required": true
        }
      },
      "description": "Retrieve community profile metrics."
    },
    "getCommits": {
      "url": "/repos/:owner/:repo/commits",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "sha": {
          "type": "string",
          "description": "Sha or branch to start listing commits from."
        },
        "path": {
          "type": "string",
          "description": "Only commits containing this file path will be returned."
        },
        "author": {
          "type": "string",
          "description": "GitHub login or email address by which to filter by commit author."
        },
        "since": {
          "type": "date",
          "description": "Timestamp in ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ"
        },
        "until": {
          "type": "date",
          "description": "Timestamp in ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ"
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List commits on a repository."
    },
    "getCommit": {
      "url": "/repos/:owner/:repo/commits/:sha",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.cryptographer-preview"
      },
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "sha": {
          "type": "string",
          "required": true
        }
      },
      "description": "Get a single commit."
    },
    "getShaOfCommitRef": {
      "url": "/repos/:owner/:repo/commits/:ref",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "ref": {
          "type": "string",
          "required": true,
          "allow-empty": true,
          "description": "String of the name of the fully qualified reference (ie: heads/master). If it doesn’t have at least one slash, it will be rejected."
        }
      },
      "description": "Get the SHA-1 of a commit reference."
    },
    "compareCommits": {
      "url": "/repos/:owner/:repo/compare/:base...:head",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "base": {
          "type": "string",
          "required": true,
          "description": "The branch (or git ref) you want your changes pulled into. This should be an existing branch on the current repository. You cannot submit a pull request to one repo that requests a merge to a base of another repo."
        },
        "head": {
          "type": "string",
          "required": true,
          "description": "The branch (or git ref) where your changes are implemented."
        }
      },
      "description": "Compare two commits."
    },
    "getReadme": {
      "url": "/repos/:owner/:repo/readme",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "ref": {
          "type": "string",
          "description": "The name of the commit/branch/tag. Default: the repository’s default branch (usually master)"
        }
      },
      "description": "Get the README for the given repository."
    },
    "getContent": {
      "url": "/repos/:owner/:repo/contents/:path",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "path": {
          "type": "string",
          "required": true,
          "allow-empty": true,
          "description": "The content path."
        },
        "ref": {
          "type": "string",
          "description": "The String name of the Commit/Branch/Tag. Defaults to master."
        }
      },
      "description": "Get the contents of a file or directory in a repository."
    },
    "createFile": {
      "url": "/repos/:owner/:repo/contents/:path",
      "method": "PUT",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "path": {
          "type": "string",
          "required": true,
          "description": "The content path."
        },
        "message": {
          "type": "string",
          "required": true,
          "description": "The commit message."
        },
        "content": {
          "type": "string",
          "required": true,
          "description": "The new file content, Base64 encoded."
        },
        "branch": {
          "type": "string",
          "description": "The branch name. If not provided, uses the repository’s default branch (usually master)."
        },
        "committer": {
          "type": "json"
        },
        "author": {
          "type": "json"
        }
      },
      "description": "Create a new file in the given repository."
    },
    "updateFile": {
      "url": "/repos/:owner/:repo/contents/:path",
      "method": "PUT",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "path": {
          "type": "string",
          "required": true,
          "description": "The content path."
        },
        "message": {
          "type": "string",
          "required": true,
          "description": "The commit message."
        },
        "content": {
          "type": "string",
          "required": true,
          "description": "The updated file content, Base64 encoded."
        },
        "sha": {
          "type": "string",
          "required": true,
          "description": "The blob SHA of the file being replaced."
        },
        "branch": {
          "type": "string",
          "description": "The branch name. If not provided, uses the repository’s default branch (usually master)."
        },
        "committer": {
          "type": "json"
        },
        "author": {
          "type": "json"
        }
      },
      "description": "Update a file."
    },
    "deleteFile": {
      "url": "/repos/:owner/:repo/contents/:path",
      "method": "DELETE",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "path": {
          "type": "string",
          "required": true,
          "description": "The content path."
        },
        "message": {
          "type": "string",
          "required": true,
          "description": "The commit message."
        },
        "sha": {
          "type": "string",
          "required": true,
          "description": "The blob SHA of the file being removed."
        },
        "branch": {
          "type": "string",
          "description": "The branch name. If not provided, uses the repository’s default branch (usually master)."
        },
        "committer": {
          "type": "json"
        },
        "author": {
          "type": "json"
        }
      },
      "description": "Delete a file."
    },
    "getArchiveLink": {
      "url": "/repos/:owner/:repo/:archive_format/:ref",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "archive_format": {
          "type": "string",
          "required": true,
          "enum": [
            "tarball",
            "zipball"
          ],
          "default": "tarball",
          "description": "Either tarball or zipball, Deafult: tarball."
        },
        "ref": {
          "type": "string",
          "description": "A valid Git reference. Default: the repository’s default branch (usually master)."
        }
      },
      "description": "Get archive link."
    },
    "getDeployKeys": {
      "url": "/repos/:owner/:repo/keys",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List deploy keys."
    },
    "getDeployKey": {
      "url": "/repos/:owner/:repo/keys/:id",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Get a deploy key."
    },
    "addDeployKey": {
      "url": "/repos/:owner/:repo/keys",
      "method": "POST",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "title": {
          "type": "string",
          "required": true
        },
        "key": {
          "type": "string",
          "required": true
        },
        "read_only": {
          "type": "boolean",
          "description": "If true, the key will only be able to read repository contents. Otherwise, the key will be able to read and write."
        }
      },
      "description": "Add a new deploy key."
    },
    "deleteDeployKey": {
      "url": "/repos/:owner/:repo/keys/:id",
      "method": "DELETE",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Remove a deploy key."
    },
    "getDeployments": {
      "url": "/repos/:owner/:repo/deployments",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.ant-man-preview+json"
      },
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "sha": {
          "type": "string",
          "default": "none",
          "description": "The short or long sha that was recorded at creation time. Default: none."
        },
        "ref": {
          "type": "string",
          "default": "none",
          "description": "The name of the ref. This can be a branch, tag, or sha. Default: none."
        },
        "task": {
          "type": "string",
          "default": "none",
          "description": "The name of the task for the deployment. e.g. deploy or deploy:migrations. Default: none."
        },
        "environment": {
          "type": "string",
          "default": "none",
          "description": "The name of the environment that was deployed to. e.g. staging or production. Default: none."
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List deployments."
    },
    "getDeployment": {
      "url": "/repos/:owner/:repo/deployments/:deployment_id",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "deployment_id": {
          "type": "string",
          "required": true,
          "description": "The deployment id."
        }
      },
      "description": "Get a single Deployment. (In preview period. See README.)"
    },
    "createDeployment": {
      "url": "/repos/:owner/:repo/deployments",
      "method": "POST",
      "headers": {
        "accept": "application/vnd.github.ant-man-preview+json"
      },
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "ref": {
          "type": "string",
          "required": true,
          "description": "The ref to deploy. This can be a branch, tag, or sha."
        },
        "task": {
          "type": "string",
          "default": "deploy",
          "description": "The named task to execute. e.g. deploy or deploy:migrations. Default: deploy"
        },
        "auto_merge": {
          "type": "boolean",
          "default": "true",
          "description": "Optional parameter to merge the default branch into the requested ref if it is behind the default branch. Default: true"
        },
        "required_contexts": {
          "type": "string[]",
          "description": "Optional array of status contexts verified against commit status checks. If this parameter is omitted from the parameters then all unique contexts will be verified before a deployment is created. To bypass checking entirely pass an empty array. Defaults to all unique contexts."
        },
        "payload": {
          "type": "string",
          "default": "\"\"",
          "description": "Optional JSON payload with extra information about the deployment. Default: \"\""
        },
        "environment": {
          "type": "string",
          "default": "none",
          "description": "The name of the environment that was deployed to. e.g. staging or production. Default: none."
        },
        "description": {
          "type": "string",
          "default": "\"\"",
          "description": "Optional short description. Default: \"\""
        },
        "transient_environment": {
          "type": "boolean",
          "default": false,
          "description": "Specifies if the given environment is specific to the deployment and will no longer exist at some point in the future. Default: false. (In preview period. See README.)"
        },
        "production_environment": {
          "type": "boolean",
          "description": "Specifies if the given environment is a one that end-users directly interact with. Default: true when environment is `production` and false otherwise. (In preview period. See README.)"
        }
      },
      "description": "Create a deployment. (In preview period. See README.)"
    },
    "getDeploymentStatuses": {
      "url": "/repos/:owner/:repo/deployments/:id/statuses",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.ant-man-preview+json"
      },
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "List deployment statuses. (In preview period. See README.)"
    },
    "getDeploymentStatus": {
      "url": "/repos/:owner/:repo/deployments/:id/statuses/:status_id",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "id": {
          "type": "string",
          "required": true,
          "description": "The Deployment ID to list the statuses from."
        },
        "status_id": {
          "type": "string",
          "required": true,
          "description": "The Deployment Status ID."
        }
      },
      "description": "List deployment statuses. (In preview period. See README.)"
    },
    "createDeploymentStatus": {
      "url": "/repos/:owner/:repo/deployments/:id/statuses",
      "method": "POST",
      "headers": {
        "accept": "application/vnd.github.ant-man-preview+json"
      },
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "id": {
          "type": "string",
          "required": true
        },
        "state": {
          "type": "string",
          "description": "The state of the status. Can be one of pending, success, error, or failure."
        },
        "target_url": {
          "type": "string",
          "default": "\"\"",
          "description": "The target URL to associate with this status. This URL should contain output to keep the user updated while the task is running or serve as historical information for what happened in the deployment. Default: \"\""
        },
        "log_url": {
          "type": "string",
          "default": "\"\"",
          "description": "Functionally equivalent to target_url. Default: \"\". (In preview period. See README.)"
        },
        "description": {
          "type": "string",
          "default": "\"\"",
          "description": "A short description of the status. Default: \"\""
        },
        "environment_url": {
          "type": "string",
          "default": "\"\"",
          "description": "URL for accessing the deployment environment. Default: \"\". (In preview period. See README.)"
        },
        "auto_inactive": {
          "type": "boolean",
          "default": true,
          "description": "When true the new `inactive` status is added to all other non-transient, non-production environment deployments with the same repository and environment name as the created status's deployment. Default: true. (In preview period. See README.)"
        }
      },
      "description": "Create a deployment status. (In preview period. See README.)"
    },
    "getDownloads": {
      "url": "/repos/:owner/:repo/downloads",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List downloads for a repository."
    },
    "getDownload": {
      "url": "/repos/:owner/:repo/downloads/:id",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Get a single download."
    },
    "deleteDownload": {
      "url": "/repos/:owner/:repo/downloads/:id",
      "method": "DELETE",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Delete a download."
    },
    "getForks": {
      "url": "/repos/:owner/:repo/forks",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "sort": {
          "type": "string",
          "enum": [
            "newest",
            "oldest",
            "stargazers"
          ],
          "default": "newest",
          "description": "Possible values: `newest`, `oldest`, `stargazers`, default: `newest`."
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List forks."
    },
    "getInvites": {
      "url": "/repos/:owner/:repo/invitations",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        }
      },
      "description": "List invitations for a repository."
    },
    "deleteInvite": {
      "url": "/repos/:owner/:repo/invitations/:invitation_id",
      "method": "DELETE",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "invitation_id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Delete a repository invitation."
    },
    "updateInvite": {
      "url": "/repos/:owner/:repo/invitations/:invitation_id",
      "method": "PATCH",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "invitation_id": {
          "type": "string",
          "required": true
        },
        "permissions": {
          "type": "string",
          "enum": [
            "read",
            "write",
            "admin"
          ],
          "description": "The permissions that the associated user will have on the repository."
        }
      },
      "description": "Update a repository invitation."
    },
    "getPages": {
      "url": "/repos/:owner/:repo/pages",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.mister-fantastic-preview+json"
      },
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "Get information about a Pages site. (In preview period. See README.)"
    },
    "requestPageBuild": {
      "url": "/repos/:owner/:repo/pages/builds",
      "method": "POST",
      "headers": {
        "accept": "application/vnd.github.mister-fantastic-preview+json"
      },
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        }
      },
      "description": "Request a page build. (In preview period. See README.)"
    },
    "getPagesBuilds": {
      "url": "/repos/:owner/:repo/pages/builds",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.mister-fantastic-preview+json"
      },
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List Pages builds. (In preview period. See README.)"
    },
    "getLatestPagesBuild": {
      "url": "/repos/:owner/:repo/pages/builds/latest",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.mister-fantastic-preview+json"
      },
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        }
      },
      "description": "Get latest Pages build. (In preview period. See README.)"
    },
    "getPagesBuild": {
      "url": "/repos/:owner/:repo/pages/builds/:id",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.mister-fantastic-preview+json"
      },
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Get a specific Pages build. (In preview period. See README.)"
    },
    "getReleases": {
      "url": "/repos/:owner/:repo/releases",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List releases for a repository."
    },
    "getRelease": {
      "url": "/repos/:owner/:repo/releases/:id",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Get a single release."
    },
    "getLatestRelease": {
      "url": "/repos/:owner/:repo/releases/latest",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        }
      },
      "description": "Get the latest release."
    },
    "getReleaseByTag": {
      "url": "/repos/:owner/:repo/releases/tags/:tag",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "tag": {
          "type": "string",
          "required": true,
          "description": "String of the tag"
        }
      },
      "description": "Get a release by tag name."
    },
    "createRelease": {
      "url": "/repos/:owner/:repo/releases",
      "method": "POST",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "tag_name": {
          "type": "string",
          "required": true,
          "description": "String of the tag"
        },
        "target_commitish": {
          "type": "string",
          "description": "Specifies the commitish value that determines where the Git tag is created from. Can be any branch or commit SHA. Unused if the Git tag already exists. Default: the repository's default branch (usually master)."
        },
        "name": {
          "type": "string"
        },
        "body": {
          "type": "string"
        },
        "draft": {
          "type": "boolean",
          "default": "false",
          "description": "true to create a draft (unpublished) release, false to create a published one. Default: false"
        },
        "prerelease": {
          "type": "boolean",
          "default": "false",
          "description": "true to identify the release as a prerelease. false to identify the release as a full release. Default: false"
        }
      },
      "description": "Create a release."
    },
    "editRelease": {
      "url": "/repos/:owner/:repo/releases/:id",
      "method": "PATCH",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "id": {
          "type": "string",
          "required": true
        },
        "tag_name": {
          "type": "string",
          "required": true,
          "description": "String of the tag"
        },
        "target_commitish": {
          "type": "string",
          "description": "Specifies the commitish value that determines where the Git tag is created from. Can be any branch or commit SHA. Unused if the Git tag already exists. Default: the repository's default branch (usually master)."
        },
        "name": {
          "type": "string"
        },
        "body": {
          "type": "string"
        },
        "draft": {
          "type": "boolean",
          "default": "false",
          "description": "true to create a draft (unpublished) release, false to create a published one. Default: false"
        },
        "prerelease": {
          "type": "boolean",
          "default": "false",
          "description": "true to identify the release as a prerelease. false to identify the release as a full release. Default: false"
        }
      },
      "description": "Edit a release."
    },
    "deleteRelease": {
      "url": "/repos/:owner/:repo/releases/:id",
      "method": "DELETE",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Delete a release"
    },
    "getAssets": {
      "url": "/repos/:owner/:repo/releases/:id/assets",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "List assets for a release."
    },
    "uploadAsset": {
      "method": "POST",
      "url": ":url",
      "params": {
        "url": {
          "type": "string",
          "required": true,
          "description": "This endpoint makes use of a Hypermedia relation (https://developer.github.com/v3/#hypermedia) to determine which URL to access. This endpoint is provided by a URI template in the release's API response (https://developer.github.com/v3/repos/releases/#get-a-single-release). You need to use an HTTP client which supports SNI (https://en.wikipedia.org/wiki/Server_Name_Indication) to make calls to this endpoint."
        },
        "file": {
          "type": "string | object",
          "required": true,
          "mapTo": "input",
          "description": "A file read stream, a String or a Buffer."
        },
        "contentType": {
          "type": "string",
          "required": true,
          "mapTo": "headers.content-type",
          "description": "The content type of the asset. This should be set in the Header. Example: 'application/zip'. For a list of acceptable types, refer this list of media types (https://www.iana.org/assignments/media-types/media-types.xhtml)"
        },
        "contentLength": {
          "type": "number",
          "required": true,
          "mapTo": "headers.content-length",
          "description": "File size in bytes."
        },
        "name": {
          "type": "string",
          "required": true,
          "description": "The file name of the asset. This should be set in a URI query parameter."
        },
        "label": {
          "type": "string",
          "description": "An alternate short description of the asset. Used in place of the filename. This should be set in a URI query parameter."
        }
      },
      "description": "Upload a release asset."
    },
    "getAsset": {
      "url": "/repos/:owner/:repo/releases/assets/:id",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Get a single release asset."
    },
    "editAsset": {
      "url": "/repos/:owner/:repo/releases/assets/:id",
      "method": "PATCH",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "id": {
          "type": "string",
          "required": true
        },
        "name": {
          "type": "string",
          "required": true
        },
        "label": {
          "type": "string",
          "description": "An alternate short description of the asset. Used in place of the filename."
        }
      },
      "description": "Edit a release asset."
    },
    "deleteAsset": {
      "url": "/repos/:owner/:repo/releases/assets/:id",
      "method": "DELETE",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Delete a release asset."
    },
    "getStatsContributors": {
      "url": "/repos/:owner/:repo/stats/contributors",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        }
      },
      "description": "Get contributors list with additions, deletions, and commit counts."
    },
    "getStatsCommitActivity": {
      "url": "/repos/:owner/:repo/stats/commit_activity",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        }
      },
      "description": "Get the last year of commit activity data."
    },
    "getStatsCodeFrequency": {
      "url": "/repos/:owner/:repo/stats/code_frequency",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        }
      },
      "description": "Get the number of additions and deletions per week."
    },
    "getStatsParticipation": {
      "url": "/repos/:owner/:repo/stats/participation",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        }
      },
      "description": "Get the weekly commit count for the repository owner and everyone else."
    },
    "getStatsPunchCard": {
      "url": "/repos/:owner/:repo/stats/punch_card",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        }
      },
      "description": "Get the number of commits per hour in each day."
    },
    "createStatus": {
      "url": "/repos/:owner/:repo/statuses/:sha",
      "method": "POST",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "sha": {
          "type": "string",
          "required": true
        },
        "state": {
          "type": "string",
          "required": true,
          "enum": [
            "pending",
            "success",
            "error",
            "failure"
          ],
          "description": "State of the status - can be one of pending, success, error, or failure."
        },
        "target_url": {
          "type": "string",
          "description": "Target url to associate with this status. This URL will be linked from the GitHub UI to allow users to easily see the ‘source’ of the Status."
        },
        "description": {
          "type": "string",
          "description": "Short description of the status."
        },
        "context": {
          "type": "string",
          "description": "A string label to differentiate this status from the status of other systems."
        }
      },
      "description": "Create a status."
    },
    "getStatuses": {
      "url": "/repos/:owner/:repo/commits/:ref/statuses",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "ref": {
          "type": "string",
          "required": true,
          "description": "Ref to list the statuses from. It can be a SHA, a branch name, or a tag name."
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List statuses for a specfic ref."
    },
    "getCombinedStatusForRef": {
      "url": "/repos/:owner/:repo/commits/:ref/status",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "ref": {
          "type": "string",
          "required": true,
          "description": "Ref to fetch the status for. It can be a SHA, a branch name, or a tag name."
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "Get the combined status for a specific ref."
    },
    "getReferrers": {
      "url": "/repos/:owner/:repo/traffic/popular/referrers",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "Get the top 10 referrers over the last 14 days."
    },
    "getPaths": {
      "url": "/repos/:owner/:repo/traffic/popular/paths",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "Get the top 10 popular contents over the last 14 days."
    },
    "getViews": {
      "url": "/repos/:owner/:repo/traffic/views",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "Get the total number of views and breakdown per day or week for the last 14 days."
    },
    "getClones": {
      "url": "/repos/:owner/:repo/traffic/clones",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "Get the total number of clones and breakdown per day or week for the last 14 days."
    },
    "getHooks": {
      "url": "/repos/:owner/:repo/hooks",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List hooks."
    },
    "getHook": {
      "url": "/repos/:owner/:repo/hooks/:id",
      "method": "GET",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Get single hook."
    },
    "createHook": {
      "url": "/repos/:owner/:repo/hooks",
      "method": "POST",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "name": {
          "type": "string",
          "required": true
        },
        "config": {
          "type": "json",
          "required": true,
          "description": "A Hash containing key/value pairs to provide settings for this hook. These settings vary between the services and are defined in the github-services repo. Booleans are stored internally as `1` for true, and `0` for false. Any JSON true/false values will be converted automatically."
        },
        "events": {
          "type": "string[]",
          "default": "[\"push\"]",
          "description": "Determines what events the hook is triggered for. Default: `['push']`."
        },
        "active": {
          "type": "boolean",
          "description": "Determines whether the hook is actually triggered on pushes."
        }
      },
      "description": "Create a hook."
    },
    "editHook": {
      "url": "/repos/:owner/:repo/hooks/:id",
      "method": "PATCH",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "id": {
          "type": "string",
          "required": true
        },
        "name": {
          "type": "string",
          "required": true
        },
        "config": {
          "type": "json",
          "required": true,
          "description": "A Hash containing key/value pairs to provide settings for this hook. Modifying this will replace the entire config object. These settings vary between the services and are defined in the github-services repo. Booleans are stored internally as `1` for true, and `0` for false. Any JSON true/false values will be converted automatically."
        },
        "events": {
          "type": "string[]",
          "default": "[\"push\"]",
          "description": "Determines what events the hook is triggered for. This replaces the entire array of events. Default: `['push']`."
        },
        "add_events": {
          "type": "string[]",
          "description": "Determines a list of events to be added to the list of events that the Hook triggers for."
        },
        "remove_events": {
          "type": "string[]",
          "description": "Determines a list of events to be removed from the list of events that the Hook triggers for."
        },
        "active": {
          "type": "boolean",
          "description": "Determines whether the hook is actually triggered on pushes."
        }
      },
      "description": "Edit a hook."
    },
    "testHook": {
      "url": "/repos/:owner/:repo/hooks/:id/tests",
      "method": "POST",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Test a [push] hook."
    },
    "pingHook": {
      "url": "/repos/:owner/:repo/hooks/:id/pings",
      "method": "POST",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Ping a hook."
    },
    "deleteHook": {
      "url": "/repos/:owner/:repo/hooks/:id",
      "method": "DELETE",
      "params": {
        "owner": {
          "type": "string",
          "required": true
        },
        "repo": {
          "type": "string",
          "required": true
        },
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Deleate a hook."
    }
  },
  "search": {
    "repos": {
      "url": "/search/repositories",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.mercy-preview+json"
      },
      "params": {
        "q": {
          "type": "string",
          "required": true,
          "description": "Search Term"
        },
        "sort": {
          "type": "string",
          "enum": [
            "stars",
            "forks",
            "updated"
          ],
          "description": "stars, forks, or updated"
        },
        "order": {
          "type": "string",
          "enum": [
            "asc",
            "desc"
          ],
          "default": "desc",
          "description": "asc or desc"
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "Search repositories."
    },
    "code": {
      "url": "/search/code",
      "method": "GET",
      "params": {
        "q": {
          "type": "string",
          "required": true,
          "description": "Search Term"
        },
        "sort": {
          "type": "string",
          "enum": [
            "indexed"
          ],
          "description": "The sort field. Can only be indexed, which indicates how recently a file has been indexed by the GitHub search infrastructure. Default: results are sorted by best match."
        },
        "order": {
          "type": "string",
          "enum": [
            "asc",
            "desc"
          ],
          "default": "desc",
          "description": "asc or desc"
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "Search code."
    },
    "commits": {
      "url": "/search/commits",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.cloak-preview+json"
      },
      "params": {
        "q": {
          "type": "string",
          "required": true,
          "description": "Search Term"
        },
        "sort": {
          "type": "string",
          "enum": [
            "author-date",
            "committer-date"
          ],
          "description": "The sort field. Can be author-date or committer-date. Default: best match."
        },
        "order": {
          "type": "string",
          "enum": [
            "asc",
            "desc"
          ],
          "default": "desc",
          "description": "asc or desc"
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "Search commits. (In preview period. See README.)"
    },
    "issues": {
      "url": "/search/issues",
      "method": "GET",
      "params": {
        "q": {
          "type": "string",
          "required": true,
          "description": "Search Term"
        },
        "sort": {
          "type": "string",
          "enum": [
            "comments",
            "created",
            "updated"
          ],
          "description": "The sort field. Can be comments, created, or updated. Default: results are sorted by best match."
        },
        "order": {
          "type": "string",
          "enum": [
            "asc",
            "desc"
          ],
          "default": "desc",
          "description": "asc or desc"
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "Search issues."
    },
    "users": {
      "url": "/search/users",
      "method": "GET",
      "params": {
        "q": {
          "type": "string",
          "required": true,
          "description": "Search Term"
        },
        "sort": {
          "type": "string",
          "enum": [
            "followers",
            "repositories",
            "joined"
          ],
          "description": "The sort field. Can be followers, repositories, or joined. Default: results are sorted by best match."
        },
        "order": {
          "type": "string",
          "enum": [
            "asc",
            "desc"
          ],
          "default": "desc",
          "description": "asc or desc"
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "Search users."
    }
  },
  "users": {
    "get": {
      "url": "/user",
      "method": "GET",
      "params": {},
      "description": "Get the authenticated user"
    },
    "update": {
      "url": "/user",
      "method": "PATCH",
      "params": {
        "name": {
          "type": "string",
          "description": "The new name of the user"
        },
        "email": {
          "type": "string",
          "description": "Publicly visible email address."
        },
        "blog": {
          "type": "string",
          "description": "The new blog URL of the user."
        },
        "company": {
          "type": "string",
          "description": "The new company of the user."
        },
        "location": {
          "type": "string",
          "description": "The new location of the user."
        },
        "hireable": {
          "type": "boolean",
          "description": "The new hiring availability of the user."
        },
        "bio": {
          "type": "string",
          "description": "The new short biography of the user."
        }
      },
      "description": "Update the authenticated user"
    },
    "promote": {
      "url": "/users/:username/site_admin",
      "method": "PUT",
      "params": {
        "username": {
          "type": "string",
          "required": true
        }
      },
      "description": "Promote an ordinary user to a site administrator"
    },
    "demote": {
      "url": "/users/:username/site_admin",
      "method": "DELETE",
      "params": {
        "username": {
          "type": "string",
          "required": true
        }
      },
      "description": "Demote a site administrator to an ordinary user"
    },
    "suspend": {
      "url": "/users/:username/suspended",
      "method": "PUT",
      "params": {
        "username": {
          "type": "string",
          "required": true
        }
      },
      "description": "Suspend a user"
    },
    "unsuspend": {
      "url": "/users/:username/suspended",
      "method": "DELETE",
      "params": {
        "username": {
          "type": "string",
          "required": true
        }
      },
      "description": "Unsuspend a user"
    },
    "getForUser": {
      "url": "/users/:username",
      "method": "GET",
      "params": {
        "username": {
          "type": "string",
          "required": true
        }
      },
      "description": "Get a single user"
    },
    "getById": {
      "url": "/user/:id",
      "method": "GET",
      "params": {
        "id": {
          "type": "string",
          "required": true,
          "description": "Numerical ID of the user."
        }
      },
      "description": "Get a single user by GitHub ID. This method uses numerical user ID. Use users.getForUser method if you need to get a user by username."
    },
    "getAll": {
      "url": "/users",
      "method": "GET",
      "params": {
        "since": {
          "type": "number",
          "description": "The integer ID of the last User that you’ve seen."
        }
      },
      "description": "Get all users"
    },
    "getOrgs": {
      "url": "/user/orgs",
      "method": "GET",
      "params": {
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List organizations for the authenticated user."
    },
    "getOrgMemberships": {
      "url": "/user/memberships/orgs",
      "method": "GET",
      "params": {
        "state": {
          "type": "string",
          "enum": [
            "active",
            "pending"
          ],
          "description": "Indicates the state of the memberships to return. Can be either active or pending. If not specified, both active and pending memberships are returned."
        }
      },
      "description": "List your organization memberships"
    },
    "getOrgMembership": {
      "url": "/user/memberships/orgs/:org",
      "method": "GET",
      "params": {
        "org": {
          "type": "string",
          "required": true
        }
      },
      "description": "Get your organization membership"
    },
    "editOrgMembership": {
      "url": "/user/memberships/orgs/:org",
      "method": "PATCH",
      "params": {
        "org": {
          "type": "string",
          "required": true
        },
        "state": {
          "type": "string",
          "required": true,
          "enum": [
            "active"
          ],
          "description": "The state that the membership should be in. Only \"active\" will be accepted."
        }
      },
      "description": "Edit your organization membership."
    },
    "getTeams": {
      "url": "/user/teams",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.hellcat-preview+json"
      },
      "params": {
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "Get your teams."
    },
    "getEmails": {
      "url": "/user/emails",
      "method": "GET",
      "params": {
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List email addresses for a user."
    },
    "getPublicEmails": {
      "url": "/user/public_emails",
      "method": "GET",
      "params": {
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List public email addresses for a user."
    },
    "addEmails": {
      "url": "/user/emails",
      "method": "POST",
      "params": {
        "emails": {
          "type": "string[]",
          "required": true,
          "mapTo": "input",
          "description": "You can post a single email address or an array of addresses."
        }
      },
      "description": "Add email address(es)."
    },
    "deleteEmails": {
      "url": "/user/emails",
      "method": "DELETE",
      "params": {
        "emails": {
          "type": "string[]",
          "required": true,
          "mapTo": "input",
          "description": "You can post a single email address or an array of addresses."
        }
      },
      "description": "Delete email address(es)."
    },
    "togglePrimaryEmailVisibility": {
      "url": "/user/email/visibility",
      "method": "PATCH",
      "params": {},
      "description": "Toggle primary email visibility."
    },
    "getFollowersForUser": {
      "url": "/users/:username/followers",
      "method": "GET",
      "params": {
        "username": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List a user's followers"
    },
    "getFollowers": {
      "url": "/user/followers",
      "method": "GET",
      "params": {
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List the authenticated user's followers"
    },
    "getFollowingForUser": {
      "url": "/users/:username/following",
      "method": "GET",
      "params": {
        "username": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List who a user is following"
    },
    "getFollowing": {
      "url": "/user/following",
      "method": "GET",
      "params": {
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List who the authenticated user is following"
    },
    "checkFollowing": {
      "url": "/user/following/:username",
      "method": "GET",
      "params": {
        "username": {
          "type": "string",
          "required": true
        }
      },
      "description": "Check if you are following a user"
    },
    "checkIfOneFollowersOther": {
      "url": "/users/:username/following/:target_user",
      "method": "GET",
      "params": {
        "username": {
          "type": "string",
          "required": true
        },
        "target_user": {
          "type": "string",
          "required": true
        }
      },
      "description": "Check if one user follows another"
    },
    "followUser": {
      "url": "/user/following/:username",
      "method": "PUT",
      "params": {
        "username": {
          "type": "string",
          "required": true
        }
      },
      "description": "Follow a user"
    },
    "unfollowUser": {
      "url": "/user/following/:username",
      "method": "DELETE",
      "params": {
        "username": {
          "type": "string",
          "required": true
        }
      },
      "description": "Unfollow a user"
    },
    "getKeysForUser": {
      "url": "/users/:username/keys",
      "method": "GET",
      "params": {
        "username": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List public keys for a user"
    },
    "getKeys": {
      "url": "/user/keys",
      "method": "GET",
      "params": {
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List your public keys"
    },
    "getKey": {
      "url": "/user/keys/:id",
      "method": "GET",
      "params": {
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Get a single public key"
    },
    "createKey": {
      "url": "/user/keys",
      "method": "POST",
      "params": {
        "title": {
          "type": "string",
          "required": true
        },
        "key": {
          "type": "string",
          "required": true
        }
      },
      "description": "Create a public key"
    },
    "deleteKey": {
      "url": "/user/keys/:id",
      "method": "DELETE",
      "params": {
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Delete a public key"
    },
    "getGpgKeysForUser": {
      "url": "/users/:username/gpg_keys",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.cryptographer-preview"
      },
      "params": {
        "username": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "Lists the GPG keys for a user. This information is accessible by anyone. (In preview period. See README.)"
    },
    "getGpgKeys": {
      "url": "/user/gpg_keys",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.cryptographer-preview"
      },
      "params": {
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List your GPG keys. (In preview period. See README.)"
    },
    "getGpgKey": {
      "url": "/user/gpg_keys/:id",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.cryptographer-preview"
      },
      "params": {
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Get a single GPG key. (In preview period. See README.)"
    },
    "createGpgKey": {
      "url": "/user/gpg_keys",
      "method": "POST",
      "headers": {
        "accept": "application/vnd.github.cryptographer-preview"
      },
      "params": {
        "armored_public_key": {
          "type": "string",
          "required": true,
          "description": "GPG key contents"
        }
      },
      "description": "Create a GPG key. (In preview period. See README.)"
    },
    "deleteGpgKey": {
      "url": "/user/gpg_keys/:id",
      "method": "DELETE",
      "headers": {
        "accept": "application/vnd.github.cryptographer-preview"
      },
      "params": {
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Delete a GPG key. (In preview period. See README.)"
    },
    "getBlockedUsers": {
      "url": "/user/blocks",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.giant-sentry-fist-preview+json"
      },
      "params": {},
      "description": "List blocked users. (In preview period. See README.)"
    },
    "checkBlockedUser": {
      "url": "/user/blocks/:username",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.giant-sentry-fist-preview+json"
      },
      "params": {
        "username": {
          "type": "string",
          "required": true
        }
      },
      "description": "Check whether you've blocked a user. (In preview period. See README.)"
    },
    "blockUser": {
      "url": "/user/blocks/:username",
      "method": "PUT",
      "headers": {
        "accept": "application/vnd.github.giant-sentry-fist-preview+json"
      },
      "params": {
        "username": {
          "type": "string",
          "required": true
        }
      },
      "description": "Block a user. (In preview period. See README.)"
    },
    "unblockUser": {
      "url": "/user/blocks/:username",
      "method": "DELETE",
      "headers": {
        "accept": "application/vnd.github.giant-sentry-fist-preview+json"
      },
      "params": {
        "username": {
          "type": "string",
          "required": true
        }
      },
      "description": "Unblock a user. (In preview period. See README.)"
    },
    "getRepoInvites": {
      "url": "/user/repository_invitations",
      "method": "GET",
      "params": {},
      "description": "List a user's repository invitations."
    },
    "acceptRepoInvite": {
      "url": "/user/repository_invitations/:invitation_id",
      "method": "PATCH",
      "params": {
        "invitation_id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Accept a repository invitation."
    },
    "declineRepoInvite": {
      "url": "/user/repository_invitations/:invitation_id",
      "method": "DELETE",
      "params": {
        "invitation_id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Decline a repository invitation."
    },
    "getInstallations": {
      "url": "/user/installations",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.machine-man-preview"
      },
      "params": {
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List installations. (In preview period. See README.)"
    },
    "getInstallationRepos": {
      "url": "/user/installations/:installation_id/repositories",
      "method": "GET",
      "params": {
        "installation_id": {
          "type": "string",
          "required": true
        },
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "List repositories accessible to the user for an installation. (In preview period. See README.)"
    },
    "addRepoToInstallation": {
      "url": "/user/installations/:installation_id/repositories/:repository_id",
      "method": "PUT",
      "headers": {
        "accept": "application/vnd.github.machine-man-preview"
      },
      "params": {
        "installation_id": {
          "type": "string",
          "required": true
        },
        "repository_id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Add a single repository to an installation. (In preview period. See README.)"
    },
    "removeRepoFromInstallation": {
      "url": "/user/installations/:installation_id/repositories/:repository_id",
      "method": "DELETE",
      "headers": {
        "accept": "application/vnd.github.machine-man-preview"
      },
      "params": {
        "installation_id": {
          "type": "string",
          "required": true
        },
        "repository_id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Remove a single repository from an installation. (In preview period. See README.)"
    },
    "getMarketplacePurchases": {
      "url": "/user/marketplace_purchases",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.valkyrie-preview+json"
      },
      "params": {
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "Get a user's Marketplace purchases. (In preview period. See README.)"
    },
    "getMarketplaceStubbedPurchases": {
      "url": "/user/marketplace_purchases/stubbed",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.valkyrie-preview+json"
      },
      "params": {
        "page": {
          "type": "number",
          "description": "Page number of the results to fetch."
        },
        "per_page": {
          "type": "number",
          "default": "30",
          "description": "A custom page size up to 100. Default is 30."
        }
      },
      "description": "Get a user's stubbed Marketplace purchases. (In preview period. See README.)"
    }
  },
  "enterprise": {
    "stats": {
      "url": "/enterprise/stats/:type",
      "method": "GET",
      "params": {
        "type": {
          "type": "string",
          "required": true,
          "enum": [
            "issues",
            "hooks",
            "milestones",
            "orgs",
            "comments",
            "pages",
            "users",
            "gists",
            "pulls",
            "repos",
            "all"
          ],
          "description": "Possible values: issues, hooks, milestones, orgs, comments, pages, users, gists, pulls, repos, all."
        }
      },
      "description": "Get statistics."
    },
    "updateLdapForUser": {
      "url": "/admin/ldap/users/:username/mapping",
      "method": "PATCH",
      "params": {
        "username": {
          "type": "string",
          "required": true
        },
        "ldap_dn": {
          "type": "string",
          "required": true,
          "description": "LDAP DN for user"
        }
      },
      "description": "Update LDAP mapping for a user."
    },
    "syncLdapForUser": {
      "url": "/admin/ldap/users/:username/sync",
      "method": "POST",
      "params": {
        "username": {
          "type": "string",
          "required": true
        }
      },
      "description": "Sync LDAP mapping for a user."
    },
    "updateLdapForTeam": {
      "url": "/admin/ldap/teams/:team_id/mapping",
      "method": "PATCH",
      "params": {
        "team_id": {
          "type": "number",
          "required": true
        },
        "ldap_dn": {
          "type": "string",
          "required": true,
          "description": "LDAP DN for user"
        }
      },
      "description": "Update LDAP mapping for a team."
    },
    "syncLdapForTeam": {
      "url": "/admin/ldap/teams/:team_id/sync",
      "method": "POST",
      "params": {
        "team_id": {
          "type": "number",
          "required": true
        }
      },
      "description": "Sync LDAP mapping for a team."
    },
    "getLicense": {
      "url": "/enterprise/settings/license",
      "method": "GET",
      "params": {},
      "description": "Get license information"
    },
    "getPreReceiveEnvironment": {
      "url": "/admin/pre-receive-environments/:id",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.eye-scream-preview"
      },
      "params": {
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Get a single pre-receive environment. (In preview period. See README.)"
    },
    "getPreReceiveEnvironments": {
      "url": "/admin/pre_receive_environments",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.eye-scream-preview"
      },
      "params": {},
      "description": "List pre-receive environments. (In preview period. See README.)"
    },
    "createPreReceiveEnvironment": {
      "url": "/admin/pre_receive_environments",
      "method": "POST",
      "headers": {
        "accept": "application/vnd.github.eye-scream-preview"
      },
      "params": {
        "name": {
          "type": "string",
          "required": true,
          "description": "The new pre-receive environment's name."
        },
        "image_url": {
          "type": "string",
          "required": true,
          "description": "URL from which to download a tarball of this environment."
        }
      },
      "description": "Create a pre-receive environment. (In preview period. See README.)"
    },
    "editPreReceiveEnvironment": {
      "url": "/admin/pre_receive_environments/:id",
      "method": "PATCH",
      "params": {
        "id": {
          "type": "string",
          "required": true
        },
        "name": {
          "type": "string",
          "required": true,
          "description": "This pre-receive environment's new name."
        },
        "image_url": {
          "type": "string",
          "required": true,
          "description": "URL from which to download a tarball of this environment."
        }
      },
      "description": "Create a pre-receive environment. (In preview period. See README.)"
    },
    "deletePreReceiveEnvironment": {
      "url": "/admin/pre_receive_environments/:id",
      "method": "DELETE",
      "params": {
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Delete a pre-receive environment. (In preview period. See README.)"
    },
    "getPreReceiveEnvironmentDownloadStatus": {
      "url": "/admin/pre-receive-environments/:id/downloads/latest",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.eye-scream-preview"
      },
      "params": {
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Get a pre-receive environment's download status. (In preview period. See README.)"
    },
    "triggerPreReceiveEnvironmentDownload": {
      "url": "/admin/pre_receive_environments/:id/downloads",
      "method": "POST",
      "headers": {
        "accept": "application/vnd.github.eye-scream-preview"
      },
      "params": {
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Trigger a pre-receive environment download. (In preview period. See README.)"
    },
    "getPreReceiveHook": {
      "url": "/admin/pre-receive-hooks/:id",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.eye-scream-preview"
      },
      "params": {
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Get a single pre-receive hook. (In preview period. See README.)"
    },
    "getPreReceiveHooks": {
      "url": "/admin/pre-receive-hooks",
      "method": "GET",
      "headers": {
        "accept": "application/vnd.github.eye-scream-preview"
      },
      "params": {},
      "description": "List pre-receive hooks. (In preview period. See README.)"
    },
    "createPreReceiveHook": {
      "url": "/admin/pre-receive-hooks",
      "method": "POST",
      "headers": {
        "accept": "application/vnd.github.eye-scream-preview"
      },
      "params": {
        "name": {
          "type": "string",
          "required": true,
          "description": "The name of the hook."
        },
        "script": {
          "type": "string",
          "required": true,
          "description": "The script that the hook runs."
        },
        "script_repository": {
          "type": "json",
          "required": true,
          "description": "The GitHub repository where the script is kept."
        },
        "environment": {
          "type": "json",
          "required": true,
          "description": "The pre-receive environment where the script is executed."
        },
        "enforcement": {
          "type": "string",
          "default": "disabled",
          "description": "The state of enforcement for this hook. default: disabled"
        },
        "allow_downstream_configuration": {
          "type": "boolean",
          "default": "false",
          "description": "Whether enforcement can be overridden at the org or repo level. default: false"
        }
      },
      "description": "Create a pre-receive hook. (In preview period. See README.)"
    },
    "editPreReceiveHook": {
      "url": "/admin/pre_receive_hooks/:id",
      "method": "PATCH",
      "params": {
        "id": {
          "type": "string",
          "required": true
        },
        "hook": {
          "type": "json",
          "required": true,
          "mapTo": "input",
          "description": "JSON object that contains pre-receive hook info."
        }
      },
      "description": "Edit a pre-receive hook. (In preview period. See README.)"
    },
    "deletePreReceiveHook": {
      "url": "/admin/pre_receive_hooks/:id",
      "method": "DELETE",
      "params": {
        "id": {
          "type": "string",
          "required": true
        }
      },
      "description": "Delete a pre-receive hook. (In preview period. See README.)"
    },
    "queueIndexingJob": {
      "url": "/staff/indexing_jobs",
      "method": "POST",
      "params": {
        "target": {
          "type": "string",
          "required": true,
          "description": "A string representing the item to index."
        }
      },
      "description": "Queue an indexing job"
    },
    "createOrg": {
      "url": "/admin/organizations",
      "method": "POST",
      "params": {
        "login": {
          "type": "string",
          "required": true,
          "description": "The organization's username."
        },
        "admin": {
          "type": "string",
          "required": true,
          "description": "The login of the user who will manage this organization."
        },
        "profile_name": {
          "type": "string",
          "description": "The organization's display name."
        }
      },
      "description": "Create an organization"
    }
  }
}

},{}],32:[function(require,module,exports){
(function (process){
/**
 * This is the web browser implementation of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = require('./debug');
exports.log = log;
exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;
exports.storage = 'undefined' != typeof chrome
               && 'undefined' != typeof chrome.storage
                  ? chrome.storage.local
                  : localstorage();

/**
 * Colors.
 */

exports.colors = [
  '#0000CC', '#0000FF', '#0033CC', '#0033FF', '#0066CC', '#0066FF', '#0099CC',
  '#0099FF', '#00CC00', '#00CC33', '#00CC66', '#00CC99', '#00CCCC', '#00CCFF',
  '#3300CC', '#3300FF', '#3333CC', '#3333FF', '#3366CC', '#3366FF', '#3399CC',
  '#3399FF', '#33CC00', '#33CC33', '#33CC66', '#33CC99', '#33CCCC', '#33CCFF',
  '#6600CC', '#6600FF', '#6633CC', '#6633FF', '#66CC00', '#66CC33', '#9900CC',
  '#9900FF', '#9933CC', '#9933FF', '#99CC00', '#99CC33', '#CC0000', '#CC0033',
  '#CC0066', '#CC0099', '#CC00CC', '#CC00FF', '#CC3300', '#CC3333', '#CC3366',
  '#CC3399', '#CC33CC', '#CC33FF', '#CC6600', '#CC6633', '#CC9900', '#CC9933',
  '#CCCC00', '#CCCC33', '#FF0000', '#FF0033', '#FF0066', '#FF0099', '#FF00CC',
  '#FF00FF', '#FF3300', '#FF3333', '#FF3366', '#FF3399', '#FF33CC', '#FF33FF',
  '#FF6600', '#FF6633', '#FF9900', '#FF9933', '#FFCC00', '#FFCC33'
];

/**
 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
 * and the Firebug extension (any Firefox version) are known
 * to support "%c" CSS customizations.
 *
 * TODO: add a `localStorage` variable to explicitly enable/disable colors
 */

function useColors() {
  // NB: In an Electron preload script, document will be defined but not fully
  // initialized. Since we know we're in Chrome, we'll just detect this case
  // explicitly
  if (typeof window !== 'undefined' && window.process && window.process.type === 'renderer') {
    return true;
  }

  // Internet Explorer and Edge do not support colors.
  if (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
    return false;
  }

  // is webkit? http://stackoverflow.com/a/16459606/376773
  // document is undefined in react-native: https://github.com/facebook/react-native/pull/1632
  return (typeof document !== 'undefined' && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance) ||
    // is firebug? http://stackoverflow.com/a/398120/376773
    (typeof window !== 'undefined' && window.console && (window.console.firebug || (window.console.exception && window.console.table))) ||
    // is firefox >= v31?
    // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
    (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31) ||
    // double check webkit in userAgent just in case we are in a worker
    (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/));
}

/**
 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
 */

exports.formatters.j = function(v) {
  try {
    return JSON.stringify(v);
  } catch (err) {
    return '[UnexpectedJSONParseError]: ' + err.message;
  }
};


/**
 * Colorize log arguments if enabled.
 *
 * @api public
 */

function formatArgs(args) {
  var useColors = this.useColors;

  args[0] = (useColors ? '%c' : '')
    + this.namespace
    + (useColors ? ' %c' : ' ')
    + args[0]
    + (useColors ? '%c ' : ' ')
    + '+' + exports.humanize(this.diff);

  if (!useColors) return;

  var c = 'color: ' + this.color;
  args.splice(1, 0, c, 'color: inherit')

  // the final "%c" is somewhat tricky, because there could be other
  // arguments passed either before or after the %c, so we need to
  // figure out the correct index to insert the CSS into
  var index = 0;
  var lastC = 0;
  args[0].replace(/%[a-zA-Z%]/g, function(match) {
    if ('%%' === match) return;
    index++;
    if ('%c' === match) {
      // we only are interested in the *last* %c
      // (the user may have provided their own)
      lastC = index;
    }
  });

  args.splice(lastC, 0, c);
}

/**
 * Invokes `console.log()` when available.
 * No-op when `console.log` is not a "function".
 *
 * @api public
 */

function log() {
  // this hackery is required for IE8/9, where
  // the `console.log` function doesn't have 'apply'
  return 'object' === typeof console
    && console.log
    && Function.prototype.apply.call(console.log, console, arguments);
}

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */

function save(namespaces) {
  try {
    if (null == namespaces) {
      exports.storage.removeItem('debug');
    } else {
      exports.storage.debug = namespaces;
    }
  } catch(e) {}
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */

function load() {
  var r;
  try {
    r = exports.storage.debug;
  } catch(e) {}

  // If debug isn't set in LS, and we're in Electron, try to load $DEBUG
  if (!r && typeof process !== 'undefined' && 'env' in process) {
    r = process.env.DEBUG;
  }

  return r;
}

/**
 * Enable namespaces listed in `localStorage.debug` initially.
 */

exports.enable(load());

/**
 * Localstorage attempts to return the localstorage.
 *
 * This is necessary because safari throws
 * when a user disables cookies/localstorage
 * and you attempt to access it.
 *
 * @return {LocalStorage}
 * @api private
 */

function localstorage() {
  try {
    return window.localStorage;
  } catch (e) {}
}

}).call(this,require('_process'))
},{"./debug":33,"_process":259}],33:[function(require,module,exports){

/**
 * This is the common logic for both the Node.js and web browser
 * implementations of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = createDebug.debug = createDebug['default'] = createDebug;
exports.coerce = coerce;
exports.disable = disable;
exports.enable = enable;
exports.enabled = enabled;
exports.humanize = require('ms');

/**
 * Active `debug` instances.
 */
exports.instances = [];

/**
 * The currently active debug mode names, and names to skip.
 */

exports.names = [];
exports.skips = [];

/**
 * Map of special "%n" handling functions, for the debug "format" argument.
 *
 * Valid key names are a single, lower or upper-case letter, i.e. "n" and "N".
 */

exports.formatters = {};

/**
 * Select a color.
 * @param {String} namespace
 * @return {Number}
 * @api private
 */

function selectColor(namespace) {
  var hash = 0, i;

  for (i in namespace) {
    hash  = ((hash << 5) - hash) + namespace.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }

  return exports.colors[Math.abs(hash) % exports.colors.length];
}

/**
 * Create a debugger with the given `namespace`.
 *
 * @param {String} namespace
 * @return {Function}
 * @api public
 */

function createDebug(namespace) {

  var prevTime;

  function debug() {
    // disabled?
    if (!debug.enabled) return;

    var self = debug;

    // set `diff` timestamp
    var curr = +new Date();
    var ms = curr - (prevTime || curr);
    self.diff = ms;
    self.prev = prevTime;
    self.curr = curr;
    prevTime = curr;

    // turn the `arguments` into a proper Array
    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i];
    }

    args[0] = exports.coerce(args[0]);

    if ('string' !== typeof args[0]) {
      // anything else let's inspect with %O
      args.unshift('%O');
    }

    // apply any `formatters` transformations
    var index = 0;
    args[0] = args[0].replace(/%([a-zA-Z%])/g, function(match, format) {
      // if we encounter an escaped % then don't increase the array index
      if (match === '%%') return match;
      index++;
      var formatter = exports.formatters[format];
      if ('function' === typeof formatter) {
        var val = args[index];
        match = formatter.call(self, val);

        // now we need to remove `args[index]` since it's inlined in the `format`
        args.splice(index, 1);
        index--;
      }
      return match;
    });

    // apply env-specific formatting (colors, etc.)
    exports.formatArgs.call(self, args);

    var logFn = debug.log || exports.log || console.log.bind(console);
    logFn.apply(self, args);
  }

  debug.namespace = namespace;
  debug.enabled = exports.enabled(namespace);
  debug.useColors = exports.useColors();
  debug.color = selectColor(namespace);
  debug.destroy = destroy;

  // env-specific initialization logic for debug instances
  if ('function' === typeof exports.init) {
    exports.init(debug);
  }

  exports.instances.push(debug);

  return debug;
}

function destroy () {
  var index = exports.instances.indexOf(this);
  if (index !== -1) {
    exports.instances.splice(index, 1);
    return true;
  } else {
    return false;
  }
}

/**
 * Enables a debug mode by namespaces. This can include modes
 * separated by a colon and wildcards.
 *
 * @param {String} namespaces
 * @api public
 */

function enable(namespaces) {
  exports.save(namespaces);

  exports.names = [];
  exports.skips = [];

  var i;
  var split = (typeof namespaces === 'string' ? namespaces : '').split(/[\s,]+/);
  var len = split.length;

  for (i = 0; i < len; i++) {
    if (!split[i]) continue; // ignore empty strings
    namespaces = split[i].replace(/\*/g, '.*?');
    if (namespaces[0] === '-') {
      exports.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
    } else {
      exports.names.push(new RegExp('^' + namespaces + '$'));
    }
  }

  for (i = 0; i < exports.instances.length; i++) {
    var instance = exports.instances[i];
    instance.enabled = exports.enabled(instance.namespace);
  }
}

/**
 * Disable debug output.
 *
 * @api public
 */

function disable() {
  exports.enable('');
}

/**
 * Returns true if the given mode name is enabled, false otherwise.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

function enabled(name) {
  if (name[name.length - 1] === '*') {
    return true;
  }
  var i, len;
  for (i = 0, len = exports.skips.length; i < len; i++) {
    if (exports.skips[i].test(name)) {
      return false;
    }
  }
  for (i = 0, len = exports.names.length; i < len; i++) {
    if (exports.names[i].test(name)) {
      return true;
    }
  }
  return false;
}

/**
 * Coerce `val`.
 *
 * @param {Mixed} val
 * @return {Mixed}
 * @api private
 */

function coerce(val) {
  if (val instanceof Error) return val.stack || val.message;
  return val;
}

},{"ms":245}],34:[function(require,module,exports){
module.exports={
  "name": "@octokit/rest",
  "version": "15.2.5",
  "publishConfig": {
    "access": "public"
  },
  "description": "GitHub REST API client for Node.js",
  "keywords": [
    "octokit",
    "github",
    "rest",
    "api-client"
  ],
  "author": "Gregor Martynus (https://github.com/gr2m)",
  "contributors": [
    {
      "name": "Mike de Boer",
      "email": "info@mikedeboer.nl"
    },
    {
      "name": "Fabian Jakobs",
      "email": "fabian@c9.io"
    },
    {
      "name": "Joe Gallo",
      "email": "joe@brassafrax.com"
    },
    {
      "name": "Gregor Martynus",
      "url": "https://github.com/gr2m"
    }
  ],
  "repository": "https://github.com/octokit/rest.js",
  "engines": {
    "node": ">=4"
  },
  "dependencies": {
    "before-after-hook": "^1.1.0",
    "btoa-lite": "^1.0.0",
    "debug": "^3.1.0",
    "http-proxy-agent": "^2.1.0",
    "https-proxy-agent": "^2.2.0",
    "lodash": "^4.17.4",
    "node-fetch": "^2.1.1",
    "url-template": "^2.0.8"
  },
  "devDependencies": {
    "@gr2m/node-fetch": "^2.0.0",
    "@octokit/fixtures-server": "^2.0.1",
    "@types/node": "^9.4.6",
    "apidoc": "^0.17.6",
    "bundlesize": "^0.16.0",
    "chai": "^4.1.2",
    "compression-webpack-plugin": "^1.1.6",
    "coveralls": "^3.0.0",
    "cypress": "^2.0.2",
    "dotenv": "^5.0.0",
    "gh-pages-with-token": "^1.0.0",
    "glob": "^7.1.2",
    "mkdirp": "^0.5.1",
    "mocha": "^5.0.0",
    "mustache": "^2.2.1",
    "nock": "^9.1.0",
    "npm-run-all": "^4.1.2",
    "nyc": "^11.2.1",
    "proxy": "^0.2.4",
    "proxyquire": "^2.0.0",
    "semantic-release": "^15.0.0",
    "sinon": "^4.2.2",
    "sinon-chai": "^3.0.0",
    "standard": "^11.0.0",
    "standard-markdown": "^4.0.2",
    "string-to-arraybuffer": "^1.0.0",
    "typescript": "^2.6.2",
    "webpack": "^4.0.0",
    "webpack-bundle-analyzer": "^2.10.0",
    "webpack-cli": "^2.0.4"
  },
  "browser": {
    "./lib/get-request-agent.js": false,
    "./lib/request/get-buffer-response.js": "./lib/request/get-buffer-response-browser.js"
  },
  "types": "index.d.ts",
  "scripts": {
    "coverage": "nyc report --reporter=html && open coverage/index.html",
    "coverage:upload": "nyc report --reporter=text-lcov | coveralls",
    "pretest": "standard && standard-markdown",
    "test": "nyc mocha test/mocha-node-setup.js \"test/**/*-test.js\"",
    "test:browser": "cypress run --browser chrome",
    "test:examples": "node test/examples.js",
    "build": "npm-run-all build:*",
    "prebuild:docs": "mkdirp doc/",
    "build:docs": "node scripts/generate-api-docs",
    "postbuild:docs": "apidoc -i doc/ -o doc/",
    "build:flow": "node scripts/generate-flow-types",
    "build:ts": "node scripts/generate-typescript-types",
    "prebuild:browser": "mkdirp dist/",
    "build:browser": "npm-run-all build:browser:*",
    "build:browser:development": "webpack --mode development --entry . --output-library=Octokit --output=./dist/octokit-rest.js --profile --json > dist/bundle-stats.json",
    "build:browser:production": "webpack --mode production --entry . --plugin=compression-webpack-plugin --output-library=Octokit --output-path=./dist --output-filename=octokit-rest.min.js --devtool source-map",
    "generate-bundle-report": "webpack-bundle-analyzer dist/bundle-stats.json --mode=static --no-open --report dist/bundle-report.html",
    "prevalidate:ts": "npm run -s build:ts",
    "validate:ts": "tsc --target es6 index.d.ts",
    "postvalidate:ts": "tsc --noEmit test/typescript-validate.ts",
    "deploy-docs": "gh-pages-with-token -d doc",
    "semantic-release": "semantic-release",
    "start-fixtures-server": "octokit-fixtures-server"
  },
  "license": "MIT",
  "files": [
    "index.js",
    "index.d.ts",
    "index.js.flow",
    "lib"
  ],
  "apidoc": {
    "template": {
      "withCompare": false
    }
  },
  "nyc": {
    "ignore": [
      "examples",
      "test"
    ]
  },
  "release": {
    "publish": [
      "@semantic-release/npm",
      {
        "path": "@semantic-release/github",
        "assets": [
          "dist/*",
          "!dist/*.map.gz"
        ]
      }
    ]
  },
  "standard": {
    "globals": [
      "describe",
      "before",
      "beforeEach",
      "afterEach",
      "after",
      "it",
      "expect",
      "cy"
    ]
  },
  "bundlesize": [
    {
      "path": "./dist/octokit-rest.min.js.gz",
      "maxSize": "33 kB"
    }
  ]
}

},{}],35:[function(require,module,exports){
(function (global){
'use strict';

// compare and isBuffer taken from https://github.com/feross/buffer/blob/680e9e5e488f22aac27599a57dc844a6315928dd/index.js
// original notice:

/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
function compare(a, b) {
  if (a === b) {
    return 0;
  }

  var x = a.length;
  var y = b.length;

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i];
      y = b[i];
      break;
    }
  }

  if (x < y) {
    return -1;
  }
  if (y < x) {
    return 1;
  }
  return 0;
}
function isBuffer(b) {
  if (global.Buffer && typeof global.Buffer.isBuffer === 'function') {
    return global.Buffer.isBuffer(b);
  }
  return !!(b != null && b._isBuffer);
}

// based on node assert, original notice:

// http://wiki.commonjs.org/wiki/Unit_Testing/1.0
//
// THIS IS NOT TESTED NOR LIKELY TO WORK OUTSIDE V8!
//
// Originally from narwhal.js (http://narwhaljs.org)
// Copyright (c) 2009 Thomas Robinson <280north.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the 'Software'), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
// ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

var util = require('util/');
var hasOwn = Object.prototype.hasOwnProperty;
var pSlice = Array.prototype.slice;
var functionsHaveNames = (function () {
  return function foo() {}.name === 'foo';
}());
function pToString (obj) {
  return Object.prototype.toString.call(obj);
}
function isView(arrbuf) {
  if (isBuffer(arrbuf)) {
    return false;
  }
  if (typeof global.ArrayBuffer !== 'function') {
    return false;
  }
  if (typeof ArrayBuffer.isView === 'function') {
    return ArrayBuffer.isView(arrbuf);
  }
  if (!arrbuf) {
    return false;
  }
  if (arrbuf instanceof DataView) {
    return true;
  }
  if (arrbuf.buffer && arrbuf.buffer instanceof ArrayBuffer) {
    return true;
  }
  return false;
}
// 1. The assert module provides functions that throw
// AssertionError's when particular conditions are not met. The
// assert module must conform to the following interface.

var assert = module.exports = ok;

// 2. The AssertionError is defined in assert.
// new assert.AssertionError({ message: message,
//                             actual: actual,
//                             expected: expected })

var regex = /\s*function\s+([^\(\s]*)\s*/;
// based on https://github.com/ljharb/function.prototype.name/blob/adeeeec8bfcc6068b187d7d9fb3d5bb1d3a30899/implementation.js
function getName(func) {
  if (!util.isFunction(func)) {
    return;
  }
  if (functionsHaveNames) {
    return func.name;
  }
  var str = func.toString();
  var match = str.match(regex);
  return match && match[1];
}
assert.AssertionError = function AssertionError(options) {
  this.name = 'AssertionError';
  this.actual = options.actual;
  this.expected = options.expected;
  this.operator = options.operator;
  if (options.message) {
    this.message = options.message;
    this.generatedMessage = false;
  } else {
    this.message = getMessage(this);
    this.generatedMessage = true;
  }
  var stackStartFunction = options.stackStartFunction || fail;
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, stackStartFunction);
  } else {
    // non v8 browsers so we can have a stacktrace
    var err = new Error();
    if (err.stack) {
      var out = err.stack;

      // try to strip useless frames
      var fn_name = getName(stackStartFunction);
      var idx = out.indexOf('\n' + fn_name);
      if (idx >= 0) {
        // once we have located the function frame
        // we need to strip out everything before it (and its line)
        var next_line = out.indexOf('\n', idx + 1);
        out = out.substring(next_line + 1);
      }

      this.stack = out;
    }
  }
};

// assert.AssertionError instanceof Error
util.inherits(assert.AssertionError, Error);

function truncate(s, n) {
  if (typeof s === 'string') {
    return s.length < n ? s : s.slice(0, n);
  } else {
    return s;
  }
}
function inspect(something) {
  if (functionsHaveNames || !util.isFunction(something)) {
    return util.inspect(something);
  }
  var rawname = getName(something);
  var name = rawname ? ': ' + rawname : '';
  return '[Function' +  name + ']';
}
function getMessage(self) {
  return truncate(inspect(self.actual), 128) + ' ' +
         self.operator + ' ' +
         truncate(inspect(self.expected), 128);
}

// At present only the three keys mentioned above are used and
// understood by the spec. Implementations or sub modules can pass
// other keys to the AssertionError's constructor - they will be
// ignored.

// 3. All of the following functions must throw an AssertionError
// when a corresponding condition is not met, with a message that
// may be undefined if not provided.  All assertion methods provide
// both the actual and expected values to the assertion error for
// display purposes.

function fail(actual, expected, message, operator, stackStartFunction) {
  throw new assert.AssertionError({
    message: message,
    actual: actual,
    expected: expected,
    operator: operator,
    stackStartFunction: stackStartFunction
  });
}

// EXTENSION! allows for well behaved errors defined elsewhere.
assert.fail = fail;

// 4. Pure assertion tests whether a value is truthy, as determined
// by !!guard.
// assert.ok(guard, message_opt);
// This statement is equivalent to assert.equal(true, !!guard,
// message_opt);. To test strictly for the value true, use
// assert.strictEqual(true, guard, message_opt);.

function ok(value, message) {
  if (!value) fail(value, true, message, '==', assert.ok);
}
assert.ok = ok;

// 5. The equality assertion tests shallow, coercive equality with
// ==.
// assert.equal(actual, expected, message_opt);

assert.equal = function equal(actual, expected, message) {
  if (actual != expected) fail(actual, expected, message, '==', assert.equal);
};

// 6. The non-equality assertion tests for whether two objects are not equal
// with != assert.notEqual(actual, expected, message_opt);

assert.notEqual = function notEqual(actual, expected, message) {
  if (actual == expected) {
    fail(actual, expected, message, '!=', assert.notEqual);
  }
};

// 7. The equivalence assertion tests a deep equality relation.
// assert.deepEqual(actual, expected, message_opt);

assert.deepEqual = function deepEqual(actual, expected, message) {
  if (!_deepEqual(actual, expected, false)) {
    fail(actual, expected, message, 'deepEqual', assert.deepEqual);
  }
};

assert.deepStrictEqual = function deepStrictEqual(actual, expected, message) {
  if (!_deepEqual(actual, expected, true)) {
    fail(actual, expected, message, 'deepStrictEqual', assert.deepStrictEqual);
  }
};

function _deepEqual(actual, expected, strict, memos) {
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;
  } else if (isBuffer(actual) && isBuffer(expected)) {
    return compare(actual, expected) === 0;

  // 7.2. If the expected value is a Date object, the actual value is
  // equivalent if it is also a Date object that refers to the same time.
  } else if (util.isDate(actual) && util.isDate(expected)) {
    return actual.getTime() === expected.getTime();

  // 7.3 If the expected value is a RegExp object, the actual value is
  // equivalent if it is also a RegExp object with the same source and
  // properties (`global`, `multiline`, `lastIndex`, `ignoreCase`).
  } else if (util.isRegExp(actual) && util.isRegExp(expected)) {
    return actual.source === expected.source &&
           actual.global === expected.global &&
           actual.multiline === expected.multiline &&
           actual.lastIndex === expected.lastIndex &&
           actual.ignoreCase === expected.ignoreCase;

  // 7.4. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if ((actual === null || typeof actual !== 'object') &&
             (expected === null || typeof expected !== 'object')) {
    return strict ? actual === expected : actual == expected;

  // If both values are instances of typed arrays, wrap their underlying
  // ArrayBuffers in a Buffer each to increase performance
  // This optimization requires the arrays to have the same type as checked by
  // Object.prototype.toString (aka pToString). Never perform binary
  // comparisons for Float*Arrays, though, since e.g. +0 === -0 but their
  // bit patterns are not identical.
  } else if (isView(actual) && isView(expected) &&
             pToString(actual) === pToString(expected) &&
             !(actual instanceof Float32Array ||
               actual instanceof Float64Array)) {
    return compare(new Uint8Array(actual.buffer),
                   new Uint8Array(expected.buffer)) === 0;

  // 7.5 For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else if (isBuffer(actual) !== isBuffer(expected)) {
    return false;
  } else {
    memos = memos || {actual: [], expected: []};

    var actualIndex = memos.actual.indexOf(actual);
    if (actualIndex !== -1) {
      if (actualIndex === memos.expected.indexOf(expected)) {
        return true;
      }
    }

    memos.actual.push(actual);
    memos.expected.push(expected);

    return objEquiv(actual, expected, strict, memos);
  }
}

function isArguments(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}

function objEquiv(a, b, strict, actualVisitedObjects) {
  if (a === null || a === undefined || b === null || b === undefined)
    return false;
  // if one is a primitive, the other must be same
  if (util.isPrimitive(a) || util.isPrimitive(b))
    return a === b;
  if (strict && Object.getPrototypeOf(a) !== Object.getPrototypeOf(b))
    return false;
  var aIsArgs = isArguments(a);
  var bIsArgs = isArguments(b);
  if ((aIsArgs && !bIsArgs) || (!aIsArgs && bIsArgs))
    return false;
  if (aIsArgs) {
    a = pSlice.call(a);
    b = pSlice.call(b);
    return _deepEqual(a, b, strict);
  }
  var ka = objectKeys(a);
  var kb = objectKeys(b);
  var key, i;
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length !== kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] !== kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!_deepEqual(a[key], b[key], strict, actualVisitedObjects))
      return false;
  }
  return true;
}

// 8. The non-equivalence assertion tests for any deep inequality.
// assert.notDeepEqual(actual, expected, message_opt);

assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
  if (_deepEqual(actual, expected, false)) {
    fail(actual, expected, message, 'notDeepEqual', assert.notDeepEqual);
  }
};

assert.notDeepStrictEqual = notDeepStrictEqual;
function notDeepStrictEqual(actual, expected, message) {
  if (_deepEqual(actual, expected, true)) {
    fail(actual, expected, message, 'notDeepStrictEqual', notDeepStrictEqual);
  }
}


// 9. The strict equality assertion tests strict equality, as determined by ===.
// assert.strictEqual(actual, expected, message_opt);

assert.strictEqual = function strictEqual(actual, expected, message) {
  if (actual !== expected) {
    fail(actual, expected, message, '===', assert.strictEqual);
  }
};

// 10. The strict non-equality assertion tests for strict inequality, as
// determined by !==.  assert.notStrictEqual(actual, expected, message_opt);

assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
  if (actual === expected) {
    fail(actual, expected, message, '!==', assert.notStrictEqual);
  }
};

function expectedException(actual, expected) {
  if (!actual || !expected) {
    return false;
  }

  if (Object.prototype.toString.call(expected) == '[object RegExp]') {
    return expected.test(actual);
  }

  try {
    if (actual instanceof expected) {
      return true;
    }
  } catch (e) {
    // Ignore.  The instanceof check doesn't work for arrow functions.
  }

  if (Error.isPrototypeOf(expected)) {
    return false;
  }

  return expected.call({}, actual) === true;
}

function _tryBlock(block) {
  var error;
  try {
    block();
  } catch (e) {
    error = e;
  }
  return error;
}

function _throws(shouldThrow, block, expected, message) {
  var actual;

  if (typeof block !== 'function') {
    throw new TypeError('"block" argument must be a function');
  }

  if (typeof expected === 'string') {
    message = expected;
    expected = null;
  }

  actual = _tryBlock(block);

  message = (expected && expected.name ? ' (' + expected.name + ').' : '.') +
            (message ? ' ' + message : '.');

  if (shouldThrow && !actual) {
    fail(actual, expected, 'Missing expected exception' + message);
  }

  var userProvidedMessage = typeof message === 'string';
  var isUnwantedException = !shouldThrow && util.isError(actual);
  var isUnexpectedException = !shouldThrow && actual && !expected;

  if ((isUnwantedException &&
      userProvidedMessage &&
      expectedException(actual, expected)) ||
      isUnexpectedException) {
    fail(actual, expected, 'Got unwanted exception' + message);
  }

  if ((shouldThrow && actual && expected &&
      !expectedException(actual, expected)) || (!shouldThrow && actual)) {
    throw actual;
  }
}

// 11. Expected to throw an error:
// assert.throws(block, Error_opt, message_opt);

assert.throws = function(block, /*optional*/error, /*optional*/message) {
  _throws(true, block, error, message);
};

// EXTENSION! This is annoying to write outside this module.
assert.doesNotThrow = function(block, /*optional*/error, /*optional*/message) {
  _throws(false, block, error, message);
};

assert.ifError = function(err) { if (err) throw err; };

var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) {
    if (hasOwn.call(obj, key)) keys.push(key);
  }
  return keys;
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"util/":265}],36:[function(require,module,exports){
module.exports = Hook

var register = require('./lib/register')
var addHook = require('./lib/add')
var removeHook = require('./lib/remove')

function Hook () {
  var state = {
    registry: {}
  }

  var hook = register.bind(null, state)
  hook.remove = {}
  hook.api = {remove: {}}

  ;['before', 'error', 'after'].forEach(function (kind) {
    hook[kind] = hook.api[kind] = addHook.bind(null, state, kind)
    hook.remove[kind] = hook.api.remove[kind] = removeHook.bind(null, state, kind)
  })

  return hook
}

},{"./lib/add":37,"./lib/register":38,"./lib/remove":39}],37:[function(require,module,exports){
module.exports = addHook

function addHook (state, kind, name, hook) {
  if (!state.registry[name]) {
    state.registry[name] = {
      before: [],
      error: [],
      after: []
    }
  }

  state.registry[name][kind][kind === 'before' ? 'unshift' : 'push'](hook)
}

},{}],38:[function(require,module,exports){
module.exports = register

function register (state, name, options, method) {
  if (arguments.length === 3) {
    method = options
    options = {}
  }

  if (typeof method !== 'function') {
    throw new Error('method for before hook must be a function')
  }

  if (typeof options !== 'object') {
    throw new Error('options for before hook must be an object')
  }

  if (Array.isArray(name)) {
    return name.reverse().reduce(function (callback, name) {
      return register.bind(null, state, name, options, callback)
    }, method)()
  }

  var hooks = state.registry[name]

  if (!hooks) {
    return invokeMethod(options, method)
  }

  var beforeHooks = hooks.before
  var errorHooks = hooks.error
  var afterHooks = hooks.after

  // 1. run "before hooks" which may mutate options
  return Promise.all(beforeHooks.map(invokeBeforeHook.bind(null, options)))

  // 2. Once all finish without error, call the method with the (mutated) options
  .then(function () {
    return method(options)
  })

  // 3. If an error occurs in 1. or 2. run the "error hooks" which may mutate
  //    the error object. If one of them does not return an error then set the
  //    result to that. Otherwise throw (mutated) error.
  .catch(function (error) {
    return Promise.all(errorHooks.map(invokeErrorHook.bind(null, error, options)))

    .then(function (results) {
      var nonErrorResults = results.filter(isntError)

      if (nonErrorResults.length) {
        return nonErrorResults[0]
      }

      throw error
    })
  })

  // 4. Run the "after hooks". They may mutate the result
  .then(function (result) {
    return Promise.all(afterHooks.map(invokeAfterHook.bind(null, result, options)))

    .then(function () {
      return result
    })
  })
}

function invokeMethod (options, method) {
  try {
    return Promise.resolve(method(options))
  } catch (error) {
    return Promise.reject(error)
  }
}

function invokeBeforeHook (options, method) {
  try {
    return method(options)
  } catch (error) {
    return Promise.reject(error)
  }
}

function invokeErrorHook (result, options, errorHook) {
  try {
    return Promise.resolve(errorHook(result, options))

    .catch(function (error) { return error })
  } catch (error) {
    return Promise.resolve(error)
  }
}

function invokeAfterHook (result, options, method) {
  try {
    return method(result, options)
  } catch (error) {
    return Promise.reject(error)
  }
}

function isntError (result) {
  return !(result instanceof Error)
}

},{}],39:[function(require,module,exports){
module.exports = removeHook

function removeHook (state, kind, name, method) {
  if (!state.registry[name]) {
    return
  }

  var index = state.registry[name][kind].indexOf(method)

  if (index === -1) {
    return
  }

  state.registry[name][kind].splice(index, 1)
}

},{}],40:[function(require,module,exports){
var trailingNewlineRegex = /\n[\s]+$/
var leadingNewlineRegex = /^\n[\s]+/
var trailingSpaceRegex = /[\s]+$/
var leadingSpaceRegex = /^[\s]+/
var multiSpaceRegex = /[\n\s]+/g

var TEXT_TAGS = [
  'a', 'abbr', 'b', 'bdi', 'bdo', 'br', 'cite', 'data', 'dfn', 'em', 'i',
  'kbd', 'mark', 'q', 'rp', 'rt', 'rtc', 'ruby', 's', 'amp', 'small', 'span',
  'strong', 'sub', 'sup', 'time', 'u', 'var', 'wbr'
]

var VERBATIM_TAGS = [
  'code', 'pre', 'textarea'
]

module.exports = function appendChild (el, childs) {
  if (!Array.isArray(childs)) return

  var nodeName = el.nodeName.toLowerCase()

  var hadText = false
  var value, leader

  for (var i = 0, len = childs.length; i < len; i++) {
    var node = childs[i]
    if (Array.isArray(node)) {
      appendChild(el, node)
      continue
    }

    if (typeof node === 'number' ||
      typeof node === 'boolean' ||
      typeof node === 'function' ||
      node instanceof Date ||
      node instanceof RegExp) {
      node = node.toString()
    }

    var lastChild = el.childNodes[el.childNodes.length - 1]

    // Iterate over text nodes
    if (typeof node === 'string') {
      hadText = true

      // If we already had text, append to the existing text
      if (lastChild && lastChild.nodeName === '#text') {
        lastChild.nodeValue += node

      // We didn't have a text node yet, create one
      } else {
        node = document.createTextNode(node)
        el.appendChild(node)
        lastChild = node
      }

      // If this is the last of the child nodes, make sure we close it out
      // right
      if (i === len - 1) {
        hadText = false
        // Trim the child text nodes if the current node isn't a
        // node where whitespace matters.
        if (TEXT_TAGS.indexOf(nodeName) === -1 &&
          VERBATIM_TAGS.indexOf(nodeName) === -1) {
          value = lastChild.nodeValue
            .replace(leadingNewlineRegex, '')
            .replace(trailingSpaceRegex, '')
            .replace(trailingNewlineRegex, '')
            .replace(multiSpaceRegex, ' ')
          if (value === '') {
            el.removeChild(lastChild)
          } else {
            lastChild.nodeValue = value
          }
        } else if (VERBATIM_TAGS.indexOf(nodeName) === -1) {
          // The very first node in the list should not have leading
          // whitespace. Sibling text nodes should have whitespace if there
          // was any.
          leader = i === 0 ? '' : ' '
          value = lastChild.nodeValue
            .replace(leadingNewlineRegex, leader)
            .replace(leadingSpaceRegex, ' ')
            .replace(trailingSpaceRegex, '')
            .replace(trailingNewlineRegex, '')
            .replace(multiSpaceRegex, ' ')
          lastChild.nodeValue = value
        }
      }

    // Iterate over DOM nodes
    } else if (node && node.nodeType) {
      // If the last node was a text node, make sure it is properly closed out
      if (hadText) {
        hadText = false

        // Trim the child text nodes if the current node isn't a
        // text node or a code node
        if (TEXT_TAGS.indexOf(nodeName) === -1 &&
          VERBATIM_TAGS.indexOf(nodeName) === -1) {
          value = lastChild.nodeValue
            .replace(leadingNewlineRegex, '')
            .replace(trailingNewlineRegex, '')
            .replace(multiSpaceRegex, ' ')

          // Remove empty text nodes, append otherwise
          if (value === '') {
            el.removeChild(lastChild)
          } else {
            lastChild.nodeValue = value
          }
        // Trim the child nodes if the current node is not a node
        // where all whitespace must be preserved
        } else if (VERBATIM_TAGS.indexOf(nodeName) === -1) {
          value = lastChild.nodeValue
            .replace(leadingSpaceRegex, ' ')
            .replace(leadingNewlineRegex, '')
            .replace(trailingNewlineRegex, '')
            .replace(multiSpaceRegex, ' ')
          lastChild.nodeValue = value
        }
      }

      // Store the last nodename
      var _nodeName = node.nodeName
      if (_nodeName) nodeName = _nodeName.toLowerCase()

      // Append the node to the DOM
      el.appendChild(node)
    }
  }
}

},{}],41:[function(require,module,exports){
var hyperx = require('hyperx')
var appendChild = require('./appendChild')

var SVGNS = 'http://www.w3.org/2000/svg'
var XLINKNS = 'http://www.w3.org/1999/xlink'

var BOOL_PROPS = [
  'autofocus', 'checked', 'defaultchecked', 'disabled', 'formnovalidate',
  'indeterminate', 'readonly', 'required', 'selected', 'willvalidate'
]

var COMMENT_TAG = '!--'

var SVG_TAGS = [
  'svg', 'altGlyph', 'altGlyphDef', 'altGlyphItem', 'animate', 'animateColor',
  'animateMotion', 'animateTransform', 'circle', 'clipPath', 'color-profile',
  'cursor', 'defs', 'desc', 'ellipse', 'feBlend', 'feColorMatrix',
  'feComponentTransfer', 'feComposite', 'feConvolveMatrix',
  'feDiffuseLighting', 'feDisplacementMap', 'feDistantLight', 'feFlood',
  'feFuncA', 'feFuncB', 'feFuncG', 'feFuncR', 'feGaussianBlur', 'feImage',
  'feMerge', 'feMergeNode', 'feMorphology', 'feOffset', 'fePointLight',
  'feSpecularLighting', 'feSpotLight', 'feTile', 'feTurbulence', 'filter',
  'font', 'font-face', 'font-face-format', 'font-face-name', 'font-face-src',
  'font-face-uri', 'foreignObject', 'g', 'glyph', 'glyphRef', 'hkern', 'image',
  'line', 'linearGradient', 'marker', 'mask', 'metadata', 'missing-glyph',
  'mpath', 'path', 'pattern', 'polygon', 'polyline', 'radialGradient', 'rect',
  'set', 'stop', 'switch', 'symbol', 'text', 'textPath', 'title', 'tref',
  'tspan', 'use', 'view', 'vkern'
]

function belCreateElement (tag, props, children) {
  var el

  // If an svg tag, it needs a namespace
  if (SVG_TAGS.indexOf(tag) !== -1) {
    props.namespace = SVGNS
  }

  // If we are using a namespace
  var ns = false
  if (props.namespace) {
    ns = props.namespace
    delete props.namespace
  }

  // Create the element
  if (ns) {
    el = document.createElementNS(ns, tag)
  } else if (tag === COMMENT_TAG) {
    return document.createComment(props.comment)
  } else {
    el = document.createElement(tag)
  }

  // Create the properties
  for (var p in props) {
    if (props.hasOwnProperty(p)) {
      var key = p.toLowerCase()
      var val = props[p]
      // Normalize className
      if (key === 'classname') {
        key = 'class'
        p = 'class'
      }
      // The for attribute gets transformed to htmlFor, but we just set as for
      if (p === 'htmlFor') {
        p = 'for'
      }
      // If a property is boolean, set itself to the key
      if (BOOL_PROPS.indexOf(key) !== -1) {
        if (val === 'true') val = key
        else if (val === 'false') continue
      }
      // If a property prefers being set directly vs setAttribute
      if (key.slice(0, 2) === 'on') {
        el[p] = val
      } else {
        if (ns) {
          if (p === 'xlink:href') {
            el.setAttributeNS(XLINKNS, p, val)
          } else if (/^xmlns($|:)/i.test(p)) {
            // skip xmlns definitions
          } else {
            el.setAttributeNS(null, p, val)
          }
        } else {
          el.setAttribute(p, val)
        }
      }
    }
  }

  appendChild(el, children)
  return el
}

module.exports = hyperx(belCreateElement, {comments: true})
module.exports.default = module.exports
module.exports.createElement = belCreateElement

},{"./appendChild":40,"hyperx":49}],42:[function(require,module,exports){

},{}],43:[function(require,module,exports){
module.exports = function _btoa(str) {
  return btoa(str)
}

},{}],44:[function(require,module,exports){
module.exports = require('bel')

},{"bel":41}],45:[function(require,module,exports){
var scrollToAnchor = require('scroll-to-anchor')
var documentReady = require('document-ready')
var nanolocation = require('nanolocation')
var nanotiming = require('nanotiming')
var nanorouter = require('nanorouter')
var nanomorph = require('nanomorph')
var nanoquery = require('nanoquery')
var nanohref = require('nanohref')
var nanoraf = require('nanoraf')
var nanobus = require('nanobus')
var assert = require('assert')
var xtend = require('xtend')

module.exports = Choo

var HISTORY_OBJECT = {}

function Choo (opts) {
  if (!(this instanceof Choo)) return new Choo(opts)
  opts = opts || {}

  assert.equal(typeof opts, 'object', 'choo: opts should be type object')

  var self = this

  // define events used by choo
  this._events = {
    DOMCONTENTLOADED: 'DOMContentLoaded',
    DOMTITLECHANGE: 'DOMTitleChange',
    REPLACESTATE: 'replaceState',
    PUSHSTATE: 'pushState',
    NAVIGATE: 'navigate',
    POPSTATE: 'popState',
    RENDER: 'render'
  }

  // properties for internal use only
  this._historyEnabled = opts.history === undefined ? true : opts.history
  this._hrefEnabled = opts.href === undefined ? true : opts.href
  this._hasWindow = typeof window !== 'undefined'
  this._createLocation = nanolocation
  this._loaded = false
  this._stores = []
  this._tree = null

  // properties that are part of the API
  this.router = nanorouter()
  this.emitter = nanobus('choo.emit')
  this.emit = this.emitter.emit.bind(this.emitter)

  var events = { events: this._events }
  if (this._hasWindow) {
    this.state = window.initialState
      ? xtend(window.initialState, events)
      : events
    delete window.initialState
  } else {
    this.state = events
  }

  // listen for title changes; available even when calling .toString()
  if (this._hasWindow) this.state.title = document.title
  this.emitter.prependListener(this._events.DOMTITLECHANGE, function (title) {
    assert.equal(typeof title, 'string', 'events.DOMTitleChange: title should be type string')
    self.state.title = title
    if (self._hasWindow) document.title = title
  })
}

Choo.prototype.route = function (route, handler) {
  assert.equal(typeof route, 'string', 'choo.route: route should be type string')
  assert.equal(typeof handler, 'function', 'choo.handler: route should be type function')
  this.router.on(route, handler)
}

Choo.prototype.use = function (cb) {
  assert.equal(typeof cb, 'function', 'choo.use: cb should be type function')
  var self = this
  this._stores.push(function () {
    var msg = 'choo.use'
    msg = cb.storeName ? msg + '(' + cb.storeName + ')' : msg
    var endTiming = nanotiming(msg)
    cb(self.state, self.emitter, self)
    endTiming()
  })
}

Choo.prototype.start = function () {
  assert.equal(typeof window, 'object', 'choo.start: window was not found. .start() must be called in a browser, use .toString() if running in Node')

  var self = this
  if (this._historyEnabled) {
    this.emitter.prependListener(this._events.NAVIGATE, function () {
      self._matchRoute()
      if (self._loaded) {
        self.emitter.emit(self._events.RENDER)
        setTimeout(scrollToAnchor.bind(null, window.location.hash), 0)
      }
    })

    this.emitter.prependListener(this._events.POPSTATE, function () {
      self.emitter.emit(self._events.NAVIGATE)
    })

    this.emitter.prependListener(this._events.PUSHSTATE, function (href) {
      assert.equal(typeof href, 'string', 'events.pushState: href should be type string')
      window.history.pushState(HISTORY_OBJECT, null, href)
      self.emitter.emit(self._events.NAVIGATE)
    })

    this.emitter.prependListener(this._events.REPLACESTATE, function (href) {
      assert.equal(typeof href, 'string', 'events.replaceState: href should be type string')
      window.history.replaceState(HISTORY_OBJECT, null, href)
      self.emitter.emit(self._events.NAVIGATE)
    })

    window.onpopstate = function () {
      self.emitter.emit(self._events.POPSTATE)
    }

    if (self._hrefEnabled) {
      nanohref(function (location) {
        var href = location.href
        var currHref = window.location.href
        if (href === currHref) return
        self.emitter.emit(self._events.PUSHSTATE, href)
      })
    }
  }

  this._stores.forEach(function (initStore) {
    initStore()
  })

  this._matchRoute()
  this._tree = this._prerender(this.state)
  assert.ok(this._tree, 'choo.start: no valid DOM node returned for location ' + this.state.href)

  this.emitter.prependListener(self._events.RENDER, nanoraf(function () {
    var renderTiming = nanotiming('choo.render')
    var newTree = self._prerender(self.state)
    assert.ok(newTree, 'choo.render: no valid DOM node returned for location ' + self.state.href)

    assert.equal(self._tree.nodeName, newTree.nodeName, 'choo.render: The target node <' +
      self._tree.nodeName.toLowerCase() + '> is not the same type as the new node <' +
      newTree.nodeName.toLowerCase() + '>.')

    var morphTiming = nanotiming('choo.morph')
    nanomorph(self._tree, newTree)
    morphTiming()

    renderTiming()
  }))

  documentReady(function () {
    self.emitter.emit(self._events.DOMCONTENTLOADED)
    self._loaded = true
  })

  return this._tree
}

Choo.prototype.mount = function mount (selector) {
  if (typeof window !== 'object') {
    assert.ok(typeof selector === 'string', 'choo.mount: selector should be type String')
    this.selector = selector
    return this
  }

  assert.ok(typeof selector === 'string' || typeof selector === 'object', 'choo.mount: selector should be type String or HTMLElement')

  var self = this

  documentReady(function () {
    var renderTiming = nanotiming('choo.render')
    var newTree = self.start()
    if (typeof selector === 'string') {
      self._tree = document.querySelector(selector)
    } else {
      self._tree = selector
    }

    assert.ok(self._tree, 'choo.mount: could not query selector: ' + selector)
    assert.equal(self._tree.nodeName, newTree.nodeName, 'choo.mount: The target node <' +
      self._tree.nodeName.toLowerCase() + '> is not the same type as the new node <' +
      newTree.nodeName.toLowerCase() + '>.')

    var morphTiming = nanotiming('choo.morph')
    nanomorph(self._tree, newTree)
    morphTiming()

    renderTiming()
  })
}

Choo.prototype.toString = function (location, state) {
  this.state = xtend(this.state, state || {})

  assert.notEqual(typeof window, 'object', 'choo.mount: window was found. .toString() must be called in Node, use .start() or .mount() if running in the browser')
  assert.equal(typeof location, 'string', 'choo.toString: location should be type string')
  assert.equal(typeof this.state, 'object', 'choo.toString: state should be type object')

  // TODO: pass custom state down to each store.
  this._stores.forEach(function (initStore) {
    initStore()
  })

  this._matchRoute(location)
  var html = this._prerender(this.state)
  assert.ok(html, 'choo.toString: no valid value returned for the route ' + location)
  assert(!Array.isArray(html), 'choo.toString: return value was an array for the route ' + location)
  return typeof html.outerHTML === 'string' ? html.outerHTML : html.toString()
}

Choo.prototype._matchRoute = function (locationOverride) {
  var location, queryString
  if (locationOverride) {
    location = locationOverride.replace(/\?.+$/, '')
    queryString = locationOverride
  } else {
    location = this._createLocation()
    queryString = window.location.search
  }
  var matched = this.router.match(location)
  this._handler = matched.cb
  this.state.href = location
  this.state.query = nanoquery(queryString)
  this.state.route = matched.route
  this.state.params = matched.params
  return this.state
}

Choo.prototype._prerender = function (state) {
  var routeTiming = nanotiming("choo.prerender('" + state.route + "')")
  var res = this._handler(state, this.emit)
  routeTiming()
  return res
}

},{"assert":35,"document-ready":46,"nanobus":247,"nanohref":248,"nanolocation":249,"nanomorph":250,"nanoquery":253,"nanoraf":254,"nanorouter":255,"nanotiming":257,"scroll-to-anchor":261,"xtend":268}],46:[function(require,module,exports){
'use strict'

var assert = require('assert')

module.exports = ready

function ready (callback) {
  assert.notEqual(typeof document, 'undefined', 'document-ready only runs in the browser')
  var state = document.readyState
  if (state === 'complete' || state === 'interactive') {
    return setTimeout(callback, 0)
  }

  document.addEventListener('DOMContentLoaded', function onLoad () {
    callback()
  })
}

},{"assert":35}],47:[function(require,module,exports){
'use strict';

var defaults = {
    ellipse: '…',
    chars: [' ', '-'],
    max: 140,
    truncate: true
};

function ellipsize(str, max, ellipse, chars, truncate) {
    var last = 0,
        c = '';

    if (str.length < max) return str;

    for (var i = 0, len = str.length; i < len; i++) {
        c = str.charAt(i);

        if (chars.indexOf(c) !== -1) {
            last = i;
        }

        if (i < max) continue;
        if (last === 0) {
            return !truncate ? '' : str.substring(0, max - 1) + ellipse;
        }

        return str.substring(0, last) + ellipse;
    }

    return str;
}

module.exports = function(str, max, opts) {
    if (typeof str !== 'string' || str.length === 0) return '';
    if (max === 0) return '';

    opts = opts || {};

    for (var key in defaults) {
        if (opts[key] === null || typeof opts[key] === 'undefined') {
            opts[key] = defaults[key];
        }
    }

    opts.max = max || opts.max;

    return ellipsize(str, opts.max, opts.ellipse, opts.chars, opts.truncate);
};

},{}],48:[function(require,module,exports){
module.exports = attributeToProperty

var transform = {
  'class': 'className',
  'for': 'htmlFor',
  'http-equiv': 'httpEquiv'
}

function attributeToProperty (h) {
  return function (tagName, attrs, children) {
    for (var attr in attrs) {
      if (attr in transform) {
        attrs[transform[attr]] = attrs[attr]
        delete attrs[attr]
      }
    }
    return h(tagName, attrs, children)
  }
}

},{}],49:[function(require,module,exports){
var attrToProp = require('hyperscript-attribute-to-property')

var VAR = 0, TEXT = 1, OPEN = 2, CLOSE = 3, ATTR = 4
var ATTR_KEY = 5, ATTR_KEY_W = 6
var ATTR_VALUE_W = 7, ATTR_VALUE = 8
var ATTR_VALUE_SQ = 9, ATTR_VALUE_DQ = 10
var ATTR_EQ = 11, ATTR_BREAK = 12
var COMMENT = 13

module.exports = function (h, opts) {
  if (!opts) opts = {}
  var concat = opts.concat || function (a, b) {
    return String(a) + String(b)
  }
  if (opts.attrToProp !== false) {
    h = attrToProp(h)
  }

  return function (strings) {
    var state = TEXT, reg = ''
    var arglen = arguments.length
    var parts = []

    for (var i = 0; i < strings.length; i++) {
      if (i < arglen - 1) {
        var arg = arguments[i+1]
        var p = parse(strings[i])
        var xstate = state
        if (xstate === ATTR_VALUE_DQ) xstate = ATTR_VALUE
        if (xstate === ATTR_VALUE_SQ) xstate = ATTR_VALUE
        if (xstate === ATTR_VALUE_W) xstate = ATTR_VALUE
        if (xstate === ATTR) xstate = ATTR_KEY
        if (xstate === OPEN) {
          if (reg === '/') {
            p.push([ OPEN, '/', arg ])
            reg = ''
          } else {
            p.push([ OPEN, arg ])
          }
        } else {
          p.push([ VAR, xstate, arg ])
        }
        parts.push.apply(parts, p)
      } else parts.push.apply(parts, parse(strings[i]))
    }

    var tree = [null,{},[]]
    var stack = [[tree,-1]]
    for (var i = 0; i < parts.length; i++) {
      var cur = stack[stack.length-1][0]
      var p = parts[i], s = p[0]
      if (s === OPEN && /^\//.test(p[1])) {
        var ix = stack[stack.length-1][1]
        if (stack.length > 1) {
          stack.pop()
          stack[stack.length-1][0][2][ix] = h(
            cur[0], cur[1], cur[2].length ? cur[2] : undefined
          )
        }
      } else if (s === OPEN) {
        var c = [p[1],{},[]]
        cur[2].push(c)
        stack.push([c,cur[2].length-1])
      } else if (s === ATTR_KEY || (s === VAR && p[1] === ATTR_KEY)) {
        var key = ''
        var copyKey
        for (; i < parts.length; i++) {
          if (parts[i][0] === ATTR_KEY) {
            key = concat(key, parts[i][1])
          } else if (parts[i][0] === VAR && parts[i][1] === ATTR_KEY) {
            if (typeof parts[i][2] === 'object' && !key) {
              for (copyKey in parts[i][2]) {
                if (parts[i][2].hasOwnProperty(copyKey) && !cur[1][copyKey]) {
                  cur[1][copyKey] = parts[i][2][copyKey]
                }
              }
            } else {
              key = concat(key, parts[i][2])
            }
          } else break
        }
        if (parts[i][0] === ATTR_EQ) i++
        var j = i
        for (; i < parts.length; i++) {
          if (parts[i][0] === ATTR_VALUE || parts[i][0] === ATTR_KEY) {
            if (!cur[1][key]) cur[1][key] = strfn(parts[i][1])
            else parts[i][1]==="" || (cur[1][key] = concat(cur[1][key], parts[i][1]));
          } else if (parts[i][0] === VAR
          && (parts[i][1] === ATTR_VALUE || parts[i][1] === ATTR_KEY)) {
            if (!cur[1][key]) cur[1][key] = strfn(parts[i][2])
            else parts[i][2]==="" || (cur[1][key] = concat(cur[1][key], parts[i][2]));
          } else {
            if (key.length && !cur[1][key] && i === j
            && (parts[i][0] === CLOSE || parts[i][0] === ATTR_BREAK)) {
              // https://html.spec.whatwg.org/multipage/infrastructure.html#boolean-attributes
              // empty string is falsy, not well behaved value in browser
              cur[1][key] = key.toLowerCase()
            }
            if (parts[i][0] === CLOSE) {
              i--
            }
            break
          }
        }
      } else if (s === ATTR_KEY) {
        cur[1][p[1]] = true
      } else if (s === VAR && p[1] === ATTR_KEY) {
        cur[1][p[2]] = true
      } else if (s === CLOSE) {
        if (selfClosing(cur[0]) && stack.length) {
          var ix = stack[stack.length-1][1]
          stack.pop()
          stack[stack.length-1][0][2][ix] = h(
            cur[0], cur[1], cur[2].length ? cur[2] : undefined
          )
        }
      } else if (s === VAR && p[1] === TEXT) {
        if (p[2] === undefined || p[2] === null) p[2] = ''
        else if (!p[2]) p[2] = concat('', p[2])
        if (Array.isArray(p[2][0])) {
          cur[2].push.apply(cur[2], p[2])
        } else {
          cur[2].push(p[2])
        }
      } else if (s === TEXT) {
        cur[2].push(p[1])
      } else if (s === ATTR_EQ || s === ATTR_BREAK) {
        // no-op
      } else {
        throw new Error('unhandled: ' + s)
      }
    }

    if (tree[2].length > 1 && /^\s*$/.test(tree[2][0])) {
      tree[2].shift()
    }

    if (tree[2].length > 2
    || (tree[2].length === 2 && /\S/.test(tree[2][1]))) {
      throw new Error(
        'multiple root elements must be wrapped in an enclosing tag'
      )
    }
    if (Array.isArray(tree[2][0]) && typeof tree[2][0][0] === 'string'
    && Array.isArray(tree[2][0][2])) {
      tree[2][0] = h(tree[2][0][0], tree[2][0][1], tree[2][0][2])
    }
    return tree[2][0]

    function parse (str) {
      var res = []
      if (state === ATTR_VALUE_W) state = ATTR
      for (var i = 0; i < str.length; i++) {
        var c = str.charAt(i)
        if (state === TEXT && c === '<') {
          if (reg.length) res.push([TEXT, reg])
          reg = ''
          state = OPEN
        } else if (c === '>' && !quot(state) && state !== COMMENT) {
          if (state === OPEN && reg.length) {
            res.push([OPEN,reg])
          } else if (state === ATTR_KEY) {
            res.push([ATTR_KEY,reg])
          } else if (state === ATTR_VALUE && reg.length) {
            res.push([ATTR_VALUE,reg])
          }
          res.push([CLOSE])
          reg = ''
          state = TEXT
        } else if (state === COMMENT && /-$/.test(reg) && c === '-') {
          if (opts.comments) {
            res.push([ATTR_VALUE,reg.substr(0, reg.length - 1)],[CLOSE])
          }
          reg = ''
          state = TEXT
        } else if (state === OPEN && /^!--$/.test(reg)) {
          if (opts.comments) {
            res.push([OPEN, reg],[ATTR_KEY,'comment'],[ATTR_EQ])
          }
          reg = c
          state = COMMENT
        } else if (state === TEXT || state === COMMENT) {
          reg += c
        } else if (state === OPEN && c === '/' && reg.length) {
          // no-op, self closing tag without a space <br/>
        } else if (state === OPEN && /\s/.test(c)) {
          if (reg.length) {
            res.push([OPEN, reg])
          }
          reg = ''
          state = ATTR
        } else if (state === OPEN) {
          reg += c
        } else if (state === ATTR && /[^\s"'=/]/.test(c)) {
          state = ATTR_KEY
          reg = c
        } else if (state === ATTR && /\s/.test(c)) {
          if (reg.length) res.push([ATTR_KEY,reg])
          res.push([ATTR_BREAK])
        } else if (state === ATTR_KEY && /\s/.test(c)) {
          res.push([ATTR_KEY,reg])
          reg = ''
          state = ATTR_KEY_W
        } else if (state === ATTR_KEY && c === '=') {
          res.push([ATTR_KEY,reg],[ATTR_EQ])
          reg = ''
          state = ATTR_VALUE_W
        } else if (state === ATTR_KEY) {
          reg += c
        } else if ((state === ATTR_KEY_W || state === ATTR) && c === '=') {
          res.push([ATTR_EQ])
          state = ATTR_VALUE_W
        } else if ((state === ATTR_KEY_W || state === ATTR) && !/\s/.test(c)) {
          res.push([ATTR_BREAK])
          if (/[\w-]/.test(c)) {
            reg += c
            state = ATTR_KEY
          } else state = ATTR
        } else if (state === ATTR_VALUE_W && c === '"') {
          state = ATTR_VALUE_DQ
        } else if (state === ATTR_VALUE_W && c === "'") {
          state = ATTR_VALUE_SQ
        } else if (state === ATTR_VALUE_DQ && c === '"') {
          res.push([ATTR_VALUE,reg],[ATTR_BREAK])
          reg = ''
          state = ATTR
        } else if (state === ATTR_VALUE_SQ && c === "'") {
          res.push([ATTR_VALUE,reg],[ATTR_BREAK])
          reg = ''
          state = ATTR
        } else if (state === ATTR_VALUE_W && !/\s/.test(c)) {
          state = ATTR_VALUE
          i--
        } else if (state === ATTR_VALUE && /\s/.test(c)) {
          res.push([ATTR_VALUE,reg],[ATTR_BREAK])
          reg = ''
          state = ATTR
        } else if (state === ATTR_VALUE || state === ATTR_VALUE_SQ
        || state === ATTR_VALUE_DQ) {
          reg += c
        }
      }
      if (state === TEXT && reg.length) {
        res.push([TEXT,reg])
        reg = ''
      } else if (state === ATTR_VALUE && reg.length) {
        res.push([ATTR_VALUE,reg])
        reg = ''
      } else if (state === ATTR_VALUE_DQ && reg.length) {
        res.push([ATTR_VALUE,reg])
        reg = ''
      } else if (state === ATTR_VALUE_SQ && reg.length) {
        res.push([ATTR_VALUE,reg])
        reg = ''
      } else if (state === ATTR_KEY) {
        res.push([ATTR_KEY,reg])
        reg = ''
      }
      return res
    }
  }

  function strfn (x) {
    if (typeof x === 'function') return x
    else if (typeof x === 'string') return x
    else if (x && typeof x === 'object') return x
    else return concat('', x)
  }
}

function quot (state) {
  return state === ATTR_VALUE_SQ || state === ATTR_VALUE_DQ
}

var hasOwn = Object.prototype.hasOwnProperty
function has (obj, key) { return hasOwn.call(obj, key) }

var closeRE = RegExp('^(' + [
  'area', 'base', 'basefont', 'bgsound', 'br', 'col', 'command', 'embed',
  'frame', 'hr', 'img', 'input', 'isindex', 'keygen', 'link', 'meta', 'param',
  'source', 'track', 'wbr', '!--',
  // SVG TAGS
  'animate', 'animateTransform', 'circle', 'cursor', 'desc', 'ellipse',
  'feBlend', 'feColorMatrix', 'feComposite',
  'feConvolveMatrix', 'feDiffuseLighting', 'feDisplacementMap',
  'feDistantLight', 'feFlood', 'feFuncA', 'feFuncB', 'feFuncG', 'feFuncR',
  'feGaussianBlur', 'feImage', 'feMergeNode', 'feMorphology',
  'feOffset', 'fePointLight', 'feSpecularLighting', 'feSpotLight', 'feTile',
  'feTurbulence', 'font-face-format', 'font-face-name', 'font-face-uri',
  'glyph', 'glyphRef', 'hkern', 'image', 'line', 'missing-glyph', 'mpath',
  'path', 'polygon', 'polyline', 'rect', 'set', 'stop', 'tref', 'use', 'view',
  'vkern'
].join('|') + ')(?:[\.#][a-zA-Z0-9\u007F-\uFFFF_:-]+)*$')
function selfClosing (tag) { return closeRE.test(tag) }

},{"hyperscript-attribute-to-property":48}],50:[function(require,module,exports){
const GitHub = require('@octokit/rest')
const assert = require('assert')
const ellipsize = require('ellipsize')

function initDB (opts) {
  return new IssueDB(opts)
}

class IssueDB {
  constructor (opts = {}) {
    assert(opts.owner, 'owner is a required option')
    assert(opts.repo, 'repo is a required option')
    assert(opts.token, 'token is a required option')

    opts.github = GitHub()
    opts.github.authenticate({type: 'token', token: opts.token})

    Object.assign(this, opts)

    return this
  }

  async list () {
    // paginate for all open issues
    // https://github.com/octokit/rest.js/issues/688#issuecomment-355787784
    let result
    do {
      if (result) {
        result = await this.github.getNextPage(result)
      } else {
        result = await this.github.issues.getForRepo({
          owner: this.owner,
          repo: this.repo,
          state: 'open',
          per_page: 100
        })
      }
    } while (this.github.hasNextPage(result))

    return result.data.map(stripDownIssueObject)
  }

  async purge () {
    const issues = await this.list()

    for (const issue of issues) {
      await this.github.issues.edit({
        owner: this.owner,
        repo: this.repo,
        number: issue.number,
        state: 'closed'
      })
    }
  }

  async get (number) {
    const {data:issue} = await this.github.issues.get({
      owner: this.owner,
      repo: this.repo,
      number
    })
    return stripDownIssueObject(issue)
  }

  async put (input) {
    const title = typeof input === 'string'
      ? ellipsize(input)
      : ellipsize(String(input.title || input.name || input.id || 'untitled'))
    const body = fence(input)
    const {data} = await this.github.issues.create({
      owner: this.owner,
      repo: this.repo,
      title,
      body
    })

    return {
      number: data.number,
      title,
      body: input
    }
  }
}

function fence (input) {
  return [
    '```json',
    JSON.stringify(input, null, 2),
    '```'
  ].join('\n')
}

function unfence (input) {
  return JSON.parse(input.replace(/^```json/, '').replace(/```$/m, '').trim())
}

function stripDownIssueObject (issue) {
  return {
    number: issue.number,
    title: issue.title,
    body: unfence(issue.body)
  }
}
module.exports = initDB

},{"@octokit/rest":2,"assert":35,"ellipsize":47}],51:[function(require,module,exports){
var getNative = require('./_getNative'),
    root = require('./_root');

/* Built-in method references that are verified to be native. */
var DataView = getNative(root, 'DataView');

module.exports = DataView;

},{"./_getNative":146,"./_root":191}],52:[function(require,module,exports){
var hashClear = require('./_hashClear'),
    hashDelete = require('./_hashDelete'),
    hashGet = require('./_hashGet'),
    hashHas = require('./_hashHas'),
    hashSet = require('./_hashSet');

/**
 * Creates a hash object.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function Hash(entries) {
  var index = -1,
      length = entries == null ? 0 : entries.length;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

// Add methods to `Hash`.
Hash.prototype.clear = hashClear;
Hash.prototype['delete'] = hashDelete;
Hash.prototype.get = hashGet;
Hash.prototype.has = hashHas;
Hash.prototype.set = hashSet;

module.exports = Hash;

},{"./_hashClear":154,"./_hashDelete":155,"./_hashGet":156,"./_hashHas":157,"./_hashSet":158}],53:[function(require,module,exports){
var listCacheClear = require('./_listCacheClear'),
    listCacheDelete = require('./_listCacheDelete'),
    listCacheGet = require('./_listCacheGet'),
    listCacheHas = require('./_listCacheHas'),
    listCacheSet = require('./_listCacheSet');

/**
 * Creates an list cache object.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function ListCache(entries) {
  var index = -1,
      length = entries == null ? 0 : entries.length;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

// Add methods to `ListCache`.
ListCache.prototype.clear = listCacheClear;
ListCache.prototype['delete'] = listCacheDelete;
ListCache.prototype.get = listCacheGet;
ListCache.prototype.has = listCacheHas;
ListCache.prototype.set = listCacheSet;

module.exports = ListCache;

},{"./_listCacheClear":170,"./_listCacheDelete":171,"./_listCacheGet":172,"./_listCacheHas":173,"./_listCacheSet":174}],54:[function(require,module,exports){
var getNative = require('./_getNative'),
    root = require('./_root');

/* Built-in method references that are verified to be native. */
var Map = getNative(root, 'Map');

module.exports = Map;

},{"./_getNative":146,"./_root":191}],55:[function(require,module,exports){
var mapCacheClear = require('./_mapCacheClear'),
    mapCacheDelete = require('./_mapCacheDelete'),
    mapCacheGet = require('./_mapCacheGet'),
    mapCacheHas = require('./_mapCacheHas'),
    mapCacheSet = require('./_mapCacheSet');

/**
 * Creates a map cache object to store key-value pairs.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function MapCache(entries) {
  var index = -1,
      length = entries == null ? 0 : entries.length;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

// Add methods to `MapCache`.
MapCache.prototype.clear = mapCacheClear;
MapCache.prototype['delete'] = mapCacheDelete;
MapCache.prototype.get = mapCacheGet;
MapCache.prototype.has = mapCacheHas;
MapCache.prototype.set = mapCacheSet;

module.exports = MapCache;

},{"./_mapCacheClear":175,"./_mapCacheDelete":176,"./_mapCacheGet":177,"./_mapCacheHas":178,"./_mapCacheSet":179}],56:[function(require,module,exports){
var getNative = require('./_getNative'),
    root = require('./_root');

/* Built-in method references that are verified to be native. */
var Promise = getNative(root, 'Promise');

module.exports = Promise;

},{"./_getNative":146,"./_root":191}],57:[function(require,module,exports){
var getNative = require('./_getNative'),
    root = require('./_root');

/* Built-in method references that are verified to be native. */
var Set = getNative(root, 'Set');

module.exports = Set;

},{"./_getNative":146,"./_root":191}],58:[function(require,module,exports){
var MapCache = require('./_MapCache'),
    setCacheAdd = require('./_setCacheAdd'),
    setCacheHas = require('./_setCacheHas');

/**
 *
 * Creates an array cache object to store unique values.
 *
 * @private
 * @constructor
 * @param {Array} [values] The values to cache.
 */
function SetCache(values) {
  var index = -1,
      length = values == null ? 0 : values.length;

  this.__data__ = new MapCache;
  while (++index < length) {
    this.add(values[index]);
  }
}

// Add methods to `SetCache`.
SetCache.prototype.add = SetCache.prototype.push = setCacheAdd;
SetCache.prototype.has = setCacheHas;

module.exports = SetCache;

},{"./_MapCache":55,"./_setCacheAdd":193,"./_setCacheHas":194}],59:[function(require,module,exports){
var ListCache = require('./_ListCache'),
    stackClear = require('./_stackClear'),
    stackDelete = require('./_stackDelete'),
    stackGet = require('./_stackGet'),
    stackHas = require('./_stackHas'),
    stackSet = require('./_stackSet');

/**
 * Creates a stack cache object to store key-value pairs.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function Stack(entries) {
  var data = this.__data__ = new ListCache(entries);
  this.size = data.size;
}

// Add methods to `Stack`.
Stack.prototype.clear = stackClear;
Stack.prototype['delete'] = stackDelete;
Stack.prototype.get = stackGet;
Stack.prototype.has = stackHas;
Stack.prototype.set = stackSet;

module.exports = Stack;

},{"./_ListCache":53,"./_stackClear":198,"./_stackDelete":199,"./_stackGet":200,"./_stackHas":201,"./_stackSet":202}],60:[function(require,module,exports){
var root = require('./_root');

/** Built-in value references. */
var Symbol = root.Symbol;

module.exports = Symbol;

},{"./_root":191}],61:[function(require,module,exports){
var root = require('./_root');

/** Built-in value references. */
var Uint8Array = root.Uint8Array;

module.exports = Uint8Array;

},{"./_root":191}],62:[function(require,module,exports){
var getNative = require('./_getNative'),
    root = require('./_root');

/* Built-in method references that are verified to be native. */
var WeakMap = getNative(root, 'WeakMap');

module.exports = WeakMap;

},{"./_getNative":146,"./_root":191}],63:[function(require,module,exports){
/**
 * A faster alternative to `Function#apply`, this function invokes `func`
 * with the `this` binding of `thisArg` and the arguments of `args`.
 *
 * @private
 * @param {Function} func The function to invoke.
 * @param {*} thisArg The `this` binding of `func`.
 * @param {Array} args The arguments to invoke `func` with.
 * @returns {*} Returns the result of `func`.
 */
function apply(func, thisArg, args) {
  switch (args.length) {
    case 0: return func.call(thisArg);
    case 1: return func.call(thisArg, args[0]);
    case 2: return func.call(thisArg, args[0], args[1]);
    case 3: return func.call(thisArg, args[0], args[1], args[2]);
  }
  return func.apply(thisArg, args);
}

module.exports = apply;

},{}],64:[function(require,module,exports){
/**
 * A specialized version of `_.forEach` for arrays without support for
 * iteratee shorthands.
 *
 * @private
 * @param {Array} [array] The array to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array} Returns `array`.
 */
function arrayEach(array, iteratee) {
  var index = -1,
      length = array == null ? 0 : array.length;

  while (++index < length) {
    if (iteratee(array[index], index, array) === false) {
      break;
    }
  }
  return array;
}

module.exports = arrayEach;

},{}],65:[function(require,module,exports){
/**
 * A specialized version of `_.filter` for arrays without support for
 * iteratee shorthands.
 *
 * @private
 * @param {Array} [array] The array to iterate over.
 * @param {Function} predicate The function invoked per iteration.
 * @returns {Array} Returns the new filtered array.
 */
function arrayFilter(array, predicate) {
  var index = -1,
      length = array == null ? 0 : array.length,
      resIndex = 0,
      result = [];

  while (++index < length) {
    var value = array[index];
    if (predicate(value, index, array)) {
      result[resIndex++] = value;
    }
  }
  return result;
}

module.exports = arrayFilter;

},{}],66:[function(require,module,exports){
var baseIndexOf = require('./_baseIndexOf');

/**
 * A specialized version of `_.includes` for arrays without support for
 * specifying an index to search from.
 *
 * @private
 * @param {Array} [array] The array to inspect.
 * @param {*} target The value to search for.
 * @returns {boolean} Returns `true` if `target` is found, else `false`.
 */
function arrayIncludes(array, value) {
  var length = array == null ? 0 : array.length;
  return !!length && baseIndexOf(array, value, 0) > -1;
}

module.exports = arrayIncludes;

},{"./_baseIndexOf":88}],67:[function(require,module,exports){
/**
 * This function is like `arrayIncludes` except that it accepts a comparator.
 *
 * @private
 * @param {Array} [array] The array to inspect.
 * @param {*} target The value to search for.
 * @param {Function} comparator The comparator invoked per element.
 * @returns {boolean} Returns `true` if `target` is found, else `false`.
 */
function arrayIncludesWith(array, value, comparator) {
  var index = -1,
      length = array == null ? 0 : array.length;

  while (++index < length) {
    if (comparator(value, array[index])) {
      return true;
    }
  }
  return false;
}

module.exports = arrayIncludesWith;

},{}],68:[function(require,module,exports){
var baseTimes = require('./_baseTimes'),
    isArguments = require('./isArguments'),
    isArray = require('./isArray'),
    isBuffer = require('./isBuffer'),
    isIndex = require('./_isIndex'),
    isTypedArray = require('./isTypedArray');

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Creates an array of the enumerable property names of the array-like `value`.
 *
 * @private
 * @param {*} value The value to query.
 * @param {boolean} inherited Specify returning inherited property names.
 * @returns {Array} Returns the array of property names.
 */
function arrayLikeKeys(value, inherited) {
  var isArr = isArray(value),
      isArg = !isArr && isArguments(value),
      isBuff = !isArr && !isArg && isBuffer(value),
      isType = !isArr && !isArg && !isBuff && isTypedArray(value),
      skipIndexes = isArr || isArg || isBuff || isType,
      result = skipIndexes ? baseTimes(value.length, String) : [],
      length = result.length;

  for (var key in value) {
    if ((inherited || hasOwnProperty.call(value, key)) &&
        !(skipIndexes && (
           // Safari 9 has enumerable `arguments.length` in strict mode.
           key == 'length' ||
           // Node.js 0.10 has enumerable non-index properties on buffers.
           (isBuff && (key == 'offset' || key == 'parent')) ||
           // PhantomJS 2 has enumerable non-index properties on typed arrays.
           (isType && (key == 'buffer' || key == 'byteLength' || key == 'byteOffset')) ||
           // Skip index properties.
           isIndex(key, length)
        ))) {
      result.push(key);
    }
  }
  return result;
}

module.exports = arrayLikeKeys;

},{"./_baseTimes":114,"./_isIndex":163,"./isArguments":217,"./isArray":218,"./isBuffer":221,"./isTypedArray":230}],69:[function(require,module,exports){
/**
 * A specialized version of `_.map` for arrays without support for iteratee
 * shorthands.
 *
 * @private
 * @param {Array} [array] The array to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array} Returns the new mapped array.
 */
function arrayMap(array, iteratee) {
  var index = -1,
      length = array == null ? 0 : array.length,
      result = Array(length);

  while (++index < length) {
    result[index] = iteratee(array[index], index, array);
  }
  return result;
}

module.exports = arrayMap;

},{}],70:[function(require,module,exports){
/**
 * Appends the elements of `values` to `array`.
 *
 * @private
 * @param {Array} array The array to modify.
 * @param {Array} values The values to append.
 * @returns {Array} Returns `array`.
 */
function arrayPush(array, values) {
  var index = -1,
      length = values.length,
      offset = array.length;

  while (++index < length) {
    array[offset + index] = values[index];
  }
  return array;
}

module.exports = arrayPush;

},{}],71:[function(require,module,exports){
/**
 * A specialized version of `_.some` for arrays without support for iteratee
 * shorthands.
 *
 * @private
 * @param {Array} [array] The array to iterate over.
 * @param {Function} predicate The function invoked per iteration.
 * @returns {boolean} Returns `true` if any element passes the predicate check,
 *  else `false`.
 */
function arraySome(array, predicate) {
  var index = -1,
      length = array == null ? 0 : array.length;

  while (++index < length) {
    if (predicate(array[index], index, array)) {
      return true;
    }
  }
  return false;
}

module.exports = arraySome;

},{}],72:[function(require,module,exports){
var baseAssignValue = require('./_baseAssignValue'),
    eq = require('./eq');

/**
 * This function is like `assignValue` except that it doesn't assign
 * `undefined` values.
 *
 * @private
 * @param {Object} object The object to modify.
 * @param {string} key The key of the property to assign.
 * @param {*} value The value to assign.
 */
function assignMergeValue(object, key, value) {
  if ((value !== undefined && !eq(object[key], value)) ||
      (value === undefined && !(key in object))) {
    baseAssignValue(object, key, value);
  }
}

module.exports = assignMergeValue;

},{"./_baseAssignValue":77,"./eq":211}],73:[function(require,module,exports){
var baseAssignValue = require('./_baseAssignValue'),
    eq = require('./eq');

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Assigns `value` to `key` of `object` if the existing value is not equivalent
 * using [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
 * for equality comparisons.
 *
 * @private
 * @param {Object} object The object to modify.
 * @param {string} key The key of the property to assign.
 * @param {*} value The value to assign.
 */
function assignValue(object, key, value) {
  var objValue = object[key];
  if (!(hasOwnProperty.call(object, key) && eq(objValue, value)) ||
      (value === undefined && !(key in object))) {
    baseAssignValue(object, key, value);
  }
}

module.exports = assignValue;

},{"./_baseAssignValue":77,"./eq":211}],74:[function(require,module,exports){
var eq = require('./eq');

/**
 * Gets the index at which the `key` is found in `array` of key-value pairs.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {*} key The key to search for.
 * @returns {number} Returns the index of the matched value, else `-1`.
 */
function assocIndexOf(array, key) {
  var length = array.length;
  while (length--) {
    if (eq(array[length][0], key)) {
      return length;
    }
  }
  return -1;
}

module.exports = assocIndexOf;

},{"./eq":211}],75:[function(require,module,exports){
var copyObject = require('./_copyObject'),
    keys = require('./keys');

/**
 * The base implementation of `_.assign` without support for multiple sources
 * or `customizer` functions.
 *
 * @private
 * @param {Object} object The destination object.
 * @param {Object} source The source object.
 * @returns {Object} Returns `object`.
 */
function baseAssign(object, source) {
  return object && copyObject(source, keys(source), object);
}

module.exports = baseAssign;

},{"./_copyObject":128,"./keys":231}],76:[function(require,module,exports){
var copyObject = require('./_copyObject'),
    keysIn = require('./keysIn');

/**
 * The base implementation of `_.assignIn` without support for multiple sources
 * or `customizer` functions.
 *
 * @private
 * @param {Object} object The destination object.
 * @param {Object} source The source object.
 * @returns {Object} Returns `object`.
 */
function baseAssignIn(object, source) {
  return object && copyObject(source, keysIn(source), object);
}

module.exports = baseAssignIn;

},{"./_copyObject":128,"./keysIn":232}],77:[function(require,module,exports){
var defineProperty = require('./_defineProperty');

/**
 * The base implementation of `assignValue` and `assignMergeValue` without
 * value checks.
 *
 * @private
 * @param {Object} object The object to modify.
 * @param {string} key The key of the property to assign.
 * @param {*} value The value to assign.
 */
function baseAssignValue(object, key, value) {
  if (key == '__proto__' && defineProperty) {
    defineProperty(object, key, {
      'configurable': true,
      'enumerable': true,
      'value': value,
      'writable': true
    });
  } else {
    object[key] = value;
  }
}

module.exports = baseAssignValue;

},{"./_defineProperty":136}],78:[function(require,module,exports){
var Stack = require('./_Stack'),
    arrayEach = require('./_arrayEach'),
    assignValue = require('./_assignValue'),
    baseAssign = require('./_baseAssign'),
    baseAssignIn = require('./_baseAssignIn'),
    cloneBuffer = require('./_cloneBuffer'),
    copyArray = require('./_copyArray'),
    copySymbols = require('./_copySymbols'),
    copySymbolsIn = require('./_copySymbolsIn'),
    getAllKeys = require('./_getAllKeys'),
    getAllKeysIn = require('./_getAllKeysIn'),
    getTag = require('./_getTag'),
    initCloneArray = require('./_initCloneArray'),
    initCloneByTag = require('./_initCloneByTag'),
    initCloneObject = require('./_initCloneObject'),
    isArray = require('./isArray'),
    isBuffer = require('./isBuffer'),
    isMap = require('./isMap'),
    isObject = require('./isObject'),
    isSet = require('./isSet'),
    keys = require('./keys');

/** Used to compose bitmasks for cloning. */
var CLONE_DEEP_FLAG = 1,
    CLONE_FLAT_FLAG = 2,
    CLONE_SYMBOLS_FLAG = 4;

/** `Object#toString` result references. */
var argsTag = '[object Arguments]',
    arrayTag = '[object Array]',
    boolTag = '[object Boolean]',
    dateTag = '[object Date]',
    errorTag = '[object Error]',
    funcTag = '[object Function]',
    genTag = '[object GeneratorFunction]',
    mapTag = '[object Map]',
    numberTag = '[object Number]',
    objectTag = '[object Object]',
    regexpTag = '[object RegExp]',
    setTag = '[object Set]',
    stringTag = '[object String]',
    symbolTag = '[object Symbol]',
    weakMapTag = '[object WeakMap]';

var arrayBufferTag = '[object ArrayBuffer]',
    dataViewTag = '[object DataView]',
    float32Tag = '[object Float32Array]',
    float64Tag = '[object Float64Array]',
    int8Tag = '[object Int8Array]',
    int16Tag = '[object Int16Array]',
    int32Tag = '[object Int32Array]',
    uint8Tag = '[object Uint8Array]',
    uint8ClampedTag = '[object Uint8ClampedArray]',
    uint16Tag = '[object Uint16Array]',
    uint32Tag = '[object Uint32Array]';

/** Used to identify `toStringTag` values supported by `_.clone`. */
var cloneableTags = {};
cloneableTags[argsTag] = cloneableTags[arrayTag] =
cloneableTags[arrayBufferTag] = cloneableTags[dataViewTag] =
cloneableTags[boolTag] = cloneableTags[dateTag] =
cloneableTags[float32Tag] = cloneableTags[float64Tag] =
cloneableTags[int8Tag] = cloneableTags[int16Tag] =
cloneableTags[int32Tag] = cloneableTags[mapTag] =
cloneableTags[numberTag] = cloneableTags[objectTag] =
cloneableTags[regexpTag] = cloneableTags[setTag] =
cloneableTags[stringTag] = cloneableTags[symbolTag] =
cloneableTags[uint8Tag] = cloneableTags[uint8ClampedTag] =
cloneableTags[uint16Tag] = cloneableTags[uint32Tag] = true;
cloneableTags[errorTag] = cloneableTags[funcTag] =
cloneableTags[weakMapTag] = false;

/**
 * The base implementation of `_.clone` and `_.cloneDeep` which tracks
 * traversed objects.
 *
 * @private
 * @param {*} value The value to clone.
 * @param {boolean} bitmask The bitmask flags.
 *  1 - Deep clone
 *  2 - Flatten inherited properties
 *  4 - Clone symbols
 * @param {Function} [customizer] The function to customize cloning.
 * @param {string} [key] The key of `value`.
 * @param {Object} [object] The parent object of `value`.
 * @param {Object} [stack] Tracks traversed objects and their clone counterparts.
 * @returns {*} Returns the cloned value.
 */
function baseClone(value, bitmask, customizer, key, object, stack) {
  var result,
      isDeep = bitmask & CLONE_DEEP_FLAG,
      isFlat = bitmask & CLONE_FLAT_FLAG,
      isFull = bitmask & CLONE_SYMBOLS_FLAG;

  if (customizer) {
    result = object ? customizer(value, key, object, stack) : customizer(value);
  }
  if (result !== undefined) {
    return result;
  }
  if (!isObject(value)) {
    return value;
  }
  var isArr = isArray(value);
  if (isArr) {
    result = initCloneArray(value);
    if (!isDeep) {
      return copyArray(value, result);
    }
  } else {
    var tag = getTag(value),
        isFunc = tag == funcTag || tag == genTag;

    if (isBuffer(value)) {
      return cloneBuffer(value, isDeep);
    }
    if (tag == objectTag || tag == argsTag || (isFunc && !object)) {
      result = (isFlat || isFunc) ? {} : initCloneObject(value);
      if (!isDeep) {
        return isFlat
          ? copySymbolsIn(value, baseAssignIn(result, value))
          : copySymbols(value, baseAssign(result, value));
      }
    } else {
      if (!cloneableTags[tag]) {
        return object ? value : {};
      }
      result = initCloneByTag(value, tag, isDeep);
    }
  }
  // Check for circular references and return its corresponding clone.
  stack || (stack = new Stack);
  var stacked = stack.get(value);
  if (stacked) {
    return stacked;
  }
  stack.set(value, result);

  if (isSet(value)) {
    value.forEach(function(subValue) {
      result.add(baseClone(subValue, bitmask, customizer, subValue, value, stack));
    });

    return result;
  }

  if (isMap(value)) {
    value.forEach(function(subValue, key) {
      result.set(key, baseClone(subValue, bitmask, customizer, key, value, stack));
    });

    return result;
  }

  var keysFunc = isFull
    ? (isFlat ? getAllKeysIn : getAllKeys)
    : (isFlat ? keysIn : keys);

  var props = isArr ? undefined : keysFunc(value);
  arrayEach(props || value, function(subValue, key) {
    if (props) {
      key = subValue;
      subValue = value[key];
    }
    // Recursively populate clone (susceptible to call stack limits).
    assignValue(result, key, baseClone(subValue, bitmask, customizer, key, value, stack));
  });
  return result;
}

module.exports = baseClone;

},{"./_Stack":59,"./_arrayEach":64,"./_assignValue":73,"./_baseAssign":75,"./_baseAssignIn":76,"./_cloneBuffer":122,"./_copyArray":127,"./_copySymbols":129,"./_copySymbolsIn":130,"./_getAllKeys":142,"./_getAllKeysIn":143,"./_getTag":151,"./_initCloneArray":159,"./_initCloneByTag":160,"./_initCloneObject":161,"./isArray":218,"./isBuffer":221,"./isMap":224,"./isObject":225,"./isSet":228,"./keys":231}],79:[function(require,module,exports){
var isObject = require('./isObject');

/** Built-in value references. */
var objectCreate = Object.create;

/**
 * The base implementation of `_.create` without support for assigning
 * properties to the created object.
 *
 * @private
 * @param {Object} proto The object to inherit from.
 * @returns {Object} Returns the new object.
 */
var baseCreate = (function() {
  function object() {}
  return function(proto) {
    if (!isObject(proto)) {
      return {};
    }
    if (objectCreate) {
      return objectCreate(proto);
    }
    object.prototype = proto;
    var result = new object;
    object.prototype = undefined;
    return result;
  };
}());

module.exports = baseCreate;

},{"./isObject":225}],80:[function(require,module,exports){
/**
 * The base implementation of `_.findIndex` and `_.findLastIndex` without
 * support for iteratee shorthands.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {Function} predicate The function invoked per iteration.
 * @param {number} fromIndex The index to search from.
 * @param {boolean} [fromRight] Specify iterating from right to left.
 * @returns {number} Returns the index of the matched value, else `-1`.
 */
function baseFindIndex(array, predicate, fromIndex, fromRight) {
  var length = array.length,
      index = fromIndex + (fromRight ? 1 : -1);

  while ((fromRight ? index-- : ++index < length)) {
    if (predicate(array[index], index, array)) {
      return index;
    }
  }
  return -1;
}

module.exports = baseFindIndex;

},{}],81:[function(require,module,exports){
var arrayPush = require('./_arrayPush'),
    isFlattenable = require('./_isFlattenable');

/**
 * The base implementation of `_.flatten` with support for restricting flattening.
 *
 * @private
 * @param {Array} array The array to flatten.
 * @param {number} depth The maximum recursion depth.
 * @param {boolean} [predicate=isFlattenable] The function invoked per iteration.
 * @param {boolean} [isStrict] Restrict to values that pass `predicate` checks.
 * @param {Array} [result=[]] The initial result value.
 * @returns {Array} Returns the new flattened array.
 */
function baseFlatten(array, depth, predicate, isStrict, result) {
  var index = -1,
      length = array.length;

  predicate || (predicate = isFlattenable);
  result || (result = []);

  while (++index < length) {
    var value = array[index];
    if (depth > 0 && predicate(value)) {
      if (depth > 1) {
        // Recursively flatten arrays (susceptible to call stack limits).
        baseFlatten(value, depth - 1, predicate, isStrict, result);
      } else {
        arrayPush(result, value);
      }
    } else if (!isStrict) {
      result[result.length] = value;
    }
  }
  return result;
}

module.exports = baseFlatten;

},{"./_arrayPush":70,"./_isFlattenable":162}],82:[function(require,module,exports){
var createBaseFor = require('./_createBaseFor');

/**
 * The base implementation of `baseForOwn` which iterates over `object`
 * properties returned by `keysFunc` and invokes `iteratee` for each property.
 * Iteratee functions may exit iteration early by explicitly returning `false`.
 *
 * @private
 * @param {Object} object The object to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @param {Function} keysFunc The function to get the keys of `object`.
 * @returns {Object} Returns `object`.
 */
var baseFor = createBaseFor();

module.exports = baseFor;

},{"./_createBaseFor":133}],83:[function(require,module,exports){
var baseFor = require('./_baseFor'),
    keys = require('./keys');

/**
 * The base implementation of `_.forOwn` without support for iteratee shorthands.
 *
 * @private
 * @param {Object} object The object to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Object} Returns `object`.
 */
function baseForOwn(object, iteratee) {
  return object && baseFor(object, iteratee, keys);
}

module.exports = baseForOwn;

},{"./_baseFor":82,"./keys":231}],84:[function(require,module,exports){
var castPath = require('./_castPath'),
    toKey = require('./_toKey');

/**
 * The base implementation of `_.get` without support for default values.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {Array|string} path The path of the property to get.
 * @returns {*} Returns the resolved value.
 */
function baseGet(object, path) {
  path = castPath(path, object);

  var index = 0,
      length = path.length;

  while (object != null && index < length) {
    object = object[toKey(path[index++])];
  }
  return (index && index == length) ? object : undefined;
}

module.exports = baseGet;

},{"./_castPath":120,"./_toKey":205}],85:[function(require,module,exports){
var arrayPush = require('./_arrayPush'),
    isArray = require('./isArray');

/**
 * The base implementation of `getAllKeys` and `getAllKeysIn` which uses
 * `keysFunc` and `symbolsFunc` to get the enumerable property names and
 * symbols of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {Function} keysFunc The function to get the keys of `object`.
 * @param {Function} symbolsFunc The function to get the symbols of `object`.
 * @returns {Array} Returns the array of property names and symbols.
 */
function baseGetAllKeys(object, keysFunc, symbolsFunc) {
  var result = keysFunc(object);
  return isArray(object) ? result : arrayPush(result, symbolsFunc(object));
}

module.exports = baseGetAllKeys;

},{"./_arrayPush":70,"./isArray":218}],86:[function(require,module,exports){
var Symbol = require('./_Symbol'),
    getRawTag = require('./_getRawTag'),
    objectToString = require('./_objectToString');

/** `Object#toString` result references. */
var nullTag = '[object Null]',
    undefinedTag = '[object Undefined]';

/** Built-in value references. */
var symToStringTag = Symbol ? Symbol.toStringTag : undefined;

/**
 * The base implementation of `getTag` without fallbacks for buggy environments.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the `toStringTag`.
 */
function baseGetTag(value) {
  if (value == null) {
    return value === undefined ? undefinedTag : nullTag;
  }
  return (symToStringTag && symToStringTag in Object(value))
    ? getRawTag(value)
    : objectToString(value);
}

module.exports = baseGetTag;

},{"./_Symbol":60,"./_getRawTag":148,"./_objectToString":187}],87:[function(require,module,exports){
/**
 * The base implementation of `_.hasIn` without support for deep paths.
 *
 * @private
 * @param {Object} [object] The object to query.
 * @param {Array|string} key The key to check.
 * @returns {boolean} Returns `true` if `key` exists, else `false`.
 */
function baseHasIn(object, key) {
  return object != null && key in Object(object);
}

module.exports = baseHasIn;

},{}],88:[function(require,module,exports){
var baseFindIndex = require('./_baseFindIndex'),
    baseIsNaN = require('./_baseIsNaN'),
    strictIndexOf = require('./_strictIndexOf');

/**
 * The base implementation of `_.indexOf` without `fromIndex` bounds checks.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {*} value The value to search for.
 * @param {number} fromIndex The index to search from.
 * @returns {number} Returns the index of the matched value, else `-1`.
 */
function baseIndexOf(array, value, fromIndex) {
  return value === value
    ? strictIndexOf(array, value, fromIndex)
    : baseFindIndex(array, baseIsNaN, fromIndex);
}

module.exports = baseIndexOf;

},{"./_baseFindIndex":80,"./_baseIsNaN":95,"./_strictIndexOf":203}],89:[function(require,module,exports){
var SetCache = require('./_SetCache'),
    arrayIncludes = require('./_arrayIncludes'),
    arrayIncludesWith = require('./_arrayIncludesWith'),
    arrayMap = require('./_arrayMap'),
    baseUnary = require('./_baseUnary'),
    cacheHas = require('./_cacheHas');

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeMin = Math.min;

/**
 * The base implementation of methods like `_.intersection`, without support
 * for iteratee shorthands, that accepts an array of arrays to inspect.
 *
 * @private
 * @param {Array} arrays The arrays to inspect.
 * @param {Function} [iteratee] The iteratee invoked per element.
 * @param {Function} [comparator] The comparator invoked per element.
 * @returns {Array} Returns the new array of shared values.
 */
function baseIntersection(arrays, iteratee, comparator) {
  var includes = comparator ? arrayIncludesWith : arrayIncludes,
      length = arrays[0].length,
      othLength = arrays.length,
      othIndex = othLength,
      caches = Array(othLength),
      maxLength = Infinity,
      result = [];

  while (othIndex--) {
    var array = arrays[othIndex];
    if (othIndex && iteratee) {
      array = arrayMap(array, baseUnary(iteratee));
    }
    maxLength = nativeMin(array.length, maxLength);
    caches[othIndex] = !comparator && (iteratee || (length >= 120 && array.length >= 120))
      ? new SetCache(othIndex && array)
      : undefined;
  }
  array = arrays[0];

  var index = -1,
      seen = caches[0];

  outer:
  while (++index < length && result.length < maxLength) {
    var value = array[index],
        computed = iteratee ? iteratee(value) : value;

    value = (comparator || value !== 0) ? value : 0;
    if (!(seen
          ? cacheHas(seen, computed)
          : includes(result, computed, comparator)
        )) {
      othIndex = othLength;
      while (--othIndex) {
        var cache = caches[othIndex];
        if (!(cache
              ? cacheHas(cache, computed)
              : includes(arrays[othIndex], computed, comparator))
            ) {
          continue outer;
        }
      }
      if (seen) {
        seen.push(computed);
      }
      result.push(value);
    }
  }
  return result;
}

module.exports = baseIntersection;

},{"./_SetCache":58,"./_arrayIncludes":66,"./_arrayIncludesWith":67,"./_arrayMap":69,"./_baseUnary":116,"./_cacheHas":118}],90:[function(require,module,exports){
var baseGetTag = require('./_baseGetTag'),
    isObjectLike = require('./isObjectLike');

/** `Object#toString` result references. */
var argsTag = '[object Arguments]';

/**
 * The base implementation of `_.isArguments`.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an `arguments` object,
 */
function baseIsArguments(value) {
  return isObjectLike(value) && baseGetTag(value) == argsTag;
}

module.exports = baseIsArguments;

},{"./_baseGetTag":86,"./isObjectLike":226}],91:[function(require,module,exports){
var baseIsEqualDeep = require('./_baseIsEqualDeep'),
    isObjectLike = require('./isObjectLike');

/**
 * The base implementation of `_.isEqual` which supports partial comparisons
 * and tracks traversed objects.
 *
 * @private
 * @param {*} value The value to compare.
 * @param {*} other The other value to compare.
 * @param {boolean} bitmask The bitmask flags.
 *  1 - Unordered comparison
 *  2 - Partial comparison
 * @param {Function} [customizer] The function to customize comparisons.
 * @param {Object} [stack] Tracks traversed `value` and `other` objects.
 * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
 */
function baseIsEqual(value, other, bitmask, customizer, stack) {
  if (value === other) {
    return true;
  }
  if (value == null || other == null || (!isObjectLike(value) && !isObjectLike(other))) {
    return value !== value && other !== other;
  }
  return baseIsEqualDeep(value, other, bitmask, customizer, baseIsEqual, stack);
}

module.exports = baseIsEqual;

},{"./_baseIsEqualDeep":92,"./isObjectLike":226}],92:[function(require,module,exports){
var Stack = require('./_Stack'),
    equalArrays = require('./_equalArrays'),
    equalByTag = require('./_equalByTag'),
    equalObjects = require('./_equalObjects'),
    getTag = require('./_getTag'),
    isArray = require('./isArray'),
    isBuffer = require('./isBuffer'),
    isTypedArray = require('./isTypedArray');

/** Used to compose bitmasks for value comparisons. */
var COMPARE_PARTIAL_FLAG = 1;

/** `Object#toString` result references. */
var argsTag = '[object Arguments]',
    arrayTag = '[object Array]',
    objectTag = '[object Object]';

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * A specialized version of `baseIsEqual` for arrays and objects which performs
 * deep comparisons and tracks traversed objects enabling objects with circular
 * references to be compared.
 *
 * @private
 * @param {Object} object The object to compare.
 * @param {Object} other The other object to compare.
 * @param {number} bitmask The bitmask flags. See `baseIsEqual` for more details.
 * @param {Function} customizer The function to customize comparisons.
 * @param {Function} equalFunc The function to determine equivalents of values.
 * @param {Object} [stack] Tracks traversed `object` and `other` objects.
 * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
 */
function baseIsEqualDeep(object, other, bitmask, customizer, equalFunc, stack) {
  var objIsArr = isArray(object),
      othIsArr = isArray(other),
      objTag = objIsArr ? arrayTag : getTag(object),
      othTag = othIsArr ? arrayTag : getTag(other);

  objTag = objTag == argsTag ? objectTag : objTag;
  othTag = othTag == argsTag ? objectTag : othTag;

  var objIsObj = objTag == objectTag,
      othIsObj = othTag == objectTag,
      isSameTag = objTag == othTag;

  if (isSameTag && isBuffer(object)) {
    if (!isBuffer(other)) {
      return false;
    }
    objIsArr = true;
    objIsObj = false;
  }
  if (isSameTag && !objIsObj) {
    stack || (stack = new Stack);
    return (objIsArr || isTypedArray(object))
      ? equalArrays(object, other, bitmask, customizer, equalFunc, stack)
      : equalByTag(object, other, objTag, bitmask, customizer, equalFunc, stack);
  }
  if (!(bitmask & COMPARE_PARTIAL_FLAG)) {
    var objIsWrapped = objIsObj && hasOwnProperty.call(object, '__wrapped__'),
        othIsWrapped = othIsObj && hasOwnProperty.call(other, '__wrapped__');

    if (objIsWrapped || othIsWrapped) {
      var objUnwrapped = objIsWrapped ? object.value() : object,
          othUnwrapped = othIsWrapped ? other.value() : other;

      stack || (stack = new Stack);
      return equalFunc(objUnwrapped, othUnwrapped, bitmask, customizer, stack);
    }
  }
  if (!isSameTag) {
    return false;
  }
  stack || (stack = new Stack);
  return equalObjects(object, other, bitmask, customizer, equalFunc, stack);
}

module.exports = baseIsEqualDeep;

},{"./_Stack":59,"./_equalArrays":137,"./_equalByTag":138,"./_equalObjects":139,"./_getTag":151,"./isArray":218,"./isBuffer":221,"./isTypedArray":230}],93:[function(require,module,exports){
var getTag = require('./_getTag'),
    isObjectLike = require('./isObjectLike');

/** `Object#toString` result references. */
var mapTag = '[object Map]';

/**
 * The base implementation of `_.isMap` without Node.js optimizations.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a map, else `false`.
 */
function baseIsMap(value) {
  return isObjectLike(value) && getTag(value) == mapTag;
}

module.exports = baseIsMap;

},{"./_getTag":151,"./isObjectLike":226}],94:[function(require,module,exports){
var Stack = require('./_Stack'),
    baseIsEqual = require('./_baseIsEqual');

/** Used to compose bitmasks for value comparisons. */
var COMPARE_PARTIAL_FLAG = 1,
    COMPARE_UNORDERED_FLAG = 2;

/**
 * The base implementation of `_.isMatch` without support for iteratee shorthands.
 *
 * @private
 * @param {Object} object The object to inspect.
 * @param {Object} source The object of property values to match.
 * @param {Array} matchData The property names, values, and compare flags to match.
 * @param {Function} [customizer] The function to customize comparisons.
 * @returns {boolean} Returns `true` if `object` is a match, else `false`.
 */
function baseIsMatch(object, source, matchData, customizer) {
  var index = matchData.length,
      length = index,
      noCustomizer = !customizer;

  if (object == null) {
    return !length;
  }
  object = Object(object);
  while (index--) {
    var data = matchData[index];
    if ((noCustomizer && data[2])
          ? data[1] !== object[data[0]]
          : !(data[0] in object)
        ) {
      return false;
    }
  }
  while (++index < length) {
    data = matchData[index];
    var key = data[0],
        objValue = object[key],
        srcValue = data[1];

    if (noCustomizer && data[2]) {
      if (objValue === undefined && !(key in object)) {
        return false;
      }
    } else {
      var stack = new Stack;
      if (customizer) {
        var result = customizer(objValue, srcValue, key, object, source, stack);
      }
      if (!(result === undefined
            ? baseIsEqual(srcValue, objValue, COMPARE_PARTIAL_FLAG | COMPARE_UNORDERED_FLAG, customizer, stack)
            : result
          )) {
        return false;
      }
    }
  }
  return true;
}

module.exports = baseIsMatch;

},{"./_Stack":59,"./_baseIsEqual":91}],95:[function(require,module,exports){
/**
 * The base implementation of `_.isNaN` without support for number objects.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is `NaN`, else `false`.
 */
function baseIsNaN(value) {
  return value !== value;
}

module.exports = baseIsNaN;

},{}],96:[function(require,module,exports){
var isFunction = require('./isFunction'),
    isMasked = require('./_isMasked'),
    isObject = require('./isObject'),
    toSource = require('./_toSource');

/**
 * Used to match `RegExp`
 * [syntax characters](http://ecma-international.org/ecma-262/7.0/#sec-patterns).
 */
var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;

/** Used to detect host constructors (Safari). */
var reIsHostCtor = /^\[object .+?Constructor\]$/;

/** Used for built-in method references. */
var funcProto = Function.prototype,
    objectProto = Object.prototype;

/** Used to resolve the decompiled source of functions. */
var funcToString = funcProto.toString;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/** Used to detect if a method is native. */
var reIsNative = RegExp('^' +
  funcToString.call(hasOwnProperty).replace(reRegExpChar, '\\$&')
  .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
);

/**
 * The base implementation of `_.isNative` without bad shim checks.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a native function,
 *  else `false`.
 */
function baseIsNative(value) {
  if (!isObject(value) || isMasked(value)) {
    return false;
  }
  var pattern = isFunction(value) ? reIsNative : reIsHostCtor;
  return pattern.test(toSource(value));
}

module.exports = baseIsNative;

},{"./_isMasked":167,"./_toSource":206,"./isFunction":222,"./isObject":225}],97:[function(require,module,exports){
var getTag = require('./_getTag'),
    isObjectLike = require('./isObjectLike');

/** `Object#toString` result references. */
var setTag = '[object Set]';

/**
 * The base implementation of `_.isSet` without Node.js optimizations.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a set, else `false`.
 */
function baseIsSet(value) {
  return isObjectLike(value) && getTag(value) == setTag;
}

module.exports = baseIsSet;

},{"./_getTag":151,"./isObjectLike":226}],98:[function(require,module,exports){
var baseGetTag = require('./_baseGetTag'),
    isLength = require('./isLength'),
    isObjectLike = require('./isObjectLike');

/** `Object#toString` result references. */
var argsTag = '[object Arguments]',
    arrayTag = '[object Array]',
    boolTag = '[object Boolean]',
    dateTag = '[object Date]',
    errorTag = '[object Error]',
    funcTag = '[object Function]',
    mapTag = '[object Map]',
    numberTag = '[object Number]',
    objectTag = '[object Object]',
    regexpTag = '[object RegExp]',
    setTag = '[object Set]',
    stringTag = '[object String]',
    weakMapTag = '[object WeakMap]';

var arrayBufferTag = '[object ArrayBuffer]',
    dataViewTag = '[object DataView]',
    float32Tag = '[object Float32Array]',
    float64Tag = '[object Float64Array]',
    int8Tag = '[object Int8Array]',
    int16Tag = '[object Int16Array]',
    int32Tag = '[object Int32Array]',
    uint8Tag = '[object Uint8Array]',
    uint8ClampedTag = '[object Uint8ClampedArray]',
    uint16Tag = '[object Uint16Array]',
    uint32Tag = '[object Uint32Array]';

/** Used to identify `toStringTag` values of typed arrays. */
var typedArrayTags = {};
typedArrayTags[float32Tag] = typedArrayTags[float64Tag] =
typedArrayTags[int8Tag] = typedArrayTags[int16Tag] =
typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] =
typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] =
typedArrayTags[uint32Tag] = true;
typedArrayTags[argsTag] = typedArrayTags[arrayTag] =
typedArrayTags[arrayBufferTag] = typedArrayTags[boolTag] =
typedArrayTags[dataViewTag] = typedArrayTags[dateTag] =
typedArrayTags[errorTag] = typedArrayTags[funcTag] =
typedArrayTags[mapTag] = typedArrayTags[numberTag] =
typedArrayTags[objectTag] = typedArrayTags[regexpTag] =
typedArrayTags[setTag] = typedArrayTags[stringTag] =
typedArrayTags[weakMapTag] = false;

/**
 * The base implementation of `_.isTypedArray` without Node.js optimizations.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a typed array, else `false`.
 */
function baseIsTypedArray(value) {
  return isObjectLike(value) &&
    isLength(value.length) && !!typedArrayTags[baseGetTag(value)];
}

module.exports = baseIsTypedArray;

},{"./_baseGetTag":86,"./isLength":223,"./isObjectLike":226}],99:[function(require,module,exports){
var baseMatches = require('./_baseMatches'),
    baseMatchesProperty = require('./_baseMatchesProperty'),
    identity = require('./identity'),
    isArray = require('./isArray'),
    property = require('./property');

/**
 * The base implementation of `_.iteratee`.
 *
 * @private
 * @param {*} [value=_.identity] The value to convert to an iteratee.
 * @returns {Function} Returns the iteratee.
 */
function baseIteratee(value) {
  // Don't store the `typeof` result in a variable to avoid a JIT bug in Safari 9.
  // See https://bugs.webkit.org/show_bug.cgi?id=156034 for more details.
  if (typeof value == 'function') {
    return value;
  }
  if (value == null) {
    return identity;
  }
  if (typeof value == 'object') {
    return isArray(value)
      ? baseMatchesProperty(value[0], value[1])
      : baseMatches(value);
  }
  return property(value);
}

module.exports = baseIteratee;

},{"./_baseMatches":102,"./_baseMatchesProperty":103,"./identity":215,"./isArray":218,"./property":239}],100:[function(require,module,exports){
var isPrototype = require('./_isPrototype'),
    nativeKeys = require('./_nativeKeys');

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * The base implementation of `_.keys` which doesn't treat sparse arrays as dense.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 */
function baseKeys(object) {
  if (!isPrototype(object)) {
    return nativeKeys(object);
  }
  var result = [];
  for (var key in Object(object)) {
    if (hasOwnProperty.call(object, key) && key != 'constructor') {
      result.push(key);
    }
  }
  return result;
}

module.exports = baseKeys;

},{"./_isPrototype":168,"./_nativeKeys":184}],101:[function(require,module,exports){
var isObject = require('./isObject'),
    isPrototype = require('./_isPrototype'),
    nativeKeysIn = require('./_nativeKeysIn');

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * The base implementation of `_.keysIn` which doesn't treat sparse arrays as dense.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 */
function baseKeysIn(object) {
  if (!isObject(object)) {
    return nativeKeysIn(object);
  }
  var isProto = isPrototype(object),
      result = [];

  for (var key in object) {
    if (!(key == 'constructor' && (isProto || !hasOwnProperty.call(object, key)))) {
      result.push(key);
    }
  }
  return result;
}

module.exports = baseKeysIn;

},{"./_isPrototype":168,"./_nativeKeysIn":185,"./isObject":225}],102:[function(require,module,exports){
var baseIsMatch = require('./_baseIsMatch'),
    getMatchData = require('./_getMatchData'),
    matchesStrictComparable = require('./_matchesStrictComparable');

/**
 * The base implementation of `_.matches` which doesn't clone `source`.
 *
 * @private
 * @param {Object} source The object of property values to match.
 * @returns {Function} Returns the new spec function.
 */
function baseMatches(source) {
  var matchData = getMatchData(source);
  if (matchData.length == 1 && matchData[0][2]) {
    return matchesStrictComparable(matchData[0][0], matchData[0][1]);
  }
  return function(object) {
    return object === source || baseIsMatch(object, source, matchData);
  };
}

module.exports = baseMatches;

},{"./_baseIsMatch":94,"./_getMatchData":145,"./_matchesStrictComparable":181}],103:[function(require,module,exports){
var baseIsEqual = require('./_baseIsEqual'),
    get = require('./get'),
    hasIn = require('./hasIn'),
    isKey = require('./_isKey'),
    isStrictComparable = require('./_isStrictComparable'),
    matchesStrictComparable = require('./_matchesStrictComparable'),
    toKey = require('./_toKey');

/** Used to compose bitmasks for value comparisons. */
var COMPARE_PARTIAL_FLAG = 1,
    COMPARE_UNORDERED_FLAG = 2;

/**
 * The base implementation of `_.matchesProperty` which doesn't clone `srcValue`.
 *
 * @private
 * @param {string} path The path of the property to get.
 * @param {*} srcValue The value to match.
 * @returns {Function} Returns the new spec function.
 */
function baseMatchesProperty(path, srcValue) {
  if (isKey(path) && isStrictComparable(srcValue)) {
    return matchesStrictComparable(toKey(path), srcValue);
  }
  return function(object) {
    var objValue = get(object, path);
    return (objValue === undefined && objValue === srcValue)
      ? hasIn(object, path)
      : baseIsEqual(srcValue, objValue, COMPARE_PARTIAL_FLAG | COMPARE_UNORDERED_FLAG);
  };
}

module.exports = baseMatchesProperty;

},{"./_baseIsEqual":91,"./_isKey":165,"./_isStrictComparable":169,"./_matchesStrictComparable":181,"./_toKey":205,"./get":213,"./hasIn":214}],104:[function(require,module,exports){
var Stack = require('./_Stack'),
    assignMergeValue = require('./_assignMergeValue'),
    baseFor = require('./_baseFor'),
    baseMergeDeep = require('./_baseMergeDeep'),
    isObject = require('./isObject'),
    keysIn = require('./keysIn'),
    safeGet = require('./_safeGet');

/**
 * The base implementation of `_.merge` without support for multiple sources.
 *
 * @private
 * @param {Object} object The destination object.
 * @param {Object} source The source object.
 * @param {number} srcIndex The index of `source`.
 * @param {Function} [customizer] The function to customize merged values.
 * @param {Object} [stack] Tracks traversed source values and their merged
 *  counterparts.
 */
function baseMerge(object, source, srcIndex, customizer, stack) {
  if (object === source) {
    return;
  }
  baseFor(source, function(srcValue, key) {
    if (isObject(srcValue)) {
      stack || (stack = new Stack);
      baseMergeDeep(object, source, key, srcIndex, baseMerge, customizer, stack);
    }
    else {
      var newValue = customizer
        ? customizer(safeGet(object, key), srcValue, (key + ''), object, source, stack)
        : undefined;

      if (newValue === undefined) {
        newValue = srcValue;
      }
      assignMergeValue(object, key, newValue);
    }
  }, keysIn);
}

module.exports = baseMerge;

},{"./_Stack":59,"./_assignMergeValue":72,"./_baseFor":82,"./_baseMergeDeep":105,"./_safeGet":192,"./isObject":225,"./keysIn":232}],105:[function(require,module,exports){
var assignMergeValue = require('./_assignMergeValue'),
    cloneBuffer = require('./_cloneBuffer'),
    cloneTypedArray = require('./_cloneTypedArray'),
    copyArray = require('./_copyArray'),
    initCloneObject = require('./_initCloneObject'),
    isArguments = require('./isArguments'),
    isArray = require('./isArray'),
    isArrayLikeObject = require('./isArrayLikeObject'),
    isBuffer = require('./isBuffer'),
    isFunction = require('./isFunction'),
    isObject = require('./isObject'),
    isPlainObject = require('./isPlainObject'),
    isTypedArray = require('./isTypedArray'),
    safeGet = require('./_safeGet'),
    toPlainObject = require('./toPlainObject');

/**
 * A specialized version of `baseMerge` for arrays and objects which performs
 * deep merges and tracks traversed objects enabling objects with circular
 * references to be merged.
 *
 * @private
 * @param {Object} object The destination object.
 * @param {Object} source The source object.
 * @param {string} key The key of the value to merge.
 * @param {number} srcIndex The index of `source`.
 * @param {Function} mergeFunc The function to merge values.
 * @param {Function} [customizer] The function to customize assigned values.
 * @param {Object} [stack] Tracks traversed source values and their merged
 *  counterparts.
 */
function baseMergeDeep(object, source, key, srcIndex, mergeFunc, customizer, stack) {
  var objValue = safeGet(object, key),
      srcValue = safeGet(source, key),
      stacked = stack.get(srcValue);

  if (stacked) {
    assignMergeValue(object, key, stacked);
    return;
  }
  var newValue = customizer
    ? customizer(objValue, srcValue, (key + ''), object, source, stack)
    : undefined;

  var isCommon = newValue === undefined;

  if (isCommon) {
    var isArr = isArray(srcValue),
        isBuff = !isArr && isBuffer(srcValue),
        isTyped = !isArr && !isBuff && isTypedArray(srcValue);

    newValue = srcValue;
    if (isArr || isBuff || isTyped) {
      if (isArray(objValue)) {
        newValue = objValue;
      }
      else if (isArrayLikeObject(objValue)) {
        newValue = copyArray(objValue);
      }
      else if (isBuff) {
        isCommon = false;
        newValue = cloneBuffer(srcValue, true);
      }
      else if (isTyped) {
        isCommon = false;
        newValue = cloneTypedArray(srcValue, true);
      }
      else {
        newValue = [];
      }
    }
    else if (isPlainObject(srcValue) || isArguments(srcValue)) {
      newValue = objValue;
      if (isArguments(objValue)) {
        newValue = toPlainObject(objValue);
      }
      else if (!isObject(objValue) || (srcIndex && isFunction(objValue))) {
        newValue = initCloneObject(srcValue);
      }
    }
    else {
      isCommon = false;
    }
  }
  if (isCommon) {
    // Recursively merge objects and arrays (susceptible to call stack limits).
    stack.set(srcValue, newValue);
    mergeFunc(newValue, srcValue, srcIndex, customizer, stack);
    stack['delete'](srcValue);
  }
  assignMergeValue(object, key, newValue);
}

module.exports = baseMergeDeep;

},{"./_assignMergeValue":72,"./_cloneBuffer":122,"./_cloneTypedArray":126,"./_copyArray":127,"./_initCloneObject":161,"./_safeGet":192,"./isArguments":217,"./isArray":218,"./isArrayLikeObject":220,"./isBuffer":221,"./isFunction":222,"./isObject":225,"./isPlainObject":227,"./isTypedArray":230,"./toPlainObject":243}],106:[function(require,module,exports){
var basePickBy = require('./_basePickBy'),
    hasIn = require('./hasIn');

/**
 * The base implementation of `_.pick` without support for individual
 * property identifiers.
 *
 * @private
 * @param {Object} object The source object.
 * @param {string[]} paths The property paths to pick.
 * @returns {Object} Returns the new object.
 */
function basePick(object, paths) {
  return basePickBy(object, paths, function(value, path) {
    return hasIn(object, path);
  });
}

module.exports = basePick;

},{"./_basePickBy":107,"./hasIn":214}],107:[function(require,module,exports){
var baseGet = require('./_baseGet'),
    baseSet = require('./_baseSet'),
    castPath = require('./_castPath');

/**
 * The base implementation of  `_.pickBy` without support for iteratee shorthands.
 *
 * @private
 * @param {Object} object The source object.
 * @param {string[]} paths The property paths to pick.
 * @param {Function} predicate The function invoked per property.
 * @returns {Object} Returns the new object.
 */
function basePickBy(object, paths, predicate) {
  var index = -1,
      length = paths.length,
      result = {};

  while (++index < length) {
    var path = paths[index],
        value = baseGet(object, path);

    if (predicate(value, path)) {
      baseSet(result, castPath(path, object), value);
    }
  }
  return result;
}

module.exports = basePickBy;

},{"./_baseGet":84,"./_baseSet":111,"./_castPath":120}],108:[function(require,module,exports){
/**
 * The base implementation of `_.property` without support for deep paths.
 *
 * @private
 * @param {string} key The key of the property to get.
 * @returns {Function} Returns the new accessor function.
 */
function baseProperty(key) {
  return function(object) {
    return object == null ? undefined : object[key];
  };
}

module.exports = baseProperty;

},{}],109:[function(require,module,exports){
var baseGet = require('./_baseGet');

/**
 * A specialized version of `baseProperty` which supports deep paths.
 *
 * @private
 * @param {Array|string} path The path of the property to get.
 * @returns {Function} Returns the new accessor function.
 */
function basePropertyDeep(path) {
  return function(object) {
    return baseGet(object, path);
  };
}

module.exports = basePropertyDeep;

},{"./_baseGet":84}],110:[function(require,module,exports){
var identity = require('./identity'),
    overRest = require('./_overRest'),
    setToString = require('./_setToString');

/**
 * The base implementation of `_.rest` which doesn't validate or coerce arguments.
 *
 * @private
 * @param {Function} func The function to apply a rest parameter to.
 * @param {number} [start=func.length-1] The start position of the rest parameter.
 * @returns {Function} Returns the new function.
 */
function baseRest(func, start) {
  return setToString(overRest(func, start, identity), func + '');
}

module.exports = baseRest;

},{"./_overRest":189,"./_setToString":196,"./identity":215}],111:[function(require,module,exports){
var assignValue = require('./_assignValue'),
    castPath = require('./_castPath'),
    isIndex = require('./_isIndex'),
    isObject = require('./isObject'),
    toKey = require('./_toKey');

/**
 * The base implementation of `_.set`.
 *
 * @private
 * @param {Object} object The object to modify.
 * @param {Array|string} path The path of the property to set.
 * @param {*} value The value to set.
 * @param {Function} [customizer] The function to customize path creation.
 * @returns {Object} Returns `object`.
 */
function baseSet(object, path, value, customizer) {
  if (!isObject(object)) {
    return object;
  }
  path = castPath(path, object);

  var index = -1,
      length = path.length,
      lastIndex = length - 1,
      nested = object;

  while (nested != null && ++index < length) {
    var key = toKey(path[index]),
        newValue = value;

    if (index != lastIndex) {
      var objValue = nested[key];
      newValue = customizer ? customizer(objValue, key, nested) : undefined;
      if (newValue === undefined) {
        newValue = isObject(objValue)
          ? objValue
          : (isIndex(path[index + 1]) ? [] : {});
      }
    }
    assignValue(nested, key, newValue);
    nested = nested[key];
  }
  return object;
}

module.exports = baseSet;

},{"./_assignValue":73,"./_castPath":120,"./_isIndex":163,"./_toKey":205,"./isObject":225}],112:[function(require,module,exports){
var constant = require('./constant'),
    defineProperty = require('./_defineProperty'),
    identity = require('./identity');

/**
 * The base implementation of `setToString` without support for hot loop shorting.
 *
 * @private
 * @param {Function} func The function to modify.
 * @param {Function} string The `toString` result.
 * @returns {Function} Returns `func`.
 */
var baseSetToString = !defineProperty ? identity : function(func, string) {
  return defineProperty(func, 'toString', {
    'configurable': true,
    'enumerable': false,
    'value': constant(string),
    'writable': true
  });
};

module.exports = baseSetToString;

},{"./_defineProperty":136,"./constant":208,"./identity":215}],113:[function(require,module,exports){
/**
 * The base implementation of `_.slice` without an iteratee call guard.
 *
 * @private
 * @param {Array} array The array to slice.
 * @param {number} [start=0] The start position.
 * @param {number} [end=array.length] The end position.
 * @returns {Array} Returns the slice of `array`.
 */
function baseSlice(array, start, end) {
  var index = -1,
      length = array.length;

  if (start < 0) {
    start = -start > length ? 0 : (length + start);
  }
  end = end > length ? length : end;
  if (end < 0) {
    end += length;
  }
  length = start > end ? 0 : ((end - start) >>> 0);
  start >>>= 0;

  var result = Array(length);
  while (++index < length) {
    result[index] = array[index + start];
  }
  return result;
}

module.exports = baseSlice;

},{}],114:[function(require,module,exports){
/**
 * The base implementation of `_.times` without support for iteratee shorthands
 * or max array length checks.
 *
 * @private
 * @param {number} n The number of times to invoke `iteratee`.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array} Returns the array of results.
 */
function baseTimes(n, iteratee) {
  var index = -1,
      result = Array(n);

  while (++index < n) {
    result[index] = iteratee(index);
  }
  return result;
}

module.exports = baseTimes;

},{}],115:[function(require,module,exports){
var Symbol = require('./_Symbol'),
    arrayMap = require('./_arrayMap'),
    isArray = require('./isArray'),
    isSymbol = require('./isSymbol');

/** Used as references for various `Number` constants. */
var INFINITY = 1 / 0;

/** Used to convert symbols to primitives and strings. */
var symbolProto = Symbol ? Symbol.prototype : undefined,
    symbolToString = symbolProto ? symbolProto.toString : undefined;

/**
 * The base implementation of `_.toString` which doesn't convert nullish
 * values to empty strings.
 *
 * @private
 * @param {*} value The value to process.
 * @returns {string} Returns the string.
 */
function baseToString(value) {
  // Exit early for strings to avoid a performance hit in some environments.
  if (typeof value == 'string') {
    return value;
  }
  if (isArray(value)) {
    // Recursively convert values (susceptible to call stack limits).
    return arrayMap(value, baseToString) + '';
  }
  if (isSymbol(value)) {
    return symbolToString ? symbolToString.call(value) : '';
  }
  var result = (value + '');
  return (result == '0' && (1 / value) == -INFINITY) ? '-0' : result;
}

module.exports = baseToString;

},{"./_Symbol":60,"./_arrayMap":69,"./isArray":218,"./isSymbol":229}],116:[function(require,module,exports){
/**
 * The base implementation of `_.unary` without support for storing metadata.
 *
 * @private
 * @param {Function} func The function to cap arguments for.
 * @returns {Function} Returns the new capped function.
 */
function baseUnary(func) {
  return function(value) {
    return func(value);
  };
}

module.exports = baseUnary;

},{}],117:[function(require,module,exports){
var castPath = require('./_castPath'),
    last = require('./last'),
    parent = require('./_parent'),
    toKey = require('./_toKey');

/**
 * The base implementation of `_.unset`.
 *
 * @private
 * @param {Object} object The object to modify.
 * @param {Array|string} path The property path to unset.
 * @returns {boolean} Returns `true` if the property is deleted, else `false`.
 */
function baseUnset(object, path) {
  path = castPath(path, object);
  object = parent(object, path);
  return object == null || delete object[toKey(last(path))];
}

module.exports = baseUnset;

},{"./_castPath":120,"./_parent":190,"./_toKey":205,"./last":233}],118:[function(require,module,exports){
/**
 * Checks if a `cache` value for `key` exists.
 *
 * @private
 * @param {Object} cache The cache to query.
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function cacheHas(cache, key) {
  return cache.has(key);
}

module.exports = cacheHas;

},{}],119:[function(require,module,exports){
var isArrayLikeObject = require('./isArrayLikeObject');

/**
 * Casts `value` to an empty array if it's not an array like object.
 *
 * @private
 * @param {*} value The value to inspect.
 * @returns {Array|Object} Returns the cast array-like object.
 */
function castArrayLikeObject(value) {
  return isArrayLikeObject(value) ? value : [];
}

module.exports = castArrayLikeObject;

},{"./isArrayLikeObject":220}],120:[function(require,module,exports){
var isArray = require('./isArray'),
    isKey = require('./_isKey'),
    stringToPath = require('./_stringToPath'),
    toString = require('./toString');

/**
 * Casts `value` to a path array if it's not one.
 *
 * @private
 * @param {*} value The value to inspect.
 * @param {Object} [object] The object to query keys on.
 * @returns {Array} Returns the cast property path array.
 */
function castPath(value, object) {
  if (isArray(value)) {
    return value;
  }
  return isKey(value, object) ? [value] : stringToPath(toString(value));
}

module.exports = castPath;

},{"./_isKey":165,"./_stringToPath":204,"./isArray":218,"./toString":244}],121:[function(require,module,exports){
var Uint8Array = require('./_Uint8Array');

/**
 * Creates a clone of `arrayBuffer`.
 *
 * @private
 * @param {ArrayBuffer} arrayBuffer The array buffer to clone.
 * @returns {ArrayBuffer} Returns the cloned array buffer.
 */
function cloneArrayBuffer(arrayBuffer) {
  var result = new arrayBuffer.constructor(arrayBuffer.byteLength);
  new Uint8Array(result).set(new Uint8Array(arrayBuffer));
  return result;
}

module.exports = cloneArrayBuffer;

},{"./_Uint8Array":61}],122:[function(require,module,exports){
var root = require('./_root');

/** Detect free variable `exports`. */
var freeExports = typeof exports == 'object' && exports && !exports.nodeType && exports;

/** Detect free variable `module`. */
var freeModule = freeExports && typeof module == 'object' && module && !module.nodeType && module;

/** Detect the popular CommonJS extension `module.exports`. */
var moduleExports = freeModule && freeModule.exports === freeExports;

/** Built-in value references. */
var Buffer = moduleExports ? root.Buffer : undefined,
    allocUnsafe = Buffer ? Buffer.allocUnsafe : undefined;

/**
 * Creates a clone of  `buffer`.
 *
 * @private
 * @param {Buffer} buffer The buffer to clone.
 * @param {boolean} [isDeep] Specify a deep clone.
 * @returns {Buffer} Returns the cloned buffer.
 */
function cloneBuffer(buffer, isDeep) {
  if (isDeep) {
    return buffer.slice();
  }
  var length = buffer.length,
      result = allocUnsafe ? allocUnsafe(length) : new buffer.constructor(length);

  buffer.copy(result);
  return result;
}

module.exports = cloneBuffer;

},{"./_root":191}],123:[function(require,module,exports){
var cloneArrayBuffer = require('./_cloneArrayBuffer');

/**
 * Creates a clone of `dataView`.
 *
 * @private
 * @param {Object} dataView The data view to clone.
 * @param {boolean} [isDeep] Specify a deep clone.
 * @returns {Object} Returns the cloned data view.
 */
function cloneDataView(dataView, isDeep) {
  var buffer = isDeep ? cloneArrayBuffer(dataView.buffer) : dataView.buffer;
  return new dataView.constructor(buffer, dataView.byteOffset, dataView.byteLength);
}

module.exports = cloneDataView;

},{"./_cloneArrayBuffer":121}],124:[function(require,module,exports){
/** Used to match `RegExp` flags from their coerced string values. */
var reFlags = /\w*$/;

/**
 * Creates a clone of `regexp`.
 *
 * @private
 * @param {Object} regexp The regexp to clone.
 * @returns {Object} Returns the cloned regexp.
 */
function cloneRegExp(regexp) {
  var result = new regexp.constructor(regexp.source, reFlags.exec(regexp));
  result.lastIndex = regexp.lastIndex;
  return result;
}

module.exports = cloneRegExp;

},{}],125:[function(require,module,exports){
var Symbol = require('./_Symbol');

/** Used to convert symbols to primitives and strings. */
var symbolProto = Symbol ? Symbol.prototype : undefined,
    symbolValueOf = symbolProto ? symbolProto.valueOf : undefined;

/**
 * Creates a clone of the `symbol` object.
 *
 * @private
 * @param {Object} symbol The symbol object to clone.
 * @returns {Object} Returns the cloned symbol object.
 */
function cloneSymbol(symbol) {
  return symbolValueOf ? Object(symbolValueOf.call(symbol)) : {};
}

module.exports = cloneSymbol;

},{"./_Symbol":60}],126:[function(require,module,exports){
var cloneArrayBuffer = require('./_cloneArrayBuffer');

/**
 * Creates a clone of `typedArray`.
 *
 * @private
 * @param {Object} typedArray The typed array to clone.
 * @param {boolean} [isDeep] Specify a deep clone.
 * @returns {Object} Returns the cloned typed array.
 */
function cloneTypedArray(typedArray, isDeep) {
  var buffer = isDeep ? cloneArrayBuffer(typedArray.buffer) : typedArray.buffer;
  return new typedArray.constructor(buffer, typedArray.byteOffset, typedArray.length);
}

module.exports = cloneTypedArray;

},{"./_cloneArrayBuffer":121}],127:[function(require,module,exports){
/**
 * Copies the values of `source` to `array`.
 *
 * @private
 * @param {Array} source The array to copy values from.
 * @param {Array} [array=[]] The array to copy values to.
 * @returns {Array} Returns `array`.
 */
function copyArray(source, array) {
  var index = -1,
      length = source.length;

  array || (array = Array(length));
  while (++index < length) {
    array[index] = source[index];
  }
  return array;
}

module.exports = copyArray;

},{}],128:[function(require,module,exports){
var assignValue = require('./_assignValue'),
    baseAssignValue = require('./_baseAssignValue');

/**
 * Copies properties of `source` to `object`.
 *
 * @private
 * @param {Object} source The object to copy properties from.
 * @param {Array} props The property identifiers to copy.
 * @param {Object} [object={}] The object to copy properties to.
 * @param {Function} [customizer] The function to customize copied values.
 * @returns {Object} Returns `object`.
 */
function copyObject(source, props, object, customizer) {
  var isNew = !object;
  object || (object = {});

  var index = -1,
      length = props.length;

  while (++index < length) {
    var key = props[index];

    var newValue = customizer
      ? customizer(object[key], source[key], key, object, source)
      : undefined;

    if (newValue === undefined) {
      newValue = source[key];
    }
    if (isNew) {
      baseAssignValue(object, key, newValue);
    } else {
      assignValue(object, key, newValue);
    }
  }
  return object;
}

module.exports = copyObject;

},{"./_assignValue":73,"./_baseAssignValue":77}],129:[function(require,module,exports){
var copyObject = require('./_copyObject'),
    getSymbols = require('./_getSymbols');

/**
 * Copies own symbols of `source` to `object`.
 *
 * @private
 * @param {Object} source The object to copy symbols from.
 * @param {Object} [object={}] The object to copy symbols to.
 * @returns {Object} Returns `object`.
 */
function copySymbols(source, object) {
  return copyObject(source, getSymbols(source), object);
}

module.exports = copySymbols;

},{"./_copyObject":128,"./_getSymbols":149}],130:[function(require,module,exports){
var copyObject = require('./_copyObject'),
    getSymbolsIn = require('./_getSymbolsIn');

/**
 * Copies own and inherited symbols of `source` to `object`.
 *
 * @private
 * @param {Object} source The object to copy symbols from.
 * @param {Object} [object={}] The object to copy symbols to.
 * @returns {Object} Returns `object`.
 */
function copySymbolsIn(source, object) {
  return copyObject(source, getSymbolsIn(source), object);
}

module.exports = copySymbolsIn;

},{"./_copyObject":128,"./_getSymbolsIn":150}],131:[function(require,module,exports){
var root = require('./_root');

/** Used to detect overreaching core-js shims. */
var coreJsData = root['__core-js_shared__'];

module.exports = coreJsData;

},{"./_root":191}],132:[function(require,module,exports){
var baseRest = require('./_baseRest'),
    isIterateeCall = require('./_isIterateeCall');

/**
 * Creates a function like `_.assign`.
 *
 * @private
 * @param {Function} assigner The function to assign values.
 * @returns {Function} Returns the new assigner function.
 */
function createAssigner(assigner) {
  return baseRest(function(object, sources) {
    var index = -1,
        length = sources.length,
        customizer = length > 1 ? sources[length - 1] : undefined,
        guard = length > 2 ? sources[2] : undefined;

    customizer = (assigner.length > 3 && typeof customizer == 'function')
      ? (length--, customizer)
      : undefined;

    if (guard && isIterateeCall(sources[0], sources[1], guard)) {
      customizer = length < 3 ? undefined : customizer;
      length = 1;
    }
    object = Object(object);
    while (++index < length) {
      var source = sources[index];
      if (source) {
        assigner(object, source, index, customizer);
      }
    }
    return object;
  });
}

module.exports = createAssigner;

},{"./_baseRest":110,"./_isIterateeCall":164}],133:[function(require,module,exports){
/**
 * Creates a base function for methods like `_.forIn` and `_.forOwn`.
 *
 * @private
 * @param {boolean} [fromRight] Specify iterating from right to left.
 * @returns {Function} Returns the new base function.
 */
function createBaseFor(fromRight) {
  return function(object, iteratee, keysFunc) {
    var index = -1,
        iterable = Object(object),
        props = keysFunc(object),
        length = props.length;

    while (length--) {
      var key = props[fromRight ? length : ++index];
      if (iteratee(iterable[key], key, iterable) === false) {
        break;
      }
    }
    return object;
  };
}

module.exports = createBaseFor;

},{}],134:[function(require,module,exports){
var baseMerge = require('./_baseMerge'),
    isObject = require('./isObject');

/**
 * Used by `_.defaultsDeep` to customize its `_.merge` use to merge source
 * objects into destination objects that are passed thru.
 *
 * @private
 * @param {*} objValue The destination value.
 * @param {*} srcValue The source value.
 * @param {string} key The key of the property to merge.
 * @param {Object} object The parent object of `objValue`.
 * @param {Object} source The parent object of `srcValue`.
 * @param {Object} [stack] Tracks traversed source values and their merged
 *  counterparts.
 * @returns {*} Returns the value to assign.
 */
function customDefaultsMerge(objValue, srcValue, key, object, source, stack) {
  if (isObject(objValue) && isObject(srcValue)) {
    // Recursively merge objects and arrays (susceptible to call stack limits).
    stack.set(srcValue, objValue);
    baseMerge(objValue, srcValue, undefined, customDefaultsMerge, stack);
    stack['delete'](srcValue);
  }
  return objValue;
}

module.exports = customDefaultsMerge;

},{"./_baseMerge":104,"./isObject":225}],135:[function(require,module,exports){
var isPlainObject = require('./isPlainObject');

/**
 * Used by `_.omit` to customize its `_.cloneDeep` use to only clone plain
 * objects.
 *
 * @private
 * @param {*} value The value to inspect.
 * @param {string} key The key of the property to inspect.
 * @returns {*} Returns the uncloned value or `undefined` to defer cloning to `_.cloneDeep`.
 */
function customOmitClone(value) {
  return isPlainObject(value) ? undefined : value;
}

module.exports = customOmitClone;

},{"./isPlainObject":227}],136:[function(require,module,exports){
var getNative = require('./_getNative');

var defineProperty = (function() {
  try {
    var func = getNative(Object, 'defineProperty');
    func({}, '', {});
    return func;
  } catch (e) {}
}());

module.exports = defineProperty;

},{"./_getNative":146}],137:[function(require,module,exports){
var SetCache = require('./_SetCache'),
    arraySome = require('./_arraySome'),
    cacheHas = require('./_cacheHas');

/** Used to compose bitmasks for value comparisons. */
var COMPARE_PARTIAL_FLAG = 1,
    COMPARE_UNORDERED_FLAG = 2;

/**
 * A specialized version of `baseIsEqualDeep` for arrays with support for
 * partial deep comparisons.
 *
 * @private
 * @param {Array} array The array to compare.
 * @param {Array} other The other array to compare.
 * @param {number} bitmask The bitmask flags. See `baseIsEqual` for more details.
 * @param {Function} customizer The function to customize comparisons.
 * @param {Function} equalFunc The function to determine equivalents of values.
 * @param {Object} stack Tracks traversed `array` and `other` objects.
 * @returns {boolean} Returns `true` if the arrays are equivalent, else `false`.
 */
function equalArrays(array, other, bitmask, customizer, equalFunc, stack) {
  var isPartial = bitmask & COMPARE_PARTIAL_FLAG,
      arrLength = array.length,
      othLength = other.length;

  if (arrLength != othLength && !(isPartial && othLength > arrLength)) {
    return false;
  }
  // Assume cyclic values are equal.
  var stacked = stack.get(array);
  if (stacked && stack.get(other)) {
    return stacked == other;
  }
  var index = -1,
      result = true,
      seen = (bitmask & COMPARE_UNORDERED_FLAG) ? new SetCache : undefined;

  stack.set(array, other);
  stack.set(other, array);

  // Ignore non-index properties.
  while (++index < arrLength) {
    var arrValue = array[index],
        othValue = other[index];

    if (customizer) {
      var compared = isPartial
        ? customizer(othValue, arrValue, index, other, array, stack)
        : customizer(arrValue, othValue, index, array, other, stack);
    }
    if (compared !== undefined) {
      if (compared) {
        continue;
      }
      result = false;
      break;
    }
    // Recursively compare arrays (susceptible to call stack limits).
    if (seen) {
      if (!arraySome(other, function(othValue, othIndex) {
            if (!cacheHas(seen, othIndex) &&
                (arrValue === othValue || equalFunc(arrValue, othValue, bitmask, customizer, stack))) {
              return seen.push(othIndex);
            }
          })) {
        result = false;
        break;
      }
    } else if (!(
          arrValue === othValue ||
            equalFunc(arrValue, othValue, bitmask, customizer, stack)
        )) {
      result = false;
      break;
    }
  }
  stack['delete'](array);
  stack['delete'](other);
  return result;
}

module.exports = equalArrays;

},{"./_SetCache":58,"./_arraySome":71,"./_cacheHas":118}],138:[function(require,module,exports){
var Symbol = require('./_Symbol'),
    Uint8Array = require('./_Uint8Array'),
    eq = require('./eq'),
    equalArrays = require('./_equalArrays'),
    mapToArray = require('./_mapToArray'),
    setToArray = require('./_setToArray');

/** Used to compose bitmasks for value comparisons. */
var COMPARE_PARTIAL_FLAG = 1,
    COMPARE_UNORDERED_FLAG = 2;

/** `Object#toString` result references. */
var boolTag = '[object Boolean]',
    dateTag = '[object Date]',
    errorTag = '[object Error]',
    mapTag = '[object Map]',
    numberTag = '[object Number]',
    regexpTag = '[object RegExp]',
    setTag = '[object Set]',
    stringTag = '[object String]',
    symbolTag = '[object Symbol]';

var arrayBufferTag = '[object ArrayBuffer]',
    dataViewTag = '[object DataView]';

/** Used to convert symbols to primitives and strings. */
var symbolProto = Symbol ? Symbol.prototype : undefined,
    symbolValueOf = symbolProto ? symbolProto.valueOf : undefined;

/**
 * A specialized version of `baseIsEqualDeep` for comparing objects of
 * the same `toStringTag`.
 *
 * **Note:** This function only supports comparing values with tags of
 * `Boolean`, `Date`, `Error`, `Number`, `RegExp`, or `String`.
 *
 * @private
 * @param {Object} object The object to compare.
 * @param {Object} other The other object to compare.
 * @param {string} tag The `toStringTag` of the objects to compare.
 * @param {number} bitmask The bitmask flags. See `baseIsEqual` for more details.
 * @param {Function} customizer The function to customize comparisons.
 * @param {Function} equalFunc The function to determine equivalents of values.
 * @param {Object} stack Tracks traversed `object` and `other` objects.
 * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
 */
function equalByTag(object, other, tag, bitmask, customizer, equalFunc, stack) {
  switch (tag) {
    case dataViewTag:
      if ((object.byteLength != other.byteLength) ||
          (object.byteOffset != other.byteOffset)) {
        return false;
      }
      object = object.buffer;
      other = other.buffer;

    case arrayBufferTag:
      if ((object.byteLength != other.byteLength) ||
          !equalFunc(new Uint8Array(object), new Uint8Array(other))) {
        return false;
      }
      return true;

    case boolTag:
    case dateTag:
    case numberTag:
      // Coerce booleans to `1` or `0` and dates to milliseconds.
      // Invalid dates are coerced to `NaN`.
      return eq(+object, +other);

    case errorTag:
      return object.name == other.name && object.message == other.message;

    case regexpTag:
    case stringTag:
      // Coerce regexes to strings and treat strings, primitives and objects,
      // as equal. See http://www.ecma-international.org/ecma-262/7.0/#sec-regexp.prototype.tostring
      // for more details.
      return object == (other + '');

    case mapTag:
      var convert = mapToArray;

    case setTag:
      var isPartial = bitmask & COMPARE_PARTIAL_FLAG;
      convert || (convert = setToArray);

      if (object.size != other.size && !isPartial) {
        return false;
      }
      // Assume cyclic values are equal.
      var stacked = stack.get(object);
      if (stacked) {
        return stacked == other;
      }
      bitmask |= COMPARE_UNORDERED_FLAG;

      // Recursively compare objects (susceptible to call stack limits).
      stack.set(object, other);
      var result = equalArrays(convert(object), convert(other), bitmask, customizer, equalFunc, stack);
      stack['delete'](object);
      return result;

    case symbolTag:
      if (symbolValueOf) {
        return symbolValueOf.call(object) == symbolValueOf.call(other);
      }
  }
  return false;
}

module.exports = equalByTag;

},{"./_Symbol":60,"./_Uint8Array":61,"./_equalArrays":137,"./_mapToArray":180,"./_setToArray":195,"./eq":211}],139:[function(require,module,exports){
var getAllKeys = require('./_getAllKeys');

/** Used to compose bitmasks for value comparisons. */
var COMPARE_PARTIAL_FLAG = 1;

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * A specialized version of `baseIsEqualDeep` for objects with support for
 * partial deep comparisons.
 *
 * @private
 * @param {Object} object The object to compare.
 * @param {Object} other The other object to compare.
 * @param {number} bitmask The bitmask flags. See `baseIsEqual` for more details.
 * @param {Function} customizer The function to customize comparisons.
 * @param {Function} equalFunc The function to determine equivalents of values.
 * @param {Object} stack Tracks traversed `object` and `other` objects.
 * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
 */
function equalObjects(object, other, bitmask, customizer, equalFunc, stack) {
  var isPartial = bitmask & COMPARE_PARTIAL_FLAG,
      objProps = getAllKeys(object),
      objLength = objProps.length,
      othProps = getAllKeys(other),
      othLength = othProps.length;

  if (objLength != othLength && !isPartial) {
    return false;
  }
  var index = objLength;
  while (index--) {
    var key = objProps[index];
    if (!(isPartial ? key in other : hasOwnProperty.call(other, key))) {
      return false;
    }
  }
  // Assume cyclic values are equal.
  var stacked = stack.get(object);
  if (stacked && stack.get(other)) {
    return stacked == other;
  }
  var result = true;
  stack.set(object, other);
  stack.set(other, object);

  var skipCtor = isPartial;
  while (++index < objLength) {
    key = objProps[index];
    var objValue = object[key],
        othValue = other[key];

    if (customizer) {
      var compared = isPartial
        ? customizer(othValue, objValue, key, other, object, stack)
        : customizer(objValue, othValue, key, object, other, stack);
    }
    // Recursively compare objects (susceptible to call stack limits).
    if (!(compared === undefined
          ? (objValue === othValue || equalFunc(objValue, othValue, bitmask, customizer, stack))
          : compared
        )) {
      result = false;
      break;
    }
    skipCtor || (skipCtor = key == 'constructor');
  }
  if (result && !skipCtor) {
    var objCtor = object.constructor,
        othCtor = other.constructor;

    // Non `Object` object instances with different constructors are not equal.
    if (objCtor != othCtor &&
        ('constructor' in object && 'constructor' in other) &&
        !(typeof objCtor == 'function' && objCtor instanceof objCtor &&
          typeof othCtor == 'function' && othCtor instanceof othCtor)) {
      result = false;
    }
  }
  stack['delete'](object);
  stack['delete'](other);
  return result;
}

module.exports = equalObjects;

},{"./_getAllKeys":142}],140:[function(require,module,exports){
var flatten = require('./flatten'),
    overRest = require('./_overRest'),
    setToString = require('./_setToString');

/**
 * A specialized version of `baseRest` which flattens the rest array.
 *
 * @private
 * @param {Function} func The function to apply a rest parameter to.
 * @returns {Function} Returns the new function.
 */
function flatRest(func) {
  return setToString(overRest(func, undefined, flatten), func + '');
}

module.exports = flatRest;

},{"./_overRest":189,"./_setToString":196,"./flatten":212}],141:[function(require,module,exports){
(function (global){
/** Detect free variable `global` from Node.js. */
var freeGlobal = typeof global == 'object' && global && global.Object === Object && global;

module.exports = freeGlobal;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],142:[function(require,module,exports){
var baseGetAllKeys = require('./_baseGetAllKeys'),
    getSymbols = require('./_getSymbols'),
    keys = require('./keys');

/**
 * Creates an array of own enumerable property names and symbols of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names and symbols.
 */
function getAllKeys(object) {
  return baseGetAllKeys(object, keys, getSymbols);
}

module.exports = getAllKeys;

},{"./_baseGetAllKeys":85,"./_getSymbols":149,"./keys":231}],143:[function(require,module,exports){
var baseGetAllKeys = require('./_baseGetAllKeys'),
    getSymbolsIn = require('./_getSymbolsIn'),
    keysIn = require('./keysIn');

/**
 * Creates an array of own and inherited enumerable property names and
 * symbols of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names and symbols.
 */
function getAllKeysIn(object) {
  return baseGetAllKeys(object, keysIn, getSymbolsIn);
}

module.exports = getAllKeysIn;

},{"./_baseGetAllKeys":85,"./_getSymbolsIn":150,"./keysIn":232}],144:[function(require,module,exports){
var isKeyable = require('./_isKeyable');

/**
 * Gets the data for `map`.
 *
 * @private
 * @param {Object} map The map to query.
 * @param {string} key The reference key.
 * @returns {*} Returns the map data.
 */
function getMapData(map, key) {
  var data = map.__data__;
  return isKeyable(key)
    ? data[typeof key == 'string' ? 'string' : 'hash']
    : data.map;
}

module.exports = getMapData;

},{"./_isKeyable":166}],145:[function(require,module,exports){
var isStrictComparable = require('./_isStrictComparable'),
    keys = require('./keys');

/**
 * Gets the property names, values, and compare flags of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the match data of `object`.
 */
function getMatchData(object) {
  var result = keys(object),
      length = result.length;

  while (length--) {
    var key = result[length],
        value = object[key];

    result[length] = [key, value, isStrictComparable(value)];
  }
  return result;
}

module.exports = getMatchData;

},{"./_isStrictComparable":169,"./keys":231}],146:[function(require,module,exports){
var baseIsNative = require('./_baseIsNative'),
    getValue = require('./_getValue');

/**
 * Gets the native function at `key` of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {string} key The key of the method to get.
 * @returns {*} Returns the function if it's native, else `undefined`.
 */
function getNative(object, key) {
  var value = getValue(object, key);
  return baseIsNative(value) ? value : undefined;
}

module.exports = getNative;

},{"./_baseIsNative":96,"./_getValue":152}],147:[function(require,module,exports){
var overArg = require('./_overArg');

/** Built-in value references. */
var getPrototype = overArg(Object.getPrototypeOf, Object);

module.exports = getPrototype;

},{"./_overArg":188}],148:[function(require,module,exports){
var Symbol = require('./_Symbol');

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var nativeObjectToString = objectProto.toString;

/** Built-in value references. */
var symToStringTag = Symbol ? Symbol.toStringTag : undefined;

/**
 * A specialized version of `baseGetTag` which ignores `Symbol.toStringTag` values.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the raw `toStringTag`.
 */
function getRawTag(value) {
  var isOwn = hasOwnProperty.call(value, symToStringTag),
      tag = value[symToStringTag];

  try {
    value[symToStringTag] = undefined;
    var unmasked = true;
  } catch (e) {}

  var result = nativeObjectToString.call(value);
  if (unmasked) {
    if (isOwn) {
      value[symToStringTag] = tag;
    } else {
      delete value[symToStringTag];
    }
  }
  return result;
}

module.exports = getRawTag;

},{"./_Symbol":60}],149:[function(require,module,exports){
var arrayFilter = require('./_arrayFilter'),
    stubArray = require('./stubArray');

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Built-in value references. */
var propertyIsEnumerable = objectProto.propertyIsEnumerable;

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeGetSymbols = Object.getOwnPropertySymbols;

/**
 * Creates an array of the own enumerable symbols of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of symbols.
 */
var getSymbols = !nativeGetSymbols ? stubArray : function(object) {
  if (object == null) {
    return [];
  }
  object = Object(object);
  return arrayFilter(nativeGetSymbols(object), function(symbol) {
    return propertyIsEnumerable.call(object, symbol);
  });
};

module.exports = getSymbols;

},{"./_arrayFilter":65,"./stubArray":241}],150:[function(require,module,exports){
var arrayPush = require('./_arrayPush'),
    getPrototype = require('./_getPrototype'),
    getSymbols = require('./_getSymbols'),
    stubArray = require('./stubArray');

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeGetSymbols = Object.getOwnPropertySymbols;

/**
 * Creates an array of the own and inherited enumerable symbols of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of symbols.
 */
var getSymbolsIn = !nativeGetSymbols ? stubArray : function(object) {
  var result = [];
  while (object) {
    arrayPush(result, getSymbols(object));
    object = getPrototype(object);
  }
  return result;
};

module.exports = getSymbolsIn;

},{"./_arrayPush":70,"./_getPrototype":147,"./_getSymbols":149,"./stubArray":241}],151:[function(require,module,exports){
var DataView = require('./_DataView'),
    Map = require('./_Map'),
    Promise = require('./_Promise'),
    Set = require('./_Set'),
    WeakMap = require('./_WeakMap'),
    baseGetTag = require('./_baseGetTag'),
    toSource = require('./_toSource');

/** `Object#toString` result references. */
var mapTag = '[object Map]',
    objectTag = '[object Object]',
    promiseTag = '[object Promise]',
    setTag = '[object Set]',
    weakMapTag = '[object WeakMap]';

var dataViewTag = '[object DataView]';

/** Used to detect maps, sets, and weakmaps. */
var dataViewCtorString = toSource(DataView),
    mapCtorString = toSource(Map),
    promiseCtorString = toSource(Promise),
    setCtorString = toSource(Set),
    weakMapCtorString = toSource(WeakMap);

/**
 * Gets the `toStringTag` of `value`.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the `toStringTag`.
 */
var getTag = baseGetTag;

// Fallback for data views, maps, sets, and weak maps in IE 11 and promises in Node.js < 6.
if ((DataView && getTag(new DataView(new ArrayBuffer(1))) != dataViewTag) ||
    (Map && getTag(new Map) != mapTag) ||
    (Promise && getTag(Promise.resolve()) != promiseTag) ||
    (Set && getTag(new Set) != setTag) ||
    (WeakMap && getTag(new WeakMap) != weakMapTag)) {
  getTag = function(value) {
    var result = baseGetTag(value),
        Ctor = result == objectTag ? value.constructor : undefined,
        ctorString = Ctor ? toSource(Ctor) : '';

    if (ctorString) {
      switch (ctorString) {
        case dataViewCtorString: return dataViewTag;
        case mapCtorString: return mapTag;
        case promiseCtorString: return promiseTag;
        case setCtorString: return setTag;
        case weakMapCtorString: return weakMapTag;
      }
    }
    return result;
  };
}

module.exports = getTag;

},{"./_DataView":51,"./_Map":54,"./_Promise":56,"./_Set":57,"./_WeakMap":62,"./_baseGetTag":86,"./_toSource":206}],152:[function(require,module,exports){
/**
 * Gets the value at `key` of `object`.
 *
 * @private
 * @param {Object} [object] The object to query.
 * @param {string} key The key of the property to get.
 * @returns {*} Returns the property value.
 */
function getValue(object, key) {
  return object == null ? undefined : object[key];
}

module.exports = getValue;

},{}],153:[function(require,module,exports){
var castPath = require('./_castPath'),
    isArguments = require('./isArguments'),
    isArray = require('./isArray'),
    isIndex = require('./_isIndex'),
    isLength = require('./isLength'),
    toKey = require('./_toKey');

/**
 * Checks if `path` exists on `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {Array|string} path The path to check.
 * @param {Function} hasFunc The function to check properties.
 * @returns {boolean} Returns `true` if `path` exists, else `false`.
 */
function hasPath(object, path, hasFunc) {
  path = castPath(path, object);

  var index = -1,
      length = path.length,
      result = false;

  while (++index < length) {
    var key = toKey(path[index]);
    if (!(result = object != null && hasFunc(object, key))) {
      break;
    }
    object = object[key];
  }
  if (result || ++index != length) {
    return result;
  }
  length = object == null ? 0 : object.length;
  return !!length && isLength(length) && isIndex(key, length) &&
    (isArray(object) || isArguments(object));
}

module.exports = hasPath;

},{"./_castPath":120,"./_isIndex":163,"./_toKey":205,"./isArguments":217,"./isArray":218,"./isLength":223}],154:[function(require,module,exports){
var nativeCreate = require('./_nativeCreate');

/**
 * Removes all key-value entries from the hash.
 *
 * @private
 * @name clear
 * @memberOf Hash
 */
function hashClear() {
  this.__data__ = nativeCreate ? nativeCreate(null) : {};
  this.size = 0;
}

module.exports = hashClear;

},{"./_nativeCreate":183}],155:[function(require,module,exports){
/**
 * Removes `key` and its value from the hash.
 *
 * @private
 * @name delete
 * @memberOf Hash
 * @param {Object} hash The hash to modify.
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function hashDelete(key) {
  var result = this.has(key) && delete this.__data__[key];
  this.size -= result ? 1 : 0;
  return result;
}

module.exports = hashDelete;

},{}],156:[function(require,module,exports){
var nativeCreate = require('./_nativeCreate');

/** Used to stand-in for `undefined` hash values. */
var HASH_UNDEFINED = '__lodash_hash_undefined__';

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Gets the hash value for `key`.
 *
 * @private
 * @name get
 * @memberOf Hash
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function hashGet(key) {
  var data = this.__data__;
  if (nativeCreate) {
    var result = data[key];
    return result === HASH_UNDEFINED ? undefined : result;
  }
  return hasOwnProperty.call(data, key) ? data[key] : undefined;
}

module.exports = hashGet;

},{"./_nativeCreate":183}],157:[function(require,module,exports){
var nativeCreate = require('./_nativeCreate');

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Checks if a hash value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf Hash
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function hashHas(key) {
  var data = this.__data__;
  return nativeCreate ? (data[key] !== undefined) : hasOwnProperty.call(data, key);
}

module.exports = hashHas;

},{"./_nativeCreate":183}],158:[function(require,module,exports){
var nativeCreate = require('./_nativeCreate');

/** Used to stand-in for `undefined` hash values. */
var HASH_UNDEFINED = '__lodash_hash_undefined__';

/**
 * Sets the hash `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf Hash
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the hash instance.
 */
function hashSet(key, value) {
  var data = this.__data__;
  this.size += this.has(key) ? 0 : 1;
  data[key] = (nativeCreate && value === undefined) ? HASH_UNDEFINED : value;
  return this;
}

module.exports = hashSet;

},{"./_nativeCreate":183}],159:[function(require,module,exports){
/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Initializes an array clone.
 *
 * @private
 * @param {Array} array The array to clone.
 * @returns {Array} Returns the initialized clone.
 */
function initCloneArray(array) {
  var length = array.length,
      result = new array.constructor(length);

  // Add properties assigned by `RegExp#exec`.
  if (length && typeof array[0] == 'string' && hasOwnProperty.call(array, 'index')) {
    result.index = array.index;
    result.input = array.input;
  }
  return result;
}

module.exports = initCloneArray;

},{}],160:[function(require,module,exports){
var cloneArrayBuffer = require('./_cloneArrayBuffer'),
    cloneDataView = require('./_cloneDataView'),
    cloneRegExp = require('./_cloneRegExp'),
    cloneSymbol = require('./_cloneSymbol'),
    cloneTypedArray = require('./_cloneTypedArray');

/** `Object#toString` result references. */
var boolTag = '[object Boolean]',
    dateTag = '[object Date]',
    mapTag = '[object Map]',
    numberTag = '[object Number]',
    regexpTag = '[object RegExp]',
    setTag = '[object Set]',
    stringTag = '[object String]',
    symbolTag = '[object Symbol]';

var arrayBufferTag = '[object ArrayBuffer]',
    dataViewTag = '[object DataView]',
    float32Tag = '[object Float32Array]',
    float64Tag = '[object Float64Array]',
    int8Tag = '[object Int8Array]',
    int16Tag = '[object Int16Array]',
    int32Tag = '[object Int32Array]',
    uint8Tag = '[object Uint8Array]',
    uint8ClampedTag = '[object Uint8ClampedArray]',
    uint16Tag = '[object Uint16Array]',
    uint32Tag = '[object Uint32Array]';

/**
 * Initializes an object clone based on its `toStringTag`.
 *
 * **Note:** This function only supports cloning values with tags of
 * `Boolean`, `Date`, `Error`, `Map`, `Number`, `RegExp`, `Set`, or `String`.
 *
 * @private
 * @param {Object} object The object to clone.
 * @param {string} tag The `toStringTag` of the object to clone.
 * @param {boolean} [isDeep] Specify a deep clone.
 * @returns {Object} Returns the initialized clone.
 */
function initCloneByTag(object, tag, isDeep) {
  var Ctor = object.constructor;
  switch (tag) {
    case arrayBufferTag:
      return cloneArrayBuffer(object);

    case boolTag:
    case dateTag:
      return new Ctor(+object);

    case dataViewTag:
      return cloneDataView(object, isDeep);

    case float32Tag: case float64Tag:
    case int8Tag: case int16Tag: case int32Tag:
    case uint8Tag: case uint8ClampedTag: case uint16Tag: case uint32Tag:
      return cloneTypedArray(object, isDeep);

    case mapTag:
      return new Ctor;

    case numberTag:
    case stringTag:
      return new Ctor(object);

    case regexpTag:
      return cloneRegExp(object);

    case setTag:
      return new Ctor;

    case symbolTag:
      return cloneSymbol(object);
  }
}

module.exports = initCloneByTag;

},{"./_cloneArrayBuffer":121,"./_cloneDataView":123,"./_cloneRegExp":124,"./_cloneSymbol":125,"./_cloneTypedArray":126}],161:[function(require,module,exports){
var baseCreate = require('./_baseCreate'),
    getPrototype = require('./_getPrototype'),
    isPrototype = require('./_isPrototype');

/**
 * Initializes an object clone.
 *
 * @private
 * @param {Object} object The object to clone.
 * @returns {Object} Returns the initialized clone.
 */
function initCloneObject(object) {
  return (typeof object.constructor == 'function' && !isPrototype(object))
    ? baseCreate(getPrototype(object))
    : {};
}

module.exports = initCloneObject;

},{"./_baseCreate":79,"./_getPrototype":147,"./_isPrototype":168}],162:[function(require,module,exports){
var Symbol = require('./_Symbol'),
    isArguments = require('./isArguments'),
    isArray = require('./isArray');

/** Built-in value references. */
var spreadableSymbol = Symbol ? Symbol.isConcatSpreadable : undefined;

/**
 * Checks if `value` is a flattenable `arguments` object or array.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is flattenable, else `false`.
 */
function isFlattenable(value) {
  return isArray(value) || isArguments(value) ||
    !!(spreadableSymbol && value && value[spreadableSymbol]);
}

module.exports = isFlattenable;

},{"./_Symbol":60,"./isArguments":217,"./isArray":218}],163:[function(require,module,exports){
/** Used as references for various `Number` constants. */
var MAX_SAFE_INTEGER = 9007199254740991;

/** Used to detect unsigned integer values. */
var reIsUint = /^(?:0|[1-9]\d*)$/;

/**
 * Checks if `value` is a valid array-like index.
 *
 * @private
 * @param {*} value The value to check.
 * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
 * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
 */
function isIndex(value, length) {
  var type = typeof value;
  length = length == null ? MAX_SAFE_INTEGER : length;

  return !!length &&
    (type == 'number' ||
      (type != 'symbol' && reIsUint.test(value))) &&
        (value > -1 && value % 1 == 0 && value < length);
}

module.exports = isIndex;

},{}],164:[function(require,module,exports){
var eq = require('./eq'),
    isArrayLike = require('./isArrayLike'),
    isIndex = require('./_isIndex'),
    isObject = require('./isObject');

/**
 * Checks if the given arguments are from an iteratee call.
 *
 * @private
 * @param {*} value The potential iteratee value argument.
 * @param {*} index The potential iteratee index or key argument.
 * @param {*} object The potential iteratee object argument.
 * @returns {boolean} Returns `true` if the arguments are from an iteratee call,
 *  else `false`.
 */
function isIterateeCall(value, index, object) {
  if (!isObject(object)) {
    return false;
  }
  var type = typeof index;
  if (type == 'number'
        ? (isArrayLike(object) && isIndex(index, object.length))
        : (type == 'string' && index in object)
      ) {
    return eq(object[index], value);
  }
  return false;
}

module.exports = isIterateeCall;

},{"./_isIndex":163,"./eq":211,"./isArrayLike":219,"./isObject":225}],165:[function(require,module,exports){
var isArray = require('./isArray'),
    isSymbol = require('./isSymbol');

/** Used to match property names within property paths. */
var reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/,
    reIsPlainProp = /^\w*$/;

/**
 * Checks if `value` is a property name and not a property path.
 *
 * @private
 * @param {*} value The value to check.
 * @param {Object} [object] The object to query keys on.
 * @returns {boolean} Returns `true` if `value` is a property name, else `false`.
 */
function isKey(value, object) {
  if (isArray(value)) {
    return false;
  }
  var type = typeof value;
  if (type == 'number' || type == 'symbol' || type == 'boolean' ||
      value == null || isSymbol(value)) {
    return true;
  }
  return reIsPlainProp.test(value) || !reIsDeepProp.test(value) ||
    (object != null && value in Object(object));
}

module.exports = isKey;

},{"./isArray":218,"./isSymbol":229}],166:[function(require,module,exports){
/**
 * Checks if `value` is suitable for use as unique object key.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is suitable, else `false`.
 */
function isKeyable(value) {
  var type = typeof value;
  return (type == 'string' || type == 'number' || type == 'symbol' || type == 'boolean')
    ? (value !== '__proto__')
    : (value === null);
}

module.exports = isKeyable;

},{}],167:[function(require,module,exports){
var coreJsData = require('./_coreJsData');

/** Used to detect methods masquerading as native. */
var maskSrcKey = (function() {
  var uid = /[^.]+$/.exec(coreJsData && coreJsData.keys && coreJsData.keys.IE_PROTO || '');
  return uid ? ('Symbol(src)_1.' + uid) : '';
}());

/**
 * Checks if `func` has its source masked.
 *
 * @private
 * @param {Function} func The function to check.
 * @returns {boolean} Returns `true` if `func` is masked, else `false`.
 */
function isMasked(func) {
  return !!maskSrcKey && (maskSrcKey in func);
}

module.exports = isMasked;

},{"./_coreJsData":131}],168:[function(require,module,exports){
/** Used for built-in method references. */
var objectProto = Object.prototype;

/**
 * Checks if `value` is likely a prototype object.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a prototype, else `false`.
 */
function isPrototype(value) {
  var Ctor = value && value.constructor,
      proto = (typeof Ctor == 'function' && Ctor.prototype) || objectProto;

  return value === proto;
}

module.exports = isPrototype;

},{}],169:[function(require,module,exports){
var isObject = require('./isObject');

/**
 * Checks if `value` is suitable for strict equality comparisons, i.e. `===`.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` if suitable for strict
 *  equality comparisons, else `false`.
 */
function isStrictComparable(value) {
  return value === value && !isObject(value);
}

module.exports = isStrictComparable;

},{"./isObject":225}],170:[function(require,module,exports){
/**
 * Removes all key-value entries from the list cache.
 *
 * @private
 * @name clear
 * @memberOf ListCache
 */
function listCacheClear() {
  this.__data__ = [];
  this.size = 0;
}

module.exports = listCacheClear;

},{}],171:[function(require,module,exports){
var assocIndexOf = require('./_assocIndexOf');

/** Used for built-in method references. */
var arrayProto = Array.prototype;

/** Built-in value references. */
var splice = arrayProto.splice;

/**
 * Removes `key` and its value from the list cache.
 *
 * @private
 * @name delete
 * @memberOf ListCache
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function listCacheDelete(key) {
  var data = this.__data__,
      index = assocIndexOf(data, key);

  if (index < 0) {
    return false;
  }
  var lastIndex = data.length - 1;
  if (index == lastIndex) {
    data.pop();
  } else {
    splice.call(data, index, 1);
  }
  --this.size;
  return true;
}

module.exports = listCacheDelete;

},{"./_assocIndexOf":74}],172:[function(require,module,exports){
var assocIndexOf = require('./_assocIndexOf');

/**
 * Gets the list cache value for `key`.
 *
 * @private
 * @name get
 * @memberOf ListCache
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function listCacheGet(key) {
  var data = this.__data__,
      index = assocIndexOf(data, key);

  return index < 0 ? undefined : data[index][1];
}

module.exports = listCacheGet;

},{"./_assocIndexOf":74}],173:[function(require,module,exports){
var assocIndexOf = require('./_assocIndexOf');

/**
 * Checks if a list cache value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf ListCache
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function listCacheHas(key) {
  return assocIndexOf(this.__data__, key) > -1;
}

module.exports = listCacheHas;

},{"./_assocIndexOf":74}],174:[function(require,module,exports){
var assocIndexOf = require('./_assocIndexOf');

/**
 * Sets the list cache `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf ListCache
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the list cache instance.
 */
function listCacheSet(key, value) {
  var data = this.__data__,
      index = assocIndexOf(data, key);

  if (index < 0) {
    ++this.size;
    data.push([key, value]);
  } else {
    data[index][1] = value;
  }
  return this;
}

module.exports = listCacheSet;

},{"./_assocIndexOf":74}],175:[function(require,module,exports){
var Hash = require('./_Hash'),
    ListCache = require('./_ListCache'),
    Map = require('./_Map');

/**
 * Removes all key-value entries from the map.
 *
 * @private
 * @name clear
 * @memberOf MapCache
 */
function mapCacheClear() {
  this.size = 0;
  this.__data__ = {
    'hash': new Hash,
    'map': new (Map || ListCache),
    'string': new Hash
  };
}

module.exports = mapCacheClear;

},{"./_Hash":52,"./_ListCache":53,"./_Map":54}],176:[function(require,module,exports){
var getMapData = require('./_getMapData');

/**
 * Removes `key` and its value from the map.
 *
 * @private
 * @name delete
 * @memberOf MapCache
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function mapCacheDelete(key) {
  var result = getMapData(this, key)['delete'](key);
  this.size -= result ? 1 : 0;
  return result;
}

module.exports = mapCacheDelete;

},{"./_getMapData":144}],177:[function(require,module,exports){
var getMapData = require('./_getMapData');

/**
 * Gets the map value for `key`.
 *
 * @private
 * @name get
 * @memberOf MapCache
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function mapCacheGet(key) {
  return getMapData(this, key).get(key);
}

module.exports = mapCacheGet;

},{"./_getMapData":144}],178:[function(require,module,exports){
var getMapData = require('./_getMapData');

/**
 * Checks if a map value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf MapCache
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function mapCacheHas(key) {
  return getMapData(this, key).has(key);
}

module.exports = mapCacheHas;

},{"./_getMapData":144}],179:[function(require,module,exports){
var getMapData = require('./_getMapData');

/**
 * Sets the map `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf MapCache
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the map cache instance.
 */
function mapCacheSet(key, value) {
  var data = getMapData(this, key),
      size = data.size;

  data.set(key, value);
  this.size += data.size == size ? 0 : 1;
  return this;
}

module.exports = mapCacheSet;

},{"./_getMapData":144}],180:[function(require,module,exports){
/**
 * Converts `map` to its key-value pairs.
 *
 * @private
 * @param {Object} map The map to convert.
 * @returns {Array} Returns the key-value pairs.
 */
function mapToArray(map) {
  var index = -1,
      result = Array(map.size);

  map.forEach(function(value, key) {
    result[++index] = [key, value];
  });
  return result;
}

module.exports = mapToArray;

},{}],181:[function(require,module,exports){
/**
 * A specialized version of `matchesProperty` for source values suitable
 * for strict equality comparisons, i.e. `===`.
 *
 * @private
 * @param {string} key The key of the property to get.
 * @param {*} srcValue The value to match.
 * @returns {Function} Returns the new spec function.
 */
function matchesStrictComparable(key, srcValue) {
  return function(object) {
    if (object == null) {
      return false;
    }
    return object[key] === srcValue &&
      (srcValue !== undefined || (key in Object(object)));
  };
}

module.exports = matchesStrictComparable;

},{}],182:[function(require,module,exports){
var memoize = require('./memoize');

/** Used as the maximum memoize cache size. */
var MAX_MEMOIZE_SIZE = 500;

/**
 * A specialized version of `_.memoize` which clears the memoized function's
 * cache when it exceeds `MAX_MEMOIZE_SIZE`.
 *
 * @private
 * @param {Function} func The function to have its output memoized.
 * @returns {Function} Returns the new memoized function.
 */
function memoizeCapped(func) {
  var result = memoize(func, function(key) {
    if (cache.size === MAX_MEMOIZE_SIZE) {
      cache.clear();
    }
    return key;
  });

  var cache = result.cache;
  return result;
}

module.exports = memoizeCapped;

},{"./memoize":235}],183:[function(require,module,exports){
var getNative = require('./_getNative');

/* Built-in method references that are verified to be native. */
var nativeCreate = getNative(Object, 'create');

module.exports = nativeCreate;

},{"./_getNative":146}],184:[function(require,module,exports){
var overArg = require('./_overArg');

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeKeys = overArg(Object.keys, Object);

module.exports = nativeKeys;

},{"./_overArg":188}],185:[function(require,module,exports){
/**
 * This function is like
 * [`Object.keys`](http://ecma-international.org/ecma-262/7.0/#sec-object.keys)
 * except that it includes inherited enumerable properties.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 */
function nativeKeysIn(object) {
  var result = [];
  if (object != null) {
    for (var key in Object(object)) {
      result.push(key);
    }
  }
  return result;
}

module.exports = nativeKeysIn;

},{}],186:[function(require,module,exports){
var freeGlobal = require('./_freeGlobal');

/** Detect free variable `exports`. */
var freeExports = typeof exports == 'object' && exports && !exports.nodeType && exports;

/** Detect free variable `module`. */
var freeModule = freeExports && typeof module == 'object' && module && !module.nodeType && module;

/** Detect the popular CommonJS extension `module.exports`. */
var moduleExports = freeModule && freeModule.exports === freeExports;

/** Detect free variable `process` from Node.js. */
var freeProcess = moduleExports && freeGlobal.process;

/** Used to access faster Node.js helpers. */
var nodeUtil = (function() {
  try {
    return freeProcess && freeProcess.binding && freeProcess.binding('util');
  } catch (e) {}
}());

module.exports = nodeUtil;

},{"./_freeGlobal":141}],187:[function(require,module,exports){
/** Used for built-in method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var nativeObjectToString = objectProto.toString;

/**
 * Converts `value` to a string using `Object.prototype.toString`.
 *
 * @private
 * @param {*} value The value to convert.
 * @returns {string} Returns the converted string.
 */
function objectToString(value) {
  return nativeObjectToString.call(value);
}

module.exports = objectToString;

},{}],188:[function(require,module,exports){
/**
 * Creates a unary function that invokes `func` with its argument transformed.
 *
 * @private
 * @param {Function} func The function to wrap.
 * @param {Function} transform The argument transform.
 * @returns {Function} Returns the new function.
 */
function overArg(func, transform) {
  return function(arg) {
    return func(transform(arg));
  };
}

module.exports = overArg;

},{}],189:[function(require,module,exports){
var apply = require('./_apply');

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeMax = Math.max;

/**
 * A specialized version of `baseRest` which transforms the rest array.
 *
 * @private
 * @param {Function} func The function to apply a rest parameter to.
 * @param {number} [start=func.length-1] The start position of the rest parameter.
 * @param {Function} transform The rest array transform.
 * @returns {Function} Returns the new function.
 */
function overRest(func, start, transform) {
  start = nativeMax(start === undefined ? (func.length - 1) : start, 0);
  return function() {
    var args = arguments,
        index = -1,
        length = nativeMax(args.length - start, 0),
        array = Array(length);

    while (++index < length) {
      array[index] = args[start + index];
    }
    index = -1;
    var otherArgs = Array(start + 1);
    while (++index < start) {
      otherArgs[index] = args[index];
    }
    otherArgs[start] = transform(array);
    return apply(func, this, otherArgs);
  };
}

module.exports = overRest;

},{"./_apply":63}],190:[function(require,module,exports){
var baseGet = require('./_baseGet'),
    baseSlice = require('./_baseSlice');

/**
 * Gets the parent value at `path` of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {Array} path The path to get the parent value of.
 * @returns {*} Returns the parent value.
 */
function parent(object, path) {
  return path.length < 2 ? object : baseGet(object, baseSlice(path, 0, -1));
}

module.exports = parent;

},{"./_baseGet":84,"./_baseSlice":113}],191:[function(require,module,exports){
var freeGlobal = require('./_freeGlobal');

/** Detect free variable `self`. */
var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

/** Used as a reference to the global object. */
var root = freeGlobal || freeSelf || Function('return this')();

module.exports = root;

},{"./_freeGlobal":141}],192:[function(require,module,exports){
/**
 * Gets the value at `key`, unless `key` is "__proto__".
 *
 * @private
 * @param {Object} object The object to query.
 * @param {string} key The key of the property to get.
 * @returns {*} Returns the property value.
 */
function safeGet(object, key) {
  return key == '__proto__'
    ? undefined
    : object[key];
}

module.exports = safeGet;

},{}],193:[function(require,module,exports){
/** Used to stand-in for `undefined` hash values. */
var HASH_UNDEFINED = '__lodash_hash_undefined__';

/**
 * Adds `value` to the array cache.
 *
 * @private
 * @name add
 * @memberOf SetCache
 * @alias push
 * @param {*} value The value to cache.
 * @returns {Object} Returns the cache instance.
 */
function setCacheAdd(value) {
  this.__data__.set(value, HASH_UNDEFINED);
  return this;
}

module.exports = setCacheAdd;

},{}],194:[function(require,module,exports){
/**
 * Checks if `value` is in the array cache.
 *
 * @private
 * @name has
 * @memberOf SetCache
 * @param {*} value The value to search for.
 * @returns {number} Returns `true` if `value` is found, else `false`.
 */
function setCacheHas(value) {
  return this.__data__.has(value);
}

module.exports = setCacheHas;

},{}],195:[function(require,module,exports){
/**
 * Converts `set` to an array of its values.
 *
 * @private
 * @param {Object} set The set to convert.
 * @returns {Array} Returns the values.
 */
function setToArray(set) {
  var index = -1,
      result = Array(set.size);

  set.forEach(function(value) {
    result[++index] = value;
  });
  return result;
}

module.exports = setToArray;

},{}],196:[function(require,module,exports){
var baseSetToString = require('./_baseSetToString'),
    shortOut = require('./_shortOut');

/**
 * Sets the `toString` method of `func` to return `string`.
 *
 * @private
 * @param {Function} func The function to modify.
 * @param {Function} string The `toString` result.
 * @returns {Function} Returns `func`.
 */
var setToString = shortOut(baseSetToString);

module.exports = setToString;

},{"./_baseSetToString":112,"./_shortOut":197}],197:[function(require,module,exports){
/** Used to detect hot functions by number of calls within a span of milliseconds. */
var HOT_COUNT = 800,
    HOT_SPAN = 16;

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeNow = Date.now;

/**
 * Creates a function that'll short out and invoke `identity` instead
 * of `func` when it's called `HOT_COUNT` or more times in `HOT_SPAN`
 * milliseconds.
 *
 * @private
 * @param {Function} func The function to restrict.
 * @returns {Function} Returns the new shortable function.
 */
function shortOut(func) {
  var count = 0,
      lastCalled = 0;

  return function() {
    var stamp = nativeNow(),
        remaining = HOT_SPAN - (stamp - lastCalled);

    lastCalled = stamp;
    if (remaining > 0) {
      if (++count >= HOT_COUNT) {
        return arguments[0];
      }
    } else {
      count = 0;
    }
    return func.apply(undefined, arguments);
  };
}

module.exports = shortOut;

},{}],198:[function(require,module,exports){
var ListCache = require('./_ListCache');

/**
 * Removes all key-value entries from the stack.
 *
 * @private
 * @name clear
 * @memberOf Stack
 */
function stackClear() {
  this.__data__ = new ListCache;
  this.size = 0;
}

module.exports = stackClear;

},{"./_ListCache":53}],199:[function(require,module,exports){
/**
 * Removes `key` and its value from the stack.
 *
 * @private
 * @name delete
 * @memberOf Stack
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function stackDelete(key) {
  var data = this.__data__,
      result = data['delete'](key);

  this.size = data.size;
  return result;
}

module.exports = stackDelete;

},{}],200:[function(require,module,exports){
/**
 * Gets the stack value for `key`.
 *
 * @private
 * @name get
 * @memberOf Stack
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function stackGet(key) {
  return this.__data__.get(key);
}

module.exports = stackGet;

},{}],201:[function(require,module,exports){
/**
 * Checks if a stack value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf Stack
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function stackHas(key) {
  return this.__data__.has(key);
}

module.exports = stackHas;

},{}],202:[function(require,module,exports){
var ListCache = require('./_ListCache'),
    Map = require('./_Map'),
    MapCache = require('./_MapCache');

/** Used as the size to enable large array optimizations. */
var LARGE_ARRAY_SIZE = 200;

/**
 * Sets the stack `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf Stack
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the stack cache instance.
 */
function stackSet(key, value) {
  var data = this.__data__;
  if (data instanceof ListCache) {
    var pairs = data.__data__;
    if (!Map || (pairs.length < LARGE_ARRAY_SIZE - 1)) {
      pairs.push([key, value]);
      this.size = ++data.size;
      return this;
    }
    data = this.__data__ = new MapCache(pairs);
  }
  data.set(key, value);
  this.size = data.size;
  return this;
}

module.exports = stackSet;

},{"./_ListCache":53,"./_Map":54,"./_MapCache":55}],203:[function(require,module,exports){
/**
 * A specialized version of `_.indexOf` which performs strict equality
 * comparisons of values, i.e. `===`.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {*} value The value to search for.
 * @param {number} fromIndex The index to search from.
 * @returns {number} Returns the index of the matched value, else `-1`.
 */
function strictIndexOf(array, value, fromIndex) {
  var index = fromIndex - 1,
      length = array.length;

  while (++index < length) {
    if (array[index] === value) {
      return index;
    }
  }
  return -1;
}

module.exports = strictIndexOf;

},{}],204:[function(require,module,exports){
var memoizeCapped = require('./_memoizeCapped');

/** Used to match property names within property paths. */
var rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g;

/** Used to match backslashes in property paths. */
var reEscapeChar = /\\(\\)?/g;

/**
 * Converts `string` to a property path array.
 *
 * @private
 * @param {string} string The string to convert.
 * @returns {Array} Returns the property path array.
 */
var stringToPath = memoizeCapped(function(string) {
  var result = [];
  if (string.charCodeAt(0) === 46 /* . */) {
    result.push('');
  }
  string.replace(rePropName, function(match, number, quote, subString) {
    result.push(quote ? subString.replace(reEscapeChar, '$1') : (number || match));
  });
  return result;
});

module.exports = stringToPath;

},{"./_memoizeCapped":182}],205:[function(require,module,exports){
var isSymbol = require('./isSymbol');

/** Used as references for various `Number` constants. */
var INFINITY = 1 / 0;

/**
 * Converts `value` to a string key if it's not a string or symbol.
 *
 * @private
 * @param {*} value The value to inspect.
 * @returns {string|symbol} Returns the key.
 */
function toKey(value) {
  if (typeof value == 'string' || isSymbol(value)) {
    return value;
  }
  var result = (value + '');
  return (result == '0' && (1 / value) == -INFINITY) ? '-0' : result;
}

module.exports = toKey;

},{"./isSymbol":229}],206:[function(require,module,exports){
/** Used for built-in method references. */
var funcProto = Function.prototype;

/** Used to resolve the decompiled source of functions. */
var funcToString = funcProto.toString;

/**
 * Converts `func` to its source code.
 *
 * @private
 * @param {Function} func The function to convert.
 * @returns {string} Returns the source code.
 */
function toSource(func) {
  if (func != null) {
    try {
      return funcToString.call(func);
    } catch (e) {}
    try {
      return (func + '');
    } catch (e) {}
  }
  return '';
}

module.exports = toSource;

},{}],207:[function(require,module,exports){
var baseClone = require('./_baseClone');

/** Used to compose bitmasks for cloning. */
var CLONE_SYMBOLS_FLAG = 4;

/**
 * Creates a shallow clone of `value`.
 *
 * **Note:** This method is loosely based on the
 * [structured clone algorithm](https://mdn.io/Structured_clone_algorithm)
 * and supports cloning arrays, array buffers, booleans, date objects, maps,
 * numbers, `Object` objects, regexes, sets, strings, symbols, and typed
 * arrays. The own enumerable properties of `arguments` objects are cloned
 * as plain objects. An empty object is returned for uncloneable values such
 * as error objects, functions, DOM nodes, and WeakMaps.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to clone.
 * @returns {*} Returns the cloned value.
 * @see _.cloneDeep
 * @example
 *
 * var objects = [{ 'a': 1 }, { 'b': 2 }];
 *
 * var shallow = _.clone(objects);
 * console.log(shallow[0] === objects[0]);
 * // => true
 */
function clone(value) {
  return baseClone(value, CLONE_SYMBOLS_FLAG);
}

module.exports = clone;

},{"./_baseClone":78}],208:[function(require,module,exports){
/**
 * Creates a function that returns `value`.
 *
 * @static
 * @memberOf _
 * @since 2.4.0
 * @category Util
 * @param {*} value The value to return from the new function.
 * @returns {Function} Returns the new constant function.
 * @example
 *
 * var objects = _.times(2, _.constant({ 'a': 1 }));
 *
 * console.log(objects);
 * // => [{ 'a': 1 }, { 'a': 1 }]
 *
 * console.log(objects[0] === objects[1]);
 * // => true
 */
function constant(value) {
  return function() {
    return value;
  };
}

module.exports = constant;

},{}],209:[function(require,module,exports){
var baseRest = require('./_baseRest'),
    eq = require('./eq'),
    isIterateeCall = require('./_isIterateeCall'),
    keysIn = require('./keysIn');

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Assigns own and inherited enumerable string keyed properties of source
 * objects to the destination object for all destination properties that
 * resolve to `undefined`. Source objects are applied from left to right.
 * Once a property is set, additional values of the same property are ignored.
 *
 * **Note:** This method mutates `object`.
 *
 * @static
 * @since 0.1.0
 * @memberOf _
 * @category Object
 * @param {Object} object The destination object.
 * @param {...Object} [sources] The source objects.
 * @returns {Object} Returns `object`.
 * @see _.defaultsDeep
 * @example
 *
 * _.defaults({ 'a': 1 }, { 'b': 2 }, { 'a': 3 });
 * // => { 'a': 1, 'b': 2 }
 */
var defaults = baseRest(function(object, sources) {
  object = Object(object);

  var index = -1;
  var length = sources.length;
  var guard = length > 2 ? sources[2] : undefined;

  if (guard && isIterateeCall(sources[0], sources[1], guard)) {
    length = 1;
  }

  while (++index < length) {
    var source = sources[index];
    var props = keysIn(source);
    var propsIndex = -1;
    var propsLength = props.length;

    while (++propsIndex < propsLength) {
      var key = props[propsIndex];
      var value = object[key];

      if (value === undefined ||
          (eq(value, objectProto[key]) && !hasOwnProperty.call(object, key))) {
        object[key] = source[key];
      }
    }
  }

  return object;
});

module.exports = defaults;

},{"./_baseRest":110,"./_isIterateeCall":164,"./eq":211,"./keysIn":232}],210:[function(require,module,exports){
var apply = require('./_apply'),
    baseRest = require('./_baseRest'),
    customDefaultsMerge = require('./_customDefaultsMerge'),
    mergeWith = require('./mergeWith');

/**
 * This method is like `_.defaults` except that it recursively assigns
 * default properties.
 *
 * **Note:** This method mutates `object`.
 *
 * @static
 * @memberOf _
 * @since 3.10.0
 * @category Object
 * @param {Object} object The destination object.
 * @param {...Object} [sources] The source objects.
 * @returns {Object} Returns `object`.
 * @see _.defaults
 * @example
 *
 * _.defaultsDeep({ 'a': { 'b': 2 } }, { 'a': { 'b': 1, 'c': 3 } });
 * // => { 'a': { 'b': 2, 'c': 3 } }
 */
var defaultsDeep = baseRest(function(args) {
  args.push(undefined, customDefaultsMerge);
  return apply(mergeWith, undefined, args);
});

module.exports = defaultsDeep;

},{"./_apply":63,"./_baseRest":110,"./_customDefaultsMerge":134,"./mergeWith":236}],211:[function(require,module,exports){
/**
 * Performs a
 * [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
 * comparison between two values to determine if they are equivalent.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to compare.
 * @param {*} other The other value to compare.
 * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
 * @example
 *
 * var object = { 'a': 1 };
 * var other = { 'a': 1 };
 *
 * _.eq(object, object);
 * // => true
 *
 * _.eq(object, other);
 * // => false
 *
 * _.eq('a', 'a');
 * // => true
 *
 * _.eq('a', Object('a'));
 * // => false
 *
 * _.eq(NaN, NaN);
 * // => true
 */
function eq(value, other) {
  return value === other || (value !== value && other !== other);
}

module.exports = eq;

},{}],212:[function(require,module,exports){
var baseFlatten = require('./_baseFlatten');

/**
 * Flattens `array` a single level deep.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Array
 * @param {Array} array The array to flatten.
 * @returns {Array} Returns the new flattened array.
 * @example
 *
 * _.flatten([1, [2, [3, [4]], 5]]);
 * // => [1, 2, [3, [4]], 5]
 */
function flatten(array) {
  var length = array == null ? 0 : array.length;
  return length ? baseFlatten(array, 1) : [];
}

module.exports = flatten;

},{"./_baseFlatten":81}],213:[function(require,module,exports){
var baseGet = require('./_baseGet');

/**
 * Gets the value at `path` of `object`. If the resolved value is
 * `undefined`, the `defaultValue` is returned in its place.
 *
 * @static
 * @memberOf _
 * @since 3.7.0
 * @category Object
 * @param {Object} object The object to query.
 * @param {Array|string} path The path of the property to get.
 * @param {*} [defaultValue] The value returned for `undefined` resolved values.
 * @returns {*} Returns the resolved value.
 * @example
 *
 * var object = { 'a': [{ 'b': { 'c': 3 } }] };
 *
 * _.get(object, 'a[0].b.c');
 * // => 3
 *
 * _.get(object, ['a', '0', 'b', 'c']);
 * // => 3
 *
 * _.get(object, 'a.b.c', 'default');
 * // => 'default'
 */
function get(object, path, defaultValue) {
  var result = object == null ? undefined : baseGet(object, path);
  return result === undefined ? defaultValue : result;
}

module.exports = get;

},{"./_baseGet":84}],214:[function(require,module,exports){
var baseHasIn = require('./_baseHasIn'),
    hasPath = require('./_hasPath');

/**
 * Checks if `path` is a direct or inherited property of `object`.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Object
 * @param {Object} object The object to query.
 * @param {Array|string} path The path to check.
 * @returns {boolean} Returns `true` if `path` exists, else `false`.
 * @example
 *
 * var object = _.create({ 'a': _.create({ 'b': 2 }) });
 *
 * _.hasIn(object, 'a');
 * // => true
 *
 * _.hasIn(object, 'a.b');
 * // => true
 *
 * _.hasIn(object, ['a', 'b']);
 * // => true
 *
 * _.hasIn(object, 'b');
 * // => false
 */
function hasIn(object, path) {
  return object != null && hasPath(object, path, baseHasIn);
}

module.exports = hasIn;

},{"./_baseHasIn":87,"./_hasPath":153}],215:[function(require,module,exports){
/**
 * This method returns the first argument it receives.
 *
 * @static
 * @since 0.1.0
 * @memberOf _
 * @category Util
 * @param {*} value Any value.
 * @returns {*} Returns `value`.
 * @example
 *
 * var object = { 'a': 1 };
 *
 * console.log(_.identity(object) === object);
 * // => true
 */
function identity(value) {
  return value;
}

module.exports = identity;

},{}],216:[function(require,module,exports){
var arrayMap = require('./_arrayMap'),
    baseIntersection = require('./_baseIntersection'),
    baseRest = require('./_baseRest'),
    castArrayLikeObject = require('./_castArrayLikeObject');

/**
 * Creates an array of unique values that are included in all given arrays
 * using [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
 * for equality comparisons. The order and references of result values are
 * determined by the first array.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Array
 * @param {...Array} [arrays] The arrays to inspect.
 * @returns {Array} Returns the new array of intersecting values.
 * @example
 *
 * _.intersection([2, 1], [2, 3]);
 * // => [2]
 */
var intersection = baseRest(function(arrays) {
  var mapped = arrayMap(arrays, castArrayLikeObject);
  return (mapped.length && mapped[0] === arrays[0])
    ? baseIntersection(mapped)
    : [];
});

module.exports = intersection;

},{"./_arrayMap":69,"./_baseIntersection":89,"./_baseRest":110,"./_castArrayLikeObject":119}],217:[function(require,module,exports){
var baseIsArguments = require('./_baseIsArguments'),
    isObjectLike = require('./isObjectLike');

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/** Built-in value references. */
var propertyIsEnumerable = objectProto.propertyIsEnumerable;

/**
 * Checks if `value` is likely an `arguments` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an `arguments` object,
 *  else `false`.
 * @example
 *
 * _.isArguments(function() { return arguments; }());
 * // => true
 *
 * _.isArguments([1, 2, 3]);
 * // => false
 */
var isArguments = baseIsArguments(function() { return arguments; }()) ? baseIsArguments : function(value) {
  return isObjectLike(value) && hasOwnProperty.call(value, 'callee') &&
    !propertyIsEnumerable.call(value, 'callee');
};

module.exports = isArguments;

},{"./_baseIsArguments":90,"./isObjectLike":226}],218:[function(require,module,exports){
/**
 * Checks if `value` is classified as an `Array` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an array, else `false`.
 * @example
 *
 * _.isArray([1, 2, 3]);
 * // => true
 *
 * _.isArray(document.body.children);
 * // => false
 *
 * _.isArray('abc');
 * // => false
 *
 * _.isArray(_.noop);
 * // => false
 */
var isArray = Array.isArray;

module.exports = isArray;

},{}],219:[function(require,module,exports){
var isFunction = require('./isFunction'),
    isLength = require('./isLength');

/**
 * Checks if `value` is array-like. A value is considered array-like if it's
 * not a function and has a `value.length` that's an integer greater than or
 * equal to `0` and less than or equal to `Number.MAX_SAFE_INTEGER`.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
 * @example
 *
 * _.isArrayLike([1, 2, 3]);
 * // => true
 *
 * _.isArrayLike(document.body.children);
 * // => true
 *
 * _.isArrayLike('abc');
 * // => true
 *
 * _.isArrayLike(_.noop);
 * // => false
 */
function isArrayLike(value) {
  return value != null && isLength(value.length) && !isFunction(value);
}

module.exports = isArrayLike;

},{"./isFunction":222,"./isLength":223}],220:[function(require,module,exports){
var isArrayLike = require('./isArrayLike'),
    isObjectLike = require('./isObjectLike');

/**
 * This method is like `_.isArrayLike` except that it also checks if `value`
 * is an object.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an array-like object,
 *  else `false`.
 * @example
 *
 * _.isArrayLikeObject([1, 2, 3]);
 * // => true
 *
 * _.isArrayLikeObject(document.body.children);
 * // => true
 *
 * _.isArrayLikeObject('abc');
 * // => false
 *
 * _.isArrayLikeObject(_.noop);
 * // => false
 */
function isArrayLikeObject(value) {
  return isObjectLike(value) && isArrayLike(value);
}

module.exports = isArrayLikeObject;

},{"./isArrayLike":219,"./isObjectLike":226}],221:[function(require,module,exports){
var root = require('./_root'),
    stubFalse = require('./stubFalse');

/** Detect free variable `exports`. */
var freeExports = typeof exports == 'object' && exports && !exports.nodeType && exports;

/** Detect free variable `module`. */
var freeModule = freeExports && typeof module == 'object' && module && !module.nodeType && module;

/** Detect the popular CommonJS extension `module.exports`. */
var moduleExports = freeModule && freeModule.exports === freeExports;

/** Built-in value references. */
var Buffer = moduleExports ? root.Buffer : undefined;

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeIsBuffer = Buffer ? Buffer.isBuffer : undefined;

/**
 * Checks if `value` is a buffer.
 *
 * @static
 * @memberOf _
 * @since 4.3.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a buffer, else `false`.
 * @example
 *
 * _.isBuffer(new Buffer(2));
 * // => true
 *
 * _.isBuffer(new Uint8Array(2));
 * // => false
 */
var isBuffer = nativeIsBuffer || stubFalse;

module.exports = isBuffer;

},{"./_root":191,"./stubFalse":242}],222:[function(require,module,exports){
var baseGetTag = require('./_baseGetTag'),
    isObject = require('./isObject');

/** `Object#toString` result references. */
var asyncTag = '[object AsyncFunction]',
    funcTag = '[object Function]',
    genTag = '[object GeneratorFunction]',
    proxyTag = '[object Proxy]';

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a function, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction(value) {
  if (!isObject(value)) {
    return false;
  }
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in Safari 9 which returns 'object' for typed arrays and other constructors.
  var tag = baseGetTag(value);
  return tag == funcTag || tag == genTag || tag == asyncTag || tag == proxyTag;
}

module.exports = isFunction;

},{"./_baseGetTag":86,"./isObject":225}],223:[function(require,module,exports){
/** Used as references for various `Number` constants. */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This method is loosely based on
 * [`ToLength`](http://ecma-international.org/ecma-262/7.0/#sec-tolength).
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 * @example
 *
 * _.isLength(3);
 * // => true
 *
 * _.isLength(Number.MIN_VALUE);
 * // => false
 *
 * _.isLength(Infinity);
 * // => false
 *
 * _.isLength('3');
 * // => false
 */
function isLength(value) {
  return typeof value == 'number' &&
    value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

module.exports = isLength;

},{}],224:[function(require,module,exports){
var baseIsMap = require('./_baseIsMap'),
    baseUnary = require('./_baseUnary'),
    nodeUtil = require('./_nodeUtil');

/* Node.js helper references. */
var nodeIsMap = nodeUtil && nodeUtil.isMap;

/**
 * Checks if `value` is classified as a `Map` object.
 *
 * @static
 * @memberOf _
 * @since 4.3.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a map, else `false`.
 * @example
 *
 * _.isMap(new Map);
 * // => true
 *
 * _.isMap(new WeakMap);
 * // => false
 */
var isMap = nodeIsMap ? baseUnary(nodeIsMap) : baseIsMap;

module.exports = isMap;

},{"./_baseIsMap":93,"./_baseUnary":116,"./_nodeUtil":186}],225:[function(require,module,exports){
/**
 * Checks if `value` is the
 * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
 * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(_.noop);
 * // => true
 *
 * _.isObject(null);
 * // => false
 */
function isObject(value) {
  var type = typeof value;
  return value != null && (type == 'object' || type == 'function');
}

module.exports = isObject;

},{}],226:[function(require,module,exports){
/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike(value) {
  return value != null && typeof value == 'object';
}

module.exports = isObjectLike;

},{}],227:[function(require,module,exports){
var baseGetTag = require('./_baseGetTag'),
    getPrototype = require('./_getPrototype'),
    isObjectLike = require('./isObjectLike');

/** `Object#toString` result references. */
var objectTag = '[object Object]';

/** Used for built-in method references. */
var funcProto = Function.prototype,
    objectProto = Object.prototype;

/** Used to resolve the decompiled source of functions. */
var funcToString = funcProto.toString;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/** Used to infer the `Object` constructor. */
var objectCtorString = funcToString.call(Object);

/**
 * Checks if `value` is a plain object, that is, an object created by the
 * `Object` constructor or one with a `[[Prototype]]` of `null`.
 *
 * @static
 * @memberOf _
 * @since 0.8.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a plain object, else `false`.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 * }
 *
 * _.isPlainObject(new Foo);
 * // => false
 *
 * _.isPlainObject([1, 2, 3]);
 * // => false
 *
 * _.isPlainObject({ 'x': 0, 'y': 0 });
 * // => true
 *
 * _.isPlainObject(Object.create(null));
 * // => true
 */
function isPlainObject(value) {
  if (!isObjectLike(value) || baseGetTag(value) != objectTag) {
    return false;
  }
  var proto = getPrototype(value);
  if (proto === null) {
    return true;
  }
  var Ctor = hasOwnProperty.call(proto, 'constructor') && proto.constructor;
  return typeof Ctor == 'function' && Ctor instanceof Ctor &&
    funcToString.call(Ctor) == objectCtorString;
}

module.exports = isPlainObject;

},{"./_baseGetTag":86,"./_getPrototype":147,"./isObjectLike":226}],228:[function(require,module,exports){
var baseIsSet = require('./_baseIsSet'),
    baseUnary = require('./_baseUnary'),
    nodeUtil = require('./_nodeUtil');

/* Node.js helper references. */
var nodeIsSet = nodeUtil && nodeUtil.isSet;

/**
 * Checks if `value` is classified as a `Set` object.
 *
 * @static
 * @memberOf _
 * @since 4.3.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a set, else `false`.
 * @example
 *
 * _.isSet(new Set);
 * // => true
 *
 * _.isSet(new WeakSet);
 * // => false
 */
var isSet = nodeIsSet ? baseUnary(nodeIsSet) : baseIsSet;

module.exports = isSet;

},{"./_baseIsSet":97,"./_baseUnary":116,"./_nodeUtil":186}],229:[function(require,module,exports){
var baseGetTag = require('./_baseGetTag'),
    isObjectLike = require('./isObjectLike');

/** `Object#toString` result references. */
var symbolTag = '[object Symbol]';

/**
 * Checks if `value` is classified as a `Symbol` primitive or object.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
 * @example
 *
 * _.isSymbol(Symbol.iterator);
 * // => true
 *
 * _.isSymbol('abc');
 * // => false
 */
function isSymbol(value) {
  return typeof value == 'symbol' ||
    (isObjectLike(value) && baseGetTag(value) == symbolTag);
}

module.exports = isSymbol;

},{"./_baseGetTag":86,"./isObjectLike":226}],230:[function(require,module,exports){
var baseIsTypedArray = require('./_baseIsTypedArray'),
    baseUnary = require('./_baseUnary'),
    nodeUtil = require('./_nodeUtil');

/* Node.js helper references. */
var nodeIsTypedArray = nodeUtil && nodeUtil.isTypedArray;

/**
 * Checks if `value` is classified as a typed array.
 *
 * @static
 * @memberOf _
 * @since 3.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a typed array, else `false`.
 * @example
 *
 * _.isTypedArray(new Uint8Array);
 * // => true
 *
 * _.isTypedArray([]);
 * // => false
 */
var isTypedArray = nodeIsTypedArray ? baseUnary(nodeIsTypedArray) : baseIsTypedArray;

module.exports = isTypedArray;

},{"./_baseIsTypedArray":98,"./_baseUnary":116,"./_nodeUtil":186}],231:[function(require,module,exports){
var arrayLikeKeys = require('./_arrayLikeKeys'),
    baseKeys = require('./_baseKeys'),
    isArrayLike = require('./isArrayLike');

/**
 * Creates an array of the own enumerable property names of `object`.
 *
 * **Note:** Non-object values are coerced to objects. See the
 * [ES spec](http://ecma-international.org/ecma-262/7.0/#sec-object.keys)
 * for more details.
 *
 * @static
 * @since 0.1.0
 * @memberOf _
 * @category Object
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.keys(new Foo);
 * // => ['a', 'b'] (iteration order is not guaranteed)
 *
 * _.keys('hi');
 * // => ['0', '1']
 */
function keys(object) {
  return isArrayLike(object) ? arrayLikeKeys(object) : baseKeys(object);
}

module.exports = keys;

},{"./_arrayLikeKeys":68,"./_baseKeys":100,"./isArrayLike":219}],232:[function(require,module,exports){
var arrayLikeKeys = require('./_arrayLikeKeys'),
    baseKeysIn = require('./_baseKeysIn'),
    isArrayLike = require('./isArrayLike');

/**
 * Creates an array of the own and inherited enumerable property names of `object`.
 *
 * **Note:** Non-object values are coerced to objects.
 *
 * @static
 * @memberOf _
 * @since 3.0.0
 * @category Object
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.keysIn(new Foo);
 * // => ['a', 'b', 'c'] (iteration order is not guaranteed)
 */
function keysIn(object) {
  return isArrayLike(object) ? arrayLikeKeys(object, true) : baseKeysIn(object);
}

module.exports = keysIn;

},{"./_arrayLikeKeys":68,"./_baseKeysIn":101,"./isArrayLike":219}],233:[function(require,module,exports){
/**
 * Gets the last element of `array`.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Array
 * @param {Array} array The array to query.
 * @returns {*} Returns the last element of `array`.
 * @example
 *
 * _.last([1, 2, 3]);
 * // => 3
 */
function last(array) {
  var length = array == null ? 0 : array.length;
  return length ? array[length - 1] : undefined;
}

module.exports = last;

},{}],234:[function(require,module,exports){
var baseAssignValue = require('./_baseAssignValue'),
    baseForOwn = require('./_baseForOwn'),
    baseIteratee = require('./_baseIteratee');

/**
 * The opposite of `_.mapValues`; this method creates an object with the
 * same values as `object` and keys generated by running each own enumerable
 * string keyed property of `object` thru `iteratee`. The iteratee is invoked
 * with three arguments: (value, key, object).
 *
 * @static
 * @memberOf _
 * @since 3.8.0
 * @category Object
 * @param {Object} object The object to iterate over.
 * @param {Function} [iteratee=_.identity] The function invoked per iteration.
 * @returns {Object} Returns the new mapped object.
 * @see _.mapValues
 * @example
 *
 * _.mapKeys({ 'a': 1, 'b': 2 }, function(value, key) {
 *   return key + value;
 * });
 * // => { 'a1': 1, 'b2': 2 }
 */
function mapKeys(object, iteratee) {
  var result = {};
  iteratee = baseIteratee(iteratee, 3);

  baseForOwn(object, function(value, key, object) {
    baseAssignValue(result, iteratee(value, key, object), value);
  });
  return result;
}

module.exports = mapKeys;

},{"./_baseAssignValue":77,"./_baseForOwn":83,"./_baseIteratee":99}],235:[function(require,module,exports){
var MapCache = require('./_MapCache');

/** Error message constants. */
var FUNC_ERROR_TEXT = 'Expected a function';

/**
 * Creates a function that memoizes the result of `func`. If `resolver` is
 * provided, it determines the cache key for storing the result based on the
 * arguments provided to the memoized function. By default, the first argument
 * provided to the memoized function is used as the map cache key. The `func`
 * is invoked with the `this` binding of the memoized function.
 *
 * **Note:** The cache is exposed as the `cache` property on the memoized
 * function. Its creation may be customized by replacing the `_.memoize.Cache`
 * constructor with one whose instances implement the
 * [`Map`](http://ecma-international.org/ecma-262/7.0/#sec-properties-of-the-map-prototype-object)
 * method interface of `clear`, `delete`, `get`, `has`, and `set`.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Function
 * @param {Function} func The function to have its output memoized.
 * @param {Function} [resolver] The function to resolve the cache key.
 * @returns {Function} Returns the new memoized function.
 * @example
 *
 * var object = { 'a': 1, 'b': 2 };
 * var other = { 'c': 3, 'd': 4 };
 *
 * var values = _.memoize(_.values);
 * values(object);
 * // => [1, 2]
 *
 * values(other);
 * // => [3, 4]
 *
 * object.a = 2;
 * values(object);
 * // => [1, 2]
 *
 * // Modify the result cache.
 * values.cache.set(object, ['a', 'b']);
 * values(object);
 * // => ['a', 'b']
 *
 * // Replace `_.memoize.Cache`.
 * _.memoize.Cache = WeakMap;
 */
function memoize(func, resolver) {
  if (typeof func != 'function' || (resolver != null && typeof resolver != 'function')) {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  var memoized = function() {
    var args = arguments,
        key = resolver ? resolver.apply(this, args) : args[0],
        cache = memoized.cache;

    if (cache.has(key)) {
      return cache.get(key);
    }
    var result = func.apply(this, args);
    memoized.cache = cache.set(key, result) || cache;
    return result;
  };
  memoized.cache = new (memoize.Cache || MapCache);
  return memoized;
}

// Expose `MapCache`.
memoize.Cache = MapCache;

module.exports = memoize;

},{"./_MapCache":55}],236:[function(require,module,exports){
var baseMerge = require('./_baseMerge'),
    createAssigner = require('./_createAssigner');

/**
 * This method is like `_.merge` except that it accepts `customizer` which
 * is invoked to produce the merged values of the destination and source
 * properties. If `customizer` returns `undefined`, merging is handled by the
 * method instead. The `customizer` is invoked with six arguments:
 * (objValue, srcValue, key, object, source, stack).
 *
 * **Note:** This method mutates `object`.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Object
 * @param {Object} object The destination object.
 * @param {...Object} sources The source objects.
 * @param {Function} customizer The function to customize assigned values.
 * @returns {Object} Returns `object`.
 * @example
 *
 * function customizer(objValue, srcValue) {
 *   if (_.isArray(objValue)) {
 *     return objValue.concat(srcValue);
 *   }
 * }
 *
 * var object = { 'a': [1], 'b': [2] };
 * var other = { 'a': [3], 'b': [4] };
 *
 * _.mergeWith(object, other, customizer);
 * // => { 'a': [1, 3], 'b': [2, 4] }
 */
var mergeWith = createAssigner(function(object, source, srcIndex, customizer) {
  baseMerge(object, source, srcIndex, customizer);
});

module.exports = mergeWith;

},{"./_baseMerge":104,"./_createAssigner":132}],237:[function(require,module,exports){
var arrayMap = require('./_arrayMap'),
    baseClone = require('./_baseClone'),
    baseUnset = require('./_baseUnset'),
    castPath = require('./_castPath'),
    copyObject = require('./_copyObject'),
    customOmitClone = require('./_customOmitClone'),
    flatRest = require('./_flatRest'),
    getAllKeysIn = require('./_getAllKeysIn');

/** Used to compose bitmasks for cloning. */
var CLONE_DEEP_FLAG = 1,
    CLONE_FLAT_FLAG = 2,
    CLONE_SYMBOLS_FLAG = 4;

/**
 * The opposite of `_.pick`; this method creates an object composed of the
 * own and inherited enumerable property paths of `object` that are not omitted.
 *
 * **Note:** This method is considerably slower than `_.pick`.
 *
 * @static
 * @since 0.1.0
 * @memberOf _
 * @category Object
 * @param {Object} object The source object.
 * @param {...(string|string[])} [paths] The property paths to omit.
 * @returns {Object} Returns the new object.
 * @example
 *
 * var object = { 'a': 1, 'b': '2', 'c': 3 };
 *
 * _.omit(object, ['a', 'c']);
 * // => { 'b': '2' }
 */
var omit = flatRest(function(object, paths) {
  var result = {};
  if (object == null) {
    return result;
  }
  var isDeep = false;
  paths = arrayMap(paths, function(path) {
    path = castPath(path, object);
    isDeep || (isDeep = path.length > 1);
    return path;
  });
  copyObject(object, getAllKeysIn(object), result);
  if (isDeep) {
    result = baseClone(result, CLONE_DEEP_FLAG | CLONE_FLAT_FLAG | CLONE_SYMBOLS_FLAG, customOmitClone);
  }
  var length = paths.length;
  while (length--) {
    baseUnset(result, paths[length]);
  }
  return result;
});

module.exports = omit;

},{"./_arrayMap":69,"./_baseClone":78,"./_baseUnset":117,"./_castPath":120,"./_copyObject":128,"./_customOmitClone":135,"./_flatRest":140,"./_getAllKeysIn":143}],238:[function(require,module,exports){
var basePick = require('./_basePick'),
    flatRest = require('./_flatRest');

/**
 * Creates an object composed of the picked `object` properties.
 *
 * @static
 * @since 0.1.0
 * @memberOf _
 * @category Object
 * @param {Object} object The source object.
 * @param {...(string|string[])} [paths] The property paths to pick.
 * @returns {Object} Returns the new object.
 * @example
 *
 * var object = { 'a': 1, 'b': '2', 'c': 3 };
 *
 * _.pick(object, ['a', 'c']);
 * // => { 'a': 1, 'c': 3 }
 */
var pick = flatRest(function(object, paths) {
  return object == null ? {} : basePick(object, paths);
});

module.exports = pick;

},{"./_basePick":106,"./_flatRest":140}],239:[function(require,module,exports){
var baseProperty = require('./_baseProperty'),
    basePropertyDeep = require('./_basePropertyDeep'),
    isKey = require('./_isKey'),
    toKey = require('./_toKey');

/**
 * Creates a function that returns the value at `path` of a given object.
 *
 * @static
 * @memberOf _
 * @since 2.4.0
 * @category Util
 * @param {Array|string} path The path of the property to get.
 * @returns {Function} Returns the new accessor function.
 * @example
 *
 * var objects = [
 *   { 'a': { 'b': 2 } },
 *   { 'a': { 'b': 1 } }
 * ];
 *
 * _.map(objects, _.property('a.b'));
 * // => [2, 1]
 *
 * _.map(_.sortBy(objects, _.property(['a', 'b'])), 'a.b');
 * // => [1, 2]
 */
function property(path) {
  return isKey(path) ? baseProperty(toKey(path)) : basePropertyDeep(path);
}

module.exports = property;

},{"./_baseProperty":108,"./_basePropertyDeep":109,"./_isKey":165,"./_toKey":205}],240:[function(require,module,exports){
var baseSet = require('./_baseSet');

/**
 * Sets the value at `path` of `object`. If a portion of `path` doesn't exist,
 * it's created. Arrays are created for missing index properties while objects
 * are created for all other missing properties. Use `_.setWith` to customize
 * `path` creation.
 *
 * **Note:** This method mutates `object`.
 *
 * @static
 * @memberOf _
 * @since 3.7.0
 * @category Object
 * @param {Object} object The object to modify.
 * @param {Array|string} path The path of the property to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns `object`.
 * @example
 *
 * var object = { 'a': [{ 'b': { 'c': 3 } }] };
 *
 * _.set(object, 'a[0].b.c', 4);
 * console.log(object.a[0].b.c);
 * // => 4
 *
 * _.set(object, ['x', '0', 'y', 'z'], 5);
 * console.log(object.x[0].y.z);
 * // => 5
 */
function set(object, path, value) {
  return object == null ? object : baseSet(object, path, value);
}

module.exports = set;

},{"./_baseSet":111}],241:[function(require,module,exports){
/**
 * This method returns a new empty array.
 *
 * @static
 * @memberOf _
 * @since 4.13.0
 * @category Util
 * @returns {Array} Returns the new empty array.
 * @example
 *
 * var arrays = _.times(2, _.stubArray);
 *
 * console.log(arrays);
 * // => [[], []]
 *
 * console.log(arrays[0] === arrays[1]);
 * // => false
 */
function stubArray() {
  return [];
}

module.exports = stubArray;

},{}],242:[function(require,module,exports){
/**
 * This method returns `false`.
 *
 * @static
 * @memberOf _
 * @since 4.13.0
 * @category Util
 * @returns {boolean} Returns `false`.
 * @example
 *
 * _.times(2, _.stubFalse);
 * // => [false, false]
 */
function stubFalse() {
  return false;
}

module.exports = stubFalse;

},{}],243:[function(require,module,exports){
var copyObject = require('./_copyObject'),
    keysIn = require('./keysIn');

/**
 * Converts `value` to a plain object flattening inherited enumerable string
 * keyed properties of `value` to own properties of the plain object.
 *
 * @static
 * @memberOf _
 * @since 3.0.0
 * @category Lang
 * @param {*} value The value to convert.
 * @returns {Object} Returns the converted plain object.
 * @example
 *
 * function Foo() {
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.assign({ 'a': 1 }, new Foo);
 * // => { 'a': 1, 'b': 2 }
 *
 * _.assign({ 'a': 1 }, _.toPlainObject(new Foo));
 * // => { 'a': 1, 'b': 2, 'c': 3 }
 */
function toPlainObject(value) {
  return copyObject(value, keysIn(value));
}

module.exports = toPlainObject;

},{"./_copyObject":128,"./keysIn":232}],244:[function(require,module,exports){
var baseToString = require('./_baseToString');

/**
 * Converts `value` to a string. An empty string is returned for `null`
 * and `undefined` values. The sign of `-0` is preserved.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to convert.
 * @returns {string} Returns the converted string.
 * @example
 *
 * _.toString(null);
 * // => ''
 *
 * _.toString(-0);
 * // => '-0'
 *
 * _.toString([1, 2, 3]);
 * // => '1,2,3'
 */
function toString(value) {
  return value == null ? '' : baseToString(value);
}

module.exports = toString;

},{"./_baseToString":115}],245:[function(require,module,exports){
/**
 * Helpers.
 */

var s = 1000;
var m = s * 60;
var h = m * 60;
var d = h * 24;
var y = d * 365.25;

/**
 * Parse or format the given `val`.
 *
 * Options:
 *
 *  - `long` verbose formatting [false]
 *
 * @param {String|Number} val
 * @param {Object} [options]
 * @throws {Error} throw an error if val is not a non-empty string or a number
 * @return {String|Number}
 * @api public
 */

module.exports = function(val, options) {
  options = options || {};
  var type = typeof val;
  if (type === 'string' && val.length > 0) {
    return parse(val);
  } else if (type === 'number' && isNaN(val) === false) {
    return options.long ? fmtLong(val) : fmtShort(val);
  }
  throw new Error(
    'val is not a non-empty string or a valid number. val=' +
      JSON.stringify(val)
  );
};

/**
 * Parse the given `str` and return milliseconds.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function parse(str) {
  str = String(str);
  if (str.length > 100) {
    return;
  }
  var match = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(
    str
  );
  if (!match) {
    return;
  }
  var n = parseFloat(match[1]);
  var type = (match[2] || 'ms').toLowerCase();
  switch (type) {
    case 'years':
    case 'year':
    case 'yrs':
    case 'yr':
    case 'y':
      return n * y;
    case 'days':
    case 'day':
    case 'd':
      return n * d;
    case 'hours':
    case 'hour':
    case 'hrs':
    case 'hr':
    case 'h':
      return n * h;
    case 'minutes':
    case 'minute':
    case 'mins':
    case 'min':
    case 'm':
      return n * m;
    case 'seconds':
    case 'second':
    case 'secs':
    case 'sec':
    case 's':
      return n * s;
    case 'milliseconds':
    case 'millisecond':
    case 'msecs':
    case 'msec':
    case 'ms':
      return n;
    default:
      return undefined;
  }
}

/**
 * Short format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function fmtShort(ms) {
  if (ms >= d) {
    return Math.round(ms / d) + 'd';
  }
  if (ms >= h) {
    return Math.round(ms / h) + 'h';
  }
  if (ms >= m) {
    return Math.round(ms / m) + 'm';
  }
  if (ms >= s) {
    return Math.round(ms / s) + 's';
  }
  return ms + 'ms';
}

/**
 * Long format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function fmtLong(ms) {
  return plural(ms, d, 'day') ||
    plural(ms, h, 'hour') ||
    plural(ms, m, 'minute') ||
    plural(ms, s, 'second') ||
    ms + ' ms';
}

/**
 * Pluralization helper.
 */

function plural(ms, n, name) {
  if (ms < n) {
    return;
  }
  if (ms < n * 1.5) {
    return Math.floor(ms / n) + ' ' + name;
  }
  return Math.ceil(ms / n) + ' ' + name + 's';
}

},{}],246:[function(require,module,exports){
assert.notEqual = notEqual
assert.notOk = notOk
assert.equal = equal
assert.ok = assert

module.exports = assert

function equal (a, b, m) {
  assert(a == b, m) // eslint-disable-line eqeqeq
}

function notEqual (a, b, m) {
  assert(a != b, m) // eslint-disable-line eqeqeq
}

function notOk (t, m) {
  assert(!t, m)
}

function assert (t, m) {
  if (!t) throw new Error(m || 'AssertionError')
}

},{}],247:[function(require,module,exports){
var splice = require('remove-array-items')
var nanotiming = require('nanotiming')
var assert = require('assert')

module.exports = Nanobus

function Nanobus (name) {
  if (!(this instanceof Nanobus)) return new Nanobus(name)

  this._name = name || 'nanobus'
  this._starListeners = []
  this._listeners = {}
}

Nanobus.prototype.emit = function (eventName) {
  assert.equal(typeof eventName, 'string', 'nanobus.emit: eventName should be type string')

  var data = []
  for (var i = 1, len = arguments.length; i < len; i++) {
    data.push(arguments[i])
  }

  var emitTiming = nanotiming(this._name + "('" + eventName + "')")
  var listeners = this._listeners[eventName]
  if (listeners && listeners.length > 0) {
    this._emit(this._listeners[eventName], data)
  }

  if (this._starListeners.length > 0) {
    this._emit(this._starListeners, eventName, data, emitTiming.uuid)
  }
  emitTiming()

  return this
}

Nanobus.prototype.on = Nanobus.prototype.addListener = function (eventName, listener) {
  assert.equal(typeof eventName, 'string', 'nanobus.on: eventName should be type string')
  assert.equal(typeof listener, 'function', 'nanobus.on: listener should be type function')

  if (eventName === '*') {
    this._starListeners.push(listener)
  } else {
    if (!this._listeners[eventName]) this._listeners[eventName] = []
    this._listeners[eventName].push(listener)
  }
  return this
}

Nanobus.prototype.prependListener = function (eventName, listener) {
  assert.equal(typeof eventName, 'string', 'nanobus.prependListener: eventName should be type string')
  assert.equal(typeof listener, 'function', 'nanobus.prependListener: listener should be type function')

  if (eventName === '*') {
    this._starListeners.unshift(listener)
  } else {
    if (!this._listeners[eventName]) this._listeners[eventName] = []
    this._listeners[eventName].unshift(listener)
  }
  return this
}

Nanobus.prototype.once = function (eventName, listener) {
  assert.equal(typeof eventName, 'string', 'nanobus.once: eventName should be type string')
  assert.equal(typeof listener, 'function', 'nanobus.once: listener should be type function')

  var self = this
  this.on(eventName, once)
  function once () {
    listener.apply(self, arguments)
    self.removeListener(eventName, once)
  }
  return this
}

Nanobus.prototype.prependOnceListener = function (eventName, listener) {
  assert.equal(typeof eventName, 'string', 'nanobus.prependOnceListener: eventName should be type string')
  assert.equal(typeof listener, 'function', 'nanobus.prependOnceListener: listener should be type function')

  var self = this
  this.prependListener(eventName, once)
  function once () {
    listener.apply(self, arguments)
    self.removeListener(eventName, once)
  }
  return this
}

Nanobus.prototype.removeListener = function (eventName, listener) {
  assert.equal(typeof eventName, 'string', 'nanobus.removeListener: eventName should be type string')
  assert.equal(typeof listener, 'function', 'nanobus.removeListener: listener should be type function')

  if (eventName === '*') {
    this._starListeners = this._starListeners.slice()
    return remove(this._starListeners, listener)
  } else {
    if (typeof this._listeners[eventName] !== 'undefined') {
      this._listeners[eventName] = this._listeners[eventName].slice()
    }

    return remove(this._listeners[eventName], listener)
  }

  function remove (arr, listener) {
    if (!arr) return
    var index = arr.indexOf(listener)
    if (index !== -1) {
      splice(arr, index, 1)
      return true
    }
  }
}

Nanobus.prototype.removeAllListeners = function (eventName) {
  if (eventName) {
    if (eventName === '*') {
      this._starListeners = []
    } else {
      this._listeners[eventName] = []
    }
  } else {
    this._starListeners = []
    this._listeners = {}
  }
  return this
}

Nanobus.prototype.listeners = function (eventName) {
  var listeners = eventName !== '*'
    ? this._listeners[eventName]
    : this._starListeners

  var ret = []
  if (listeners) {
    var ilength = listeners.length
    for (var i = 0; i < ilength; i++) ret.push(listeners[i])
  }
  return ret
}

Nanobus.prototype._emit = function (arr, eventName, data, uuid) {
  if (typeof arr === 'undefined') return
  if (arr.length === 0) return
  if (data === undefined) {
    data = eventName
    eventName = null
  }

  if (eventName) {
    if (uuid !== undefined) {
      data = [eventName].concat(data, uuid)
    } else {
      data = [eventName].concat(data)
    }
  }

  var length = arr.length
  for (var i = 0; i < length; i++) {
    var listener = arr[i]
    listener.apply(listener, data)
  }
}

},{"assert":35,"nanotiming":257,"remove-array-items":260}],248:[function(require,module,exports){
var assert = require('assert')

var safeExternalLink = /(noopener|noreferrer) (noopener|noreferrer)/
var protocolLink = /^[\w-_]+:/

module.exports = href

function href (cb, root) {
  assert.notEqual(typeof window, 'undefined', 'nanohref: expected window to exist')

  root = root || window.document

  assert.equal(typeof cb, 'function', 'nanohref: cb should be type function')
  assert.equal(typeof root, 'object', 'nanohref: root should be type object')

  window.addEventListener('click', function (e) {
    if ((e.button && e.button !== 0) ||
      e.ctrlKey || e.metaKey || e.altKey || e.shiftKey ||
      e.defaultPrevented) return

    var anchor = (function traverse (node) {
      if (!node || node === root) return
      if (node.localName !== 'a' || node.href === undefined) {
        return traverse(node.parentNode)
      }
      return node
    })(e.target)

    if (!anchor) return

    if (window.location.origin !== anchor.origin ||
      anchor.hasAttribute('download') ||
      (anchor.getAttribute('target') === '_blank' &&
        safeExternalLink.test(anchor.getAttribute('rel'))) ||
      protocolLink.test(anchor.getAttribute('href'))) return

    e.preventDefault()
    cb(anchor)
  })
}

},{"assert":35}],249:[function(require,module,exports){
var assert = require('assert')

module.exports = nanolocation

function nanolocation () {
  assert.notEqual(typeof window, 'undefined', 'nanolocation: expected window to exist')
  var pathname = window.location.pathname.replace(/\/$/, '')
  var hash = window.location.hash.replace(/^#/, '/')
  return pathname + hash
}

},{"assert":35}],250:[function(require,module,exports){
var assert = require('assert')
var morph = require('./lib/morph')

var TEXT_NODE = 3
// var DEBUG = false

module.exports = nanomorph

// Morph one tree into another tree
//
// no parent
//   -> same: diff and walk children
//   -> not same: replace and return
// old node doesn't exist
//   -> insert new node
// new node doesn't exist
//   -> delete old node
// nodes are not the same
//   -> diff nodes and apply patch to old node
// nodes are the same
//   -> walk all child nodes and append to old node
function nanomorph (oldTree, newTree) {
  // if (DEBUG) {
  //   console.log(
  //   'nanomorph\nold\n  %s\nnew\n  %s',
  //   oldTree && oldTree.outerHTML,
  //   newTree && newTree.outerHTML
  // )
  // }
  assert.equal(typeof oldTree, 'object', 'nanomorph: oldTree should be an object')
  assert.equal(typeof newTree, 'object', 'nanomorph: newTree should be an object')
  var tree = walk(newTree, oldTree)
  // if (DEBUG) console.log('=> morphed\n  %s', tree.outerHTML)
  return tree
}

// Walk and morph a dom tree
function walk (newNode, oldNode) {
  // if (DEBUG) {
  //   console.log(
  //   'walk\nold\n  %s\nnew\n  %s',
  //   oldNode && oldNode.outerHTML,
  //   newNode && newNode.outerHTML
  // )
  // }
  if (!oldNode) {
    return newNode
  } else if (!newNode) {
    return null
  } else if (newNode.isSameNode && newNode.isSameNode(oldNode)) {
    return oldNode
  } else if (newNode.tagName !== oldNode.tagName) {
    return newNode
  } else {
    morph(newNode, oldNode)
    updateChildren(newNode, oldNode)
    return oldNode
  }
}

// Update the children of elements
// (obj, obj) -> null
function updateChildren (newNode, oldNode) {
  // if (DEBUG) {
  //   console.log(
  //   'updateChildren\nold\n  %s\nnew\n  %s',
  //   oldNode && oldNode.outerHTML,
  //   newNode && newNode.outerHTML
  // )
  // }
  var oldChild, newChild, morphed, oldMatch

  // The offset is only ever increased, and used for [i - offset] in the loop
  var offset = 0

  for (var i = 0; ; i++) {
    oldChild = oldNode.childNodes[i]
    newChild = newNode.childNodes[i - offset]
    // if (DEBUG) {
    //   console.log(
    //   '===\n- old\n  %s\n- new\n  %s',
    //   oldChild && oldChild.outerHTML,
    //   newChild && newChild.outerHTML
    // )
    // }
    // Both nodes are empty, do nothing
    if (!oldChild && !newChild) {
      break

    // There is no new child, remove old
    } else if (!newChild) {
      oldNode.removeChild(oldChild)
      i--

    // There is no old child, add new
    } else if (!oldChild) {
      oldNode.appendChild(newChild)
      offset++

    // Both nodes are the same, morph
    } else if (same(newChild, oldChild)) {
      morphed = walk(newChild, oldChild)
      if (morphed !== oldChild) {
        oldNode.replaceChild(morphed, oldChild)
        offset++
      }

    // Both nodes do not share an ID or a placeholder, try reorder
    } else {
      oldMatch = null

      // Try and find a similar node somewhere in the tree
      for (var j = i; j < oldNode.childNodes.length; j++) {
        if (same(oldNode.childNodes[j], newChild)) {
          oldMatch = oldNode.childNodes[j]
          break
        }
      }

      // If there was a node with the same ID or placeholder in the old list
      if (oldMatch) {
        morphed = walk(newChild, oldMatch)
        if (morphed !== oldMatch) offset++
        oldNode.insertBefore(morphed, oldChild)

      // It's safe to morph two nodes in-place if neither has an ID
      } else if (!newChild.id && !oldChild.id) {
        morphed = walk(newChild, oldChild)
        if (morphed !== oldChild) {
          oldNode.replaceChild(morphed, oldChild)
          offset++
        }

      // Insert the node at the index if we couldn't morph or find a matching node
      } else {
        oldNode.insertBefore(newChild, oldChild)
        offset++
      }
    }
  }
}

function same (a, b) {
  if (a.id) return a.id === b.id
  if (a.isSameNode) return a.isSameNode(b)
  if (a.tagName !== b.tagName) return false
  if (a.type === TEXT_NODE) return a.nodeValue === b.nodeValue
  return false
}

},{"./lib/morph":252,"assert":246}],251:[function(require,module,exports){
module.exports = [
  // attribute events (can be set with attributes)
  'onclick',
  'ondblclick',
  'onmousedown',
  'onmouseup',
  'onmouseover',
  'onmousemove',
  'onmouseout',
  'onmouseenter',
  'onmouseleave',
  'ontouchcancel',
  'ontouchend',
  'ontouchmove',
  'ontouchstart',
  'ondragstart',
  'ondrag',
  'ondragenter',
  'ondragleave',
  'ondragover',
  'ondrop',
  'ondragend',
  'onkeydown',
  'onkeypress',
  'onkeyup',
  'onunload',
  'onabort',
  'onerror',
  'onresize',
  'onscroll',
  'onselect',
  'onchange',
  'onsubmit',
  'onreset',
  'onfocus',
  'onblur',
  'oninput',
  // other common events
  'oncontextmenu',
  'onfocusin',
  'onfocusout'
]

},{}],252:[function(require,module,exports){
var events = require('./events')
var eventsLength = events.length

var ELEMENT_NODE = 1
var TEXT_NODE = 3
var COMMENT_NODE = 8

module.exports = morph

// diff elements and apply the resulting patch to the old node
// (obj, obj) -> null
function morph (newNode, oldNode) {
  var nodeType = newNode.nodeType
  var nodeName = newNode.nodeName

  if (nodeType === ELEMENT_NODE) {
    copyAttrs(newNode, oldNode)
  }

  if (nodeType === TEXT_NODE || nodeType === COMMENT_NODE) {
    if (oldNode.nodeValue !== newNode.nodeValue) {
      oldNode.nodeValue = newNode.nodeValue
    }
  }

  // Some DOM nodes are weird
  // https://github.com/patrick-steele-idem/morphdom/blob/master/src/specialElHandlers.js
  if (nodeName === 'INPUT') updateInput(newNode, oldNode)
  else if (nodeName === 'OPTION') updateOption(newNode, oldNode)
  else if (nodeName === 'TEXTAREA') updateTextarea(newNode, oldNode)

  copyEvents(newNode, oldNode)
}

function copyAttrs (newNode, oldNode) {
  var oldAttrs = oldNode.attributes
  var newAttrs = newNode.attributes
  var attrNamespaceURI = null
  var attrValue = null
  var fromValue = null
  var attrName = null
  var attr = null

  for (var i = newAttrs.length - 1; i >= 0; --i) {
    attr = newAttrs[i]
    attrName = attr.name
    attrNamespaceURI = attr.namespaceURI
    attrValue = attr.value
    if (attrNamespaceURI) {
      attrName = attr.localName || attrName
      fromValue = oldNode.getAttributeNS(attrNamespaceURI, attrName)
      if (fromValue !== attrValue) {
        oldNode.setAttributeNS(attrNamespaceURI, attrName, attrValue)
      }
    } else {
      if (!oldNode.hasAttribute(attrName)) {
        oldNode.setAttribute(attrName, attrValue)
      } else {
        fromValue = oldNode.getAttribute(attrName)
        if (fromValue !== attrValue) {
          // apparently values are always cast to strings, ah well
          if (attrValue === 'null' || attrValue === 'undefined') {
            oldNode.removeAttribute(attrName)
          } else {
            oldNode.setAttribute(attrName, attrValue)
          }
        }
      }
    }
  }

  // Remove any extra attributes found on the original DOM element that
  // weren't found on the target element.
  for (var j = oldAttrs.length - 1; j >= 0; --j) {
    attr = oldAttrs[j]
    if (attr.specified !== false) {
      attrName = attr.name
      attrNamespaceURI = attr.namespaceURI

      if (attrNamespaceURI) {
        attrName = attr.localName || attrName
        if (!newNode.hasAttributeNS(attrNamespaceURI, attrName)) {
          oldNode.removeAttributeNS(attrNamespaceURI, attrName)
        }
      } else {
        if (!newNode.hasAttributeNS(null, attrName)) {
          oldNode.removeAttribute(attrName)
        }
      }
    }
  }
}

function copyEvents (newNode, oldNode) {
  for (var i = 0; i < eventsLength; i++) {
    var ev = events[i]
    if (newNode[ev]) {           // if new element has a whitelisted attribute
      oldNode[ev] = newNode[ev]  // update existing element
    } else if (oldNode[ev]) {    // if existing element has it and new one doesnt
      oldNode[ev] = undefined    // remove it from existing element
    }
  }
}

function updateOption (newNode, oldNode) {
  updateAttribute(newNode, oldNode, 'selected')
}

// The "value" attribute is special for the <input> element since it sets the
// initial value. Changing the "value" attribute without changing the "value"
// property will have no effect since it is only used to the set the initial
// value. Similar for the "checked" attribute, and "disabled".
function updateInput (newNode, oldNode) {
  var newValue = newNode.value
  var oldValue = oldNode.value

  updateAttribute(newNode, oldNode, 'checked')
  updateAttribute(newNode, oldNode, 'disabled')

  if (newValue !== oldValue) {
    oldNode.setAttribute('value', newValue)
    oldNode.value = newValue
  }

  if (newValue === 'null') {
    oldNode.value = ''
    oldNode.removeAttribute('value')
  }

  if (!newNode.hasAttributeNS(null, 'value')) {
    oldNode.removeAttribute('value')
  } else if (oldNode.type === 'range') {
    // this is so elements like slider move their UI thingy
    oldNode.value = newValue
  }
}

function updateTextarea (newNode, oldNode) {
  var newValue = newNode.value
  if (newValue !== oldNode.value) {
    oldNode.value = newValue
  }

  if (oldNode.firstChild && oldNode.firstChild.nodeValue !== newValue) {
    // Needed for IE. Apparently IE sets the placeholder as the
    // node value and vise versa. This ignores an empty update.
    if (newValue === '' && oldNode.firstChild.nodeValue === oldNode.placeholder) {
      return
    }

    oldNode.firstChild.nodeValue = newValue
  }
}

function updateAttribute (newNode, oldNode, name) {
  if (newNode[name] !== oldNode[name]) {
    oldNode[name] = newNode[name]
    if (newNode[name]) {
      oldNode.setAttribute(name, '')
    } else {
      oldNode.removeAttribute(name)
    }
  }
}

},{"./events":251}],253:[function(require,module,exports){
var reg = /([^?=&]+)(=([^&]*))?/g
var assert = require('assert')

module.exports = qs

function qs (url) {
  assert.equal(typeof url, 'string', 'nanoquery: url should be type string')

  var obj = {}
  url.replace(/^.*\?/, '').replace(reg, function (a0, a1, a2, a3) {
    obj[decodeURIComponent(a1)] = decodeURIComponent(a3)
  })

  return obj
}

},{"assert":246}],254:[function(require,module,exports){
'use strict'

var assert = require('assert')

module.exports = nanoraf

// Only call RAF when needed
// (fn, fn?) -> fn
function nanoraf (render, raf) {
  assert.equal(typeof render, 'function', 'nanoraf: render should be a function')
  assert.ok(typeof raf === 'function' || typeof raf === 'undefined', 'nanoraf: raf should be a function or undefined')

  if (!raf) raf = window.requestAnimationFrame
  var redrawScheduled = false
  var args = null

  return function frame () {
    if (args === null && !redrawScheduled) {
      redrawScheduled = true

      raf(function redraw () {
        redrawScheduled = false

        var length = args.length
        var _args = new Array(length)
        for (var i = 0; i < length; i++) _args[i] = args[i]

        render.apply(render, _args)
        args = null
      })
    }

    args = arguments
  }
}

},{"assert":35}],255:[function(require,module,exports){
var assert = require('assert')
var wayfarer = require('wayfarer')

// electron support
var isLocalFile = (/file:\/\//.test(
  typeof window === 'object' &&
  window.location &&
  window.location.origin
))

/* eslint-disable no-useless-escape */
var electron = '^(file:\/\/|\/)(.*\.html?\/?)?'
var protocol = '^(http(s)?(:\/\/))?(www\.)?'
var domain = '[a-zA-Z0-9-_\.]+(:[0-9]{1,5})?(\/{1})?'
var qs = '[\?].*$'
/* eslint-enable no-useless-escape */

var stripElectron = new RegExp(electron)
var prefix = new RegExp(protocol + domain)
var normalize = new RegExp('#')
var suffix = new RegExp(qs)

module.exports = Nanorouter

function Nanorouter (opts) {
  if (!(this instanceof Nanorouter)) return new Nanorouter(opts)
  opts = opts || {}
  this.router = wayfarer(opts.default || '/404')
}

Nanorouter.prototype.on = function (routename, listener) {
  assert.equal(typeof routename, 'string')
  routename = routename.replace(/^[#/]/, '')
  this.router.on(routename, listener)
}

Nanorouter.prototype.emit = function (routename) {
  assert.equal(typeof routename, 'string')
  routename = pathname(routename, isLocalFile)
  return this.router.emit(routename)
}

Nanorouter.prototype.match = function (routename) {
  assert.equal(typeof routename, 'string')
  routename = pathname(routename, isLocalFile)
  return this.router.match(routename)
}

// replace everything in a route but the pathname and hash
function pathname (routename, isElectron) {
  if (isElectron) routename = routename.replace(stripElectron, '')
  else routename = routename.replace(prefix, '')
  return decodeURI(routename.replace(suffix, '').replace(normalize, '/'))
}

},{"assert":35,"wayfarer":266}],256:[function(require,module,exports){
var assert = require('assert')

var hasWindow = typeof window !== 'undefined'

function createScheduler () {
  var scheduler
  if (hasWindow) {
    if (!window._nanoScheduler) window._nanoScheduler = new NanoScheduler(true)
    scheduler = window._nanoScheduler
  } else {
    scheduler = new NanoScheduler()
  }
  return scheduler
}

function NanoScheduler (hasWindow) {
  this.hasWindow = hasWindow
  this.hasIdle = this.hasWindow && window.requestIdleCallback
  this.method = this.hasIdle ? window.requestIdleCallback.bind(window) : this.setTimeout
  this.scheduled = false
  this.queue = []
}

NanoScheduler.prototype.push = function (cb) {
  assert.equal(typeof cb, 'function', 'nanoscheduler.push: cb should be type function')

  this.queue.push(cb)
  this.schedule()
}

NanoScheduler.prototype.schedule = function () {
  if (this.scheduled) return

  this.scheduled = true
  var self = this
  this.method(function (idleDeadline) {
    var cb
    while (self.queue.length && idleDeadline.timeRemaining() > 0) {
      cb = self.queue.shift()
      cb(idleDeadline)
    }
    self.scheduled = false
    if (self.queue.length) self.schedule()
  })
}

NanoScheduler.prototype.setTimeout = function (cb) {
  setTimeout(cb, 0, {
    timeRemaining: function () {
      return 1
    }
  })
}

module.exports = createScheduler

},{"assert":246}],257:[function(require,module,exports){
var scheduler = require('nanoscheduler')()
var assert = require('assert')

var perf
nanotiming.disabled = true
try {
  perf = window.performance
  nanotiming.disabled = window.localStorage.DISABLE_NANOTIMING === 'true' || !perf.mark
} catch (e) { }

module.exports = nanotiming

function nanotiming (name) {
  assert.equal(typeof name, 'string', 'nanotiming: name should be type string')

  if (nanotiming.disabled) return noop

  var uuid = (perf.now() * 10000).toFixed() % Number.MAX_SAFE_INTEGER
  var startName = 'start-' + uuid + '-' + name
  perf.mark(startName)

  function end (cb) {
    var endName = 'end-' + uuid + '-' + name
    perf.mark(endName)

    scheduler.push(function () {
      var err = null
      try {
        var measureName = name + ' [' + uuid + ']'
        perf.measure(measureName, startName, endName)
        perf.clearMarks(startName)
        perf.clearMarks(endName)
      } catch (e) { err = e }
      if (cb) cb(err, name)
    })
  }

  end.uuid = uuid
  return end
}

function noop (cb) {
  if (cb) {
    scheduler.push(function () {
      cb(new Error('nanotiming: performance API unavailable'))
    })
  }
}

},{"assert":35,"nanoscheduler":256}],258:[function(require,module,exports){
module.exports = exports = window.fetch;

// Needed for TypeScript and Webpack.
exports.default = window.fetch.bind(window);

exports.Headers = window.Headers;
exports.Request = window.Request;
exports.Response = window.Response;

},{}],259:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],260:[function(require,module,exports){
'use strict'

/**
 * Remove a range of items from an array
 *
 * @function removeItems
 * @param {Array<*>} arr The target array
 * @param {number} startIdx The index to begin removing from (inclusive)
 * @param {number} removeCount How many items to remove
 */
module.exports = function removeItems(arr, startIdx, removeCount)
{
  var i, length = arr.length

  if (startIdx >= length || removeCount === 0) {
    return
  }

  removeCount = (startIdx + removeCount > length ? length - startIdx : removeCount)

  var len = length - removeCount

  for (i = startIdx; i < len; ++i) {
    arr[i] = arr[i + removeCount]
  }

  arr.length = len
}

},{}],261:[function(require,module,exports){
module.exports = scrollToAnchor

function scrollToAnchor (anchor, options) {
  if (anchor) {
    try {
      var el = document.querySelector(anchor)
      if (el) el.scrollIntoView(options)
    } catch (e) {}
  }
}

},{}],262:[function(require,module,exports){
(function (root, factory) {
    if (typeof exports === 'object') {
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else {
        root.urltemplate = factory();
    }
}(this, function () {
  /**
   * @constructor
   */
  function UrlTemplate() {
  }

  /**
   * @private
   * @param {string} str
   * @return {string}
   */
  UrlTemplate.prototype.encodeReserved = function (str) {
    return str.split(/(%[0-9A-Fa-f]{2})/g).map(function (part) {
      if (!/%[0-9A-Fa-f]/.test(part)) {
        part = encodeURI(part).replace(/%5B/g, '[').replace(/%5D/g, ']');
      }
      return part;
    }).join('');
  };

  /**
   * @private
   * @param {string} str
   * @return {string}
   */
  UrlTemplate.prototype.encodeUnreserved = function (str) {
    return encodeURIComponent(str).replace(/[!'()*]/g, function (c) {
      return '%' + c.charCodeAt(0).toString(16).toUpperCase();
    });
  }

  /**
   * @private
   * @param {string} operator
   * @param {string} value
   * @param {string} key
   * @return {string}
   */
  UrlTemplate.prototype.encodeValue = function (operator, value, key) {
    value = (operator === '+' || operator === '#') ? this.encodeReserved(value) : this.encodeUnreserved(value);

    if (key) {
      return this.encodeUnreserved(key) + '=' + value;
    } else {
      return value;
    }
  };

  /**
   * @private
   * @param {*} value
   * @return {boolean}
   */
  UrlTemplate.prototype.isDefined = function (value) {
    return value !== undefined && value !== null;
  };

  /**
   * @private
   * @param {string}
   * @return {boolean}
   */
  UrlTemplate.prototype.isKeyOperator = function (operator) {
    return operator === ';' || operator === '&' || operator === '?';
  };

  /**
   * @private
   * @param {Object} context
   * @param {string} operator
   * @param {string} key
   * @param {string} modifier
   */
  UrlTemplate.prototype.getValues = function (context, operator, key, modifier) {
    var value = context[key],
        result = [];

    if (this.isDefined(value) && value !== '') {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        value = value.toString();

        if (modifier && modifier !== '*') {
          value = value.substring(0, parseInt(modifier, 10));
        }

        result.push(this.encodeValue(operator, value, this.isKeyOperator(operator) ? key : null));
      } else {
        if (modifier === '*') {
          if (Array.isArray(value)) {
            value.filter(this.isDefined).forEach(function (value) {
              result.push(this.encodeValue(operator, value, this.isKeyOperator(operator) ? key : null));
            }, this);
          } else {
            Object.keys(value).forEach(function (k) {
              if (this.isDefined(value[k])) {
                result.push(this.encodeValue(operator, value[k], k));
              }
            }, this);
          }
        } else {
          var tmp = [];

          if (Array.isArray(value)) {
            value.filter(this.isDefined).forEach(function (value) {
              tmp.push(this.encodeValue(operator, value));
            }, this);
          } else {
            Object.keys(value).forEach(function (k) {
              if (this.isDefined(value[k])) {
                tmp.push(this.encodeUnreserved(k));
                tmp.push(this.encodeValue(operator, value[k].toString()));
              }
            }, this);
          }

          if (this.isKeyOperator(operator)) {
            result.push(this.encodeUnreserved(key) + '=' + tmp.join(','));
          } else if (tmp.length !== 0) {
            result.push(tmp.join(','));
          }
        }
      }
    } else {
      if (operator === ';') {
        if (this.isDefined(value)) {
          result.push(this.encodeUnreserved(key));
        }
      } else if (value === '' && (operator === '&' || operator === '?')) {
        result.push(this.encodeUnreserved(key) + '=');
      } else if (value === '') {
        result.push('');
      }
    }
    return result;
  };

  /**
   * @param {string} template
   * @return {function(Object):string}
   */
  UrlTemplate.prototype.parse = function (template) {
    var that = this;
    var operators = ['+', '#', '.', '/', ';', '?', '&'];

    return {
      expand: function (context) {
        return template.replace(/\{([^\{\}]+)\}|([^\{\}]+)/g, function (_, expression, literal) {
          if (expression) {
            var operator = null,
                values = [];

            if (operators.indexOf(expression.charAt(0)) !== -1) {
              operator = expression.charAt(0);
              expression = expression.substr(1);
            }

            expression.split(/,/g).forEach(function (variable) {
              var tmp = /([^:\*]*)(?::(\d+)|(\*))?/.exec(variable);
              values.push.apply(values, that.getValues(context, operator, tmp[1], tmp[2] || tmp[3]));
            });

            if (operator && operator !== '+') {
              var separator = ',';

              if (operator === '?') {
                separator = '&';
              } else if (operator !== '#') {
                separator = operator;
              }
              return (values.length !== 0 ? operator : '') + values.join(separator);
            } else {
              return values.join(',');
            }
          } else {
            return that.encodeReserved(literal);
          }
        });
      }
    };
  };

  return new UrlTemplate();
}));

},{}],263:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],264:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],265:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":264,"_process":259,"inherits":263}],266:[function(require,module,exports){
var assert = require('assert')
var trie = require('./trie')

module.exports = Wayfarer

// create a router
// str -> obj
function Wayfarer (dft) {
  if (!(this instanceof Wayfarer)) return new Wayfarer(dft)

  var _default = (dft || '').replace(/^\//, '')
  var _trie = trie()

  emit._trie = _trie
  emit.on = on
  emit.emit = emit
  emit.match = match
  emit._wayfarer = true

  return emit

  // define a route
  // (str, fn) -> obj
  function on (route, cb) {
    assert.equal(typeof route, 'string')
    assert.equal(typeof cb, 'function')

    route = route || '/'
    cb.route = route

    if (cb && cb._wayfarer && cb._trie) {
      _trie.mount(route, cb._trie.trie)
    } else {
      var node = _trie.create(route)
      node.cb = cb
    }

    return emit
  }

  // match and call a route
  // (str, obj?) -> null
  function emit (route) {
    var matched = match(route)

    var args = new Array(arguments.length)
    args[0] = matched.params
    for (var i = 1; i < args.length; i++) {
      args[i] = arguments[i]
    }

    return matched.cb.apply(matched.cb, args)
  }

  function match (route) {
    assert.notEqual(route, undefined, "'route' must be defined")

    var matched = _trie.match(route)
    if (matched && matched.cb) return new Route(matched)

    var dft = _trie.match(_default)
    if (dft && dft.cb) return new Route(dft)

    throw new Error("route '" + route + "' did not match")
  }

  function Route (matched) {
    this.cb = matched.cb
    this.route = matched.cb.route
    this.params = matched.params
  }
}

},{"./trie":267,"assert":35}],267:[function(require,module,exports){
var mutate = require('xtend/mutable')
var assert = require('assert')
var xtend = require('xtend')

module.exports = Trie

// create a new trie
// null -> obj
function Trie () {
  if (!(this instanceof Trie)) return new Trie()
  this.trie = { nodes: {} }
}

// create a node on the trie at route
// and return a node
// str -> null
Trie.prototype.create = function (route) {
  assert.equal(typeof route, 'string', 'route should be a string')
  // strip leading '/' and split routes
  var routes = route.replace(/^\//, '').split('/')

  function createNode (index, trie) {
    var thisRoute = (routes.hasOwnProperty(index) && routes[index])
    if (thisRoute === false) return trie

    var node = null
    if (/^:|^\*/.test(thisRoute)) {
      // if node is a name match, set name and append to ':' node
      if (!trie.nodes.hasOwnProperty('$$')) {
        node = { nodes: {} }
        trie.nodes['$$'] = node
      } else {
        node = trie.nodes['$$']
      }

      if (thisRoute[0] === '*') {
        trie.wildcard = true
      }

      trie.name = thisRoute.replace(/^:|^\*/, '')
    } else if (!trie.nodes.hasOwnProperty(thisRoute)) {
      node = { nodes: {} }
      trie.nodes[thisRoute] = node
    } else {
      node = trie.nodes[thisRoute]
    }

    // we must recurse deeper
    return createNode(index + 1, node)
  }

  return createNode(0, this.trie)
}

// match a route on the trie
// and return the node
// str -> obj
Trie.prototype.match = function (route) {
  assert.equal(typeof route, 'string', 'route should be a string')

  var routes = route.replace(/^\//, '').split('/')
  var params = {}

  function search (index, trie) {
    // either there's no match, or we're done searching
    if (trie === undefined) return undefined
    var thisRoute = routes[index]
    if (thisRoute === undefined) return trie

    if (trie.nodes.hasOwnProperty(thisRoute)) {
      // match regular routes first
      return search(index + 1, trie.nodes[thisRoute])
    } else if (trie.name) {
      // match named routes
      try {
        params[trie.name] = decodeURIComponent(thisRoute)
      } catch (e) {
        return search(index, undefined)
      }
      return search(index + 1, trie.nodes['$$'])
    } else if (trie.wildcard) {
      // match wildcards
      try {
        params['wildcard'] = decodeURIComponent(routes.slice(index).join('/'))
      } catch (e) {
        return search(index, undefined)
      }
      // return early, or else search may keep recursing through the wildcard
      return trie.nodes['$$']
    } else {
      // no matches found
      return search(index + 1)
    }
  }

  var node = search(0, this.trie)

  if (!node) return undefined
  node = xtend(node)
  node.params = params
  return node
}

// mount a trie onto a node at route
// (str, obj) -> null
Trie.prototype.mount = function (route, trie) {
  assert.equal(typeof route, 'string', 'route should be a string')
  assert.equal(typeof trie, 'object', 'trie should be a object')

  var split = route.replace(/^\//, '').split('/')
  var node = null
  var key = null

  if (split.length === 1) {
    key = split[0]
    node = this.create(key)
  } else {
    var head = split.join('/')
    key = split[0]
    node = this.create(head)
  }

  mutate(node.nodes, trie.nodes)
  if (trie.name) node.name = trie.name

  // delegate properties from '/' to the new node
  // '/' cannot be reached once mounted
  if (node.nodes['']) {
    Object.keys(node.nodes['']).forEach(function (key) {
      if (key === 'nodes') return
      node[key] = node.nodes[''][key]
    })
    mutate(node.nodes, node.nodes[''].nodes)
    delete node.nodes[''].nodes
  }
}

},{"assert":35,"xtend":268,"xtend/mutable":269}],268:[function(require,module,exports){
module.exports = extend

var hasOwnProperty = Object.prototype.hasOwnProperty;

function extend() {
    var target = {}

    for (var i = 0; i < arguments.length; i++) {
        var source = arguments[i]

        for (var key in source) {
            if (hasOwnProperty.call(source, key)) {
                target[key] = source[key]
            }
        }
    }

    return target
}

},{}],269:[function(require,module,exports){
module.exports = extend

var hasOwnProperty = Object.prototype.hasOwnProperty;

function extend(target) {
    for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i]

        for (var key in source) {
            if (hasOwnProperty.call(source, key)) {
                target[key] = source[key]
            }
        }
    }

    return target
}

},{}]},{},[1]);
