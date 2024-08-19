import { join } from "node:path";

import { env } from "../config/env.config.js";

const assetBaseFolder = join(process.cwd(), "public", "assets", "content");
const contentBaseFolder = join(process.cwd(), "content");

const wordPressBaseUrl = env.WORDPRESS_BASE_URL;
const wordPressUploadsPathname = "wp-content/uploads/";

/**
 * Map wordpress category slug to content and asset path segments.
 */
const paths: Record<string, Array<string>> = {
	events: ["events"],
	news: ["news"],
};

export const config = {
	assetBaseFolder,
	contentBaseFolder,
	wordPressBaseUrl,
	wordPressUploadsPathname,
	paths,
};

export type Config = typeof config;
