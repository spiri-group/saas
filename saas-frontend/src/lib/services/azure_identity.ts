import "server-only";

import { DefaultAzureCredential } from "@azure/identity";
import qs from "qs";

const azure_identity = () => {
  try {
    const credential = new DefaultAzureCredential();
    const envInformation = process.env.EnvInformation || ""; // Provide a default value
    const envDetails = qs.parse(envInformation);
    return {
      credential,
      app_name_short: envDetails.appNameShort,
      env_name: envDetails.name,
      env_index: envDetails.index
    };
  } catch (err) {
    throw `Error occurred whilst trying to get token for Azure: ${JSON.stringify(err)}`;
  }
};

export default azure_identity;