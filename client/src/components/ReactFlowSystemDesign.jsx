import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  addEdge,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { 
  Laptop, 
  Scale, 
  ShieldCheck, 
  Database, 
  Zap, 
  Layers, 
  Plus, 
  Share2, 
  Check, 
  Trash2,
  Send
} from 'lucide-react';

const COMPONENT_TYPES = [
  { type: 'client', label: 'Client / App', icon: Laptop, color: 'border-blue-500 bg-blue-950/70 text-blue-300' },
  { type: 'load_balancer', label: 'Load Balancer (LB)', icon: Scale, color: 'border-purple-500 bg-purple-950/70 text-purple-300' },
  { type: 'api', label: 'API Gateway', icon: ShieldCheck, color: 'border-emerald-500 bg-emerald-950/70 text-emerald-300' },
  { type: 'database', label: 'Database (DB)', icon: Database, color: 'border-cyan-500 bg-cyan-950/70 text-cyan-300' },
  { type: 'cache', label: 'In-Memory Cache', icon: Zap, color: 'border-amber-500 bg-amber-950/70 text-amber-300' },
  { type: 'queue', label: 'Message Queue', icon: Layers, color: 'border-rose-500 bg-rose-950/70 text-rose-300' },
];

const INITIAL_NODES = [
  {
    id: '1',
    data: { label: '📱 Web / Mobile Clients' },
    position: { x: 50, y: 120 },
    style: { background: '#0f172a', color: '#93c5fd', border: '1px solid #3b82f6', borderRadius: '12px', padding: '10px 16px', fontWeight: 600, fontSize: '12px' },
  },
  {
    id: '2',
    data: { label: '⚖️ Load Balancer (LB)' },
    position: { x: 260, y: 120 },
    style: { background: '#0f172a', color: '#c084fc', border: '1px solid #a855f7', borderRadius: '12px', padding: '10px 16px', fontWeight: 600, fontSize: '12px' },
  },
  {
    id: '3',
    data: { label: '🚪 API Gateway' },
    position: { x: 470, y: 120 },
    style: { background: '#0f172a', color: '#6ee7b7', border: '1px solid #10b981', borderRadius: '12px', padding: '10px 16px', fontWeight: 600, fontSize: '12px' },
  },
  {
    id: '4',
    data: { label: '⚡ Redis Cache' },
    position: { x: 680, y: 40 },
    style: { background: '#0f172a', color: '#fde047', border: '1px solid #eab308', borderRadius: '12px', padding: '10px 16px', fontWeight: 600, fontSize: '12px' },
  },
  {
    id: '5',
    data: { label: '🗄️ Primary DB' },
    position: { x: 680, y: 200 },
    style: { background: '#0f172a', color: '#67e8f9', border: '1px solid #06b6d4', borderRadius: '12px', padding: '10px 16px', fontWeight: 600, fontSize: '12px' },
  },
];

const INITIAL_EDGES = [
  { id: 'e1-2', source: '1', target: '2', label: 'HTTPS / 443', animated: true, style: { stroke: '#38bdf8' } },
  { id: 'e2-3', source: '2', target: '3', label: 'Round-Robin', animated: true, style: { stroke: '#a855f7' } },
  { id: 'e3-4', source: '3', target: '4', label: 'Cache-Aside', animated: true, style: { stroke: '#eab308' } },
  { id: 'e3-5', source: '3', target: '5', label: 'Read / Write', animated: true, style: { stroke: '#06b6d4' } },
];

