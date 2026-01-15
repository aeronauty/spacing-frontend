import { useSSP } from './hooks/useSSP';
import SSPPlot from './components/SSPPlot';
import ControlPanel from './components/ControlPanel';
import './App.css';

// Initial configuration with non-uniform spacing
const INITIAL_KNOTS = [
  { S: 0, F: 0.5 },
  { S: 0.3, F: 1.5 },
  { S: 0.7, F: 0.8 },
  { S: 1, F: 1.2 }
];

function App() {
  const {
    knots,
    n,
    si,
    updateKnot,
    addKnot,
    removeKnot,
    setN,
    importState,
    exportState,
    reset
  } = useSSP(INITIAL_KNOTS, 25);

  return (
    <div className="app">
      <header className="header">
        <h1>SSP: Position-Based Mesh Spacing</h1>
        <p className="subtitle">Interactive spacing editor based on Mark Drela's algorithm</p>
      </header>
      
      <main className="main">
        <div className="plot-container">
          <SSPPlot
            knots={knots}
            si={si}
            onKnotChange={updateKnot}
            onAddKnot={addKnot}
            onRemoveKnot={removeKnot}
          />
        </div>
        
        <aside className="controls-container">
          <ControlPanel
            n={n}
            si={si}
            onSetN={setN}
            onImport={importState}
            onExport={exportState}
            onReset={reset}
          />
        </aside>
      </main>
    </div>
  );
}

export default App;
