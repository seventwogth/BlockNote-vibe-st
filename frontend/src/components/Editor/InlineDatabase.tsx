import { useState } from 'react';

type PropertyType = 'text' | 'number' | 'select' | 'date' | 'checkbox' | 'url' | 'email' | 'relation';

interface DatabaseProperty {
  id: string;
  name: string;
  type: PropertyType;
  options?: string[];
}

interface DatabaseRow {
  id: string;
  values: Record<string, string | number | boolean>;
}

interface DatabaseView {
  type: 'table' | 'board' | 'gallery';
}

interface InlineDatabaseProps {
  onClose?: () => void;
}

const INITIAL_PROPERTIES: DatabaseProperty[] = [
  { id: 'name', name: 'Name', type: 'text' },
  { id: 'status', name: 'Status', type: 'select', options: ['Not started', 'In progress', 'Done'] },
  { id: 'priority', name: 'Priority', type: 'select', options: ['Low', 'Medium', 'High'] },
];

const INITIAL_ROWS: DatabaseRow[] = [
  { id: '1', values: { name: 'Task 1', status: 'In progress', priority: 'High' } },
  { id: '2', values: { name: 'Task 2', status: 'Not started', priority: 'Low' } },
  { id: '3', values: { name: 'Task 3', status: 'Done', priority: 'Medium' } },
];

