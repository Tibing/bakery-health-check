const prodEnv = {
  env: 'prod',
  uiBuilderDevID: 'CE4FS5BV2',
};

const devEnv = {
  env: 'dev',
  uiBuilderDevID: 'G01J9KEAU1K',
};

const localEnv = {
  env: 'local',
  uiBuilderDevID: null,
};

function getConfig() {
  const env = process.env.ENVIRONMENT;

  if (env === 'prod') {
    return prodEnv;
  }

  if (env === 'dev') {
    return devEnv;
  }

  if (env === 'local') {
    return localEnv;
  }

  throw new Error(`No env specified. Please, choose one: prod, dev or local`);
}

exports.config = getConfig();
