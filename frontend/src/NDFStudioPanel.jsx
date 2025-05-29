import React, { useRef, useState, useEffect } from "react";
import CNLInput from "./CNLInput";
import NDFPreview from "./NDFPreview";

const NDFStudioPanel = ({ userId, graphId, graph, onGraphUpdate }) => {
  const containerRef = useRef(null);
  const [topHeight, setTopHeight] = useState(300); // Editor height
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = () => setIsDragging(true);

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const containerTop = containerRef.current.getBoundingClientRect().top;
    const newHeight = e.clientY - containerTop;
    setTopHeight(Math.max(newHeight, 100));
  };

  const handleMouseUp = () => setIsDragging(false);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full w-full bg-white border-r border-gray-300"
    >
      {/* Top: CNL Editor */}
      <div style={{ height: `${topHeight}px` }} className="overflow-auto">
        <CNLInput
          userId={userId}
          graphId={graphId}
          graph={graph}
          onGraphUpdate={onGraphUpdate}
        />
      </div>

      {/* Divider */}
      <div
        onMouseDown={handleMouseDown}
        className="h-2 cursor-row-resize bg-gray-400"
      ></div>

      {/* Bottom: Preview */}
      <div className="flex-1 overflow-auto">
          <NDFPreview
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
