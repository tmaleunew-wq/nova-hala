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
    if (!isOpen) {
      setGlbUrl(null);
      setIsGenerating(false);
      return;
    }

    let active = true;
    setIsGenerating(true);

    const tryExport = async () => {
      // Pri otvorení cez QR kód (?ar=1) trvá 1-3 sekundy, kým sa 3D Canvas scéna v mobile inicializuje
      const maxAttempts = 60; // 60 * 200ms = 12 sekúnd
      let attempts = 0;

      while (active && attempts < maxAttempts) {
        if (exportRef.current && exportRef.current.children.length > 0) {
          try {
            const blob = await exportToGlb(exportRef.current);
            if (!active) return;
            const url = URL.createObjectURL(blob);
            setGlbUrl(url);
            setIsGenerating(false);
            return;
          } catch (err) {
            console.error("Chyba pri generovaní AR GLB:", err);
            if (!active) return;
            setIsGenerating(false);
            return;
          }
        }
        attempts++;
        await new Promise((r) => setTimeout(r, 200));
      }

      if (active) {
        console.warn("AR exportRef timed out");
        setIsGenerating(false);
      }
    };

    tryExport();

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
