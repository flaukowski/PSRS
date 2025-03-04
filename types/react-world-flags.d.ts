declare module 'react-world-flags' {
  import { ComponentType } from 'react';

  interface FlagProps {
    code: string;
    height?: string | number;
    width?: string | number;
    className?: string;
    style?: React.CSSProperties;
  }

  const Flag: ComponentType<FlagProps>;
  export default Flag;
}
