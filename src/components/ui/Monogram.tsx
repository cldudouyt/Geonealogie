export function Monogram({ name, sex, size = 'md' }: { name: string; sex: 'M' | 'F' | 'U'; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const bg = sex === 'M' ? 'bg-male/15 text-male' : sex === 'F' ? 'bg-female/15 text-female' : 'bg-neutral/15 text-neutral';
  const sz = size === 'sm' ? 'w-8 h-8 text-sm' : size === 'lg' ? 'w-14 h-14 text-xl' : 'w-10 h-10 text-base';
  return (
    <span className={`inline-flex items-center justify-center rounded-full font-bold shrink-0 ${bg} ${sz}`}>
      {initials || '?'}
    </span>
  );
}
