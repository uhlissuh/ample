require('./test-helper');
const assert = require('assert');
const cookieParser = require('cookie-parser');
const cookieSignature = require('cookie-signature');
const database = require('../src/database');
const request = require('request-promise').defaults({
  simple: false,
  followRedirect: false,
  resolveWithFullResponse: true
});

const facebookClient = {};
const googlePlacesClient = {};
const cookieSigningSecret = 'the-cookie-signing-secret';
const cache = {
  get() { return null },
  set(key, value) {}
}

const server = require('../src/server')(
  cookieSigningSecret,
  facebookClient,
  googlePlacesClient,
  cache
);

describe("server", () => {
  let port, jar

  before(done => {
    const listener = server.listen(err => {
      port = listener.address().port
      done()
    });
  });

  beforeEach(async () => {
    await database.clear();
    jar = request.jar();
  });

  describe("login", () => {
    describe("when the access token is valid", () => {
      beforeEach(() => {
        facebookClient.getUserInfo = function(accessToken) {
          assert.equal(accessToken, 'the-access-token')
          return {
            email: 'bob@example.com',
            name: 'Bob',
            id: '12345'
          };
        };
      });

      it("sets a cookie", async () => {
        const response = await request.post({
          uri: `http://localhost:${port}/login`,
          jar: jar,
          form: {
            'access-token': 'the-access-token'
          }
        });

        const userId = getLoggedInUser();

        assert.deepEqual(await database.getUserById(userId), {
          id: userId,
          email: 'bob@example.com',
          name: 'Bob',
          facebookId: '12345',
          phone: null
        });

        assert.equal(response.statusCode, 302);
        assert.equal(response.headers.location, '/')
      });

      it("redirects to the given referer URL", async () => {
        const response = await request.post({
          uri: `http://localhost:${port}/login`,
          jar: jar,
          form: {
            'access-token': 'the-access-token',
            'referer': '/businesses/123/reviews/new'
          }
        });

        assert.equal(response.statusCode, 302);
        assert.equal(response.headers.location, '/businesses/123/reviews/new')
      });
    });
  });

  describe("review business", () => {
    it("redirects to the login page if the user isn't logged in", async () => {
      const response = await request({
        uri: `http://localhost:${port}/businesses/567/reviews/new`,
        jar: jar
      });

      assert.equal(response.statusCode, 302);
      assert.equal(response.headers.location, '/login?referer=/businesses/567/reviews/new')
    });

    it("shows the review form if the user is logged in", async () => {
      logIn('123');

      googlePlacesClient.getBusinessById = async function (id) {
        assert.equal(id, '567');
        return {
          name: 'the-business',
          formatted_address: '123 Example St',
          geometry: {}
        }
      }

      const response = await request({
        uri: `http://localhost:${port}/businesses/567/reviews/new`,
        jar: jar
      });

      assert.equal(response.statusCode, 200);
      assert(response.body.includes('the-business'));
    });
  });

  function getLoggedInUser() {
    const cookies = jar.getCookies(`http://localhost:${port}`);
    const cookie = cookies.find(cookie => cookie.key === 'userId');
    return cookieParser.signedCookie(cookie.value, cookieSigningSecret);
  }

  function logIn(userId) {
    const signedUserId = cookieSignature.sign(userId, cookieSigningSecret);
    jar.setCookie(`userId=s:${signedUserId}; path=/;`, `http://localhost:${port}`)
  }
});
