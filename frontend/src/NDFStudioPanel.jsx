import React, { useRef, useState, useEffect } from "react";
import CNLInput from "./CNLInput";
import DevPanel from "./DevPanel";

const NDFStudioPanel = ({ userId, graphId, graph, onGraphUpdate }) => {
  const [forceUpdate, setForceUpdate] = useState(0);
  const forcePreviewReload = () => setForceUpdate(prev => prev + 1);
  const containerRef = useRef(null);
  const [topHeight, setTopHeight] = useState(300); // Editor height
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = () => setIsDragging(true);

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const containerTop = containerRef.current.getBoundingClientRect().top;
    const newHeight = e.clientY - containerTop;
    // Set min/max heights if desired
    setTopHeight(Math.max(100, Math.min(newHeight, (containerRef.current?.offsetHeight || 600) - 100)));
  };

  const handleMouseUp = () => setIsDragging(false);

  useEffect(() => {
    if (!isDragging) return;
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  // Responsive: detect mobile (simple check)
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

  return (
    <div
      ref={containerRef}
      className={`flex ${isMobile ? "flex-col" : "flex-col"} h-full w-full bg-white border-r border-gray-300`}
      style={{ minHeight: 0 }}
    >
      {/* Top: CNL Editor */}
      <div
        style={{
          height: isMobile ? "auto" : `${topHeight}px`,
          minHeight: 50,
          maxHeight: isMobile ? "none" : undefined,
        }}
        className="overflow-auto"
      >
        <CNLInput
          onAfterParse={forcePreviewReload}
          userId={userId}
          graphId={graphId}
          graph={graph}
          onGraphUpdate={onGraphUpdate}
        />
      </div>

      {/* Divider: hide on mobile */}
      {!isMobile && (
        <div
          onMouseDown={handleMouseDown}
          className="h-2 cursor-row-resize"
          style={{
            userSelect: "none",
            background: "linear-gradient(90deg, #b0b0b0 0%, #888 50%, #b0b0b0 100%)",
            borderTop: "2px solid #666",
            borderBottom: "2px solid #666",
            boxShadow: "0 2px 6px rgba(0,0,0,0.10)",
            zIndex: 10
          }}
        ></div>
      )}

      {/* Bottom: DevPanel (Tabbed) */}
      <div
        className="flex-1 overflow-auto"
        style={{
          minHeight: 50,
          height: isMobile ? "auto" : undefined,
        }}
      >
        <DevPanel
          userId={userId}
          graphId={graphId}
          graph={graph}
          onGraphUpdate={onGraphUpdate}
        />
      </div>
    </div>
  );
};

export default NDFStudioPanel;
