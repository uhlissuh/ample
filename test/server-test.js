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
  let port, jar, userId

  before(done => {
    const listener = server.listen(err => {
      port = listener.address().port
      done()
    });
  });

  beforeEach(async () => {
    await database.clear();
    jar = request.jar();

    userId = await database.createUser({
      name: 'Mike Dupont',
      facebookId: 'mike-id',
      email: 'mike@example.com'
    })
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
        const response = await post('login', {
          'access-token': 'the-access-token'
        })

        const userId = getLoggedInUser();

        assert.deepEqual(await database.getUserById(userId), {
          id: userId,
          email: 'bob@example.com',
          name: 'Bob',
          facebookId: '12345',
        });

        assert.equal(response.statusCode, 302);
        assert.equal(response.headers.location, '/')
      });

      it("redirects to the given referer URL", async () => {
        const response = await post('login', {
          'access-token': 'the-access-token',
          'referer': '/businesses/123/reviews/new'
        });

        assert.equal(response.statusCode, 302);
        assert.equal(response.headers.location, '/businesses/123/reviews/new')
      });
    });
  });

  describe("review business", () => {
    it("redirects to the login page if the user isn't logged in", async () => {
      const response = await get('businesses/567/reviews/new')

      assert.equal(response.statusCode, 302);
      assert.equal(response.headers.location, '/login?referer=/businesses/567/reviews/new')
    });

    it("shows the review form if the user is logged in", async () => {
      logIn(userId);

      googlePlacesClient.getBusinessById = async function (id) {
        assert.equal(id, '567');
        return {
          name: 'the-business',
          formatted_address: '123 Example St',
          geometry: {}
        }
      }

      const response = await get('businesses/567/reviews/new');

      assert.equal(response.statusCode, 200);
      assert(response.body.includes('the-business'));
    });
  });

  describe("update review", () => {
    it("updates the review's text and the business's ratings", async () => {
      logIn(userId);

      googlePlacesClient.getBusinessById = async function (id) {
        assert.equal(id, '567');
        return {
          name: 'the-business',
          formatted_address: '123 Example St',
          geometry: {
            location: {
              lat: 42,
              lng: -122
            }
          }
        }
      };

      const createReviewResponse = await post('businesses/567/reviews', {
        'content': 'I like this business.',
        'body-positivity-rating': '5',
        'lgbtq-inclusivity-rating': '3',
        'parent-category': 'Doctors'
      });

      assert.equal(createReviewResponse.statusCode, 302);
      assert.equal(createReviewResponse.headers.location, '/businesses/567');

      const business = await database.getBusinessByGoogleId('567');
      const reviews = await database.getBusinessReviewsById(business.id)
      const updateReviewResponse = await post(`businesses/567/reviews/${reviews[0].id}`, {
        'content': 'I like this business. A lot.',
        'body-positivity-rating': '5',
        'lgbtq-inclusivity-rating': '4',
        'parent-category': 'Doctors'
      });

      assert.equal(updateReviewResponse.statusCode, 302);
      assert.equal(updateReviewResponse.headers.location, '/businesses/567');

      let getBusinessResponse = await get('businesses/567');
      assert(getBusinessResponse.body.includes('I like this business. A lot.'));

      // Can still view the business if not logged in.
      logOut();
      getBusinessResponse = await get('businesses/567');
      assert(getBusinessResponse.body.includes('I like this business. A lot.'));
    });
  });

  function get(url) {
    return request({
      uri: `http://localhost:${port}/${url}`,
      jar: jar,
    });
  }

  function post(url, formData) {
    return request.post({
      uri: `http://localhost:${port}/${url}`,
      jar: jar,
      form: formData
    });
  }

  function getLoggedInUser() {
    const cookies = jar.getCookies(`http://localhost:${port}`);
    const cookie = cookies.find(cookie => cookie.key === 'userId');
    return cookieParser.signedCookie(cookie.value, cookieSigningSecret);
  }

  function logIn(userId) {
    const signedUserId = cookieSignature.sign(String(userId), cookieSigningSecret);
    jar.setCookie(`userId=s:${signedUserId}; path=/;`, `http://localhost:${port}`)
  }

  function logOut() {
    jar.setCookie(`userId=; path=/;`, `http://localhost:${port}`)
  }
});
