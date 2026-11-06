/** Human-readable durations for the HUD's elapsed and last-run timers. */
export function humanDuration(ms: number): string {
	if (ms < 60_000) return `${(Math.max(0, ms) / 1000).toFixed(1)}s`;
	const totalSeconds = Math.max(0, Math.round(ms / 1000));

	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	if (minutes < 60) return seconds ? `${minutes}m ${seconds}s` : `${minutes}m`;

	const hours = Math.floor(minutes / 60);
	const remainderMinutes = minutes % 60;
	if (hours < 24) return remainderMinutes ? `${hours}h ${remainderMinutes}m` : `${hours}h`;

	const days = Math.floor(hours / 24);
	const remainderHours = hours % 24;
	if (days < 7) return remainderHours ? `${days}d ${remainderHours}h` : `${days}d`;

	if (days < 30) {
		const weeks = Math.floor(days / 7);
		const remainderDays = days % 7;
		return remainderDays ? `${weeks}w ${remainderDays}d` : `${weeks}w`;
	}

	const months = Math.floor(days / 30);
	const remainderMonthDays = days % 30;
	if (days < 365) return remainderMonthDays ? `${months}mo ${remainderMonthDays}d` : `${months}mo`;

	const years = Math.floor(days / 365);
	const remainderMonths = Math.floor((days % 365) / 30);
	return remainderMonths ? `${years}y ${remainderMonths}mo` : `${years}y`;
}