export default function ReactFlowSystemDesign({ roomId, socket, user, onSubmitArchitecture }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES);
  const [copied, setCopied] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Synchronize remote canvas updates from peer gladiator
  useEffect(() => {
    if (!socket) return;

    const handleCanvasUpdate = (data) => {
      if (data.nodes) setNodes(data.nodes);
      if (data.edges) setEdges(data.edges);
    };

    socket.on('canvas:update', handleCanvasUpdate);
    return () => {
      socket.off('canvas:update', handleCanvasUpdate);
    };
  }, [socket, setNodes, setEdges]);

  // Broadcast local changes to room
  const broadcastSync = useCallback((newNodes, newEdges) => {
    if (socket && roomId) {
      socket.emit('canvas:sync', {
        roomId,
        nodes: newNodes,
        edges: newEdges,
      });
    }
  }, [socket, roomId]);

  const onConnect = useCallback((params) => {
    setEdges((eds) => {
      const updated = addEdge({ ...params, animated: true, style: { stroke: '#06b6d4' } }, eds);
      broadcastSync(nodes, updated);
      return updated;
    });
  }, [setEdges, nodes, broadcastSync]);

  const handleAddNode = (comp) => {
    const newNodeId = `node_${Date.now()}`;
    const xPos = 200 + Math.floor(Math.random() * 300);
    const yPos = 80 + Math.floor(Math.random() * 200);

    const borderColor = comp.type === 'client' ? '#3b82f6'
      : comp.type === 'load_balancer' ? '#a855f7'
      : comp.type === 'api' ? '#10b981'
      : comp.type === 'database' ? '#06b6d4'
      : comp.type === 'cache' ? '#eab308' : '#f43f5e';

    const textColor = comp.type === 'client' ? '#93c5fd'
      : comp.type === 'load_balancer' ? '#c084fc'
      : comp.type === 'api' ? '#6ee7b7'
      : comp.type === 'database' ? '#67e8f9'
      : comp.type === 'cache' ? '#fde047' : '#fda4af';

    const newNode = {
      id: newNodeId,
      data: { label: comp.label },
      position: { x: xPos, y: yPos },
      style: {
        background: '#0f172a',
        color: textColor,
        border: `1px solid ${borderColor}`,
        borderRadius: '12px',
        padding: '10px 16px',
        fontWeight: 600,
        fontSize: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
      },
    };

    const updatedNodes = [...nodes, newNode];
    setNodes(updatedNodes);
    broadcastSync(updatedNodes, edges);
  };

  const handleClear = () => {
    if (window.confirm('Reset the canvas architecture?')) {
      setNodes([]);
      setEdges([]);
      broadcastSync([], []);
    }
  };

  const handleSubmit = () => {
    setSubmitted(true);
    if (onSubmitArchitecture) {
      onSubmitArchitecture({ nodes, edges });
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 relative select-none">
      {/* Component Palette Toolbar */}
      <div className="p-3 bg-slate-900/90 border-b border-white/10 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 z-10">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-bold mr-1">
            ADD ARCHITECTURE BLOCK:
          </span>
          {COMPONENT_TYPES.map((c) => {
            const Icon = c.icon;
            return (
              <button
                key={c.type}
                type="button"
                onClick={() => handleAddNode(c)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold hover:scale-105 active:scale-95 transition-all shadow-sm ${c.color}`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{c.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleClear}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 border border-white/5 transition-all"
            title="Clear canvas"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitted}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-mono font-bold text-xs shadow-lg shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>{submitted ? 'Architecture Submitted' : 'Submit System Design 🏁'}</span>
          </button>
        </div>
      </div>

      {/* Main React Flow Canvas */}
      <div className="flex-1 w-full h-[600px] relative bg-slate-950">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={(changes) => {
            onNodesChange(changes);
            broadcastSync(nodes, edges);
          }}
          onEdgesChange={(changes) => {
            onEdgesChange(changes);
            broadcastSync(nodes, edges);
          }}
          onConnect={onConnect}
          fitView
          className="bg-slate-950"
        >
          <Background color="#1e293b" gap={16} size={1} />
          <Controls className="bg-slate-900 border-white/10 text-white fill-white rounded-xl shadow-xl" />
          <MiniMap 
            nodeColor={(n) => {
              if (n.style?.borderColor) return n.style.borderColor;
              return '#38bdf8';
            }}
            maskColor="rgba(15, 23, 42, 0.7)"
            className="bg-slate-900 rounded-xl border border-white/10"
          />
        </ReactFlow>

        {/* Live Collab Overlay Badge */}
        <div className="absolute bottom-4 left-4 z-10 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-cyan-500/30 text-[11px] font-mono text-cyan-300 flex items-center gap-2 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>REAL-TIME MULTIPLAYER SYSTEM DESIGN WHITEBOARD</span>
        </div>
      </div>
    </div>
  );
}
