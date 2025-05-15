/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';

export const IProjectDetectionService = createDecorator<IProjectDetectionService>('projectDetectionService');

export interface ProjectDetectionResult {
	languages: string[];
	frameworks: string[];
	details: Record<string, string>;
	cloc: Record<string, { code: number; nFiles: number }>;
}

export interface IProjectDetectionService {
	readonly _serviceBrand: undefined;

	detect(folderPath: string): Promise<ProjectDetectionResult>;
	write(folderPath: string, data: ProjectDetectionResult): void;
	detectAndWriteOnStartup(): Promise<void>;
}
