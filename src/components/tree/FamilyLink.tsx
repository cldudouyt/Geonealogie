'use client';

import React from 'react';
import type { LayoutLink } from '@/lib/types';

const NODE_HEIGHT = 80;

interface FamilyLinkProps {
  link: LayoutLink;
}

function FamilyLinkComponent({ link }: FamilyLinkProps) {
  if (link.type === 'spouse') {
    // Short horizontal dashed line between spouses (center of cards)
    const y = link.sourceY + NODE_HEIGHT / 2;
    const x1 = Math.min(link.sourceX, link.targetX) + NODE_HEIGHT / 2;
    const x2 = Math.max(link.sourceX, link.targetX) - NODE_HEIGHT / 2 + NODE_HEIGHT;
    return (
      <line x1={x1} y1={y} x2={x2} y2={y} className="tree-link-spouse" />
    );
  }

  // Parent-child: elbow path (parent bottom → horizontal → child top)
  // This avoids diagonal crossings by using right-angle connectors
  const srcX = link.sourceX;
  const srcY = link.sourceY + NODE_HEIGHT;          // bottom of parent card
  const dstX = link.targetX;
  const dstY = link.targetY;                        // top of child card

  // The horizontal junction is at 60% of the vertical gap
  const junctionY = srcY + (dstY - srcY) * 0.5;

  // Right-angle elbow: down → horizontal → down
  const d = `M ${srcX} ${srcY} L ${srcX} ${junctionY} L ${dstX} ${junctionY} L ${dstX} ${dstY}`;

  return <path d={d} className="tree-link-parent" />;
}

export default React.memo(FamilyLinkComponent);
