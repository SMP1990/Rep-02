/**
 * Public resolvers for the propagation check. Fixed list: visitors cannot
 * add servers, so the tool can never be aimed at someone else's machine.
 * `cc` = where the provider is based (anycast ones answer from a site near
 * our server). `doh` = its DNS-over-HTTPS address, used when port 53 is blocked.
 */
export type PublicResolver = { id: string; name: string; cc: string; ip: string; doh?: string };

export const RESOLVERS: PublicResolver[] = [
  { id: 'google', name: 'Google', cc: 'US', ip: '8.8.8.8', doh: 'https://dns.google/dns-query' },
  { id: 'cloudflare', name: 'Cloudflare', cc: 'US', ip: '1.1.1.1', doh: 'https://cloudflare-dns.com/dns-query' },
  { id: 'quad9', name: 'Quad9', cc: 'CH', ip: '9.9.9.9' },
  { id: 'opendns', name: 'OpenDNS', cc: 'US', ip: '208.67.222.222', doh: 'https://doh.opendns.com/dns-query' },
  { id: 'adguard', name: 'AdGuard', cc: 'CY', ip: '94.140.14.140', doh: 'https://unfiltered.adguard-dns.com/dns-query' },
  { id: 'controld', name: 'Control D', cc: 'CA', ip: '76.76.10.0' },
  { id: 'he', name: 'Hurricane Electric', cc: 'US', ip: '74.82.42.42' },
  { id: 'level3', name: 'Lumen (Level3)', cc: 'US', ip: '4.2.2.1' },
  { id: 'comodo', name: 'Comodo', cc: 'US', ip: '8.26.56.26' },
  { id: 'ultradns', name: 'UltraDNS', cc: 'US', ip: '64.6.64.6' },
  { id: 'cira', name: 'CIRA', cc: 'CA', ip: '149.112.121.10' },
  { id: 'gcore', name: 'Gcore', cc: 'LU', ip: '95.85.95.85' },
  { id: 'yandex', name: 'Yandex', cc: 'RU', ip: '77.88.8.8' },
  { id: 'alidns', name: 'AliDNS', cc: 'CN', ip: '223.5.5.5', doh: 'https://dns.alidns.com/dns-query' },
  { id: 'dnspod', name: 'DNSPod', cc: 'CN', ip: '119.29.29.29', doh: 'https://doh.pub/dns-query' },
  { id: 'kt', name: 'KT', cc: 'KR', ip: '168.126.63.1' },
];
