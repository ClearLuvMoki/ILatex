export function IPCErrorTemplate(channel: string, message: string) {
  return `IPC Error:
    Channel Name: ${channel};
    Message: ${message};

  `;
}

export function FunctionErrorTemplate(name: string, message: string) {
  return `Function Error:
    Method Name: ${name};
    Message: ${message};

  `;
}
