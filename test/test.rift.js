module.exports = {
  search: {
    help: 'HELP STRING',
    // path relative to API root
    url: '/rel/path',
    // the http method type: get, post, put, del
    method: 'get'
  },
  user: {
    get: {
      help: 'Get user by ID',
      url: '/user/:id',
      method: 'get'
    }
  },
  fail: {
    url: '/fail',
    method: 'get'
  },
  succeed: {
    url: '/succeed',
    method: 'get'
  },
  testBefore: {
    url: '/testBefore',
    method: 'get'
  },
  testAfter: {
    url: '/testAfter',
    method: 'get'
  },
  testCatch: {
    url: '/testCatch',
    method: 'get'
  }
};
