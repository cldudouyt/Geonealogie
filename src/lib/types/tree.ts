export interface TreeNode {
  id: string;
  displayName: string;
  sex: 'M' | 'F' | 'U';
  birthYear?: string;
  deathYear?: string;
  occupation?: string;
  photoUrl?: string;
  generation: number;
}

export interface TreeLink {
  source: string;
  target: string;
  type: 'parent' | 'spouse';
}

export interface TreeData {
  rootId: string;
  nodes: TreeNode[];
  links: TreeLink[];
}

export interface LayoutNode extends TreeNode {
  x: number;
  y: number;
  collapsed?: boolean;
  hiddenCount?: number;
}

export interface LayoutLink extends TreeLink {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
}
