import { useSession } from 'next-auth/react';
import React from 'react';

function withProtection<P>(
  Component: React.ComponentType<P>, 
  protectionFn: (session: any, props: P) => boolean
): React.FC<P> {
  const ProtectedComponent: React.FC<P> = (props: P) => {
    const { data: session } = useSession(); // Destructure to get session data

    // Run the protection function with session and component props
    const isAllowed = protectionFn(session, props);

    // If the condition is not met, return null to hide the component
    if (!isAllowed) {
      return null;
    }

    // If the condition is met, render the component
    return <Component {...props as any} />;
  };

  ProtectedComponent.displayName = `withProtection(${Component.displayName || Component.name || 'Component'})`;

  return ProtectedComponent;
};

export default withProtection;