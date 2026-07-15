"use client";

import { useRef, useState, type DragEvent } from "react";

/**
 * Drag-and-drop file target: spread `props` on the drop element and style
 * the dragover state with `over`. Uses an enter/leave depth counter so
 * dragging across child elements doesn't flicker the state.
 */
const hasFiles = (e: DragEvent) => e.dataTransfer.types.includes("Files");

export function useDropzone(onFiles: (files: FileList) => void) {
  const [over, setOver] = useState(false);
  const depth = useRef(0);
  return {
    over,
    props: {
      onDragEnter: (e: DragEvent) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        depth.current += 1;
        setOver(true);
      },
      onDragOver: (e: DragEvent) => {
        if (hasFiles(e)) e.preventDefault();
      },
      onDragLeave: () => {
        depth.current -= 1;
        if (depth.current <= 0) {
          depth.current = 0;
          setOver(false);
        }
      },
      onDrop: (e: DragEvent) => {
        e.preventDefault();
        depth.current = 0;
        setOver(false);
        if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
      },
    },
  };
}
