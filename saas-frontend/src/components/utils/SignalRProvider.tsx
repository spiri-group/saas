'use client'

import { createContext, JSX, useContext, useEffect, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { isNullOrWhitespace } from "@/lib/functions";

const SignalRContext = createContext<{
  connection: signalR.HubConnection | null;
  userId: string;
  joinGroup: (group: string) => Promise<void>;
  leaveGroup: (group: string) => Promise<void>;
} | null>(null);

const hubUrl = 
    process.env.NEXT_PUBLIC_server_endpoint != undefined && 
    !process.env.NEXT_PUBLIC_server_endpoint.includes('localhost')
        ? `${process.env.NEXT_PUBLIC_server_endpoint}`
        : "http://127.0.0.1:7071/api"

const hubCode = process.env.NEXT_PUBLIC_server_endpoint_code == undefined ? "" : `code=${process.env.NEXT_PUBLIC_server_endpoint_code}`

export const useSignalRConnection = () => {
  return useContext(SignalRContext);
};

export const SignalRProvider: React.FC<{ children: JSX.Element | JSX.Element[], userId: string }> = ({
  children, userId
}) => {

  const [connection, setConnection] = useState<signalR.HubConnection | null>(
    null
  );
  const [, setJoinedGroups] = useState<string[]>([]);

  useEffect(() => {
    // Skip SignalR in test environment (Playwright sets this)
    if (process.env.NODE_ENV === 'test' || typeof window !== 'undefined' && window.location.port === '3002') {
      return;
    }

    let signalRUrl = hubUrl.includes("?") ? hubUrl + `&userId=${userId}` : hubUrl + `?userId=${userId}`
    if (!isNullOrWhitespace(hubCode)) {
      signalRUrl += `&${hubCode}`
    }

    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl(signalRUrl)
      .build();

    newConnection.start().then(() => {
      setConnection(newConnection);
    }).catch((error) => {
      console.error(error)
    });

    return () => {
      // Cleanup the connection when the component unmounts
      if (newConnection) {
        newConnection.stop();
      }
    };
  }, []);

    const joinGroup = async (group: string) => {
      if (connection == null || isNullOrWhitespace(connection.connectionId)) return;
  
      setJoinedGroups((prevJoinedGroups) => {
          if (prevJoinedGroups.includes(group)) return prevJoinedGroups;
  
          manageGroupMembership('addUserToGroup', group, connection.connectionId as string);
          return [...prevJoinedGroups, group];
      });
  };

    const leaveGroup = async (group: string) => {
      if (connection == null || isNullOrWhitespace(connection.connectionId)) return;
  
      setJoinedGroups((prevJoinedGroups) => {
          if (!prevJoinedGroups.includes(group)) return prevJoinedGroups;
  
          manageGroupMembership('removeUserFromGroup', group, connection.connectionId as string);
          return prevJoinedGroups.filter(g => g !== group);
      });
  };

  return (
    <SignalRContext.Provider value={{
      connection, userId, joinGroup, leaveGroup
    }}>
      {children}
    </SignalRContext.Provider>
  );
};

const manageGroupMembership = async (action: 'addUserToGroup' | 'removeUserFromGroup', group: string, userId: string | undefined) => {
  if (userId == undefined) return
 
  let membershipUrl = `${hubUrl}/${action}?userId=${userId}&group=${group}`
  if (hubCode != "") {
    membershipUrl += `&${hubCode}`
  }
 
  await fetch(membershipUrl, {
    method: 'POST'
  });
 
};