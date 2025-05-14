declare module 'node-cups' {
  export interface PrintParams {
    printer: string;
    printerOptions: Record<string, string>;
    user?: string;
    password?: string;
  }

  export interface PrintResult {
    requestId: string;
    success: boolean;
  }

  export function printFile(filePath: string, options: PrintParams): Promise<PrintResult>;
  export function getPrinterNames(): Promise<string[]>;
} 