export function InlineDatabase({ onClose }: InlineDatabaseProps) {
  const [properties, setProperties] = useState<DatabaseProperty[]>(INITIAL_PROPERTIES);
  const [rows, setRows] = useState<DatabaseRow[]>(INITIAL_ROWS);
  const [view, setView] = useState<DatabaseView['type']>('table');
  const [_selectedRow, setSelectedRow] = useState<string | null>(null);
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [newPropertyName, setNewPropertyName] = useState('');
  const [newPropertyType, setNewPropertyType] = useState<PropertyType>('text');

  const handleAddRow = () => {
    const newRow: DatabaseRow = {
      id: `row-${Date.now()}`,
      values: properties.reduce((acc, prop) => ({ ...acc, [prop.id]: '' }), {}),
    };
    setRows([...rows, newRow]);
  };

  const handleDeleteRow = (rowId: string) => {
    setRows(rows.filter(r => r.id !== rowId));
  };

  const handleCellChange = (rowId: string, propertyId: string, value: string | number | boolean) => {
    setRows(rows.map(row => 
      row.id === rowId 
        ? { ...row, values: { ...row.values, [propertyId]: value } }
        : row
    ));
  };

  const handleAddProperty = () => {
    if (!newPropertyName.trim()) return;
    const newProp: DatabaseProperty = {
      id: `prop-${Date.now()}`,
      name: newPropertyName,
      type: newPropertyType,
    };
    setProperties([...properties, newProp]);
    setNewPropertyName('');
    setShowAddProperty(false);
  };

  const handleDeleteProperty = (propertyId: string) => {
    setProperties(properties.filter(p => p.id !== propertyId));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Done': return 'bg-green-100 text-green-700';
      case 'In progress': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'text-red-500';
      case 'Medium': return 'text-yellow-500';
      default: return 'text-green-500';
    }
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="bg-surface border-b border-border p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">📊</span>
          <input
            type="text"
            defaultValue="Database"
            className="font-medium bg-transparent border-none outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-border rounded overflow-hidden">
            {(['table', 'board', 'gallery'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1 text-sm ${view === v ? 'bg-primary text-white' : 'hover:bg-hover'}`}
              >
                {v === 'table' ? '▦' : v === 'board' ? '▤' : '▣'}
              </button>
            ))}
          </div>
          <button
            onClick={onClose}
            className="px-2 py-1 text-text-secondary hover:text-text"
          >
            ✕
          </button>
        </div>
      </div>

      {view === 'table' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-gray-50">
                <th className="w-8 p-2"></th>
                {properties.map(prop => (
                  <th key={prop.id} className="p-2 text-left font-medium min-w-[120px]">
                    <div className="flex items-center gap-1">
                      <span>{prop.name}</span>
                      <button
                        onClick={() => handleDeleteProperty(prop.id)}
                        className="text-text-secondary hover:text-red-500 opacity-0 group-hover:opacity-100"
                      >
                        ×
                      </button>
                    </div>
                  </th>
                ))}
                <th className="w-8 p-2">
                  <button
                    onClick={() => setShowAddProperty(true)}
                    className="text-text-secondary hover:text-text"
                    title="Add property"
                  >
                    +
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id} className="border-b border-border hover:bg-hover group">
                  <td className="p-2 text-center">
                    <button
                      onClick={() => handleDeleteRow(row.id)}
                      className="text-text-secondary hover:text-red-500 opacity-0 group-hover:opacity-100"
                    >
                      ×
                    </button>
                  </td>
                  {properties.map(prop => (
                    <td key={prop.id} className="p-2">
                      {prop.type === 'select' && prop.options ? (
                        <select
                          value={row.values[prop.id] as string || ''}
                          onChange={(e) => handleCellChange(row.id, prop.id, e.target.value)}
                          className="w-full px-2 py-1 border border-border rounded text-sm bg-surface"
                        >
                          <option value="">Select...</option>
                          {prop.options.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : prop.type === 'checkbox' ? (
                        <input
                          type="checkbox"
                          checked={row.values[prop.id] as boolean || false}
                          onChange={(e) => handleCellChange(row.id, prop.id, e.target.checked)}
                          className="w-4 h-4"
                        />
                      ) : (
                        <input
                          type={prop.type === 'number' ? 'number' : 'text'}
                          value={row.values[prop.id] as string || ''}
                          onChange={(e) => handleCellChange(row.id, prop.id, 
                            prop.type === 'number' ? Number(e.target.value) : e.target.value
                          )}
                          className="w-full px-2 py-1 border border-border rounded text-sm bg-surface focus:outline-none focus:border-primary"
                          placeholder="Empty"
                        />
                      )}
                    </td>
                  ))}
                  <td></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-2 border-t border-border">
            <button
              onClick={handleAddRow}
              className="px-3 py-1 text-sm text-text-secondary hover:text-text hover:bg-hover rounded"
            >
              + Add a row
            </button>
          </div>
        </div>
      )}

      {view === 'board' && (
        <div className="flex gap-4 p-4 overflow-x-auto min-h-[300px]">
          {properties.find(p => p.type === 'select')?.options?.map(option => (
            <div key={option} className="flex-shrink-0 w-64">
              <div className="font-medium text-sm mb-2 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${getStatusColor(option).split(' ')[0].replace('bg-', 'bg-')}`} />
                {option}
                <span className="text-text-secondary text-xs">
                  ({rows.filter(r => r.values[properties.find(p => p.type === 'select')?.id || ''] === option).length})
                </span>
              </div>
              <div className="space-y-2">
                {rows
                  .filter(r => r.values[properties.find(p => p.type === 'select')?.id || ''] === option)
                  .map(row => (
                    <div
                      key={row.id}
                      className="bg-white border border-border rounded p-3 shadow-sm hover:shadow cursor-pointer"
                      onClick={() => setSelectedRow(row.id)}
                    >
                      <div className="font-medium text-sm">
                        {row.values['name'] as string || 'Untitled'}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {view === 'gallery' && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
          {rows.map(row => (
            <div
              key={row.id}
              className="bg-white border border-border rounded overflow-hidden hover:shadow cursor-pointer"
              onClick={() => setSelectedRow(row.id)}
            >
              <div className="h-24 bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center text-4xl">
                📄
              </div>
              <div className="p-3">
                <div className="font-medium text-sm">
                  {row.values['name'] as string || 'Untitled'}
                </div>
                {row.values['status'] && (
                  <span className={`inline-block mt-2 px-2 py-0.5 text-xs rounded ${getStatusColor(row.values['status'] as string)}`}>
                    {row.values['status'] as string}
                  </span>
                )}
                {row.values['priority'] && (
                  <span className={`inline-block mt-1 ml-1 text-xs ${getPriorityColor(row.values['priority'] as string)}`}>
                    {row.values['priority'] as string}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddProperty && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-lg shadow-lg p-4 w-72">
            <h3 className="font-medium mb-3">Add property</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={newPropertyName}
                onChange={(e) => setNewPropertyName(e.target.value)}
                placeholder="Property name"
                className="w-full px-3 py-2 border border-border rounded text-sm"
                autoFocus
              />
              <select
                value={newPropertyType}
                onChange={(e) => setNewPropertyType(e.target.value as PropertyType)}
                className="w-full px-3 py-2 border border-border rounded text-sm"
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="select">Select</option>
                <option value="date">Date</option>
                <option value="checkbox">Checkbox</option>
                <option value="url">URL</option>
                <option value="email">Email</option>
              </select>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowAddProperty(false)}
                className="flex-1 px-3 py-2 text-sm border border-border rounded hover:bg-hover"
              >
                Cancel
              </button>
              <button
                onClick={handleAddProperty}
                className="flex-1 px-3 py-2 text-sm bg-primary text-white rounded hover:opacity-90"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
