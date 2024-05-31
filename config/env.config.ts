import { log } from "@acdh-oeaw/lib";
import * as v from "valibot";

const schema = v.object({
	WORDPRESS_BASE_URL: v.pipe(v.string(), v.url()),
});

const result = v.safeParse(schema, process.env);

if (!result.success) {
	const message = "Invalid environment variables.";
	const errors = v.flatten(result.issues).nested;
	log.error(message, errors);
	throw new Error(message);
}

export const env = result.output;
