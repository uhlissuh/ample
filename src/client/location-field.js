require('../css/location-field.css');

module.exports =
function(input) {
  input.addEventListener('blur', handleBlur);
  handleBlur();

  function handleBlur() {
    if (input.value === '') input.value = 'Current Location';
    if (input.value === 'Current Location') {
      input.classList.add('input-current-location');
    } else {
      input.classList.remove('input-current-location');
    }
  }
};
