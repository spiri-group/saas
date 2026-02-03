import qs from "qs";

const azure_environment = () => {
  try {
    const envInformation = process.env.EnvInformation || ""; // Provide a default value
    const envDetails = qs.parse(envInformation);
    return {
      app_name_short: envDetails.appNameShort,
      env_name: envDetails.name,
      env_index: envDetails.index
    };
  } catch (err) {
    throw `Error occurred whilst trying to get token for Azure: ${JSON.stringify(err)}`;
  }
};

export default azure_environment;