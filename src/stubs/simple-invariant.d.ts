declare module 'simple-invariant' {
	export default function invariant(
		condition: unknown,
		message: unknown,
	): asserts condition;
}
