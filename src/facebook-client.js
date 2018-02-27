const {Facebook} = require('fb');

module.exports =
class FacebookClient {
  constructor(appId, appSecret) {
    this.fb = new Facebook({appId, appSecret});
    this.appId = appId
  }

  getUserInfo(accessToken) {
    this.fb.setAccessToken(accessToken)
    return this.fb.api('/me?fields=name,email,id')
  }
}
