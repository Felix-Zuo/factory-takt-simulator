import { useEffect } from 'react';
import { useFactoryStore } from '../store/factoryStore';

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
};

export function useKeyboardShortcuts() {
  const undo = useFactoryStore((state) => state.undo);
  const redo = useFactoryStore((state) => state.redo);
  const start = useFactoryStore((state) => state.start);
  const pause = useFactoryStore((state) => state.pause);
  const resetSimulation = useFactoryStore((state) => state.resetSimulation);
  const saveScenario = useFactoryStore((state) => state.saveScenario);
  const deleteNode = useFactoryStore((state) => state.deleteNode);
  const deleteEdge = useFactoryStore((state) => state.deleteEdge);
  const selectNode = useFactoryStore((state) => state.selectNode);
  const selectEdge = useFactoryStore((state) => state.selectEdge);
  const selectedNodeId = useFactoryStore((state) => state.selectedNodeId);
  const selectedEdgeId = useFactoryStore((state) => state.selectedEdgeId);
  const isRunning = useFactoryStore((state) => state.isRunning);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      const key = event.key.toLowerCase();

      if ((event.ctrlKey || event.metaKey) && key === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && key === 'y') {
        event.preventDefault();
        redo();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && key === 's') {
        event.preventDefault();
        saveScenario();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && key === 'r') {
        event.preventDefault();
        resetSimulation();
        return;
      }

      if (event.key === ' ' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        if (isRunning) pause();
        else start();
        return;
      }

      if (event.key === 'Escape') {
        selectNode(null);
        selectEdge(null);
        return;
      }

      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedNodeId) {
        event.preventDefault();
        deleteNode(selectedNodeId);
        return;
      }

      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedEdgeId) {
        event.preventDefault();
        deleteEdge(selectedEdgeId);
      }
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [
    deleteEdge,
    deleteNode,
    isRunning,
    pause,
    redo,
    resetSimulation,
    saveScenario,
    selectEdge,
    selectNode,
    selectedEdgeId,
    selectedNodeId,
    start,
    undo,
  ]);
}
