import Image from 'next/image';
import { Monogram } from './Monogram';

const SIZES = {
  sm:  { px: 32,  cls: 'w-8 h-8' },
  md:  { px: 40,  cls: 'w-10 h-10' },
  lg:  { px: 56,  cls: 'w-14 h-14' },
  xl:  { px: 80,  cls: 'w-20 h-20' },
};

export function Avatar({
  name,
  sex,
  photoUrl,
  size = 'md',
}: {
  name: string;
  sex: 'M' | 'F' | 'U';
  photoUrl?: string;
  size?: keyof typeof SIZES;
}) {
  if (!photoUrl) {
    return <Monogram name={name} sex={sex} size={size === 'xl' ? 'lg' : size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'md'} />;
  }

  const { px, cls } = SIZES[size];

  return (
    <span className={`relative inline-block shrink-0 ${cls} rounded-full overflow-hidden`}>
      <Image
        src={photoUrl}
        alt={name}
        width={px}
        height={px}
        className="object-cover w-full h-full"
        unoptimized={photoUrl.startsWith('blob:') || photoUrl.startsWith('http')}
      />
    </span>
  );
}
