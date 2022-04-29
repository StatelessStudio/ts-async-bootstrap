export type BootstrapFunction = () => Promise<void | number>;
export type ErrorHandlerFunction = (e: Error) => void | Promise<void>;

/**
 * Options for bootstrapping
 */
export interface BootstrapOptions {
	// (Optional) Register function runs before entrypoint, and is useful
	//	for setting up services etc
	register?: BootstrapFunction;

	// Entrypoint
	run: BootstrapFunction;

	// Callback to run on successs
	onComplete?: () => void;

	// Callback to run after main returns or throws exception
	onFinally?: () => void;

	// Should exit after unhandled exception?
	shouldExitOnError?: boolean;

	// (Optional) Error handling function for uncaught errors
	errorHandler?: ErrorHandlerFunction;
}

/**
 * Default options
 */
export const defaultOptions: BootstrapOptions = {
	register: null,
	run: null,
	onComplete: () => { },
	onFinally: () => { },
	shouldExitOnError: true,
	errorHandler: console.error
};

/**
 * Bootstrap a function
 *
 * @param options Bootstrapping options
 */
export function bootstrap(options: BootstrapOptions): void {
	options = { ...defaultOptions, ...options };

	Promise.resolve(options.register ? options.register() : null)
		.then(async () => {
			return await Promise.resolve(options.run());
		})
		.then(options.onComplete)
		.catch(async e => {
			// Handle or log the error
			await Promise.resolve(options.errorHandler(e));

			if (options.shouldExitOnError) {
				process.exit(e.code ?? 1);
			}
		})
		.finally(async () => {
			await Promise.resolve(options.onFinally());
		});
}

/**
 * Returns a promise that will resolve after bootstrapping is complete.
 * 	You will then be responsible for calling your main entrypoint
 * 	function manually (usually after awaiting this function)
 *
 * @param register Register function
 */
export async function bootstrapPromise(
	register: BootstrapFunction
): Promise<void> {
	return await new Promise<void>((accept, reject) => {
		bootstrap({
			register: register,
			run: async () => accept(),
			errorHandler: async (...e) => reject(...e),
			shouldExitOnError: false,
		});
	});
}
