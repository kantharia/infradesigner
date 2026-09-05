import { ReactFlowProvider } from '@xyflow/react';
import { Canvas } from './components/canvas/Canvas';
import { ComponentPalette } from './components/palette/ComponentPalette';
import { Inspector } from './components/inspector/Inspector';
import { Toolbar } from './components/toolbar/Toolbar';
import { StartScreen } from './components/start/StartScreen';
import { useCanvasStore } from './store/canvasStore';

export default function App() {
  const sessionOpen = useCanvasStore((s) => s.sessionOpen);
  const currentId = useCanvasStore((s) => s.currentId);

  if (!sessionOpen) {
    return <StartScreen />;
  }

  return (
    <div
      className="flex h-screen w-screen flex-col overflow-hidden"
      style={{ background: 'var(--surface-0)', fontFamily: 'var(--font-ui)' }}
    >
      <Toolbar />
      <div className="flex min-h-0 flex-1">
        <ComponentPalette />
        <div className="min-w-0 flex-1">
          <ReactFlowProvider>
            <Canvas key={currentId ?? 'draft'} />
          </ReactFlowProvider>
        </div>
        <Inspector />
      </div>
    </div>
  );
}
