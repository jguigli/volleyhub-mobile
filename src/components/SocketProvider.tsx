import React, { ReactNode } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useNotifications } from '../hooks/useNotifications';

interface Props {
  children: ReactNode;
}

function AppServices() {
  useSocket();
  useNotifications();
  return null;
}

export function SocketProvider({ children }: Props) {
  return (
    <>
      <AppServices />
      {children}
    </>
  );
}
