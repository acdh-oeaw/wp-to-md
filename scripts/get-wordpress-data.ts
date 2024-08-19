import { createUrl, createUrlSearchParams, keyBy } from "@acdh-oeaw/lib";
import type {
	WP_REST_API_Attachment,
	WP_REST_API_Attachments,
	WP_REST_API_Categories,
	WP_REST_API_Category,
	WP_REST_API_Page,
	WP_REST_API_Pages,
	WP_REST_API_Post,
	WP_REST_API_Posts,
} from "wp-types";

import type { Config } from "../config/transform.config";

export interface WordPressData {
	pages: Record<WP_REST_API_Page["id"], WP_REST_API_Page>;
	posts: Record<WP_REST_API_Post["id"], WP_REST_API_Post>;
	media: Record<WP_REST_API_Attachment["id"], WP_REST_API_Attachment>;
	categories: Record<WP_REST_API_Category["id"], WP_REST_API_Category>;
}

export async function getWordPressData(config: Config): Promise<WordPressData> {
	const [pages, posts, media, categories] = await Promise.all([
		getPages(config),
		getPosts(config),
		getMedia(config),
		getCategories(config),
	]);

	const data = {
		pages: keyById(pages),
		posts: keyById(posts),
		media: keyById(media),
		categories: keyById(categories),
	};

	return data;
}

async function getAll<T>(url: URL): Promise<Array<T>> {
	const results: Array<T> = [];

	const response = await fetch(url);
	results.push(...((await response.json()) as Array<T>));

	let page = 1;
	const pages = Number(response.headers.get("X-WP-TotalPages") ?? 1);

	while (++page <= pages) {
		url.searchParams.set("page", String(page));
		const response = await fetch(url);
		results.push(...((await response.json()) as Array<T>));
	}

	return results;
}

export function getPages(config: Config): Promise<WP_REST_API_Pages> {
	const url = createUrl({
		baseUrl: config.wordPressBaseUrl,
		pathname: "/wp-json/wp/v2/pages",
		searchParams: createUrlSearchParams({ per_page: 100, _embed: "author" }),
	});

	return getAll(url);
}

export function getPosts(config: Config): Promise<WP_REST_API_Posts> {
	const url = createUrl({
		baseUrl: config.wordPressBaseUrl,
		pathname: "/wp-json/wp/v2/posts",
		searchParams: createUrlSearchParams({ per_page: 100, _embed: "author" }),
	});

	return getAll(url);
}

export function getMedia(config: Config): Promise<WP_REST_API_Attachments> {
	const url = createUrl({
		baseUrl: config.wordPressBaseUrl,
		pathname: "/wp-json/wp/v2/media",
		searchParams: createUrlSearchParams({ per_page: 100 }),
	});

	return getAll(url);
}

export function getCategories(config: Config): Promise<WP_REST_API_Categories> {
	const url = createUrl({
		baseUrl: config.wordPressBaseUrl,
		pathname: "/wp-json/wp/v2/categories",
		searchParams: createUrlSearchParams({ per_page: 100 }),
	});

	return getAll(url);
}

function keyById<T extends { id: number }>(data: Array<T>) {
	return keyBy(data, (d) => {
		return d.id;
	});
}
