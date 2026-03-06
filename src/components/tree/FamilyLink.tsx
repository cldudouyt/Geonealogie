'use client';

import React from 'react';
import type { LayoutLink } from '@/lib/types';

const NODE_HEIGHT = 80;

interface FamilyLinkProps {
  link: LayoutLink;
}

function FamilyLinkComponent({ link }: FamilyLinkProps) {
  if (link.type === 'spouse') {
    // Horizontal dashed line between spouses
    const y = link.sourceY;
    const x1 = Math.min(link.sourceX, link.targetX);
    const x2 = Math.max(link.sourceX, link.targetX);

    return (
      <line
        x1={x1}
        y1={y}
        x2={x2}
        y2={y}
        className="tree-link-spouse"
      />
    );
  }

  // Parent-child: S-curve from bottom of parent to top of child
  const startX = link.sourceX;
  const startY = link.sourceY + NODE_HEIGHT / 2;
  const endX = link.targetX;
  const endY = link.targetY - NODE_HEIGHT / 2;
  const midY = (startY + endY) / 2;

  const path = `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;

  return (
    <path
      d={path}
      className="tree-link-parent"
    />
  );
}

export default React.memo(FamilyLinkComponent);
