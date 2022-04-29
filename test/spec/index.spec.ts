import 'jasmine';
import { BootstrapOptions, bootstrap, bootstrapPromise } from '../../src';

describe('BootstrapOptions', () => {
	it('accepts a register function', () => {
		const options: Partial<BootstrapOptions> = {
			register: async () => {}
		};

		expect(options.register).toBeDefined();
	});

	it('accepts a run function', () => {
		const options: Partial<BootstrapOptions> = {
			run: async () => {}
		};

		expect(options.run).toBeDefined();
	});

	it('accepts an option to exit after completion', () => {
		const options: Partial<BootstrapOptions> = {
			shouldExitOnError: true
		};

		expect(options.shouldExitOnError).toBeTrue();
	});

	it('accepts a error callback', () => {
		const options: Partial<BootstrapOptions> = {
			errorHandler: async () => {}
		};

		expect(options.errorHandler).toBeDefined();
	});
});

describe('bootstrap', () => {
	it('runs and awaits the register function', () => {
		let registered = null;

		bootstrap({
			shouldExitOnError: false,
			register: async () => (new Promise((accept) => {
				setTimeout(() => {
					registered = true;
					accept();
				}, 10);
			})),
			run: async () => expect(registered).toBeTrue(),
		});
	});

	it('runs the error handler if an error is thrown from register()', () => {
		bootstrap({
			shouldExitOnError: false,
			register: async () => {
				throw new Error('test');
			},
			run: async () => {},
			errorHandler: (e) => expect(e.message).toBe('test')
		});
	});

	it('runs the error handler if an error is thrown from run()', () => {
		bootstrap({
			shouldExitOnError: false,
			register: async () => {},
			run: async () => {
				throw new Error('test');
			},
			errorHandler: (e) => expect(e.message).toBe('test')
		});
	});

	it('can run without a register function', async () => {
		const returned = await new Promise<string>(accept => {
			bootstrap({
				shouldExitOnError: false,
				run: async () => {
					accept('done');
				}
			});
		});

		expect(returned).toBe('done');
	});

	it('can run with a synchronous register function', async () => {
		const returned = await new Promise<string>(accept => {
			bootstrap({
				shouldExitOnError: false,
				register: async () => {},
				run: async () => {
					accept('done');
				}
			});
		});

		expect(returned).toBe('done');
	});

	it('can call a onComplete method', async () => {
		const returned = await new Promise<string>(accept => {
			bootstrap({
				shouldExitOnError: false,
				register: async () => { },
				run: async () => { },
				onComplete: async () => {
					accept('done');
				}
			});
		});

		expect(returned).toBe('done');
	});

	it('can call a onFinally method', async () => {
		const returned = await new Promise<string>(accept => {
			bootstrap({
				shouldExitOnError: false,
				register: async () => { },
				run: async () => { },
				onFinally: async () => {
					accept('done');
				}
			});
		});

		expect(returned).toBe('done');
	});

	it('logs to console if no error handler is provided', async () => {
		spyOn(console, 'error');

		bootstrap({
			shouldExitOnError: false,
			register: async () => {
				throw new Error('test');
			},
			run: async () => {
				expect(console.error).toHaveBeenCalled();
			}
		});
	});
});

describe('bootstrap async', () => {
	it('awaits the register function', async () => {
		let hasBeenCalled = null;

		await bootstrapPromise(async () => {
			return new Promise(accept => {
				setTimeout(() => {
					hasBeenCalled = true;

					accept();
				}, 10);
			});
		});

		expect(hasBeenCalled).toBeTrue();
	});

	it('rejects if register throws', async () => {
		await expectAsync(bootstrapPromise(
			async () => {
				throw new Error();
			}
		)).toBeRejected();
	});
});
