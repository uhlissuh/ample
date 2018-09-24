// Based on https://devcenter.heroku.com/articles/s3-upload-node#setting-up-the-app-side-node-code

const aws = require('aws-sdk');

module.exports =
class S3Client {
  constructor (bucketName) {
    this.bucketName = bucketName;
  }

  getSignedURL (fileName, fileType) {
    const s3 = new aws.S3();

    const s3Params = {
      Bucket: this.bucketName,
      Key: fileName,
      Expires: 60,
      ContentType: fileType,
      ACL: 'public-read'
    };

    return new Promise((resolve, reject) => {
      s3.getSignedUrl('putObject', s3Params, (error, uploadURL) => {
        if (error) {
          reject(error)
        } else {
          resolve({
            uploadURL,
            downloadURL: `https://${this.bucketName}.s3.amazonaws.com/${fileName}`
          })
        }
      });
    });
  }
};
