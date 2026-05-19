interface ContainerProps {
  children: React.ReactNode;
}

export function Container({ children }: ContainerProps) {
  return (
    <div
      className="mx-auto"
      style={{
        maxWidth: 480,
        paddingTop: 'max(16px, env(safe-area-inset-top))',
        paddingBottom: 'calc(140px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      {children}
    </div>
  );
}
