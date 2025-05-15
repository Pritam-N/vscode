/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as toml from 'toml';
import { parseString } from 'xml2js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IProjectDetectionService, ProjectDetectionResult } from '../../../../workbench/services/projectDetection/common/projectDetectionService.js';

export class ProjectDetectionService extends Disposable implements IProjectDetectionService {
	declare readonly _serviceBrand: undefined;

	constructor(
		@IWorkspaceContextService private readonly workspaceContextService: IWorkspaceContextService,
		@ILogService private readonly logService: ILogService
	) {
		super();
		void this.detectAndWriteOnStartup();
	}

	async detectAndWriteOnStartup(): Promise<void> {
		const folders = this.workspaceContextService.getWorkspace().folders;
		if (!folders.length) return;

		const folder = folders[0].uri.fsPath;
		const result = await this.detect(folder);
		this.write(folder, result);

		this.watchForChanges(folder);
	}

	async detect(folder: string): Promise<ProjectDetectionResult> {
		const result: ProjectDetectionResult = {
			languages: [],
			frameworks: [],
			details: {},
			cloc: {}
		};

		const files = fs.readdirSync(folder);
		const langSet = new Set<string>();
		const fwSet = new Set<string>();

		// JS/TS
		if (files.includes('package.json')) {
			const pkg = JSON.parse(fs.readFileSync(path.join(folder, 'package.json'), 'utf-8'));
			const deps: Record<string, string> = { ...pkg.dependencies, ...pkg.devDependencies };
			if (pkg.engines?.node) result.details['node'] = pkg.engines.node;
			langSet.add('JavaScript');
			if ('typescript' in deps) langSet.add('TypeScript');

			const fwMap: Record<string, string> = {
				react: 'React',
				next: 'Next.js',
				'@angular/core': 'Angular',
				vue: 'Vue.js',
				svelte: 'Svelte',
				'@sveltejs/kit': 'SvelteKit',
				electron: 'Electron',
				express: 'Express',
				'@nestjs/core': 'NestJS'
			};

			Object.entries(fwMap).forEach(([key, frameworkName]) => {
				if (deps[key]) {
					fwSet.add(frameworkName);
					result.details[key] = deps[key] as string;
				}
			});
		}

		// Python
		if (files.includes('pyproject.toml')) {
			const tomlText = fs.readFileSync(path.join(folder, 'pyproject.toml'), 'utf8');
			const parsed = toml.parse(tomlText);
			langSet.add('Python');
			const ver = parsed?.tool?.poetry?.dependencies?.python;
			if (ver) result.details['python'] = ver;
		} else if (files.includes('requirements.txt')) {
			langSet.add('Python');
		}

		// .NET
		const csproj = files.find(f => f.endsWith('.csproj'));
		if (csproj) {
			const xml = fs.readFileSync(path.join(folder, csproj), 'utf8');
			await new Promise<void>(resolve => {
				parseString(xml, (err: Error | null, xmlResult: any) => {
					const tf = xmlResult?.Project?.PropertyGroup?.[0]?.TargetFramework?.[0];
					if (tf) {
						langSet.add('C#');
						fwSet.add('.NET');
						result.details['dotnet'] = tf;
					}
					resolve();
				});
			});
		}

		// cloc
		try {
			const clocOut = execSync(`cloc --json "${folder}"`, { encoding: 'utf-8' });
			const parsed = JSON.parse(clocOut);
			delete parsed.header;
			result.cloc = parsed;
			Object.keys(parsed).forEach(k => langSet.add(k));
		} catch (e) {
			this.logService.warn(`[ProjectDetection] cloc failed: ${e}`);
		}

		result.languages = Array.from(langSet);
		result.frameworks = Array.from(fwSet);
		return result;
	}

	write(folder: string, data: ProjectDetectionResult): void {
		const vscodeDir = path.join(folder, '.vscode');
		if (!fs.existsSync(vscodeDir)) fs.mkdirSync(vscodeDir);
		fs.writeFileSync(path.join(vscodeDir, 'projectdetails.json'), JSON.stringify(data, null, 2));
		this.logService.info(`[Co.dev] Updated projectdetails.json`);
	}

	private watchForChanges(folder: string): void {
		const filesToWatch = ['package.json', 'pyproject.toml', 'requirements.txt'];
		const csprojFiles = fs.readdirSync(folder).filter(f => f.endsWith('.csproj'));
		const targets = [...filesToWatch, ...csprojFiles];
		for (const fileName of targets) {
			const fullPath = path.join(folder, fileName);
			if (!fs.existsSync(fullPath)) {
				continue;
			}
			const watcher = fs.watch(fullPath, async () => {
				this.logService.info(`[ProjectDetection] Detected change in ${fileName}, re-running detection.`);
				const result = await this.detect(folder);
				this.write(folder, result);
			});
			this._register({ dispose: () => watcher.close() });
		}
	}
}
