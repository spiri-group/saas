import { readdirSync } from "fs"
import { resolve } from "path";
import { CosmosDataSource } from "../utils/database";
import { LogManager } from "../utils/functions";
import { vault } from "../services/vault";
import NodeCache from "node-cache";

const myCache = new NodeCache();

const seedData = async () => {
    var host = "https://localhost"
    var log = new LogManager()
    var keyVault = new vault(host, log, myCache)
    var cms = new CosmosDataSource(new LogManager(), keyVault)
    cms.init(host);
    
    const dir = "./graphql/db/defaults"
    const files = readdirSync(resolve(dir));
    for (var file in files) {
        const fn = files[file]
        const filename = fn.replace(".json", "")
        const container_name = filename[0].toUpperCase() + filename.substring(1);
        const defaultData = require(resolve(`${dir}/${fn}`))
        defaultData.items.forEach(async (data: any) => {
            var dataExists = await cms.record_exists(container_name, data.id, data[defaultData.partitionColumn])
            if (!dataExists) {
                await cms.add_record(container_name, data, data[defaultData.partitionColumn], "SYSTEM")
            }
        })
    }
}

const setup = async () => {
    await seedData();
}

export default setup 