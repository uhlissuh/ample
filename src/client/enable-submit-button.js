module.exports =
function(form, callback) {
  form.addEventListener('change', handleChange);
  form.addEventListener('keyup', handleChange);

  const inputs = form.querySelectorAll('input, textarea, select');
  const submitButton = form.querySelector('[type="submit"]');

  handleChange();

  function handleChange() {
    const parameters = {};

    for (const input of inputs) {
      if (!input.name) continue;
      if (input.type === 'radio' && !input.checked) continue;
      parameters[input.name] = input.value;
    }

    if (callback(parameters)) {
      submitButton.disabled = false;
    } else {
      submitButton.disabled = 'disabled';
    }
  }
};
