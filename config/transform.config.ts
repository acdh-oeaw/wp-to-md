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
	"events-en": ["en", "events"],
	"events-de": ["de", "events"],

	event_archive: ["en", "events"],
	veranstaltung_archiv: ["de", "events"],

	consortium: ["en", "pages"],
	konsortium: ["de", "pages"],

	"news-en": ["en", "news"],
	"news-de": ["de", "news"],

	hp_news: ["en", "pages"],
	hp_aktuell: ["de", "pages"],

	projects: ["en", "projects"],
	projekte: ["de", "projects"],

	funding: ["en", "pages"],
	foerderungen: ["de", "pages"],

	about: ["en", "pages"],
	allgemein: ["de", "pages"],

	uncategorized: ["en", "pages"],
	"uncategorized-de": ["de", "pages"],
};

export const config = {
	assetBaseFolder,
	contentBaseFolder,
	wordPressBaseUrl,
	wordPressUploadsPathname,
	paths,
};
