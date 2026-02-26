import { useState, useMemo } from 'react';

interface TableBlockProps {
  block: {
    id: string;
    content: string;
  };
  onUpdate: (content: string) => void;
}

interface TableData {
  rows: number;
  cols: number;
  cells: string[][];
}

export function TableBlock({ block, onUpdate }: TableBlockProps) {
  const tableData = useMemo<TableData>(() => {
    if (block.content) {
      try {
        return JSON.parse(block.content);
      } catch {
        return { rows: 3, cols: 3, cells: Array(3).fill(null).map(() => Array(3).fill('')) };
      }
    }
    return { rows: 3, cols: 3, cells: Array(3).fill(null).map(() => Array(3).fill('')) };
  }, [block.content]);

  const [data, setData] = useState<TableData>(tableData);

  const updateCell = (row: number, col: number, value: string) => {
    const newCells = data.cells.map((r, ri) => 
      ri === row ? r.map((c, ci) => ci === col ? value : c) : r
    );
    const newData = { ...data, cells: newCells };
    setData(newData);
    onUpdate(JSON.stringify(newData));
  };

  const addRow = () => {
    const newCells = [...data.cells, Array(data.cols).fill('')];
    const newData = { ...data, rows: data.rows + 1, cells: newCells };
    setData(newData);
    onUpdate(JSON.stringify(newData));
  };

  const addCol = () => {
    const newCells = data.cells.map(row => [...row, '']);
    const newData = { ...data, cols: data.cols + 1, cells: newCells };
    setData(newData);
    onUpdate(JSON.stringify(newData));
  };

  const deleteRow = (index: number) => {
    if (data.rows <= 1) return;
    const newCells = data.cells.filter((_, i) => i !== index);
    const newData = { ...data, rows: data.rows - 1, cells: newCells };
    setData(newData);
    onUpdate(JSON.stringify(newData));
  };

  const deleteCol = (index: number) => {
    if (data.cols <= 1) return;
    const newCells = data.cells.map(row => row.filter((_, i) => i !== index));
    const newData = { ...data, cols: data.cols - 1, cells: newCells };
    setData(newData);
    onUpdate(JSON.stringify(newData));
  };

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={addRow}
          className="px-2 py-1 text-xs bg-surface hover:bg-hover rounded"
          title="Add row"
        >
          + Row
        </button>
        <button
          onClick={addCol}
          className="px-2 py-1 text-xs bg-surface hover:bg-hover rounded"
          title="Add column"
        >
          + Column
        </button>
      </div>
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse border border-gray-200">
          <tbody>
            {data.cells.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, colIndex) => (
                  <td 
                    key={colIndex} 
                    className="border border-gray-200 p-0 relative group"
                  >
                    <input
                      className="w-full px-3 py-2 outline-none bg-transparent"
                      value={cell}
                      onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                      placeholder={rowIndex === 0 ? `Header ${colIndex + 1}` : ''}
                    />
                    <button
                      onClick={() => deleteCol(colIndex)}
                      className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-xs opacity-0 group-hover:opacity-100 cursor-pointer"
                      title="Delete column"
                    >
                      ×
                    </button>
                  </td>
                ))}
                <td className="border-none p-1 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => deleteRow(rowIndex)}
                    className="w-6 h-6 bg-red-500 text-white text-xs rounded flex items-center justify-center"
                    title="Delete row"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
