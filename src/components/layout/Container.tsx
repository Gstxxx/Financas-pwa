interface ContainerProps {
  children: React.ReactNode;
  /** "wide" lets the page span the full desktop layout (multi-column). */
  width?: 'narrow' | 'wide';
}

export function Container({ children, width = 'narrow' }: ContainerProps) {
  return (
    <div
      className={`app-container app-container-${width}`}
      style={{
        paddingTop: 'max(16px, env(safe-area-inset-top))',
        paddingBottom: 'calc(140px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      {children}
    </div>
  );
}
