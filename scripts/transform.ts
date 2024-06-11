import { createWriteStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { pipeline } from "node:stream/promises";

import {
	assert,
	createUrl,
	isNonEmptyArray,
	isNonEmptyString,
	isNonNullable,
	isoDate,
	log,
} from "@acdh-oeaw/lib";
import type { Root } from "hast";
import rehypeParse from "rehype-parse";
import rehypeRemark from "rehype-remark";
import remarkGfm from "remark-gfm";
import remarkMdx from "remark-mdx";
import remarkStringify from "remark-stringify";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import type { WP_REST_API_Page } from "wp-types";
import * as YAML from "yaml";

import { config } from "../config/transform.config.js";
import type { WordPressData } from "./get-wordpress-data.js";
import { withSlashes } from "./lib.js";

export type Report = Map<WP_REST_API_Page["slug"], { filePath: string; slug: string }>;

export async function transform(
	items: Array<WP_REST_API_Page>,
	data: WordPressData,
): Promise<Report> {
	const wordPressUploadsUrl = String(
		createUrl({ baseUrl: config.wordPressBaseUrl, pathname: config.wordPressUploadsPathname }),
	);

	const done: Report = new Map();

	for (const item of items) {
		if (item.status !== "publish") continue;

		const segments = getPathSegments(item, data);

		const contentFolder = join(config.contentBaseFolder, ...segments);
		const assetFolder = join(config.assetBaseFolder, ...segments, item.slug);

		await mkdir(contentFolder, { recursive: true });
		await mkdir(assetFolder, { recursive: true });

		const publicAssetFolder = assetFolder.slice(join(process.cwd(), "public").length);

		const processor = createProcessor(wordPressUploadsUrl, assetFolder, publicAssetFolder);

		const featuredImage = isNonNullable(item.featured_media)
			? data.media[item.featured_media]
			: undefined;

		const frontmatter = YAML.stringify({
			title: plaintext(item.title.rendered),
			date: date(item.date),
			summary: await mdx(item.excerpt.rendered, processor),
			image: isNonNullable(featuredImage)
				? await attachment(featuredImage.source_url, assetFolder, publicAssetFolder)
				: undefined,
		});

		const body = await mdx(item.content.rendered, processor);

		const content = `---\n${frontmatter}\n---\n${body}`;

		const filePath = join(contentFolder, item.slug + ".mdx");

		await writeFile(filePath, content, { encoding: "utf-8" });

		done.set(withSlashes(item.slug), {
			filePath,
			/** Assumes content will be served by collection name. */
			slug: withSlashes(join(...segments, item.slug)),
		});
	}

	return done;
}

function getPathSegments(item: WP_REST_API_Page, data: WordPressData): Array<string> {
	const categories = item.categories;

	if (!isNonEmptyArray(categories)) return ["none"];

	if (categories.length > 1) {
		log.warn(`Multiple categories found in ${item.slug}.`);
	}

	const categoryId = categories.at(0)!;

	const category = data.categories[categoryId]?.slug;

	assert(category, `Unknown category id ${categoryId}.`);

	const segments = config.paths[category] ?? ["unknown"];

	return segments;
}

function sanitize(value: string): string {
	return (
		value
			.replace(/&nbsp;/g, " ")
			// eslint-disable-next-line no-irregular-whitespace
			.replace(/[​ ]/g, " ")
			.replace(/[‚‘’]/g, "'")
			.replace(/[„“”]/g, '"')
	);
}

function plaintext(value: string) {
	return sanitize(value);
}

function date(value: string) {
	return isoDate(new Date(value));
}

async function mdx(value: string, processor: ReturnType<typeof createProcessor>) {
	return String(await processor.process(sanitize(value)));
}

async function attachment(url: string, assetFolder: string, publicAssetFolder: string) {
	const fileName = "image" + extname(url);

	await pipeline(
		// @ts-expect-error It's fine.
		(await fetch(url)).body,
		createWriteStream(join(assetFolder, fileName)),
	);

	return join(publicAssetFolder, fileName);
}

function createProcessor(
	wordPressUploadsUrl: string,
	assetFolder: string,
	publicAssetFolder: string,
) {
	const processor = unified()
		.use(rehypeParse)
		.use(transformAttachmentsPlugin, wordPressUploadsUrl, assetFolder, publicAssetFolder)
		.use(rehypeRemark)
		.use(remarkGfm)
		.use(remarkMdx)
		.use(remarkStringify);

	return processor;
}

function transformAttachmentsPlugin(
	wordPressUploadsUrl: string,
	assetFolder: string,
	publicAssetFolder: string,
) {
	return async function transformer(tree: Root) {
		const assets: Array<{ input: string; output: string }> = [];

		visit(tree, "element", (node) => {
			switch (node.tagName) {
				case "a": {
					const { href } = node.properties;

					if (!isNonEmptyString(href)) break;
					if (!href.startsWith(wordPressUploadsUrl)) break;

					const fileName = href.split("/").at(-1)?.toLowerCase();
					assert(fileName, `Invalid asset filename for ${href}.`);

					node.properties["href"] = join(publicAssetFolder, fileName);

					assets.push({
						input: href,
						output: join(assetFolder, fileName),
					});

					break;
				}

				case "img": {
					const { src } = node.properties;

					if (!isNonEmptyString(src)) break;
					if (!src.startsWith(wordPressUploadsUrl)) break;

					const fileName = src.split("/").at(-1)?.toLowerCase();
					assert(fileName, `Invalid asset filename for ${src}.`);

					node.properties["src"] = join(publicAssetFolder, fileName);

					assets.push({
						input: src,
						output: join(assetFolder, fileName),
					});

					break;
				}
			}
		});

		for (const asset of assets) {
			await pipeline(
				// @ts-expect-error It's fine.
				(await fetch(asset.input)).body,
				createWriteStream(asset.output),
			);
		}
	};
}
