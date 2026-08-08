import { ReactThreeFiber } from '@react-three/fiber';

declare global {
  namespace JSX {
    // Extend the JSX intrinsic elements with react-three-fiber's types so r3f elements like
    // <ambientLight />, <directionalLight />, <primitive /> are recognized by TypeScript.
    interface IntrinsicElements extends ReactThreeFiber.JSX.IntrinsicElements {}
  }
}

export {};
