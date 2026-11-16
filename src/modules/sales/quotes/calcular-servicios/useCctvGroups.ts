import { useCallback, useMemo, useState } from 'react';
import type { CameraGroup, DifficultyState, DvrGroup, Items, MaterialState } from './types';
import type { Actions } from './cards';
import type { SystemType } from './catalog';
import { SYSTEMS } from './catalog';
import { createCamera, createDvr, uid } from './calc';

const setAllTasks = (items: Items, selected: boolean): Items =>
  Object.fromEntries(Object.entries(items).map(([key, task]) => [key, { ...task, selected }]));

export interface UseCctvGroupsProps {
  initialGroups?: DvrGroup[];
  system: SystemType;
  getActiveCameraTasks?: () => string[] | undefined;
}

export function useCctvGroups({
  initialGroups,
  system,
  getActiveCameraTasks,
}: UseCctvGroupsProps) {
  const [dvrGroups, setDvrGroups] = useState<DvrGroup[]>(
    () => initialGroups ?? [createDvr('DVR / NVR 1', system, false, 4)],
  );
  const [copySource, setCopySource] = useState<{ dvrId: string; camId: string } | null>(null);

  const actions = useMemo<Actions>(() => {
    const mapDvr = (id: string, fn: (d: DvrGroup) => DvrGroup) =>
      setDvrGroups(prev => prev.map(d => (d.id === id ? fn(d) : d)));
    const mapCamera = (dvrId: string, camId: string, fn: (c: CameraGroup) => CameraGroup) =>
      mapDvr(dvrId, d => ({ ...d, cameras: d.cameras.map(c => (c.id === camId ? fn(c) : c)) }));

    return {
      updateDvr: (id, patch) => mapDvr(id, d => ({ ...d, ...patch })),
      removeDvr: id => setDvrGroups(prev => prev.filter(d => d.id !== id)),
      patchDvrDifficulty: (id, key, patch) =>
        mapDvr(id, d => ({ ...d, difficulties: { ...d.difficulties, [key]: { ...d.difficulties[key], ...patch } } })),
      patchDvrTask: (id, key, patch) =>
        mapDvr(id, d => ({ ...d, maintenance: { ...d.maintenance, [key]: { ...d.maintenance[key], ...patch } } })),
      addCamera: (dvrId, sys) => {
        const defaultTasks = getActiveCameraTasks ? getActiveCameraTasks() : undefined;
        mapDvr(dvrId, d => ({
          ...d,
          cameras: [...d.cameras, createCamera(`Cámara ${d.cameras.length + 1}`, sys, true, defaultTasks)],
        }));
      },
      addCameras: (dvrId, count, sys) => {
        const defaultTasks = getActiveCameraTasks ? getActiveCameraTasks() : undefined;
        mapDvr(dvrId, d => ({
          ...d,
          cameras: [
            ...d.cameras,
            ...Array.from({ length: Math.max(1, Math.min(20, count)) }, (_, i) =>
              createCamera(`Cámara ${d.cameras.length + i + 1}`, sys, false, defaultTasks)),
          ],
        }));
      },
      openCopyCamera: (dvrId, camId) => setCopySource({ dvrId, camId }),
      duplicateCamera: (dvrId, camId) => mapDvr(dvrId, d => {
        const index = d.cameras.findIndex(camera => camera.id === camId);
        if (index < 0) return d;

        const source = d.cameras[index];
        const copy: CameraGroup = {
          ...source,
          id: uid(),
          label: `${source.label || 'Cámara'} (copia)`,
          expanded: true,
          photos: [],
          note: '',
          difficultyPhoto: null,
          difficultyNote: '',
          tasks: Object.fromEntries(Object.entries(source.tasks).map(([key, task]) => [key, { ...task }])),
          difficulties: Object.fromEntries(Object.entries(source.difficulties).map(([key, diff]) => [key, { ...diff }])),
        };

        const cameras = [...d.cameras];
        cameras.splice(index + 1, 0, copy);
        return { ...d, cameras };
      }),
      applyCameraToSelected: (dvrId, camId, targetIds) => mapDvr(dvrId, d => {
        const source = d.cameras.find(camera => camera.id === camId);
        if (!source) return d;

        const targets = new Set(targetIds);
        return {
          ...d,
          cameras: d.cameras.map(camera => targets.has(camera.id) ? {
            ...camera,
            distance: source.distance,
            height: source.height,
            cableDistance: source.cableDistance,
            cableHeight: source.cableHeight,
            tasks: Object.fromEntries(Object.entries(source.tasks).map(([key, task]) => [key, { ...task }])),
            difficulties: Object.fromEntries(Object.entries(source.difficulties).map(([key, diff]) => [key, { ...diff }])),
          } : camera),
        };
      }),
      fullMaintenance: (dvrId) => setDvrGroups(prev => {
        const scope = prev.filter(dvr => !dvrId || dvr.id === dvrId);
        const allOn = scope.every(dvr =>
          Object.values(dvr.maintenance).every(task => task.selected)
          && dvr.cameras.every(camera => Object.values(camera.tasks).every(task => task.selected)));
        const selected = !allOn;

        return prev.map(dvr => (dvrId && dvr.id !== dvrId ? dvr : {
          ...dvr,
          maintenance: setAllTasks(dvr.maintenance, selected),
          cameras: dvr.cameras.map(camera => ({ ...camera, tasks: setAllTasks(camera.tasks, selected) })),
        }));
      }),
      updateCamera: (dvrId, camId, patch) => mapCamera(dvrId, camId, c => ({ ...c, ...patch })),
      removeCamera: (dvrId, camId) =>
        mapDvr(dvrId, d => ({ ...d, cameras: d.cameras.filter(c => c.id !== camId) })),
      patchCameraTask: (dvrId, camId, key, patch) =>
        mapCamera(dvrId, camId, c => ({ ...c, tasks: { ...c.tasks, [key]: { ...c.tasks[key], ...patch } } })),
      patchCameraDifficulty: (dvrId, camId, key, patch) =>
        mapCamera(dvrId, camId, c => ({ ...c, difficulties: { ...c.difficulties, [key]: { ...c.difficulties[key], ...patch } } })),
    };
  }, [getActiveCameraTasks]);

  const addDvrGroup = useCallback(() => {
    const { deviceName } = SYSTEMS[system];
    const defaultTasks = getActiveCameraTasks ? getActiveCameraTasks() : undefined;
    setDvrGroups(prev => [...prev, createDvr(`${deviceName} ${prev.length + 1}`, system, true, 0, defaultTasks)]);
  }, [system, getActiveCameraTasks]);

  const copyTarget = useMemo(() => {
    if (!copySource) return null;
    const dvr = dvrGroups.find(group => group.id === copySource.dvrId);
    const cam = dvr?.cameras.find(camera => camera.id === copySource.camId);
    return dvr && cam ? { dvr, cam } : null;
  }, [copySource, dvrGroups]);

  return {
    dvrGroups,
    setDvrGroups,
    actions,
    addDvrGroup,
    copySource,
    setCopySource,
    copyTarget,
  };
}
