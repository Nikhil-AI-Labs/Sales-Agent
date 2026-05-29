export type RuntimeConfig = {
  chakraApiKey: string;
  chakraPluginId: string;
  chakraWabaId: string;
  chakraPhoneId: string;
  chakraApiVersion: string;
  sarvamApiKey: string;
  sarvamModel: string;
  productionTeamPhone: string;
  webhookSecret: string;
};

export function getConfig(): RuntimeConfig {
  return {
    chakraApiKey: process.env.CHAKRA_API_KEY ?? "",
    chakraPluginId: process.env.CHAKRA_PLUGIN_ID ?? "",
    chakraWabaId: process.env.CHAKRA_WABA_ID ?? "",
    chakraPhoneId: process.env.CHAKRA_PHONE_ID ?? "",
    chakraApiVersion: process.env.CHAKRA_API_VERSION ?? "v22.0",
    sarvamApiKey: process.env.SARVAM_API_KEY ?? "",
    sarvamModel: process.env.SARVAM_MODEL ?? "sarvam-105b",
    productionTeamPhone: process.env.PRODUCTION_TEAM_PHONE ?? "",
    webhookSecret: process.env.CHAKRA_WEBHOOK_SECRET ?? "",
  };
}

export function getConfigStatus() {
  const config = getConfig();
  return {
    chakraConfigured: Boolean(config.chakraApiKey && config.chakraPluginId && config.chakraPhoneId),
    sarvamConfigured: Boolean(config.sarvamApiKey),
    ownerPhoneConfigured: Boolean(config.productionTeamPhone),
    webhookSecretConfigured: Boolean(config.webhookSecret),
    chakraApiVersion: config.chakraApiVersion,
    sarvamModel: config.sarvamModel,
  };
}
