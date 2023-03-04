import fse from 'fs-extra';
import { AsyncSeriesHook } from 'tapable';
import createYargs from 'yargs';

const { readJson } = fse;

interface ConfigFile {
	type: 'js' | 'json';
	path: string;
	result: unknown;
}

interface CliContext {
	readonly yargsInstance: createYargs.Argv<{}>;
	readonly options: {
		argv: string[];
		plugins: Plugin[];
		configFile: ConfigFile | ConfigFile[] | null;
		scriptName: string;
		showHelpOnFail: boolean;
	};
	custom: Record<string, unknown>;
	readonly hooks: {
		beforeInit: AsyncSeriesHook<CliContext>;
		afterInit: AsyncSeriesHook<CliContext>;
		beforeLoadConfig: AsyncSeriesHook<CliContext>;
		afterLoadConfig: AsyncSeriesHook<CliContext>;
		beforeParse: AsyncSeriesHook<CliContext>;
		afterParse: AsyncSeriesHook<CliContext>;
	};
}
abstract class Plugin {
	name?: string = '';
	apply(context: CliContext): void {}
}

class PluggableCli {
	context: CliContext;

	constructor(options: Partial<CliContext['options']> & { scriptName: string }) {
		const {
			scriptName,
			argv = process.argv,
			configFile = null,
			plugins = [],
			showHelpOnFail = false,
		} = options;
		this.context = {
			options: {
				scriptName,
				argv,
				configFile,
				plugins,
				showHelpOnFail,
			},
			yargsInstance: createYargs(argv),
			hooks: {
				beforeInit: new AsyncSeriesHook(['context']),
				afterInit: new AsyncSeriesHook(['context']),
				beforeLoadConfig: new AsyncSeriesHook(['context']),
				afterLoadConfig: new AsyncSeriesHook(['context']),
				beforeParse: new AsyncSeriesHook(['context']),
				afterParse: new AsyncSeriesHook(['context']),
			},
			custom: {},
		};
	}

	async main() {
		this.applyPlugins();
		// init
		await this.context.hooks.beforeInit.promise(this.context);
		await this.init();
		await this.context.hooks.afterInit.promise(this.context);

		// loadConfig
		await this.context.hooks.beforeLoadConfig.promise(this.context);
		await this.loadConfig();
		await this.context.hooks.afterLoadConfig.promise(this.context);

		// parse
		await this.context.hooks.beforeParse.promise(this.context);
		await this.parse();
		await this.context.hooks.afterParse.promise(this.context);
	}

	applyPlugins() {
		this.context.options.plugins.forEach((plugin) => {
			plugin.apply(this.context);
		});
	}
	async init() {
		return new Promise((resolve) => {
			const yargs = this.context.yargsInstance;
			yargs.scriptName(this.context.options.scriptName);
			yargs.showHelpOnFail(this.context.options.showHelpOnFail);
			resolve(yargs);
		});
	}

	async loadConfig(): Promise<unknown[]> {
		if (this.context.options.configFile === null) {
			return [1];
		}
		const configFiles = Array.isArray(this.context.options.configFile)
			? this.context.options.configFile
			: [this.context.options.configFile];
		return Promise.all(
			configFiles.map(async (i) => {
				const { path, type } = i;
				switch (type) {
					case 'json':
						// eslint-disable-next-line require-atomic-updates, no-param-reassign
						i.result = (await readJson(path)) as unknown as number;
						break;
					case 'js':
						// eslint-disable-next-line require-atomic-updates, no-param-reassign
						i.result = await import(path);
						break;
					default:
						// eslint-disable-next-line no-param-reassign
						i.result = null;
				}
				return i.result;
			}),
		);
	}
	async parse() {
		return this.context.yargsInstance?.parseAsync?.(this.context.options.argv);
	}
	async registerCommands() {}
}

export { PluggableCli, Plugin };
