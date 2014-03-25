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
    method: 'get',
    before: function(xhr, params, ctx, endpoint) {
      delete params.notAllowed;
      params.options = params.options || {
        perPage: 25
      };
    }
  },
  testAfter: {
    url: '/testAfter',
    method: 'get',
    after: function(response, params, ctx, endpoint) {
      if (!response.body || !response.body.length) {
        response.body = [{ok:false}];
      }
    }
  },
  testCatch: {
    url: '/testCatch',
    method: 'get',
    catch: function(error, params, ctx, endpoint) {
      error.customProperty = 'customProperty';
    }
  }
};
