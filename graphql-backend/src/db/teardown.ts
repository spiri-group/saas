// import { readdirSync } from "fs"
// import { resolve } from "path";
// import { CosmosDataSource } from "../../utils/database";

// const removeSeedData = async () => {
//     var cms = new CosmosDataSource("https://localhost");
//     const dir = "./graphql/db/defaults"
//     const files = readdirSync(resolve(dir));
//     for (var file in files) {
//         const fn = files[file]
//         const filename = fn.replace(".json", "")
//         const container_name = filename[0].toUpperCase() + filename.substring(1);
//         const defaultData = require(resolve(`${dir}/${fn}`))
//         defaultData.items.forEach(async (data: any) => {
//             await cms.purge_record(container_name, data["id"], data[defaultData.partitionColumn])
//         })
//     }
// }

const teardown = async () => {
    //await removeSeedData();
}

export default teardown 