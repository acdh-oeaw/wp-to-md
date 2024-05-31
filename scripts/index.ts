import { log } from "@acdh-oeaw/lib";

import { fix } from "./fix.js";
import { getWordPressData } from "./get-wordpress-data.js";
import { type Report, transform } from "./transform.js";

async function run() {
	const data = await getWordPressData();

	const pages = await transform(Object.values(data.pages), data);
	const posts = await transform(Object.values(data.posts), data);

	const transformed: Report = new Map([...pages, ...posts]);
	await fix(transformed);
}

run()
	.then(() => {
		log.success("Successfully processed website data.");
	})
	.catch((error) => {
		log.error("Failed to process website data.\n", String(error));
	});
