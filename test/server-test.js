require('./test-helper');
const assert = require('assert');
const cookieParser = require('cookie-parser');
const database = require('../src/database');
const request = require('request-promise').defaults({
  simple: false,
  followRedirect: false,
  resolveWithFullResponse: true
});

const facebookClient = {};

const server = require('../src/server')(
  'the-cookie-signing-secret',
  facebookClient
)

describe("server", () => {
  let port

  before(done => {
    const listener = server.listen(err => {
      port = listener.address().port
      done()
    });
  });

  beforeEach(async () => {
    await database.clear();
  })

  describe("login", () => {
    describe("when the access token is valid", () => {
      it("sets a cookie", async () => {
        facebookClient.getUserInfo = function() {
          return {
            email: 'bob@example.com',
            name: 'Bob',
            id: '12345'
          };
        };

        const jar = request.jar();

        const response = await request.post({
          uri: `http://localhost:${port}/login`,
          jar: jar,
          formData: {
            'access-token': 'ok'
          }
        });

        const cookie = jar.getCookies(`http://localhost:${port}`).find(cookie =>
          cookie.key === 'userId'
        )

        const userId = cookieParser.signedCookie(
          cookie.value,
          'the-cookie-signing-secret'
        );

        assert.deepEqual(await database.getUserById(userId), {
          id: userId,
          email: 'bob@example.com',
          name: 'Bob',
          facebookId: '12345',
          phone: null
        });
      });
    });
  });
});
