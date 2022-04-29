import { Bootstrap } from '../src';

export class AppBootstrap extends Bootstrap {
	register = () => {
		console.log('Registering...');
	};

	teardown = () => {
		console.log('Teardown...');
	};
}

const app = new AppBootstrap();
app.boot(() => {
	setInterval(() => console.log('.'), 1000);
	setTimeout(() => app.exit(), 5000);
});
