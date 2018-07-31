// From https://devcenter.heroku.com/articles/s3-upload-node#setting-up-the-client-side-code

module.exports = function(fileInput, imageURLHiddenInput, previewImage) {
  fileInput.onchange = () => {
    const files = fileInput.files;
    const file = files[0];
    if (file == null) {
      alert('No file selected.');
      return;
    }
    getSignedRequest(file);
  };

  function getSignedRequest(file) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', `/sign-s3?file-name=${file.name}&file-type=${file.type}`);
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          uploadFile(file, response.uploadURL, response.downloadURL);
        } else {
          alert('Error - ' + xhr.responseText);
        }
      }
    };
    xhr.send();
  }

  function uploadFile(file, uploadURL, downloadURL) {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadURL);
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          previewImage.src = downloadURL;
          imageURLHiddenInput.value = downloadURL;
        } else {
          alert('Could not upload file.');
        }
      }
    };
    xhr.send(file);
  }
}
