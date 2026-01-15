import React, { useState, useRef, useCallback } from 'react';
import type { SSPState, Knot } from '../types';

interface ControlPanelProps {
  n: number;
  si: number[];
  onSetN: (n: number) => void;
  onImport: (state: SSPState) => void;
  onExport: () => SSPState;
  onReset: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  n,
  si,
  onSetN,
  onImport,
  onExport,
  onReset
}) => {
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle n adjustment
  const decrementN = () => onSetN(n - 1);
  const incrementN = () => onSetN(n + 1);

  // Handle keyboard shortcuts for n
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === '+' || e.key === '=') {
        onSetN(n + 1);
      } else if (e.key === '-' || e.key === '_') {
        onSetN(n - 1);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [n, onSetN]);

  // Export as JSON file
  const handleExportJSON = useCallback(() => {
    const state = onExport();
    const json = JSON.stringify(state, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ssp-config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [onExport]);

  // Export si values as text
  const handleExportSi = useCallback(() => {
    const lines = ['# SSP Output Points (si)', `# n = ${si.length}`, ''];
    si.forEach((s, i) => {
      lines.push(`${(i + 1).toString().padStart(4)} ${s.toFixed(8)}`);
    });
    const text = lines.join('\n');
    navigator.clipboard.writeText(text);
    alert('Output points copied to clipboard!');
  }, [si]);

  // Copy config to clipboard
  const handleCopyConfig = useCallback(() => {
    const state = onExport();
    const lines = [
      '# SSP Knots',
      '# S       F',
      ...state.knots.map(k => `${k.S.toFixed(4).padStart(8)} ${k.F.toFixed(4).padStart(8)}`),
      `# n = ${state.n}`
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    alert('Configuration copied to clipboard!');
  }, [onExport]);

  // Import from file
  const handleFileImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        onImport(json);
        setImportError('');
        setShowImportModal(false);
      } catch (err) {
        setImportError('Invalid JSON file');
      }
    };
    reader.readAsText(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onImport]);

  // Parse and import text
  const handleTextImport = useCallback(() => {
    try {
      // Try JSON first
      try {
        const json = JSON.parse(importText);
        onImport(json);
        setImportError('');
        setShowImportModal(false);
        setImportText('');
        return;
      } catch {
        // Not JSON, try plain text format
      }

      // Parse plain text format
      const lines = importText.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
      const knots: Knot[] = [];
      let n = 25;

      for (const line of lines) {
        // Check for n = value
        const nMatch = line.match(/n\s*=\s*(\d+)/i);
        if (nMatch) {
          n = parseInt(nMatch[1], 10);
          continue;
        }

        // Parse S F values
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 2) {
          const S = parseFloat(parts[0]);
          const F = parseFloat(parts[1]);
          if (!isNaN(S) && !isNaN(F)) {
            knots.push({ S, F });
          }
        }
      }

      if (knots.length >= 2) {
        onImport({ knots, n });
        setImportError('');
        setShowImportModal(false);
        setImportText('');
      } else {
        setImportError('Need at least 2 knots');
      }
    } catch (err) {
      setImportError('Failed to parse input');
    }
  }, [importText, onImport]);

  return (
    <div style={styles.container}>
      {/* Point count controls */}
      <div style={styles.section}>
        <label style={styles.label}>Output Points (n):</label>
        <div style={styles.nControls}>
          <button 
            onClick={decrementN} 
            style={styles.button}
            disabled={n <= 2}
          >
            −
          </button>
          <span style={styles.nValue}>{n}</span>
          <button 
            onClick={incrementN} 
            style={styles.button}
            disabled={n >= 200}
          >
            +
          </button>
        </div>
        <span style={styles.hint}>Press +/− keys</span>
      </div>

      {/* Import/Export controls */}
      <div style={styles.section}>
        <label style={styles.label}>Data:</label>
        <div style={styles.buttonRow}>
          <button onClick={() => setShowImportModal(true)} style={styles.actionButton}>
            Import
          </button>
          <button onClick={handleExportJSON} style={styles.actionButton}>
            Export JSON
          </button>
          <button onClick={handleCopyConfig} style={styles.actionButton}>
            Copy Config
          </button>
          <button onClick={handleExportSi} style={styles.actionButton}>
            Copy si
          </button>
        </div>
      </div>

      {/* Reset */}
      <div style={styles.section}>
        <button onClick={onReset} style={styles.resetButton}>
          Reset
        </button>
      </div>

      {/* Instructions */}
      <div style={styles.instructions}>
        <strong>Controls:</strong>
        <ul style={styles.instructionList}>
          <li>Drag knots to adjust spacing</li>
          <li>Click on plot to add knot</li>
          <li>Shift+click or right-click knot to remove</li>
          <li>Green knots (endpoints) move vertically only</li>
        </ul>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Import Configuration</h3>
            
            <div style={styles.modalSection}>
              <label>Load JSON file:</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileImport}
                style={styles.fileInput}
              />
            </div>

            <div style={styles.modalSection}>
              <label>Or paste text:</label>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={`# SSP Knots
# S       F
0.0      0.5
0.3      1.5
1.0      1.0
# n = 25`}
                style={styles.textarea}
              />
              {importError && <p style={styles.error}>{importError}</p>}
              <button onClick={handleTextImport} style={styles.actionButton}>
                Import Text
              </button>
            </div>

            <button 
              onClick={() => {
                setShowImportModal(false);
                setImportError('');
                setImportText('');
              }} 
              style={styles.closeButton}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '16px',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
    minWidth: '200px'
  },
  section: {
    marginBottom: '16px'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: 'bold',
    fontSize: '14px',
    color: '#333'
  },
  nControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  nValue: {
    fontSize: '20px',
    fontWeight: 'bold',
    minWidth: '50px',
    textAlign: 'center'
  },
  button: {
    width: '36px',
    height: '36px',
    fontSize: '20px',
    fontWeight: 'bold',
    cursor: 'pointer',
    border: '1px solid #ccc',
    borderRadius: '4px',
    backgroundColor: '#fff'
  },
  hint: {
    fontSize: '11px',
    color: '#666',
    marginTop: '4px',
    display: 'block'
  },
  buttonRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px'
  },
  actionButton: {
    padding: '8px 12px',
    fontSize: '13px',
    cursor: 'pointer',
    border: '1px solid #ccc',
    borderRadius: '4px',
    backgroundColor: '#fff'
  },
  resetButton: {
    padding: '8px 16px',
    fontSize: '13px',
    cursor: 'pointer',
    border: '1px solid #d32f2f',
    borderRadius: '4px',
    backgroundColor: '#fff',
    color: '#d32f2f'
  },
  instructions: {
    marginTop: '24px',
    padding: '12px',
    backgroundColor: '#e3f2fd',
    borderRadius: '4px',
    fontSize: '12px'
  },
  instructionList: {
    margin: '8px 0 0 0',
    paddingLeft: '20px'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modal: {
    backgroundColor: '#fff',
    padding: '24px',
    borderRadius: '8px',
    width: '400px',
    maxWidth: '90%'
  },
  modalTitle: {
    margin: '0 0 16px 0'
  },
  modalSection: {
    marginBottom: '16px'
  },
  fileInput: {
    display: 'block',
    marginTop: '8px'
  },
  textarea: {
    width: '100%',
    height: '150px',
    marginTop: '8px',
    marginBottom: '8px',
    fontFamily: 'monospace',
    fontSize: '12px',
    padding: '8px',
    boxSizing: 'border-box'
  },
  error: {
    color: '#d32f2f',
    fontSize: '12px',
    margin: '4px 0'
  },
  closeButton: {
    padding: '8px 16px',
    fontSize: '13px',
    cursor: 'pointer',
    border: '1px solid #ccc',
    borderRadius: '4px',
    backgroundColor: '#fff',
    marginTop: '8px'
  }
};

export default ControlPanel;
