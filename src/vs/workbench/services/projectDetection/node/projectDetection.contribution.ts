/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { InstantiationType, registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IProjectDetectionService } from '../common/projectDetectionService.js';
import { ProjectDetectionService } from './projectDetectionService.js';

// Register the browser implementation of the ProjectDetectionService
registerSingleton(IProjectDetectionService, ProjectDetectionService, InstantiationType.Delayed);
