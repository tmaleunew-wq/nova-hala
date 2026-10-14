import { useState, useEffect } from "react";
import * as THREE from "three";
import { ARViewer } from "@/components/configurator/ARViewer";
import { exportToGlb } from "@/lib/garage/arExporter";

interface ArModalProps {
  isOpen: boolean;
  onClose: () => void;
  exportRef: React.RefObject<THREE.Group | null>;
  hallName?: string;
}

export function ArModal({ isOpen, onClose, exportRef, hallName = "Garáž" }: ArModalProps) {
  const [glbUrl, setGlbUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!isOpen || !exportRef.current) return;
    let active = true;
    setIsGenerating(true);

    exportToGlb(exportRef.current)
      .then((blob) => {
        if (!active) return;
        const url = URL.createObjectURL(blob);
        setGlbUrl(url);
      })
      .catch((err) => {
        console.error("Chyba pri generovaní AR GLB:", err);
      })
      .finally(() => {
        if (active) setIsGenerating(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, exportRef]);

  return (
    <ARViewer
      open={isOpen}
      onClose={onClose}
      glbUrl={glbUrl}
      isGenerating={isGenerating}
      primaryColor="#10b981"
      title={`Zobraziť v AR — ${hallName}`}
      description={`Vizualizujte halu ${hallName} priamo vo vašom priestore`}
    />
  );
}
export default ArModal;
