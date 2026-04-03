//=======================================================//

import chalk from 'chalk';

console.log(chalk.whiteBright("\n• Baileys Mod by Skyzopedia"));
console.log(chalk.cyan("• Telegram: ") + chalk.greenBright("https://t.me/Xskycode"));
console.log(chalk.gray("------------------------------\n"));

import makeWASocket from "./Socket/index.js";
//=======================================================//
export * from "./Defaults/index.js";
export * from "./WABinary/index.js";
export * from "../WAProto/index.js";
export * from "./WAUSync/index.js";
export * from "./Store/index.js";
export * from "./Utils/index.js";
export * from "./Types/index.js";
export * from "./WAM/index.js";
//=======================================================//
export { makeWASocket };
export default makeWASocket;
//=======================================================//