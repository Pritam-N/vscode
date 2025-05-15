/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { registerAction2, Action2 } from '../../../../platform/actions/common/actions.js';
import { IEditorService } from '../../../../workbench/services/editor/common/editorService.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { joinPath } from '../../../../base/common/resources.js';


registerAction2(class ShowProjectInfo extends Action2 {
    constructor() {
        super({
            id: 'co.dev.showProjectInfo',
            title: { value: 'Co.dev: Show Project Info', original: 'Co.dev: Show Project Info' },
            f1: true,
            category: { value: 'Co.dev', original: 'Co.dev' },
        });
    }

    run(accessor: any) {
        const editorService = accessor.get(IEditorService);
        const workspace = accessor.get(IWorkspaceContextService);
        const folder = workspace.getWorkspace().folders[0].uri;
        const jsonUri = joinPath(folder, '.vscode', 'projectdetails.json');
        editorService.openEditor({ resource: jsonUri });
    }
});
