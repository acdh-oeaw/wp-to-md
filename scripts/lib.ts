export function withSlashes(value: string): string {
	let pathname = value;

	if (!pathname.startsWith("/")) {
		pathname = "/" + pathname;
	}

	if (!pathname.endsWith("/")) {
		pathname = pathname + "/";
	}

	return pathname;
}
