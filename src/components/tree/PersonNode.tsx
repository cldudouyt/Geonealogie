'use client';

import React from 'react';
import type { LayoutNode } from '@/lib/types';

const NODE_WIDTH = 180;
const NODE_HEIGHT = 80;

interface PersonNodeProps {
  node: LayoutNode;
  isRoot: boolean;
  isSelected: boolean;
  onClick: (id: string) => void;
  onDoubleClick: (id: string) => void;
}

function PersonNodeComponent({ node, isRoot, isSelected, onClick, onDoubleClick }: PersonNodeProps) {
  const borderColor = node.sex === 'M' ? '#3b82f6' : node.sex === 'F' ? '#ec4899' : '#6b7280';
  const bgColor = isSelected ? (node.sex === 'M' ? '#eff6ff' : node.sex === 'F' ? '#fdf2f8' : '#f9fafb') : '#ffffff';
  const ringStyle = isRoot ? `2px solid ${borderColor}` : 'none';

  return (
    <g
      transform={`translate(${node.x - NODE_WIDTH / 2}, ${node.y - NODE_HEIGHT / 2})`}
      className={isRoot ? 'person-node person-node-root' : 'person-node'}
      onClick={(e) => { e.stopPropagation(); onClick(node.id); }}
      onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick(node.id); }}
    >
      <rect
        width={NODE_WIDTH}
        height={NODE_HEIGHT}
        rx={8}
        ry={8}
        fill={bgColor}
        stroke={borderColor}
        strokeWidth={isSelected ? 2.5 : 1.5}
        style={{ outline: ringStyle, outlineOffset: '3px' }}
      />

      {/* Color accent bar */}
      <rect
        x={0}
        y={0}
        width={4}
        height={NODE_HEIGHT}
        rx={8}
        fill={borderColor}
      />
      <clipPath id={`clip-${node.id}`}>
        <rect x={0} y={0} width={4} height={NODE_HEIGHT} rx={8} />
      </clipPath>

      {/* Avatar circle */}
      {node.photoUrl ? (
        <>
          <clipPath id={`avatar-clip-${node.id}`}>
            <circle cx={26} cy={NODE_HEIGHT / 2} r={18} />
          </clipPath>
          <image
            href={node.photoUrl}
            x={8}
            y={NODE_HEIGHT / 2 - 18}
            width={36}
            height={36}
            clipPath={`url(#avatar-clip-${node.id})`}
            preserveAspectRatio="xMidYMid slice"
          />
        </>
      ) : (
        <>
          <circle cx={26} cy={NODE_HEIGHT / 2} r={16} fill={borderColor} opacity={0.15} />
          <text
            x={26}
            y={NODE_HEIGHT / 2 + 5}
            textAnchor="middle"
            fontSize={12}
            fontWeight={700}
            fill={borderColor}
          >
            {node.displayName.split(' ').filter(Boolean).slice(0, 2).map((w: string) => w[0]).join('').toUpperCase() || '?'}
          </text>
        </>
      )}

      <foreignObject x={50} y={8} width={NODE_WIDTH - 58} height={NODE_HEIGHT - 16}>
        <div
          style={{
            fontFamily: 'system-ui, sans-serif',
            overflow: 'hidden',
          }}
        >
          <p style={{
            fontSize: '13px',
            fontWeight: 600,
            color: '#1e293b',
            margin: 0,
            lineHeight: '1.3',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {node.displayName}
          </p>
          <p style={{
            fontSize: '11px',
            color: '#64748b',
            margin: '2px 0 0',
          }}>
            {node.birthYear || '?'}
            {node.deathYear ? ` - ${node.deathYear}` : ''}
          </p>
          {node.occupation && (
            <p style={{
              fontSize: '10px',
              color: '#94a3b8',
              margin: '2px 0 0',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
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
