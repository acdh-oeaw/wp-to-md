import { log } from "@acdh-oeaw/lib";

import { config as defaultConfig } from "../config/transform.config.js";
import { fix } from "./fix.js";
import { getWordPressData } from "./get-wordpress-data.js";
import { type Report, transform } from "./transform.js";

async function run() {
	const config = defaultConfig;

	const data = await getWordPressData(config);

	const pages = await transform(config, Object.values(data.pages), data);
	const posts = await transform(config, Object.values(data.posts), data);

	const transformed: Report = new Map([...pages, ...posts]);
	await fix(config, transformed);
}

run()
	.then(() => {
		log.success("Successfully processed website data.");
	})
	.catch((error) => {
		log.error("Failed to process website data.\n", String(error));
	});
