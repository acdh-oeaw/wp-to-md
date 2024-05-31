import { readFile, writeFile } from "node:fs/promises";

import { isNonEmptyString, log } from "@acdh-oeaw/lib";
import type { Root } from "mdast";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMdx from "remark-mdx";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import { unified } from "unified";
import { visit } from "unist-util-visit";

import { config } from "../config/transform.config.js";
import { withSlashes } from "./lib.js";
import type { Report } from "./transform.js";

/**
 * Fix internal links.
 */
export async function fix(items: Report): Promise<Map<string, string>> {
	const fixes = new Map<string, string>();

	const processor = createProcessor(items, fixes);

	for (const [_id, item] of items) {
		const content = await readFile(item.filePath, { encoding: "utf-8" });
		const fixed = String(await processor.process(content));
		await writeFile(item.filePath, fixed, { encoding: "utf-8" });
	}

	return fixes;
}

function createProcessor(items: Report, fixes: Map<string, string>) {
	const processor = unified()
		.use(remarkParse)
		.use(remarkFrontmatter)
		.use(remarkGfm)
		.use(remarkMdx)
		.use(transformLinksPlugin, items, config.wordPressBaseUrl, fixes)
		.use(remarkStringify);

	return processor;
}

function transformLinksPlugin(items: Report, wordPressBaseUrl: string, fixes: Map<string, string>) {
	return function transformer(tree: Root) {
		visit(tree, "link", (node) => {
			const href = node.url;

			if (!isNonEmptyString(href)) return;
			if (!href.startsWith(wordPressBaseUrl)) return;

			const pathname = withSlashes(href.slice(wordPressBaseUrl.length));

			const item = items.get(pathname);

			let url = item?.slug;

			if (url == null) {
				url = pathname;

				if (!fixes.has(url)) {
					log.warn(`No item found for ${href}.`);
				}
			}

			fixes.set(node.url, url);
			node.url = url;
		});
	};
}
