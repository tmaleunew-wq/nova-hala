import { useOpeningDrag } from './useOpeningDrag';
import { useEffect, useMemo, useState, type RefObject } from 'react';
import { DoubleSide, Group } from 'three';
import { Html } from '@react-three/drei';
import { Edit3, RefreshCw, Copy, Trash2, X } from 'lucide-react';
import type { Bay, Opening } from '@/lib/garage/openingSystem';
import { splitBayPanels } from '@/lib/garage/openingSystem';
import { addHotspotPosition, gridBubbles } from '@/lib/garage/surfaceHotspotLayout';
import catalog from '@/config/openingsCatalog.json';
import { SurfaceHotspot } from './SurfaceHotspot';

export function OpeningHotspots({ bays, openings, enabled, onAdd, onEdit, onReplace, onAddAtCoords, onDuplicate, onDelete, modelRef, templateId, replacedWindowIds = [], onMove }: {
  bays: Bay[]; openings: Opening[]; enabled: boolean;
  modelRef?: RefObject<Group | null>; templateId?: string;
  replacedWindowIds?: string[];
  onAdd: (bay: Bay, coords?: { x: number; y: number }) => void;
  onEdit: (opening: Opening) => void;
  onReplace?: (opening: Opening) => void;
  onAddAtCoords?: (bay: Bay, categoryId: string, coords: { x: number; y: number }) => void;
  onDuplicate?: (opening: Opening) => void;
  onDelete?: (opening: Opening) => void;
  onMove?: (id: string, coords: { x: number; y: number }) => void;
}) {
  const [hoveredBayId, setHoveredBayId] = useState<string | null>(null);
  const [hoveredOpeningId, setHoveredOpeningId] = useState<string | null>(null);
  const [selectedOpeningId, setSelectedOpeningId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedOpeningId(null);
  }, [templateId, enabled]);

  const dragHandlers = useOpeningDrag(onMove);

  const bubbles = useMemo(() => gridBubbles(bays), [bays]);

  // Single authoritative source of truth: bay elements directly from openings state
  const bayElements = useMemo(() => {
    const map = new Map<string, Opening[]>();
    for (const bay of bays) {
      map.set(bay.id, openings.filter(o => o.bayId === bay.id));
    }
    return map;
  }, [bays, openings]);

  // Compute free area for "+" hotspots on each bay
  const points = useMemo(() => bays.map(bay => {
    const elements = bayElements.get(bay.id) || [];
    const free = splitBayPanels(bay.width, bay.height, elements);
    const canAdd = catalog.categories.some(c => c.roof === bay.roof && free.some(r => r.width >= c.minWidth + .2 && r.height >= c.minHeight + .1));
    const validFree = free.filter(r => r.width >= 0.6 && r.height >= 0.6);
    const largestFree = validFree.length > 0 ? validFree.reduce((a, b) => a.width * a.height >= b.width * b.height ? a : b) : null;
    return {
      bay,
      elements,
      freeCoords: largestFree ? { x: largestFree.x + largestFree.width / 2, y: largestFree.y + largestFree.height / 2 } : undefined,
      addPosition: canAdd ? addHotspotPosition(bay, elements) : null
    };
  }), [bays, bayElements]);

  if (!enabled) return null;

  return <group name="surface-opening-hotspots">
    {/* 1. Interactive Plus Hotspots on Free Wall & Roof Areas */}
    {points.map(({ bay, freeCoords, addPosition }) => (
      addPosition && (
        <SurfaceHotspot
          key={`add-${bay.id}`}
          position={addPosition}
          normal={bay.normal}
          label="+"
          onActivate={() => onAdd(bay, freeCoords)}
        />
      )
    ))}

    {/* 2. Interactive Selection & Context Actions on Existing Openings + Wall Surface Click */}
    {bays.map(bay => {
      const elements = bayElements.get(bay.id) || [];
      const isHovered = hoveredBayId === bay.id;

      return (
        <group key={bay.id} position={bay.position3D} rotation={bay.rotation}>
          {/* Wall surface click to open catalog */}
          <mesh
            position={[0, 0, 0.03]}
            onPointerOver={e => {
              e.stopPropagation();
              setHoveredBayId(bay.id);
            }}
            onPointerOut={() => {
              if (hoveredBayId === bay.id) setHoveredBayId(null);
            }}
            onClick={e => {
              if (e.delta > 10) return;
              e.stopPropagation();
              setSelectedOpeningId(null);
              onAdd(bay);
            }}
          >
            <planeGeometry args={[bay.width, bay.height]} />
            <meshBasicMaterial
              color="#38bdf8"
              transparent
              opacity={isHovered ? 0.06 : 0.001}
              depthWrite={false}
              side={DoubleSide}
            />
          </mesh>

          {/* Interactive Hitbox over existing openings */}
          {elements.map(opening => {
            const isSelected = selectedOpeningId === opening.id;
            const isHoveredOp = hoveredOpeningId === opening.id;
            const opCenterX = opening.x + opening.width / 2 - bay.width / 2;
            const opCenterY = opening.y + opening.height / 2 - bay.height / 2;

            return (
              <group key={opening.id} position={[opCenterX, opCenterY, 0.12]}>
                {/* Raycast hitmesh for opening */}
                <mesh
                  {...dragHandlers(opening)}
                  onPointerOver={e => {
                    e.stopPropagation();
                    setHoveredOpeningId(opening.id);
                  }}
                  onPointerOut={() => {
                    if (hoveredOpeningId === opening.id) setHoveredOpeningId(null);
                  }}
                  onClick={e => {
                    if (e.delta > 15) return;
                    e.stopPropagation();
                    setSelectedOpeningId(opening.id);
                  }}
                >
                  <boxGeometry args={[opening.width, opening.height, 0.14]} />
                  <meshBasicMaterial
                    color="#38bdf8"
                    transparent
                    opacity={isSelected ? 0.2 : isHoveredOp ? 0.12 : 0.001}
                    depthWrite={false}
                  />
                </mesh>

                {/* 3D selection outline */}
                {(isSelected || isHoveredOp) && (
                  <mesh position={[0, 0, 0.02]}>
                    <planeGeometry args={[opening.width + 0.08, opening.height + 0.08]} />
                    <meshBasicMaterial color={isSelected ? "#38bdf8" : "#f59e0b"} wireframe side={DoubleSide} />
                  </mesh>
                )}

                {/* Floating CAD Action Bar for selected opening */}
                {isSelected && (
                  <Html center distanceFactor={14} position={[0, opening.height / 2 + 0.35, 0]} zIndexRange={[70, 0]}>
                    <div className="bg-slate-900/95 backdrop-blur-md text-white border border-sky-400/50 rounded-xl shadow-2xl p-2 flex items-center gap-1.5 pointer-events-auto select-none">
                      <div className="text-[11px] font-bold px-2 py-1 bg-sky-950/80 border border-sky-500/30 rounded-lg text-sky-300 flex items-center gap-1">
                        <span>{opening.category === 'door' ? '🚪 Dvere' : opening.category === 'sectional' ? '🏭 Brána' : opening.category === 'sliding' ? '↔️ Brána' : opening.category === 'roller' ? '🔄 Brána' : opening.category === 'skylight' ? '☀️ Svetlík' : opening.category === 'dock' ? '🚛 Rampa' : '🪟 Okno'}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({opening.width.toFixed(2)}×{opening.height.toFixed(2)}m)</span>
                      </div>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          onEdit(opening);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow transition cursor-pointer"
                        title="Upraviť rozmery a parapet"
                      >
                        <Edit3 size={13} />
                        <span>Upraviť</span>
                      </button>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          if (onReplace) onReplace(opening);
                          else onEdit(opening);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow transition cursor-pointer"
                        title="Nahradiť typ z katalógu (brána, okno, dvere...)"
                      >
                        <RefreshCw size={13} />
                        <span>Nahradiť typ</span>
                      </button>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          if (onDuplicate) onDuplicate(opening);
                          else onEdit(opening);
                        }}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer"
                        title="Duplikovať otvor"
                      >
                        <Copy size={13} />
                        <span>Duplikovať</span>
                      </button>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          if (onDelete) onDelete(opening);
                          setSelectedOpeningId(null);
                        }}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-xs font-medium transition cursor-pointer"
                        title="Odstrániť otvor"
                      >
                        <Trash2 size={13} />
                        <span>Odstrániť</span>
                      </button>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedOpeningId(null);
                        }}
                        className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
                        title="Zavrieť"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </Html>
                )}
              </group>
            );
          })}
        </group>
      );
    })}

    {/* 3. Axis orientation labels */}
    {bubbles.map(bubble => (
      <SurfaceHotspot key={bubble.id} position={bubble.position} normal={bubble.normal} label={bubble.label} axis />
    ))}
  </group>;
}
