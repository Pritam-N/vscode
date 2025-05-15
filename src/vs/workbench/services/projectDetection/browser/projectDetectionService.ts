/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IProjectDetectionService, ProjectDetectionResult } from '../../../../workbench/services/projectDetection/common/projectDetectionService.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { join } from '../../../../base/common/path.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { URI } from '../../../../base/common/uri.js';

export class ProjectDetectionService extends Disposable implements IProjectDetectionService {
	declare readonly _serviceBrand: undefined;

	constructor(
		@IWorkspaceContextService private readonly workspaceContextService: IWorkspaceContextService,
		@ILogService private readonly logService: ILogService,
		@IFileService private readonly fileService: IFileService
	) {
		super();
		void this.detectAndWriteOnStartup();
	}

	async detectAndWriteOnStartup(): Promise<void> {
		const folders = this.workspaceContextService.getWorkspace().folders;
		if (!folders.length) return;

		const folder = folders[0].uri;
		const result = await this.detect(folder.fsPath);
		await this.write(folder.fsPath, result);
	}

	async detect(folder: string): Promise<ProjectDetectionResult> {
		try {
			// Read the project details file if it exists
			//const vscodeDir = URI.file(join(folder, '.vscode'));
			const detailsFile = URI.file(join(folder, '.vscode', 'projectdetails.json'));

			try {
				const content = await this.fileService.readFile(detailsFile);
				return JSON.parse(content.value.toString());
			} catch (e) {
				// If file doesn't exist or can't be read, return empty result
				return {
					languages: [],
					frameworks: [],
					details: {},
					cloc: {}
				};
			}
		} catch (e) {
			this.logService.error(`[ProjectDetection] Failed to detect project: ${e}`);
			return {
				languages: [],
				frameworks: [],
				details: {},
				cloc: {}
			};
		}
	}

	async write(folder: string, data: ProjectDetectionResult): Promise<void> {
		const vscodeDir = URI.file(join(folder, '.vscode'));
		const detailsFile = URI.file(join(folder, '.vscode', 'projectdetails.json'));

		try {
			// Create .vscode directory if it doesn't exist
			if (!(await this.fileService.exists(vscodeDir))) {
				await this.fileService.createFolder(vscodeDir);
			}

			// Write project details
			await this.fileService.writeFile(
				detailsFile,
				VSBuffer.fromString(JSON.stringify(data, null, 2))
			);
			this.logService.info(`[Co.dev] Updated projectdetails.json`);
		} catch (error) {
			this.logService.error('Failed to write project details', error);
		}
	}
}


