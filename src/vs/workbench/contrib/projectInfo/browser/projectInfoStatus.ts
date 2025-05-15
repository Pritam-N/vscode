/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IStatusbarService, StatusbarAlignment } from '../../../../workbench/services/statusbar/browser/statusbar.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IWorkbenchContribution } from '../../../../workbench/common/contributions.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { joinPath } from '../../../../base/common/resources.js';

export class ProjectInfoStatusBar extends Disposable implements IWorkbenchContribution {
	constructor(
		@IStatusbarService statusbarService: IStatusbarService,
		@IWorkspaceContextService contextService: IWorkspaceContextService,
		@IFileService fileService: IFileService
	) {
		super();

		const folder = contextService.getWorkspace().folders?.[0]?.uri;
		if (!folder) {
			return;
		}

		const projectInfoUri = joinPath(folder, '.vscode', 'projectdetails.json');
		fileService.exists(projectInfoUri).then(exists => {
			if (!exists) {
				return;
			}
			fileService.readFile(projectInfoUri).then(file => {
				const info = JSON.parse(file.value.toString());
				const langs = Array.isArray(info.languages) ? info.languages.join(', ') : 'Unknown';

				statusbarService.addEntry(
					{
						name: 'Project Info',
						text: `$(tools) ${langs}`,
						tooltip: 'Detected project languages',
						command: 'co.dev.showProjectInfo',
						ariaLabel: `Detected project languages: ${langs}`
					},
					'status.projectInfo',
					StatusbarAlignment.LEFT,
					100
				);
			});
		});
	}
}
