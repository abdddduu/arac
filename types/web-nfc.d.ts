interface NDEFRecordInit {
  recordType: string;
  mediaType?: string;
  data?: string | ArrayBuffer | number[];
}

interface NDEFWriteOptions {
  overwrite?: boolean;
  signal?: AbortSignal;
}

interface NDEFMessageInit {
  records: NDEFRecordInit[];
}

interface NDEFMessage {
  records: NDEFRecord[];
}

interface NDEFRecord {
  recordType: string;
  mediaType?: string;
  data?: DataView;
}

interface NDEFReadingEvent extends Event {
  serialNumber: string;
  message: NDEFMessage;
}

interface NDEFReader {
  scan(options?: { signal?: AbortSignal }): Promise<void>;
  write(message: NDEFMessageInit, options?: NDEFWriteOptions): Promise<void>;
  makeReadOnly?(options?: { signal?: AbortSignal }): Promise<void>;
  onreading: ((this: NDEFReader, event: NDEFReadingEvent) => unknown) | null;
  addEventListener(type: 'reading', listener: (event: NDEFReadingEvent) => void): void;
  removeEventListener(type: 'reading', listener: (event: NDEFReadingEvent) => void): void;
}

interface NDEFReaderConstructor {
  new (): NDEFReader;
}

interface Window {
  NDEFReader?: NDEFReaderConstructor;
}
