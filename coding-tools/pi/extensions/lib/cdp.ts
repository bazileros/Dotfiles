/** Locate the Ghostex CEF DevTools endpoint that Playwright can attach to. */

export interface CdpTarget {
	url: string;
	port: number;
	browser: string;
}

export const CEF_PORTS = Array.from({ length: 11 }, (_, index) => 9333 + index);

export function candidatePorts(): number[] {
	const configured = Number(process.env.GHOSTEX_CEF_REMOTE_DEBUGGING_PORT);
	const ports = [Number.isInteger(configured) && configured > 0 ? configured : undefined, ...CEF_PORTS].filter(
		(port): port is number => port !== undefined,
	);
	return [...new Set(ports)];
}

export async function findCdp(ports: number[] = candidatePorts()): Promise<CdpTarget | undefined> {
	for (const port of ports) {
		try {
			const response = await fetch(`http://127.0.0.1:${port}/json/version`, {
				signal: AbortSignal.timeout(800),
			});
			if (!response.ok) continue;
			const data = (await response.json()) as { Browser?: string };
			return { url: `http://127.0.0.1:${port}`, port, browser: data.Browser ?? "CEF" };
		} catch {
			// not this port
		}
	}
	return undefined;
}
