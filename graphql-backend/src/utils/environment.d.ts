export {};

declare global {
  namespace NodeJS {
    interface ProcessEnv {
        COSMOS_CONNECTION_STRING: string
        twilioAccountSID: string,
        twilioAccountAuthToken: string,
        StripeToken: string
    }
  }
}