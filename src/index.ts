export type RunFunction = () => void | number | Promise<void | number>;
export type BootstrapFunction = RunFunction; // Deprecated, TODO: Remove in v3
export type ErrorHandlerFunction = (e: Error) => void | Promise<void>;

/**
 * Options for bootstrapping
 */
export interface BootstrapOptions {
	// (Optional) Register function runs before entrypoint, and is useful
	//	for setting up services etc
	register?: RunFunction;

	// Entrypoint
	run: RunFunction;

	// Callback to run on successs
	onComplete?: RunFunction;

	// Callback to run after main returns or throws exception
	onFinally?: RunFunction;

	// Callback to run on exiting
	teardown?: RunFunction;

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

export class Bootstrap {
	/**
	 * Should the process exit when the register/run throw an exception
	 */
	public shouldExitOnError = true;

	/**
	 * Register function runs before entrypoint, and is useful
	 *	for setting up services etc
	 */
	protected register: RunFunction = async () => { };

	/**
	 * Teardown function runs before the application exits
	 */
	protected teardown: RunFunction = async () => { };

	/**
	 * onComplete runs when the run function returns (.then())
	 */
	protected onComplete: RunFunction = async () => { };

	/**
	 * onError runs when the run function throws an exception (.catch())
	 */
	protected onError: ErrorHandlerFunction = console.error;

	/**
	 * onFinally runs when the run function stops (.finally())
	 */
	protected onFinally: RunFunction = async () => { };

	/**
	 * @internal
	 */
	protected isBooted = false;

	public constructor(options: BootstrapOptions = defaultOptions) {
		process.on('SIGINT', this.exit.bind(this));
		process.on('SIGTERM', this.exit.bind(this));
		process.on('exit', this.exit.bind(this));

		if (options.register) {
			this.setRegister(options.register);
		}

		if (options.onComplete) {
			this.setOnComplete(options.onComplete);
		}

		if (options.onFinally) {
			this.setOnFinally(options.onFinally);
		}

		if (options.teardown) {
			this.setTeardown(options.teardown);
		}

		if (options.shouldExitOnError !== null) {
			this.shouldExitOnError = options.shouldExitOnError;
		}

		if (options.errorHandler) {
			this.setOnError(options.errorHandler);
		}
	}

	/**
	 * Boot and run a function
	 *
	 * @param run Run function
	 */
	public boot(run: RunFunction): void {
		this.isBooted = true;

		Promise.resolve(this.register ? this.register() : null)
			.then(async () => await Promise.resolve(run()))
			.then(async () => await Promise.resolve(this.onComplete()))
			.catch(async e => {
				// Handle or log the error
				await Promise.resolve(this.onError(e));

				if (this.shouldExitOnError) {
					this.exit.bind(this)(e.code ?? 1);
				}
			})
			.finally(async () => await Promise.resolve(this.onFinally()));
	}

	/**
	 * Boot (async)
	 */
	public async bootAsync(): Promise<void> {
		this.shouldExitOnError = false;

		return await new Promise<void>((accept, reject) => {
			this.setOnError(reject);
			this.boot(async () => accept());
		});
	}

	/**
	 * Gracefully exit
	 *
	 * @param code Exit code
	 */
	public exit(code = 1): void {
		if (!this.isBooted) {
			process.exit(code);
		}

		this.isBooted = false;

		Promise.resolve(this.teardown()).finally(() => process.exit(code));
	}

	public setRegister(register: RunFunction): void {
		if (this.isBooted) {
			throw new Error('Cannot setRegister() after boot');
		}

		this.register = register.bind(this);
	}

	public setTeardown(teardown: RunFunction): void {
		if (this.isBooted) {
			throw new Error('Cannot setTeardown() after boot');
		}

		this.teardown = teardown.bind(this);
	}

	public setOnComplete(onComplete: RunFunction): void {
		if (this.isBooted) {
			throw new Error('Cannot setOnComplete() after boot');
		}

		this.onComplete = onComplete.bind(this);
	}

	public setOnError(onError: ErrorHandlerFunction): void {
		if (this.isBooted) {
			throw new Error('Cannot setOnError() after boot');
		}

		this.onError = onError.bind(this);
	}

	public setOnFinally(onFinally: RunFunction): void {
		if (this.isBooted) {
			throw new Error('Cannot setOnFinally() after boot');
		}

		this.onFinally = onFinally.bind(this);
	}
}

/**
 * Bootstrap a function
 *
 * @param options Bootstrapping options
 */
export function bootstrap(options: BootstrapOptions): Bootstrap {
	const b = new Bootstrap({ ...defaultOptions, ...options });

	b.boot(options.run);

	return b;
}

/**
 * Returns a promise that will resolve after bootstrapping is complete.
 * 	You will then be responsible for calling your main entrypoint
 * 	function manually (usually after awaiting this function)
 *
 * @param register Register function
 */
export async function bootstrapPromise(
	register: RunFunction
): Promise<void> {
	const b = new Bootstrap({
		register: register,
		run: async () => { },
	});

	return await b.bootAsync();
}
