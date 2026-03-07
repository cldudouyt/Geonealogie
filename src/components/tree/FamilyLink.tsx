'use client';

import React from 'react';
import type { LayoutLink } from '@/lib/types';

const NODE_WIDTH = 180;
const NODE_HEIGHT = 80;

interface FamilyLinkProps {
  link: LayoutLink;
}

function FamilyLinkComponent({ link }: FamilyLinkProps) {
  // x, y in layout nodes are CENTER coordinates (PersonNode uses translate(x - w/2, y - h/2))

  if (link.type === 'spouse') {
    // Horizontal dashed line at center-y, from center of left node to center of right node
    // (the node cards will visually cover the overlapping ends)
    const y = link.sourceY;
    const x1 = Math.min(link.sourceX, link.targetX);
    const x2 = Math.max(link.sourceX, link.targetX);
    return <line x1={x1} y1={y} x2={x2} y2={y} className="tree-link-spouse" />;
  }

  // Parent/adoption: orthogonal elbow connector
  // Start at bottom-center of parent, end at top-center of child
  const srcX = link.sourceX;
  const srcY = link.sourceY + NODE_HEIGHT / 2;
  const dstX = link.targetX;
  const dstY = link.targetY - NODE_HEIGHT / 2;
  const junctionY = (srcY + dstY) / 2;

  const d = `M ${srcX} ${srcY} L ${srcX} ${junctionY} L ${dstX} ${junctionY} L ${dstX} ${dstY}`;

  if (link.type === 'adoption') {
    return <path d={d} className="tree-link-adoption" />;
  }
  return <path d={d} className="tree-link-parent" />;
}

export default React.memo(FamilyLinkComponent);
