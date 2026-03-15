'use client';

import React from 'react';
import type { LayoutNode } from '@/lib/types';

const NODE_WIDTH = 190;
const NODE_HEIGHT = 92;
const AVATAR_R = 21;
const AVATAR_CX = 31;

interface PersonNodeProps {
  node: LayoutNode;
  isRoot: boolean;
  isSelected: boolean;
  onClick: (id: string) => void;
  onDoubleClick: (id: string) => void;
}

function PersonNodeComponent({ node, isRoot, isSelected, onClick, onDoubleClick }: PersonNodeProps) {
  const isMale   = node.sex === 'M';
  const isFemale = node.sex === 'F';
  const borderColor = isMale ? '#3b82f6' : isFemale ? '#ec4899' : '#6b7280';
  const bgSelected  = isMale ? '#eff6ff' : isFemale ? '#fdf2f8' : '#f9fafb';

  return (
    <g
      transform={`translate(${node.x - NODE_WIDTH / 2}, ${node.y - NODE_HEIGHT / 2})`}
      className={isRoot ? 'person-node person-node-root' : 'person-node'}
      onClick={(e) => { e.stopPropagation(); onClick(node.id); }}
      onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick(node.id); }}
    >
      {/* Drop shadow */}
      <rect x={2} y={3} width={NODE_WIDTH} height={NODE_HEIGHT} rx={10} fill="rgba(0,0,0,0.08)" />

      {/* Main card */}
      <rect
        width={NODE_WIDTH}
        height={NODE_HEIGHT}
        rx={10}
        fill={isSelected ? bgSelected : '#ffffff'}
        stroke={borderColor}
        strokeWidth={isSelected ? 2.5 : 1.5}
        strokeOpacity={isSelected ? 1 : 0.65}
      />

      {/* Left accent bar */}
      <clipPath id={`bar-clip-${node.id}`}>
        <rect x={0} y={0} width={5} height={NODE_HEIGHT} rx={10} />
      </clipPath>
      <rect x={0} y={0} width={5} height={NODE_HEIGHT} clipPath={`url(#bar-clip-${node.id})`} fill={borderColor} />

      {/* Avatar ring */}
      <circle cx={AVATAR_CX} cy={NODE_HEIGHT / 2} r={AVATAR_R + 1.5} fill={borderColor} opacity={0.15} />

      {/* Avatar */}
      {node.photoUrl ? (
        <>
          <clipPath id={`avatar-clip-${node.id}`}>
            <circle cx={AVATAR_CX} cy={NODE_HEIGHT / 2} r={AVATAR_R} />
          </clipPath>
          <image
            href={node.photoUrl}
            x={AVATAR_CX - AVATAR_R}
            y={NODE_HEIGHT / 2 - AVATAR_R}
            width={AVATAR_R * 2}
            height={AVATAR_R * 2}
            clipPath={`url(#avatar-clip-${node.id})`}
            preserveAspectRatio="xMidYMid slice"
          />
        </>
      ) : (
        <text
          x={AVATAR_CX}
          y={NODE_HEIGHT / 2 + 5}
          textAnchor="middle"
          fontSize={13}
          fontWeight={700}
          fill={borderColor}
          opacity={0.8}
        >
          {node.displayName.split(' ').filter(Boolean).slice(0, 2).map((w: string) => w[0]).join('').toUpperCase() || '?'}
        </text>
      )}

      {/* Text */}
      <foreignObject x={60} y={10} width={NODE_WIDTH - 68} height={NODE_HEIGHT - 20}>
        <div style={{ fontFamily: 'system-ui, sans-serif', overflow: 'hidden' }}>
          <p style={{
            fontSize: '12.5px',
            fontWeight: 600,
            color: '#1e293b',
            margin: 0,
            lineHeight: '1.35',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {node.displayName}
          </p>
          <p style={{
            fontSize: '11px',
            color: '#64748b',
            margin: '3px 0 0',
            letterSpacing: '0.01em',
          }}>
            {node.birthYear || '?'}{node.deathYear ? ` – ${node.deathYear}` : ''}
          </p>
          {node.occupation && (
            <p style={{
              fontSize: '10px',
              color: '#94a3b8',
              margin: '3px 0 0',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontStyle: 'italic',
            }}>
              {node.occupation}
            </p>
          )}
        </div>
      </foreignObject>
    </g>
  );
}

export default React.memo(PersonNodeComponent);
