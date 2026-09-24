/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ZoomIn, ZoomOut, RotateCcw, Search, Share2, Tag, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DataManager } from '../services/storage/DataManager';
import { Note } from '../types/note';
import { findBacklinks } from '../utils/backlinks';

interface GraphNode {
  id: string;
  title: string;
  emoji: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

interface GraphLink {
  source: string;
  target: string;
}

export const GraphView: React.FC = () => {
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const svgRef = useRef<SVGSVGElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const loadGraphData = async () => {
      const allNotes = await DataManager.getAllNotes();
      const validNotes = (allNotes as Note[]).filter(n => !n.isTrashed);
      setNotes(validNotes);

      // Create initial node positions in a circle
      const initialNodes: GraphNode[] = validNotes.map((note, idx) => {
        const angle = (idx / validNotes.length) * 2 * Math.PI;
        const radius = 180 + Math.random() * 80;
        return {
          id: note.id,
          title: note.title || 'শিরোনামহীন',
          emoji: note.emoji || '📄',
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
          vx: 0,
          vy: 0,
          radius: Math.min(24, Math.max(10, (note.content || '').length / 100)),
          color: note.tags && note.tags.length > 0 ? '#a855f7' : '#3b82f6'
        };
      });

      // Find all inter-note links
      const initialLinks: GraphLink[] = [];
      validNotes.forEach(note => {
        const backlinks = findBacklinks(note.id, validNotes);
        backlinks.forEach(bl => {
          initialLinks.push({
            source: bl.noteId,
            target: note.id
          });
        });
      });

      setNodes(initialNodes);
      setLinks(initialLinks);
    };

    loadGraphData();
  }, []);

  // Simple Force Simulation Animation Step
  useEffect(() => {
    if (nodes.length === 0) return;

    let animFrame: number;
    let currNodes = [...nodes];

    const simulate = () => {
      // Repulsion between nodes
      for (let i = 0; i < currNodes.length; i++) {
        for (let j = i + 1; j < currNodes.length; j++) {
          const dx = currNodes[j].x - currNodes[i].x;
          const dy = currNodes[j].y - currNodes[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist < 200) {
            const force = (200 - dist) / dist * 0.05;
            currNodes[i].vx -= dx * force;
            currNodes[i].vy -= dy * force;
            currNodes[j].vx += dx * force;
            currNodes[j].vy += dy * force;
          }
        }
      }

      // Attraction along links
      links.forEach(link => {
        const sourceNode = currNodes.find(n => n.id === link.source);
        const targetNode = currNodes.find(n => n.id === link.target);
        if (sourceNode && targetNode) {
          const dx = targetNode.x - sourceNode.x;
          const dy = targetNode.y - sourceNode.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (dist - 100) * 0.01;
          sourceNode.vx += dx * force;
          sourceNode.vy += dy * force;
          targetNode.vx -= dx * force;
          targetNode.vy -= dy * force;
        }
      });

      // Center gravity & velocity dampening
      currNodes = currNodes.map(n => ({
        ...n,
        x: n.x + n.vx,
        y: n.y + n.vy,
        vx: n.vx * 0.85 - n.x * 0.001,
        vy: n.vy * 0.85 - n.y * 0.001
      }));

      setNodes(currNodes);
    };

    const interval = setInterval(simulate, 30);
    return () => clearInterval(interval);
  }, [links, nodes.length]);

  const filteredNodes = useMemo(() => {
    return nodes.filter(n => {
      const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [nodes, searchQuery]);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  return (
    <div className="fixed inset-0 bg-[#0d0d0e] text-white flex flex-col select-none overflow-hidden">
      {/* Top Bar */}
      <header className="h-14 px-4 bg-[#141415] border-b border-white/10 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/main')}
            className="p-2 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            <Share2 className="text-purple-400 w-5 h-5" />
            <h1 className="font-bold text-sm">গ্রাফ ভিউ (Graph View)</h1>
          </div>
        </div>

        {/* Search Input */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs">
            <Search size={14} className="text-white/40 mr-2" />
            <input
              type="text"
              placeholder="নোড খুঁজুন..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-white placeholder:text-white/30 w-32 sm:w-48"
            />
          </div>
        </div>
      </header>

      {/* Floating Controls */}
      <div className="absolute bottom-6 right-6 z-20 flex flex-col gap-2 bg-[#1a1a1b] p-2 rounded-2xl border border-white/10 shadow-2xl">
        <button
          onClick={() => setZoom(z => Math.min(2.5, z + 0.2))}
          className="p-2.5 hover:bg-white/10 rounded-xl text-white/80 hover:text-white cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn size={18} />
        </button>
        <button
          onClick={() => setZoom(z => Math.max(0.4, z - 0.2))}
          className="p-2.5 hover:bg-white/10 rounded-xl text-white/80 hover:text-white cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut size={18} />
        </button>
        <button
          onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
          className="p-2.5 hover:bg-white/10 rounded-xl text-white/80 hover:text-white cursor-pointer"
          title="Reset View"
        >
          <RotateCcw size={18} />
        </button>
      </div>

      {/* Interactive Graph Canvas */}
      <div
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="flex-1 w-full h-full cursor-grab active:cursor-grabbing relative overflow-hidden flex items-center justify-center"
      >
        <svg
          ref={svgRef}
          className="w-full h-full"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center'
          }}
        >
          <g transform={`translate(${window.innerWidth / 2}, ${window.innerHeight / 2})`}>
            {/* Links */}
            {links.map((link, idx) => {
              const sourceNode = nodes.find(n => n.id === link.source);
              const targetNode = nodes.find(n => n.id === link.target);
              if (!sourceNode || !targetNode) return null;

              return (
                <line
                  key={idx}
                  x1={sourceNode.x}
                  y1={sourceNode.y}
                  x2={targetNode.x}
                  y2={targetNode.y}
                  stroke="rgba(255, 255, 255, 0.15)"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
              );
            })}

            {/* Nodes */}
            {filteredNodes.map(node => (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={() => navigate(`/editor/${node.id}`)}
                className="cursor-pointer group"
              >
                <circle
                  r={node.radius}
                  fill={node.color}
                  className="transition-all group-hover:scale-125 filter drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]"
                />
                <text
                  y={node.radius + 14}
                  textAnchor="middle"
                  fill="white"
                  fontSize="10"
                  fontWeight="bold"
                  className="pointer-events-none opacity-80 group-hover:opacity-100 font-sans"
                >
                  {node.emoji} {node.title}
                </text>
              </g>
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
};
