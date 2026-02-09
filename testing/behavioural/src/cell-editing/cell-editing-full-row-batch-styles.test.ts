import { getByTestId } from '@testing-library/dom';
import '@testing-library/jest-dom';
import { userEvent } from '@testing-library/user-event';

import { TextEditorModule, agTestIdFor, getGridElement, setupAgTestIds } from 'ag-grid-community';
import { BatchEditModule, CellSelectionModule } from 'ag-grid-enterprise';

import { TestGridsManager, asyncSetTimeout, waitForInput } from '../test-utils';

describe('Cell Editing: full-row batch styles', () => {
    const gridMgr = new TestGridsManager({
        modules: [BatchEditModule, TextEditorModule],
    });

    const rangeGridMgr = new TestGridsManager({
        modules: [BatchEditModule, TextEditorModule, CellSelectionModule],
    });

    beforeAll(() => {
        setupAgTestIds();
    });

    afterEach(() => {
        gridMgr.reset();
        rangeGridMgr.reset();
    });

    async function createGrid() {
        const api = await gridMgr.createGridAndWait('batchStyleGrid', {
            editType: 'fullRow',
            defaultColDef: {
                editable: true,
            },
            columnDefs: [
                { field: 'a', editable: true },
                { field: 'b', editable: true },
            ],
            rowData: [
                { id: 'ROW_0', a: 'A0', b: 'B0' },
                { id: 'ROW_1', a: 'A1', b: 'B1' },
                { id: 'ROW_2', a: 'A2', b: 'B2' },
            ],
            getRowId: (params) => params.data.id,
        });
        return api;
    }

    test('edited row retains batch edit style after tabbing to next row', async () => {
        const api = await createGrid();
        const gridDiv = getGridElement(api)! as HTMLElement;
        const user = userEvent.setup({ skipHover: true });
        await asyncSetTimeout(0);

        api.startBatchEdit();

        // Start editing row 0, column a
        const cellA0 = getByTestId(gridDiv, agTestIdFor.cell('ROW_0', 'a'));
        await user.click(cellA0);
        api.startEditingCell({ rowIndex: 0, colKey: 'a' });
        const inputA0 = await waitForInput(gridDiv, cellA0);
        await user.clear(inputA0);
        await user.type(inputA0, 'CHANGED');

        // Tab through column b of row 0
        await user.keyboard('{Tab}');
        await asyncSetTimeout(0);

        // Tab from row 0 col b to row 1 col a (crossing row boundary)
        await user.keyboard('{Tab}');
        await asyncSetTimeout(0);

        // Row 0 cell a should retain the batch edit style because it was changed
        const cellA0After = getByTestId(gridDiv, agTestIdFor.cell('ROW_0', 'a'));
        expect(cellA0After).toHaveClass(/ag-cell-batch-edit/);
        expect(cellA0After).toHaveTextContent('CHANGED');

        // Row 0 should have batch edit row style
        const row0 = cellA0After.closest('[row-index="0"]');
        expect(row0).toHaveClass(/ag-row-batch-edit/);

        // Row 0 cell b should NOT have batch edit style (unchanged)
        const cellB0 = getByTestId(gridDiv, agTestIdFor.cell('ROW_0', 'b'));
        expect(cellB0).not.toHaveClass(/ag-cell-batch-edit/);

        // After commit, styles should be removed
        api.commitBatchEdit();
        await asyncSetTimeout(0);

        const cellA0Final = getByTestId(gridDiv, agTestIdFor.cell('ROW_0', 'a'));
        expect(cellA0Final).not.toHaveClass(/ag-cell-batch-edit/);
    });

    test('multiple rows retain batch edit styles when editing across rows', async () => {
        const api = await createGrid();
        const gridDiv = getGridElement(api)! as HTMLElement;
        const user = userEvent.setup({ skipHover: true });
        await asyncSetTimeout(0);

        api.startBatchEdit();

        // Edit row 0, column a
        const cellA0 = getByTestId(gridDiv, agTestIdFor.cell('ROW_0', 'a'));
        await user.click(cellA0);
        api.startEditingCell({ rowIndex: 0, colKey: 'a' });
        const inputA0 = await waitForInput(gridDiv, cellA0);
        await user.clear(inputA0);
        await user.type(inputA0, 'R0_CHANGED');

        // Tab through b0 to row 1
        await user.keyboard('{Tab}');
        await asyncSetTimeout(0);
        await user.keyboard('{Tab}');
        await asyncSetTimeout(0);

        // Now editing row 1, column a - change it
        const cellA1 = getByTestId(gridDiv, agTestIdFor.cell('ROW_1', 'a'));
        const inputA1 = await waitForInput(gridDiv, cellA1);
        await user.clear(inputA1);
        await user.type(inputA1, 'R1_CHANGED');

        // Tab through b1 to row 2
        await user.keyboard('{Tab}');
        await asyncSetTimeout(0);
        await user.keyboard('{Tab}');
        await asyncSetTimeout(0);

        // Both row 0 and row 1 should still have batch edit styles
        const cellA0After = getByTestId(gridDiv, agTestIdFor.cell('ROW_0', 'a'));
        expect(cellA0After).toHaveTextContent('R0_CHANGED');
        expect(cellA0After).toHaveClass(/ag-cell-batch-edit/);

        const cellA1After = getByTestId(gridDiv, agTestIdFor.cell('ROW_1', 'a'));
        expect(cellA1After).toHaveClass(/ag-cell-batch-edit/);
        expect(cellA1After).toHaveTextContent('R1_CHANGED');

        // Row 2 should not have batch edit style (currently being edited, not yet changed)
        // Row 0 and 1 should have row-level batch edit style
        const row0 = cellA0After.closest('[row-index="0"]');
        expect(row0).toHaveClass(/ag-row-batch-edit/);

        const row1 = cellA1After.closest('[row-index="1"]');
        expect(row1).toHaveClass(/ag-row-batch-edit/);
    });

    test('cancel removes batch edit styles from previously edited rows', async () => {
        const api = await createGrid();
        const gridDiv = getGridElement(api)! as HTMLElement;
        const user = userEvent.setup({ skipHover: true });
        await asyncSetTimeout(0);

        api.startBatchEdit();

        // Edit row 0
        const cellA0 = getByTestId(gridDiv, agTestIdFor.cell('ROW_0', 'a'));
        await user.click(cellA0);
        api.startEditingCell({ rowIndex: 0, colKey: 'a' });
        const inputA0 = await waitForInput(gridDiv, cellA0);
        await user.clear(inputA0);
        await user.type(inputA0, 'CHANGED');

        // Tab to row 1
        await user.keyboard('{Tab}');
        await asyncSetTimeout(0);
        await user.keyboard('{Tab}');
        await asyncSetTimeout(0);

        // Row 0 should have batch edit style before cancel
        const cellA0Before = getByTestId(gridDiv, agTestIdFor.cell('ROW_0', 'a'));
        expect(cellA0Before).toHaveClass(/ag-cell-batch-edit/);

        // Cancel batch edit
        api.cancelBatchEdit();
        await asyncSetTimeout(0);

        // All batch edit styles should be removed
        const cellA0After = getByTestId(gridDiv, agTestIdFor.cell('ROW_0', 'a'));
        expect(cellA0After).not.toHaveClass(/ag-cell-batch-edit/);
        expect(cellA0After).toHaveTextContent('A0');

        const row0 = cellA0After.closest('[row-index="0"]');
        expect(row0).not.toHaveClass(/ag-row-batch-edit/);
    });

    test('editing cell back to original value removes cell style, re-changing re-applies it', async () => {
        const api = await createGrid();
        const gridDiv = getGridElement(api)! as HTMLElement;
        const user = userEvent.setup({ skipHover: true });
        await asyncSetTimeout(0);

        api.startBatchEdit();

        // Edit row 0, column a
        const cellA0 = getByTestId(gridDiv, agTestIdFor.cell('ROW_0', 'a'));
        await user.click(cellA0);
        api.startEditingCell({ rowIndex: 0, colKey: 'a' });
        let input = await waitForInput(gridDiv, cellA0);
        await user.clear(input);
        await user.type(input, 'CHANGED');

        // Tab through b0 then to row 1 (crosses row boundary)
        await user.keyboard('{Tab}');
        await asyncSetTimeout(0);
        await user.keyboard('{Tab}');
        await asyncSetTimeout(0);

        // Cell a0 should have batch edit style
        let cellA0After = getByTestId(gridDiv, agTestIdFor.cell('ROW_0', 'a'));
        expect(cellA0After).toHaveTextContent('CHANGED');
        expect(cellA0After).toHaveClass(/ag-cell-batch-edit/);

        // Tab back to row 0 (Shift+Tab from row 1 col a -> row 0 col b -> row 0 col a)
        await user.keyboard('{Shift>}{Tab}{/Shift}');
        await asyncSetTimeout(0);
        await user.keyboard('{Shift>}{Tab}{/Shift}');
        await asyncSetTimeout(0);

        // Now editing row 0 col a — re-type original value
        cellA0After = getByTestId(gridDiv, agTestIdFor.cell('ROW_0', 'a'));
        input = await waitForInput(gridDiv, cellA0After);
        await user.clear(input);
        await user.type(input, 'A0');

        // Tab away to commit (through b0 then to row 1)
        await user.keyboard('{Tab}');
        await asyncSetTimeout(0);
        await user.keyboard('{Tab}');
        await asyncSetTimeout(0);

        // Cell a0 should no longer have batch edit style (value matches original)
        cellA0After = getByTestId(gridDiv, agTestIdFor.cell('ROW_0', 'a'));
        expect(cellA0After).toHaveTextContent('A0');
        expect(cellA0After).not.toHaveClass(/ag-cell-batch-edit/);

        // Row 0 should not have row-level batch style either (no edits remain)
        const row0 = cellA0After.closest('[row-index="0"]');
        expect(row0).not.toHaveClass(/ag-row-batch-edit/);

        // Tab back and re-edit to a new value
        await user.keyboard('{Shift>}{Tab}{/Shift}');
        await asyncSetTimeout(0);
        await user.keyboard('{Shift>}{Tab}{/Shift}');
        await asyncSetTimeout(0);

        cellA0After = getByTestId(gridDiv, agTestIdFor.cell('ROW_0', 'a'));
        input = await waitForInput(gridDiv, cellA0After);
        await user.clear(input);
        await user.type(input, 'CHANGED_AGAIN');

        // Tab away
        await user.keyboard('{Tab}');
        await asyncSetTimeout(0);
        await user.keyboard('{Tab}');
        await asyncSetTimeout(0);

        // Cell a0 should have batch edit style again
        cellA0After = getByTestId(gridDiv, agTestIdFor.cell('ROW_0', 'a'));
        expect(cellA0After).toHaveTextContent('CHANGED_AGAIN');
        expect(cellA0After).toHaveClass(/ag-cell-batch-edit/);

        const row0After = cellA0After.closest('[row-index="0"]');
        expect(row0After).toHaveClass(/ag-row-batch-edit/);
    });

    test('row style is removed only when all edited cells in the row are reverted to original', async () => {
        const api = await createGrid();
        const gridDiv = getGridElement(api)! as HTMLElement;
        const user = userEvent.setup({ skipHover: true });
        await asyncSetTimeout(0);

        api.startBatchEdit();

        // Edit row 0, column a
        const cellA0 = getByTestId(gridDiv, agTestIdFor.cell('ROW_0', 'a'));
        await user.click(cellA0);
        api.startEditingCell({ rowIndex: 0, colKey: 'a' });
        let input = await waitForInput(gridDiv, cellA0);
        await user.clear(input);
        await user.type(input, 'A0_NEW');

        // Tab to column b in same row and edit it
        await user.keyboard('{Tab}');
        await asyncSetTimeout(0);

        const cellB0 = getByTestId(gridDiv, agTestIdFor.cell('ROW_0', 'b'));
        input = await waitForInput(gridDiv, cellB0);
        await user.clear(input);
        await user.type(input, 'B0_NEW');

        // Tab to row 1 (crosses row boundary, commits row 0 edits)
        await user.keyboard('{Tab}');
        await asyncSetTimeout(0);

        // Both cells in row 0 should have batch edit style
        let cellA0After = getByTestId(gridDiv, agTestIdFor.cell('ROW_0', 'a'));
        let cellB0After = getByTestId(gridDiv, agTestIdFor.cell('ROW_0', 'b'));
        expect(cellA0After).toHaveClass(/ag-cell-batch-edit/);
        expect(cellB0After).toHaveClass(/ag-cell-batch-edit/);

        // Row 0 should have row-level batch edit style
        let row0 = cellA0After.closest('[row-index="0"]');
        expect(row0).toHaveClass(/ag-row-batch-edit/);

        // Tab back to row 0 col b, then to col a
        await user.keyboard('{Shift>}{Tab}{/Shift}');
        await asyncSetTimeout(0);
        await user.keyboard('{Shift>}{Tab}{/Shift}');
        await asyncSetTimeout(0);

        // Now editing row 0 col a — revert to original value
        cellA0After = getByTestId(gridDiv, agTestIdFor.cell('ROW_0', 'a'));
        input = await waitForInput(gridDiv, cellA0After);
        await user.clear(input);
        await user.type(input, 'A0');

        // Tab away to commit row 0 (through b0 then to row 1)
        await user.keyboard('{Tab}');
        await asyncSetTimeout(0);
        await user.keyboard('{Tab}');
        await asyncSetTimeout(0);

        // Cell a0 should lose batch edit style (reverted), cell b0 should keep it
        cellA0After = getByTestId(gridDiv, agTestIdFor.cell('ROW_0', 'a'));
        cellB0After = getByTestId(gridDiv, agTestIdFor.cell('ROW_0', 'b'));
        expect(cellA0After).not.toHaveClass(/ag-cell-batch-edit/);
        expect(cellB0After).toHaveClass(/ag-cell-batch-edit/);

        // Row 0 should STILL have row-level batch edit style (cell b is still edited)
        row0 = cellA0After.closest('[row-index="0"]');
        expect(row0).toHaveClass(/ag-row-batch-edit/);

        // Tab back to row 0 col b and revert it to original
        await user.keyboard('{Shift>}{Tab}{/Shift}');
        await asyncSetTimeout(0);
        await user.keyboard('{Shift>}{Tab}{/Shift}');
        await asyncSetTimeout(0);

        // Now on row 0 col a — tab to col b
        await user.keyboard('{Tab}');
        await asyncSetTimeout(0);

        cellB0After = getByTestId(gridDiv, agTestIdFor.cell('ROW_0', 'b'));
        input = await waitForInput(gridDiv, cellB0After);
        await user.clear(input);
        await user.type(input, 'B0');

        // Tab away to commit
        await user.keyboard('{Tab}');
        await asyncSetTimeout(0);

        // Now BOTH cells are reverted — row should lose batch edit style too
        cellA0After = getByTestId(gridDiv, agTestIdFor.cell('ROW_0', 'a'));
        cellB0After = getByTestId(gridDiv, agTestIdFor.cell('ROW_0', 'b'));
        expect(cellA0After).not.toHaveClass(/ag-cell-batch-edit/);
        expect(cellB0After).not.toHaveClass(/ag-cell-batch-edit/);

        row0 = cellA0After.closest('[row-index="0"]');
        expect(row0).not.toHaveClass(/ag-row-batch-edit/);

        // Re-edit both cells to new values to verify styles re-apply
        await user.keyboard('{Shift>}{Tab}{/Shift}');
        await asyncSetTimeout(0);
        await user.keyboard('{Shift>}{Tab}{/Shift}');
        await asyncSetTimeout(0);

        // Edit col a
        cellA0After = getByTestId(gridDiv, agTestIdFor.cell('ROW_0', 'a'));
        input = await waitForInput(gridDiv, cellA0After);
        await user.clear(input);
        await user.type(input, 'A0_AGAIN');

        // Tab to col b and edit it
        await user.keyboard('{Tab}');
        await asyncSetTimeout(0);

        cellB0After = getByTestId(gridDiv, agTestIdFor.cell('ROW_0', 'b'));
        input = await waitForInput(gridDiv, cellB0After);
        await user.clear(input);
        await user.type(input, 'B0_AGAIN');

        // Tab to row 1
        await user.keyboard('{Tab}');
        await asyncSetTimeout(0);

        // Both cells and row should have batch edit styles again
        cellA0After = getByTestId(gridDiv, agTestIdFor.cell('ROW_0', 'a'));
        cellB0After = getByTestId(gridDiv, agTestIdFor.cell('ROW_0', 'b'));
        expect(cellA0After).toHaveClass(/ag-cell-batch-edit/);
        expect(cellB0After).toHaveClass(/ag-cell-batch-edit/);

        row0 = cellA0After.closest('[row-index="0"]');
        expect(row0).toHaveClass(/ag-row-batch-edit/);
    });

    test('Escape cancels current row edit without affecting previously edited rows', async () => {
        const api = await createGrid();
        const gridDiv = getGridElement(api)! as HTMLElement;
        const user = userEvent.setup({ skipHover: true });
        await asyncSetTimeout(0);

        api.startBatchEdit();

        // Edit row 0, column a
        const cellA0 = getByTestId(gridDiv, agTestIdFor.cell('ROW_0', 'a'));
        await user.click(cellA0);
        api.startEditingCell({ rowIndex: 0, colKey: 'a' });
        let input = await waitForInput(gridDiv, cellA0);
        await user.clear(input);
        await user.type(input, 'CONFIRMED');

        // Tab through b0 to row 1 (commits row 0)
        await user.keyboard('{Tab}');
        await asyncSetTimeout(0);
        await user.keyboard('{Tab}');
        await asyncSetTimeout(0);

        // Row 0 should have batch edit styles
        const cellA0After = getByTestId(gridDiv, agTestIdFor.cell('ROW_0', 'a'));
        expect(cellA0After).toHaveTextContent('CONFIRMED');
        expect(cellA0After).toHaveClass(/ag-cell-batch-edit/);
        const row0 = cellA0After.closest('[row-index="0"]');
        expect(row0).toHaveClass(/ag-row-batch-edit/);

        // Now editing row 1, type something in col a, then press Escape
        const cellA1 = getByTestId(gridDiv, agTestIdFor.cell('ROW_1', 'a'));
        input = await waitForInput(gridDiv, cellA1);
        await user.clear(input);
        await user.type(input, 'WILL_CANCEL');
        await user.keyboard('{Escape}');
        await asyncSetTimeout(0);

        // Row 1 should revert — no batch edit styles
        const cellA1After = getByTestId(gridDiv, agTestIdFor.cell('ROW_1', 'a'));
        expect(cellA1After).toHaveTextContent('A1');
        expect(cellA1After).not.toHaveClass(/ag-cell-batch-edit/);
        const row1 = cellA1After.closest('[row-index="1"]');
        expect(row1).not.toHaveClass(/ag-row-batch-edit/);

        // Row 0 batch edits should be preserved
        const cellA0Still = getByTestId(gridDiv, agTestIdFor.cell('ROW_0', 'a'));
        expect(cellA0Still).toHaveTextContent('CONFIRMED');
        expect(cellA0Still).toHaveClass(/ag-cell-batch-edit/);
        const row0Still = cellA0Still.closest('[row-index="0"]');
        expect(row0Still).toHaveClass(/ag-row-batch-edit/);
    });

    test('Escape on a re-edited batch row preserves the previous batch values', async () => {
        const api = await createGrid();
        const gridDiv = getGridElement(api)! as HTMLElement;
        const user = userEvent.setup({ skipHover: true });
        await asyncSetTimeout(0);

        api.startBatchEdit();

        // Edit row 0, column a
        const cellA0 = getByTestId(gridDiv, agTestIdFor.cell('ROW_0', 'a'));
        await user.click(cellA0);
        api.startEditingCell({ rowIndex: 0, colKey: 'a' });
        let input = await waitForInput(gridDiv, cellA0);
        await user.clear(input);
        await user.type(input, 'FIRST_EDIT');

        // Tab through b0 to row 1 (commits row 0)
        await user.keyboard('{Tab}');
        await asyncSetTimeout(0);
        await user.keyboard('{Tab}');
        await asyncSetTimeout(0);

        expect(getByTestId(gridDiv, agTestIdFor.cell('ROW_0', 'a'))).toHaveTextContent('FIRST_EDIT');
        expect(getByTestId(gridDiv, agTestIdFor.cell('ROW_0', 'a'))).toHaveClass(/ag-cell-batch-edit/);

        // Tab back to row 0
        await user.keyboard('{Shift>}{Tab}{/Shift}');
        await asyncSetTimeout(0);
        await user.keyboard('{Shift>}{Tab}{/Shift}');
        await asyncSetTimeout(0);

        // Type a different value then press Escape
        const cellA0Again = getByTestId(gridDiv, agTestIdFor.cell('ROW_0', 'a'));
        input = await waitForInput(gridDiv, cellA0Again);
        await user.clear(input);
        await user.type(input, 'SECOND_EDIT');
        await user.keyboard('{Escape}');
        await asyncSetTimeout(0);

        // Should revert to the previous batch pending value, not the original
        const cellA0Final = getByTestId(gridDiv, agTestIdFor.cell('ROW_0', 'a'));
        expect(cellA0Final).toHaveTextContent('FIRST_EDIT');
        expect(cellA0Final).toHaveClass(/ag-cell-batch-edit/);
        const row0 = cellA0Final.closest('[row-index="0"]');
        expect(row0).toHaveClass(/ag-row-batch-edit/);
    });

    test('clearing a batch-edited cell with Backspace and typing original value removes styles', async () => {
        const api = await createGrid();
        const gridDiv = getGridElement(api)! as HTMLElement;
        const user = userEvent.setup({ skipHover: true });
        await asyncSetTimeout(0);

        api.startBatchEdit();

        // Edit row 0, column a
        const cellA0 = getByTestId(gridDiv, agTestIdFor.cell('ROW_0', 'a'));
        await user.click(cellA0);
        api.startEditingCell({ rowIndex: 0, colKey: 'a' });
        let input = await waitForInput(gridDiv, cellA0);
        await user.clear(input);
        await user.type(input, 'CHANGED');

        // Tab through b0 to row 1 (commits row 0)
        await user.keyboard('{Tab}');
        await asyncSetTimeout(0);
        await user.keyboard('{Tab}');
        await asyncSetTimeout(0);

        expect(getByTestId(gridDiv, agTestIdFor.cell('ROW_0', 'a'))).toHaveClass(/ag-cell-batch-edit/);
        const row0Before = getByTestId(gridDiv, agTestIdFor.cell('ROW_0', 'a')).closest('[row-index="0"]');
        expect(row0Before).toHaveClass(/ag-row-batch-edit/);

        // Tab back to row 0
        await user.keyboard('{Shift>}{Tab}{/Shift}');
        await asyncSetTimeout(0);
        await user.keyboard('{Shift>}{Tab}{/Shift}');
        await asyncSetTimeout(0);

        // Use Backspace to clear, then type original value
        const cellA0Again = getByTestId(gridDiv, agTestIdFor.cell('ROW_0', 'a'));
        input = await waitForInput(gridDiv, cellA0Again);
        while (input.value.length > 0) {
            await user.keyboard('{Backspace}');
        }
        await user.type(input, 'A0');

        // Tab through b0 to row 1 (commits row 0)
        await user.keyboard('{Tab}');
        await asyncSetTimeout(0);
        await user.keyboard('{Tab}');
        await asyncSetTimeout(0);

        // Cell should lose batch edit style because value matches original
        const cellA0Final = getByTestId(gridDiv, agTestIdFor.cell('ROW_0', 'a'));
        expect(cellA0Final).toHaveTextContent('A0');
        expect(cellA0Final).not.toHaveClass(/ag-cell-batch-edit/);

        // Row should also lose batch style (no edits remain)
        const row0 = cellA0Final.closest('[row-index="0"]');
        expect(row0).not.toHaveClass(/ag-row-batch-edit/);
    });

    test('Delete on a cleared batch cell toggles it back to original value', async () => {
        const api = await createGrid();
        const gridDiv = getGridElement(api)! as HTMLElement;
        const user = userEvent.setup({ skipHover: true });
        await asyncSetTimeout(0);

        api.startBatchEdit();

        // Edit row 0, clear column a
        const cellA0 = getByTestId(gridDiv, agTestIdFor.cell('ROW_0', 'a'));
        await user.click(cellA0);
        api.startEditingCell({ rowIndex: 0, colKey: 'a' });
        const input = await waitForInput(gridDiv, cellA0);
        await user.clear(input);

        // Tab through b0 to row 1 (commits row 0)
        await user.keyboard('{Tab}');
        await asyncSetTimeout(0);
        await user.keyboard('{Tab}');
        await asyncSetTimeout(0);

        // Cell should show empty and have batch style
        const cellA0Cleared = getByTestId(gridDiv, agTestIdFor.cell('ROW_0', 'a'));
        expect(cellA0Cleared).toHaveTextContent('');
        expect(cellA0Cleared).toHaveClass(/ag-cell-batch-edit/);

        // Stop editing so the Delete key triggers cellClear instead of editor input
        api.stopEditing();
        await asyncSetTimeout(0);

        // Focus the cleared cell and press Delete — should toggle back to original value
        const cellA0ForToggle = getByTestId(gridDiv, agTestIdFor.cell('ROW_0', 'a'));
        await user.click(cellA0ForToggle);
        await user.keyboard('{Delete}');
        await asyncSetTimeout(0);

        const cellA0Restored = getByTestId(gridDiv, agTestIdFor.cell('ROW_0', 'a'));
        expect(cellA0Restored).toHaveTextContent('A0');
        expect(cellA0Restored).not.toHaveClass(/ag-cell-batch-edit/);

        // Row should also lose batch style (no edits remain)
        const row0 = cellA0Restored.closest('[row-index="0"]');
        expect(row0).not.toHaveClass(/ag-row-batch-edit/);
    });

    test('commitBatchEdit removes cell and row styles and persists values', async () => {
        const api = await createGrid();
        const gridDiv = getGridElement(api)! as HTMLElement;
        const user = userEvent.setup({ skipHover: true });
        await asyncSetTimeout(0);

        api.startBatchEdit();

        // Edit row 0, column a
        const cellA0 = getByTestId(gridDiv, agTestIdFor.cell('ROW_0', 'a'));
        await user.click(cellA0);
        api.startEditingCell({ rowIndex: 0, colKey: 'a' });
        let input = await waitForInput(gridDiv, cellA0);
        await user.clear(input);
        await user.type(input, 'COMMIT_A0');

        // Tab through b0 to row 1
        await user.keyboard('{Tab}');
        await asyncSetTimeout(0);
        await user.keyboard('{Tab}');
        await asyncSetTimeout(0);

        // Edit row 1, column b
        await user.keyboard('{Tab}');
        await asyncSetTimeout(0);
        const cellB1 = getByTestId(gridDiv, agTestIdFor.cell('ROW_1', 'b'));
        input = await waitForInput(gridDiv, cellB1);
        await user.clear(input);
        await user.type(input, 'COMMIT_B1');

        // Tab to row 2
        await user.keyboard('{Tab}');
        await asyncSetTimeout(0);

        // Verify batch styles exist before commit
        const cellA0Before = getByTestId(gridDiv, agTestIdFor.cell('ROW_0', 'a'));
        expect(cellA0Before).toHaveClass(/ag-cell-batch-edit/);
        const row0 = cellA0Before.closest('[row-index="0"]');
        expect(row0).toHaveClass(/ag-row-batch-edit/);

        const cellB1Before = getByTestId(gridDiv, agTestIdFor.cell('ROW_1', 'b'));
        expect(cellB1Before).toHaveClass(/ag-cell-batch-edit/);
        const row1 = cellB1Before.closest('[row-index="1"]');
        expect(row1).toHaveClass(/ag-row-batch-edit/);

        // Commit batch edit
        api.commitBatchEdit();
        await asyncSetTimeout(0);

        // All batch edit styles should be removed
        const cellA0After = getByTestId(gridDiv, agTestIdFor.cell('ROW_0', 'a'));
        expect(cellA0After).not.toHaveClass(/ag-cell-batch-edit/);
        const row0After = cellA0After.closest('[row-index="0"]');
        expect(row0After).not.toHaveClass(/ag-row-batch-edit/);

        const cellB1After = getByTestId(gridDiv, agTestIdFor.cell('ROW_1', 'b'));
        expect(cellB1After).not.toHaveClass(/ag-cell-batch-edit/);
        const row1After = cellB1After.closest('[row-index="1"]');
        expect(row1After).not.toHaveClass(/ag-row-batch-edit/);

        // Values should persist
        expect(cellA0After).toHaveTextContent('COMMIT_A0');
        expect(cellB1After).toHaveTextContent('COMMIT_B1');

        // Underlying row data should reflect committed values
        const rowData = api.getGridOption('rowData')!;
        expect(rowData[0].a).toBe('COMMIT_A0');
        expect(rowData[1].b).toBe('COMMIT_B1');
    });

    test('cancelBatchEdit removes cell and row styles and reverts values', async () => {
        const api = await createGrid();
        const gridDiv = getGridElement(api)! as HTMLElement;
        const user = userEvent.setup({ skipHover: true });
        await asyncSetTimeout(0);

        api.startBatchEdit();

        // Edit row 0, column a
        const cellA0 = getByTestId(gridDiv, agTestIdFor.cell('ROW_0', 'a'));
        await user.click(cellA0);
        api.startEditingCell({ rowIndex: 0, colKey: 'a' });
        let input = await waitForInput(gridDiv, cellA0);
        await user.clear(input);
        await user.type(input, 'CANCEL_A0');

        // Tab through b0 to row 1
        await user.keyboard('{Tab}');
        await asyncSetTimeout(0);
        await user.keyboard('{Tab}');
        await asyncSetTimeout(0);

        // Edit row 1, column b
        await user.keyboard('{Tab}');
        await asyncSetTimeout(0);
        const cellB1 = getByTestId(gridDiv, agTestIdFor.cell('ROW_1', 'b'));
        input = await waitForInput(gridDiv, cellB1);
        await user.clear(input);
        await user.type(input, 'CANCEL_B1');

        // Tab to row 2
        await user.keyboard('{Tab}');
        await asyncSetTimeout(0);

        // Verify batch styles exist before cancel
        const cellA0Before = getByTestId(gridDiv, agTestIdFor.cell('ROW_0', 'a'));
        expect(cellA0Before).toHaveClass(/ag-cell-batch-edit/);
        const row0 = cellA0Before.closest('[row-index="0"]');
        expect(row0).toHaveClass(/ag-row-batch-edit/);

        const cellB1Before = getByTestId(gridDiv, agTestIdFor.cell('ROW_1', 'b'));
        expect(cellB1Before).toHaveClass(/ag-cell-batch-edit/);
        const row1 = cellB1Before.closest('[row-index="1"]');
        expect(row1).toHaveClass(/ag-row-batch-edit/);

        // Cancel batch edit
        api.cancelBatchEdit();
        await asyncSetTimeout(0);

        // All batch edit styles should be removed
        const cellA0After = getByTestId(gridDiv, agTestIdFor.cell('ROW_0', 'a'));
        expect(cellA0After).not.toHaveClass(/ag-cell-batch-edit/);
        const row0After = cellA0After.closest('[row-index="0"]');
        expect(row0After).not.toHaveClass(/ag-row-batch-edit/);

        const cellB1After = getByTestId(gridDiv, agTestIdFor.cell('ROW_1', 'b'));
        expect(cellB1After).not.toHaveClass(/ag-cell-batch-edit/);
        const row1After = cellB1After.closest('[row-index="1"]');
        expect(row1After).not.toHaveClass(/ag-row-batch-edit/);

        // Values should revert to original
        expect(cellA0After).toHaveTextContent('A0');
        expect(cellB1After).toHaveTextContent('B1');

        // Underlying row data should reflect original values
        const rowData = api.getGridOption('rowData')!;
        expect(rowData[0].a).toBe('A0');
        expect(rowData[1].b).toBe('B1');
    });

    test('range Delete applies batch edit styles', async () => {
        const api = await rangeGridMgr.createGridAndWait('fullRowRangeBatch', {
            editType: 'fullRow',
            cellSelection: true,
            defaultColDef: { editable: true },
            columnDefs: [
                { field: 'a', editable: true },
                { field: 'b', editable: true },
            ],
            rowData: [
                { id: 'ROW_0', a: 'A0', b: 'B0' },
                { id: 'ROW_1', a: 'A1', b: 'B1' },
            ],
            getRowId: (params) => params.data.id,
        });
        const gridDiv = getGridElement(api)! as HTMLElement;
        const user = userEvent.setup({ skipHover: true });
        await asyncSetTimeout(0);

        api.startBatchEdit();

        // Select range and delete
        const cell = getByTestId(gridDiv, agTestIdFor.cell('ROW_0', 'a'));
        await user.click(cell);
        api.addCellRange({ rowStartIndex: 0, rowEndIndex: 1, columns: ['a'] });
        await user.keyboard('{Delete}');
        await asyncSetTimeout(0);

        // Cleared cells should have batch edit style
        const cellA0 = getByTestId(gridDiv, agTestIdFor.cell('ROW_0', 'a'));
        expect(cellA0).toHaveClass(/ag-cell-batch-edit/);

        const cellA1 = getByTestId(gridDiv, agTestIdFor.cell('ROW_1', 'a'));
        expect(cellA1).toHaveClass(/ag-cell-batch-edit/);

        // Column b cells should NOT have batch edit style
        const cellB0 = getByTestId(gridDiv, agTestIdFor.cell('ROW_0', 'b'));
        expect(cellB0).not.toHaveClass(/ag-cell-batch-edit/);

        // Commit should clear styles
        api.commitBatchEdit();
        await asyncSetTimeout(0);

        const cellA0After = getByTestId(gridDiv, agTestIdFor.cell('ROW_0', 'a'));
        expect(cellA0After).not.toHaveClass(/ag-cell-batch-edit/);
    });

    test('range Delete cancel reverts data and removes styles', async () => {
        const api = await rangeGridMgr.createGridAndWait('fullRowRangeCancel', {
            editType: 'fullRow',
            cellSelection: true,
            defaultColDef: { editable: true },
            columnDefs: [
                { field: 'a', editable: true },
                { field: 'b', editable: true },
            ],
            rowData: [
                { id: 'ROW_0', a: 'A0', b: 'B0' },
                { id: 'ROW_1', a: 'A1', b: 'B1' },
            ],
            getRowId: (params) => params.data.id,
        });
        const gridDiv = getGridElement(api)! as HTMLElement;
        const user = userEvent.setup({ skipHover: true });
        await asyncSetTimeout(0);

        api.startBatchEdit();

        // Select multi-column range and delete
        const cell = getByTestId(gridDiv, agTestIdFor.cell('ROW_0', 'a'));
        await user.click(cell);
        api.addCellRange({ rowStartIndex: 0, rowEndIndex: 1, columns: ['a', 'b'] });
        await user.keyboard('{Delete}');
        await asyncSetTimeout(0);

        // Verify batch styles on cleared cells
        const cellA0 = getByTestId(gridDiv, agTestIdFor.cell('ROW_0', 'a'));
        expect(cellA0).toHaveClass(/ag-cell-batch-edit/);

        // Cancel should revert everything
        api.cancelBatchEdit();
        await asyncSetTimeout(0);

        const cellA0After = getByTestId(gridDiv, agTestIdFor.cell('ROW_0', 'a'));
        expect(cellA0After).not.toHaveClass(/ag-cell-batch-edit/);
        expect(cellA0After).toHaveTextContent('A0');

        const cellB1After = getByTestId(gridDiv, agTestIdFor.cell('ROW_1', 'b'));
        expect(cellB1After).not.toHaveClass(/ag-cell-batch-edit/);
        expect(cellB1After).toHaveTextContent('B1');
    });
});
