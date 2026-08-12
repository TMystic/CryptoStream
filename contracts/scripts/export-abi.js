const fs = require("fs");
const path = require("path");

const artifact = require("../artifacts/contracts/StreamingService.sol/StreamingService.json");
const destination = path.resolve(__dirname, "../../client/src/contracts/StreamingService.json");
fs.writeFileSync(destination, `${JSON.stringify(artifact.abi, null, 2)}\n`);
console.log(`Exported ABI to ${destination}`);
