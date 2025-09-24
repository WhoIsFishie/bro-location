export type SmsParty = {
  direction: string;
  phone: string;
  name: string;
};

export type SmsTimestamp = {
  date: string; // e.g. "05/06/2014"
  time: string; // e.g. "15:12:53(UTC+0)"
};

export type SmsLocation = {
  latitude: number;
  longitude: number;
};

export type SmsRecord = {
  id: number;
  type: string;
  timestamp: SmsTimestamp;
  party: SmsParty;
  message: string;
  location_data: SmsLocation;
};

export type NormalizedRecord = {
  id: number;
  type: string;
  timestampMs: number | null;
  originalDate: string;
  originalTime: string;
  partyName: string;
  partyPhone: string;
  partyDirection: string;
  message: string;
  latitude: number;
  longitude: number;
  searchText: string;
};


