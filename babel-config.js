module.exports = function(api) {
  api.cache(true);
  
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      '@babel/plugin-transform-class-static-block', // Added plugin for static class blocks
      // Other plugins can be added here
    ]
  };
};
