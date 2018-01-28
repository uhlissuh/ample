const Memcached = require('memcached');
const memcached = new Memcached('localhost:11211');

exports.get = function(key) {
  return new Promise((resolve, reject) => {
    memcached.get(key, (err, data) => {
      if(err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

exports.set = function(key, value, lifetime) {
  return new Promise((resolve, reject) => {
    memcached.set(key, value, lifetime, (err) => {
      if(err) {
        reject(err);
      } else {
        resolve();
      }
    })
  });
}
