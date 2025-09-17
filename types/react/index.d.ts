declare module 'react' {
  export type ReactNode = any;
  export type DependencyList = readonly any[];
  export type Dispatch<A> = (value: A) => void;
  export type SetStateAction<S> = S | ((prevState: S) => S);

  export interface MutableRefObject<T> {
    current: T;
  }

  export interface ChangeEvent<T = Element> extends Event {
    readonly target: T;
    readonly currentTarget: T;
  }

  export interface FormEvent<T = Element> extends Event {
    readonly target: T;
    readonly currentTarget: T;
  }

  export interface KeyboardEvent<T = Element> extends Event {
    readonly key: string;
    readonly target: T;
    readonly currentTarget: T;
    preventDefault(): void;
  }

  export function useState<S>(initialState: S | (() => S)): [S, Dispatch<SetStateAction<S>>];
  export function useEffect(effect: () => void | (() => void), deps?: DependencyList): void;
  export function useMemo<T>(factory: () => T, deps: DependencyList): T;
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: DependencyList): T;
  export function useRef<T>(initialValue: T | null): MutableRefObject<T | null>;
  export function useId(): string;

  export interface StrictModeProps {
    children?: ReactNode;
  }

  export function StrictMode(props: StrictModeProps): ReactNode;

  export function createElement(type: any, props: any, ...children: ReactNode[]): ReactNode;
  export const Fragment: unique symbol;
}

export {};

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}
