exports.snakeCase = function(string) {
  return string.replace(/([a-z])([A-Z])/g, match =>
    match[0] + '_' + match[1].toLowerCase()
  );
};
