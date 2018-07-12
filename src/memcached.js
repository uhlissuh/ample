const memjs = require('memjs');

module.exports =
class Memcached {
  constructor(urls, username, password) {
    this.client = memjs.Client.create(urls, {username, password});
  }

  get(key) {
    return new Promise((resolve, reject) => {
      this.client.get(key, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(JSON.parse(data));
        }
      });
    });
  }

  set(key, value, lifetime) {
    return new Promise((resolve, reject) => {
      this.client.set(key, JSON.stringify(value), {expires: lifetime}, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      })
    });
  }
};
