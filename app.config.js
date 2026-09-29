// Extends app.json. WEB_BASE_URL serves the web build from a sub-path,
// e.g. WEB_BASE_URL=/KmCalc for https://<user>.github.io/KmCalc/ (set in the GitHub Pages workflow).
module.exports = ({ config }) => {
  const baseUrl = process.env.WEB_BASE_URL;
  if (!baseUrl) return config;
  return { ...config, experiments: { ...config.experiments, baseUrl } };
};
