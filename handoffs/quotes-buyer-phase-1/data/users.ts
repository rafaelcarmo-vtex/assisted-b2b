export interface UserOption {
  id: string;
  name: string;
  email: string;
  isCommon?: boolean;
}

export const USERS: UserOption[] = [
  { id: 'u-donald-green', name: 'Donald Green', email: 'donald.green@vtex.com', isCommon: true },
  { id: 'u-ethan-parker', name: 'Ethan Parker', email: 'ethan.parker@vtex.com', isCommon: true },
  { id: 'u-mia-thompson', name: 'Mia Thompson', email: 'mia.thompson@vtex.com', isCommon: true },
  { id: 'u-liam-johnson', name: 'Liam Johnson', email: 'liam.johnson@vtex.com', isCommon: true },
  { id: 'u-sophia-davis', name: 'Sophia Davis', email: 'sophia.davis@vtex.com' },
  { id: 'u-noah-wilson', name: 'Noah Wilson', email: 'noah.wilson@vtex.com' },
  { id: 'u-olivia-martinez', name: 'Olivia Martinez', email: 'olivia.martinez@vtex.com' },
  { id: 'u-lucas-brown', name: 'Lucas Brown', email: 'lucas.brown@vtex.com' },
  { id: 'u-ava-garcia', name: 'Ava Garcia', email: 'ava.garcia@vtex.com' },
  { id: 'u-ethan-williams', name: 'Ethan Williams', email: 'ethan.williams@vtex.com' },
  { id: 'u-isabella-jones', name: 'Isabella Jones', email: 'isabella.jones@vtex.com' },
  { id: 'u-mason-miller', name: 'Mason Miller', email: 'mason.miller@vtex.com' },
];
