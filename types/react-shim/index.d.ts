declare module 'react' {
  export type ReactNode = any;
  export type FC<P = {}> = (props: P & { children?: ReactNode }) => any;
  export type ChangeEvent<T = any> = { currentTarget: T; target: T; preventDefault: () => void };
  export type FormEvent<T = any> = { currentTarget: T; preventDefault: () => void };
  export type KeyboardEvent<T = any> = { key: string; preventDefault: () => void };
  export interface RefObject<T> {
    readonly current: T | null;
  }
  export function useState<S>(initialState: S | (() => S)): [S, (value: S) => void];
  export function useEffect(effect: () => void | (() => void), deps?: any[]): void;
  export function useMemo<T>(factory: () => T, deps?: any[]): T;
  export function useCallback<T extends (...args: any[]) => any>(cb: T, deps?: any[]): T;
  export function useRef<T>(initialValue: T | null): RefObject<T>;
  export const StrictMode: any;
}

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

declare module 'react/jsx-runtime' {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
}

declare module 'react-dom/client' {
  export function createRoot(container: Element | DocumentFragment): { render(children: any): void };
}
