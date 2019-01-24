require('./test-helper');
const assert = require('assert');
const cookieParser = require('cookie-parser');
const cookieSignature = require('cookie-signature');
const database = require('../src/database');
const cheerio = require('cheerio');
const request = require('request-promise').defaults({
  simple: false,
  followRedirect: false,
  resolveWithFullResponse: true
});

const facebookClient = {};
const googleOauthClient = {};
const googlePlacesClient = {};
const cookieSigningSecret = 'the-cookie-signing-secret';
const cache = {
  get() { return null },
  set(key, value) {}
}
const s3Client = {};

const server = require('../src/server')(
  cookieSigningSecret,
  facebookClient,
  googleOauthClient,
  googlePlacesClient,
  cache,
  s3Client,
  {}
);

const GOOGLE_PLACES_SEARCH_RESPONSE = require('./fixtures/google-place-search-response.json');

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
    describe("when the facebook access token is valid", () => {
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
          'access-token': 'the-access-token',
          'login-service': 'facebook'
        })

        const userId = getLoggedInUser();

        assert.deepEqual(await database.getUserById(userId), {
          id: userId,
          email: 'bob@example.com',
          name: 'Bob',
          facebookId: '12345',
          googleId: null,
          isAmplifier: null
        });

        assert.equal(response.statusCode, 302);
        assert.equal(response.headers.location, '/')
      });

      it("redirects to the given referer URL", async () => {
        const response = await post('login', {
          'access-token': 'the-access-token',
          'login-service': 'facebook',
          'referer': '/businesses/123/reviews/new'
        });

        assert.equal(response.statusCode, 302);
        assert.equal(response.headers.location, '/businesses/123/reviews/new')
      });
    });
  });

  describe("search for businesses", () => {
    it("can search based on the user's current location", async () => {
      const businessId1 = await database.createBusiness({
        name: 'Something Shoes',
        googleId: 'businessGoogleId1',
        latitude: 45.50,
        longitude: -122.60
      });
      const businessId2 = await database.createBusiness({
        name: 'Something Soap',
        googleId: 'businessGoogleId2',
        latitude: 47.50,
        longitude: -124.60
      });
      const businessId3 = await database.createBusiness({
        name: 'Out There Biz',
        googleId: 'businessGoogleId3',
        latitude: 47.50,
        longitude: -124.60
      });

      await database.createReview(userId, businessId1, {
        fatRating: 4,
        content: 'good',
        categories: ['Wellness']
      });
      await database.createReview(userId, businessId2, {
        fatRating: 5,
        content: 'amazing',
        categories: ['Wellness']
      });
      await database.createReview(userId, businessId2, {
        fatRating: 5,
        content: 'amazing',
        categories: ['Restaurants']
      });

      const response = await get('searchforbusinesses?location=Current%20Location&term=wellness&page=1', {
        'x-forwarded-for': '71.238.71.20'
      });

      const $ = cheerio.load(response.body);
      const linkURLs = $('.search-results-business-info a').map((index, link) => $(link).attr('href')).get();

      assert.equal(response.statusCode, 200);
      assert(linkURLs.includes(`/businesses/${businessId1}`));
      assert(linkURLs.includes(`/businesses/${businessId2}`));
      assert(!linkURLs.includes(`/businesses/${businessId3}`));

    });
  });

  describe("review business", () => {
    it("redirects to the login page if the user isn't logged in", async () => {
      const response = await get('businesses/567/reviews/new')

      assert.equal(response.statusCode, 302);
      assert.equal(response.headers.location, '/login?referer=/businesses/567/reviews/new')
    });

    it("can add tags to the business", async () => {
      logIn(userId);

      googlePlacesClient.getBusinessById = async function (id) {
        assert.equal(id, 'WX-YZ');
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

      await database.createApprovedTags(['large seating', 'no stairs']);

      const createReviewResponse = await post('businesses/WX-YZ/reviews', {
        'content': 'I like this business.',
        'fat-rating': '5',
        'trans-rating': '3',
        'parent-category': 'Doctors',
        'tags[0]': 'large seating',
        'tags[1]': 'no stairs',
        'tags[2]': 'some new tag'
      });

      let business = await database.getBusinessByGoogleId('WX-YZ');

      assert.equal(createReviewResponse.statusCode, 302);
      assert.equal(createReviewResponse.headers.location, `/businesses/${business.id}`);
      assert.deepEqual(business.tags.sort(), ['large seating', 'no stairs']);

      let getBusinessResponse = await get(createReviewResponse.headers.location);

      let $ = cheerio.load(getBusinessResponse.body);
      assert($('.tag-list-item').text().includes('large seating'));
      assert($('.tag-list-item').text().includes('no stairs'));
      assert(!$('.tag-list-item').text().includes('some new tag'));

      await database.approveTag('some new tag');
      business = await database.getBusinessByGoogleId('WX-YZ');
      assert.deepEqual(business.tags.sort(), ['large seating', 'no stairs', 'some new tag']);

      getBusinessResponse = await get(createReviewResponse.headers.location);
      $ = cheerio.load(getBusinessResponse.body);
      assert($('.tag-list-item').text().includes('some new tag'));
    });
  });

  describe("update review", () => {
    it("updates the review's text and the business's ratings", async () => {
      logIn(userId);

      googlePlacesClient.getBusinessById = async function (id) {
        assert.equal(id, 'WX-YZ');
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

      const createReviewResponse = await post('businesses/WX-YZ/reviews', {
        'content': 'I like this business.',
        'fat-rating': '5',
        'trans-rating': '3',
        'parent-category': 'Doctors'
      });

      const business = await database.getBusinessByGoogleId('WX-YZ');
      const reviews = await database.getBusinessReviewsById(business.id);

      assert.deepEqual(business.categories, ['Doctors']);
      assert.deepEqual(reviews[0].categories, ['Doctors']);
      assert.equal(reviews[0].fatRating, 5);
      assert.equal(reviews[0].transRating, 3);

      const updateReviewResponse = await post(`businesses/${business.id}/reviews/${reviews[0].id}`, {
        'content': 'I like this business. A lot.',
        'body-positivity-rating': '5',
        'lgbtq-inclusivity-rating': '4',
        'parent-category': 'Doctors'
      });

      assert.equal(updateReviewResponse.statusCode, 302);
      assert.equal(updateReviewResponse.headers.location, `/businesses/${business.id}`);

      let getBusinessResponse = await get(`businesses/${business.id}`);
      assert(getBusinessResponse.body.includes('I like this business. A lot.'));

      // Can still view the business if not logged in.
      logOut();
      getBusinessResponse = await get(`businesses/${business.id}`);
      assert(getBusinessResponse.body.includes('I like this business. A lot.'));
    });
  });

  describe("add a photo for a business", () => {
    beforeEach(() => {
      googlePlacesClient.getBusinessById = async function (id) {
        assert.equal(id, 'WX-YZ');
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
    })

    it("shows that photo on the business page afterward", async () => {
      const photoURL1 = `http://localhost:${port}/static/alissa.jpg`
      const photoURL2 = `http://localhost:${port}/static/AB.jpg`

      // Can't add a photo if you're not logged in
      let uploadPhotoResponse = await post('businesses/WX-YZ/photos', {
        'photo-url': photoURL1
      });
      assert.equal(uploadPhotoResponse.statusCode, 302);
      assert.equal(uploadPhotoResponse.headers.location, '/login?referer=/businesses/WX-YZ')

      logIn(userId);

      // Add a photo for a business that does not yet exist in the database
      uploadPhotoResponse = await post('businesses/WX-YZ/photos', {
        'photo-url': photoURL1
      });
      const business = await database.getBusinessByGoogleId('WX-YZ')
      assert.equal(uploadPhotoResponse.statusCode, 302);
      assert.equal(uploadPhotoResponse.headers.location, `/businesses/${business.id}`)
      assert.deepEqual(await database.getBusinessPhotosById(business.id), [
        {userId, url: photoURL1, width: 250, height: 250},
      ]);

      // Add another photo; this time the business *does* exist in the database
      uploadPhotoResponse = await post(`businesses/${business.id}/photos`, {
        'photo-url': photoURL2
      });
      assert.equal(uploadPhotoResponse.statusCode, 302);
      assert.equal(uploadPhotoResponse.headers.location, `/businesses/${business.id}`)
      assert.deepEqual(await database.getBusinessPhotosById(business.id), [
        {userId, url: photoURL1, width: 250, height: 250},
        {userId, url: photoURL2, width: 250, height: 250},
      ])
    });

    it("only allows JPG and PNG files", async () => {
      logIn(userId);

      // Can't upload a non-image file
      let uploadPhotoResponse = await post('businesses/WX-YZ/photos', {
        'photo-url': `http://localhost:${port}/static/bundle.js`
      });
      assert.equal(uploadPhotoResponse.statusCode, 422);
      assert.equal(uploadPhotoResponse.body, 'Business photos need to be JPEG or PNG files')

      // Can't upload an SVG
      uploadPhotoResponse = await post('businesses/WX-YZ/photos', {
        'photo-url': `http://localhost:${port}/static/snowflake.svg`
      });
      assert.equal(uploadPhotoResponse.statusCode, 422);
      assert.equal(uploadPhotoResponse.body, 'Business photos need to be JPEG or PNG files')
    })
  });

  function get(url, headers) {
    if (url.startsWith('/')) url = url.slice(1)
    return request({
      uri: `http://localhost:${port}/${url}`,
      jar: jar,
      headers
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
