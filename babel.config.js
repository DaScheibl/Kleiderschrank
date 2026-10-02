module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Drizzle-Migrationen werden als .sql-Dateien ins Bundle eingebettet.
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
