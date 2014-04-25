module.exports = {
  search: {
    help: 'HELP STRING',
    // path relative to API root
    url: '/rel/path',
    // the http method type: get, post, put, del
    method: 'get',
    client: 'http'
  },
  userGet: {
    help: 'Get user by ID',
    url: '/user/:id',
    method: 'get',
    client: 'http'
  },
  fail: {
    url: '/fail',
    method: 'get',
    client: 'http'
  },
  succeed: {
    url: '/succeed',
    method: 'get',
    client: 'http'
  },
  testBefore: {
    url: '/testBefore',
    method: 'get',
    client: 'http'
  },
  testAfter: {
    url: '/testAfter',
    method: 'get',
    client: 'http'
  },
  testCatch: {
    url: '/testCatch',
    method: 'get',
    client: 'http'
  },

  socketTest: {
    client: 'socket'
  }

};
