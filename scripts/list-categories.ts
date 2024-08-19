import { log } from "@acdh-oeaw/lib";

import { config as defaultConfig } from "../config/transform.config.js";
import { getCategories } from "./get-wordpress-data.js";

async function run() {
	const config = defaultConfig;

	const data = await getCategories(config);

	return data.map((d) => {
		return { [d.slug]: { id: d.id, name: d.name } };
	});
}

run()
	.then((categories) => {
		log.success("Successfully retrieved wordpress categories.\n", categories);
	})
	.catch((error) => {
		log.error("Failed to retrieve wordpress categories.\n", String(error));
	});
