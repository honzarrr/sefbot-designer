'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Layers } from 'lucide-react';
import { useDesignerStore } from '@/stores/designerStore';
import type { Connection } from '@/types';

interface ChainInfo {
  id: string;
  nodeIds: string[];
  firstNodeName: string;
  lastNodeName: string;
}

/**
 * Detects linear chains: A->B->C->D where each has exactly 1 in and 1 out connection.
 * Returns chain groups for collapsing.
 */
function detectChains(
  nodeIds: string[],
  connections: Connection[],
  nodeNameMap: Map<string, string>
): ChainInfo[] {
  // Build in-degree and out-degree maps
  const outMap = new Map<string, string[]>();
  const inMap = new Map<string, string[]>();

  for (const conn of connections) {
    if (!outMap.has(conn.sourceId)) outMap.set(conn.sourceId, []);
    outMap.get(conn.sourceId)!.push(conn.targetId);

    if (!inMap.has(conn.targetId)) inMap.set(conn.targetId, []);
    inMap.get(conn.targetId)!.push(conn.sourceId);
  }

  // Find chain starts: nodes with out-degree=1 and in-degree != 1 (or no in-edges)
  // A chain node has exactly 1 outgoing and 1 incoming (except start/end)
  const visited = new Set<string>();
  const chains: ChainInfo[] = [];

  for (const nodeId of nodeIds) {
    if (visited.has(nodeId)) continue;

    const outCount = outMap.get(nodeId)?.length ?? 0;
    const inCount = inMap.get(nodeId)?.length ?? 0;

    // Start of a potential chain: node with 1 out and NOT 1 in (so it's a chain head)
    if (outCount === 1 && inCount !== 1) {
      const chain: string[] = [nodeId];
      visited.add(nodeId);
      let current = outMap.get(nodeId)![0];

      while (current) {
        const curOut = outMap.get(current)?.length ?? 0;
        const curIn = inMap.get(current)?.length ?? 0;

        if (curIn === 1 && curOut === 1) {
          chain.push(current);
          visited.add(current);
          current = outMap.get(current)![0];
        } else if (curIn === 1 && curOut !== 1) {
          // End of chain
          chain.push(current);
          visited.add(current);
          break;
        } else {
          break;
        }
      }

      // Only create a chain if it has 3+ nodes (otherwise not worth collapsing)
      if (chain.length >= 3) {
        chains.push({
          id: chain[0],
          nodeIds: chain,
          firstNodeName: nodeNameMap.get(chain[0]) || chain[0],
          lastNodeName: nodeNameMap.get(chain[chain.length - 1]) || chain[chain.length - 1],
        });
      }
    }
  }

  return chains;
}

export function ChainStackOverlay() {
  const project = useDesignerStore((s) => s.project);
  const canvasMode = useDesignerStore((s) => s.canvasMode);
  const [collapsedChains, setCollapsedChains] = useState<Set<string>>(new Set());

  const chains = useMemo(() => {
    if (!project || canvasMode !== 'development') return [];

    const devConnections = project.connections.filter(
      (c) => c.layer === 'development' || !c.layer
    );
    const nodeIds = [
      ...project.steps.map((s) => s.id),
      ...project.conditions.map((c) => c.id),
      ...project.softStarts.map((s) => s.id),
    ];
    const nameMap = new Map<string, string>();
    project.steps.forEach((s) => nameMap.set(s.id, s.name));
    project.conditions.forEach((c) => nameMap.set(c.id, 'Condition'));
    project.softStarts.forEach((s) => nameMap.set(s.id, s.name));

    return detectChains(nodeIds, devConnections, nameMap);
  }, [project, canvasMode]);

  if (canvasMode !== 'development' || chains.length === 0) return null;

  const toggleChain = (chainId: string) => {
    setCollapsedChains((prev) => {
      const next = new Set(prev);
      if (next.has(chainId)) {
        next.delete(chainId);
      } else {
        next.add(chainId);
      }
      return next;
    });
  };

  return (
    <div className="absolute top-14 right-3 z-10 bg-white border rounded-lg shadow-sm p-2 max-w-[200px]">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5 px-1">
        <Layers className="h-3.5 w-3.5" />
        <span>Chains ({chains.length})</span>
      </div>
      <div className="space-y-0.5">
        {chains.map((chain) => {
          const isCollapsed = collapsedChains.has(chain.id);
          return (
            <button
              key={chain.id}
              onClick={() => toggleChain(chain.id)}
              className="w-full flex items-center gap-1.5 px-2 py-1 rounded text-xs hover:bg-muted/50 transition-colors text-left"
            >
              {isCollapsed ? (
                <ChevronRight className="h-3 w-3 shrink-0" />
              ) : (
                <ChevronDown className="h-3 w-3 shrink-0" />
              )}
              <span className="truncate">
                {chain.firstNodeName} ... {chain.lastNodeName}
              </span>
              <span className="text-muted-foreground ml-auto shrink-0">
                {chain.nodeIds.length}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
