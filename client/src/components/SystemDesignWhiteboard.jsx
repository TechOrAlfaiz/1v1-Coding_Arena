import React, { useState, useRef } from 'react';

const NODE_TYPES = [
  { type: 'client', label: 'Client / App', icon: '📱', color: 'border-[var(--border)] bg-[var(--surface-raised)] text-[#7aa2f7]' },
  { type: 'load_balancer', label: 'Load Balancer / Gateway', icon: '⚖️', color: 'border-[var(--border)] bg-[var(--surface-raised)] text-[#bb9af7]' },
  { type: 'service', label: 'Backend Service', icon: '⚙️', color: 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--accent)]' },
  { type: 'cache', label: 'Redis / Cache', icon: '⚡', color: 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--accent-secondary)]' },
  { type: 'database', label: 'SQL / NoSQL DB', icon: '🗄️', color: 'border-[var(--border)] bg-[var(--surface-raised)] text-[#7dcfff]' },
  { type: 'queue', label: 'Message Queue / Kafka', icon: '📬', color: 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--error)]' },
  { type: 'storage', label: 'Object Storage / S3', icon: '📦', color: 'border-[var(--border)] bg-[var(--surface-raised)] text-[#a9b1d6]' },
];

export const SystemDesignWhiteboard = ({ elements = [], onDiagramChange }) => {
  const [nodes, setNodes] = useState(
    elements.length > 0
      ? elements
      : [
          { id: 'node_1', type: 'client', label: 'Web / Mobile Clients', x: 60, y: 140 },
          { id: 'node_2', type: 'load_balancer', label: 'API Gateway (Envoy)', x: 260, y: 140 },
          { id: 'node_3', type: 'service', label: 'Core Application Service', x: 480, y: 140 },
          { id: 'node_4', type: 'cache', label: 'Redis Cluster (Cache)', x: 700, y: 60 },
          { id: 'node_5', type: 'database', label: 'Primary PostgreSQL DB', x: 700, y: 220 },
        ]
  );

  const [connections, setConnections] = useState([
    { from: 'node_1', to: 'node_2', label: 'HTTPS / WSS' },
    { from: 'node_2', to: 'node_3', label: 'gRPC / Round Robin' },
    { from: 'node_3', to: 'node_4', label: 'Cache-Aside' },
    { from: 'node_3', to: 'node_5', label: 'Read / Write' },
  ]);

  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectSourceId, setConnectSourceId] = useState(null);
  const [draggedNode, setDraggedNode] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const canvasRef = useRef(null);

  const syncChanges = (newNodes, newConns) => {
    if (onDiagramChange) {
      onDiagramChange({
        nodes: newNodes || nodes,
        connections: newConns || connections,
      });
    }
  };

  const addNode = (nodeDef) => {
    const newNode = {
      id: `node_${Date.now()}`,
      type: nodeDef.type,
      label: nodeDef.label,
      x: 100 + Math.random() * 200,
      y: 100 + Math.random() * 150,
    };
    const updated = [...nodes, newNode];
    setNodes(updated);
    syncChanges(updated, connections);
  };

  const handleMouseDown = (e, node) => {
    e.stopPropagation();
    if (isConnecting) {
      if (!connectSourceId) {
        setConnectSourceId(node.id);
      } else if (connectSourceId !== node.id) {
        // Create connection
        const newConn = { from: connectSourceId, to: node.id, label: 'Data Flow' };
        const updatedConns = [...connections, newConn];
        setConnections(updatedConns);
        setIsConnecting(false);
        setConnectSourceId(null);
        syncChanges(nodes, updatedConns);
      }
      return;
    }

    setSelectedNodeId(node.id);
    setDraggedNode(node.id);
    const rect = canvasRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left - node.x,
      y: e.clientY - rect.top - node.y,
    });
  };

  const handleMouseMove = (e) => {
    if (!draggedNode) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const newX = Math.max(10, Math.min(rect.width - 150, e.clientX - rect.left - dragOffset.x));
    const newY = Math.max(10, Math.min(rect.height - 80, e.clientY - rect.top - dragOffset.y));

    const updated = nodes.map((n) => (n.id === draggedNode ? { ...n, x: newX, y: newY } : n));
    setNodes(updated);
  };

  const handleMouseUp = () => {
    if (draggedNode) {
      setDraggedNode(null);
      syncChanges(nodes, connections);
    }
  };

  const deleteSelected = () => {
    if (!selectedNodeId) return;
    const updatedNodes = nodes.filter((n) => n.id !== selectedNodeId);
    const updatedConns = connections.filter(
      (c) => c.from !== selectedNodeId && c.to !== selectedNodeId
    );
    setNodes(updatedNodes);
    setConnections(updatedConns);
    setSelectedNodeId(null);
    syncChanges(updatedNodes, updatedConns);
  };

  const clearCanvas = () => {
    setNodes([]);
    setConnections([]);
    setSelectedNodeId(null);
    syncChanges([], []);
  };

  const renameSelected = () => {
    if (!selectedNodeId) return;
    const node = nodes.find((n) => n.id === selectedNodeId);
    const newName = window.prompt('Enter new component label:', node?.label || '');
    if (newName && newName.trim()) {
      const updated = nodes.map((n) =>
        n.id === selectedNodeId ? { ...n, label: newName.trim() } : n
      );
      setNodes(updated);
      syncChanges(updated, connections);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden select-none">
      {/* Top Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-[var(--surface-raised)] border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-1.5">
            Architecture Whiteboard
          </span>
          <span className="text-xs text-[var(--text-secondary)] font-mono">
            ({nodes.length} Components, {connections.length} Connections)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setIsConnecting(!isConnecting);
              setConnectSourceId(null);
            }}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
              isConnecting
                ? 'bg-[var(--accent-secondary)] text-[#10141C]'
                : 'bg-[var(--surface)] hover:bg-[#202736] text-[var(--text-secondary)] border border-[var(--border)]'
            }`}
          >
            {isConnecting
              ? connectSourceId
                ? 'Click Target Node'
                : 'Click Source Node'
              : 'Connect Nodes'}
          </button>

          {selectedNodeId && (
            <>
              <button
                type="button"
                onClick={renameSelected}
                className="px-2.5 py-1 text-xs bg-[var(--surface)] hover:bg-[#202736] text-[var(--text-primary)] rounded-lg border border-[var(--border)]"
              >
                Rename
              </button>
              <button
                type="button"
                onClick={deleteSelected}
                className="px-2.5 py-1 text-xs bg-[rgba(217,115,106,0.15)] hover:bg-[rgba(217,115,106,0.25)] text-[var(--error)] rounded-lg border border-[var(--error)]/30"
              >
                Delete
              </button>
            </>
          )}

          <button
            type="button"
            onClick={clearCanvas}
            className="px-2.5 py-1 text-xs bg-[var(--surface)] hover:bg-[#202736] text-[var(--text-secondary)] rounded-lg border border-[var(--border)]"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Component Palette Sidebar / Bar */}
      <div className="flex items-center gap-1.5 px-4 py-2 bg-[var(--surface)] border-b border-[var(--border)] overflow-x-auto text-xs">
        <span className="text-[var(--text-secondary)] text-xs font-mono mr-1">Add:</span>
        {NODE_TYPES.map((typeDef) => (
          <button
            key={typeDef.type}
            type="button"
            onClick={() => addNode(typeDef)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs whitespace-nowrap transition-colors ${typeDef.color}`}
          >
            <span>{typeDef.icon}</span>
            <span>{typeDef.label}</span>
          </button>
        ))}
      </div>

      {/* Interactive SVG / Canvas Area */}
      <div
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={() => setSelectedNodeId(null)}
        className="relative flex-1 w-full h-[420px] bg-[radial-gradient(#262D3D_1px,transparent_1px)] [background-size:16px_16px] bg-[var(--bg-base)] overflow-hidden cursor-crosshair"
      >
        {/* SVG Arrow Lines Layer */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="10"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#4FA393" />
            </marker>
          </defs>

          {connections.map((conn, idx) => {
            const fromNode = nodes.find((n) => n.id === conn.from);
            const toNode = nodes.find((n) => n.id === conn.to);
            if (!fromNode || !toNode) return null;

            const x1 = fromNode.x + 75;
            const y1 = fromNode.y + 25;
            const x2 = toNode.x + 75;
            const y2 = toNode.y + 25;

            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;

            return (
              <g key={idx}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#4FA393"
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                  markerEnd="url(#arrowhead)"
                  opacity="0.75"
                />
                {conn.label && (
                  <text
                    x={midX}
                    y={midY - 6}
                    fill="#8B93A1"
                    fontSize="10"
                    fontFamily="JetBrains Mono, monospace"
                    textAnchor="middle"
                    className="select-none"
                  >
                    {conn.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Nodes Layer */}
        {nodes.map((node) => {
          const typeDef = NODE_TYPES.find((t) => t.type === node.type) || NODE_TYPES[0];
          const isSelected = selectedNodeId === node.id;
          const isConnectSource = connectSourceId === node.id;

          return (
            <div
              key={node.id}
              onMouseDown={(e) => handleMouseDown(e, node)}
              style={{ left: `${node.x}px`, top: `${node.y}px` }}
              className={`absolute w-36 px-2.5 py-2 rounded-xl border cursor-move transition-all z-10 select-none ${
                typeDef.color
              } ${
                isSelected
                  ? 'ring-1 ring-[var(--accent)] border-[var(--accent)]'
                  : 'hover:border-[var(--text-secondary)]'
              } ${isConnectSource ? 'ring-1 ring-[var(--accent-secondary)]' : ''}`}
            >
              <div className="flex items-center gap-1.5 font-medium text-xs truncate">
                <span>{typeDef.icon}</span>
                <span className="truncate">{node.label}</span>
              </div>
              <div className="text-[10px] text-[var(--text-secondary)] font-mono capitalize mt-0.5 opacity-80">
                {node.type.replace('_', ' ')}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SystemDesignWhiteboard;
