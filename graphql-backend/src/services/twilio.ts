import axios from 'axios'
import { GraphQLError } from 'graphql';
import { LogManager, isAxiosError } from '../utils/functions';
import { vault } from './vault';

const service_prefix = "https://lookups.twilio.com/v1"

export class TwilioDataSource {
    private auth : {username: string, password:string} | null;
    private logger: LogManager;
    private vault: vault;
    private apiPrefix: string;

    constructor(log: LogManager, keyVault: vault) {
        this.logger = log;
        this.vault = keyVault;
    }

    async init() {
        this.auth = await this.getAuth();
    }
    
    async getAuth() {
        var sid = await this.vault.get("twilio-sid")
        var token = await this.vault.get("twilio-token")
        this.apiPrefix = `https://api.twilio.com/2010-04-01/Accounts/${sid}`
        if (!(sid != undefined && token != undefined)) {
            throw "Twilio :: Cannot get twilio sid and token"
        }
        // Removed verbose "Successfully retrieve auth" log - only log errors
        return {
            username: sid,
            password: token
        };
    }

    async validatePhoneNumber(phoneNumber: string) {
        if (this.auth == null) throw "Twilio :: auth needs to be initialised before calling";
        try {
            const auth = await this.auth;
    
            var resp = await axios.get(
                `${service_prefix}/PhoneNumbers/${phoneNumber}"`, { auth }
            )
        } catch (error: unknown) {
            if (isAxiosError(error) && error.response != null) {
                if(error.response.status == 404) throw new GraphQLError(`Could not find phone number ${phoneNumber}.`)
                else if(error.response.status == 401) throw new GraphQLError(`Couldn't authenticate against twilio.`)
                else throw new GraphQLError(`Unknown twilio error: ${error.message}`)
            } else {
              throw new GraphQLError(`Non axios / twilio error`, {
                extensions: { code: 'BAD_REQUEST'},
              });
            }
        }
    
        return resp.status == 200
    }

    async sendSMS(to: string, body: string) {

        if (this.auth == null) throw "Twilio :: auth needs to be initialised before calling";
        try {
            const auth = await this.auth;
    
            var resp = await axios.post(
                `${this.apiPrefix}/Messages.json`, 
                { To: to, Body: body, From: "+12058900004" }, 
                { auth }
            )

        } catch (error: unknown) {
            if (isAxiosError(error) && error.response != null) {
                if(error.response.status == 404) throw new GraphQLError(`Could not find phone number ${to}.`)
                else if(error.response.status == 401) throw new GraphQLError(`Couldn't authenticate against twilio.`)
                else throw new GraphQLError(`Unknown twilio error: ${error.message}`)
            } else {
              throw new GraphQLError(`Non axios / twilio error`, {
                extensions: { code: 'BAD_REQUEST'},
              });
            }
        }
    
        return resp.status == 200
    }

    
}