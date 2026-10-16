// Every word of the DNS Checker (tool + its page), English. The other
// 10 languages live next to this file, typed as `Strings`, so TypeScript
// fails if one misses a key. They load only with the tool page.
// Placeholders: {n} number, {total} number, {ms} milliseconds, {s} seconds.
export const en = {
  title: 'DNS Checker',
  subtitle: 'Check any domain\'s DNS records on 16 public DNS servers around the world and compare them with the true answer from the domain\'s own name servers. Free, no sign-up.',

  domainLabel: 'Domain name',
  placeholder: 'example.com',
  typeLabel: 'Record type',
  check: 'Check DNS',
  checking: 'Checking…',
  hint: 'You can paste a full link too; only the domain is used.',

  errBadDomain: 'Please enter a valid domain name, for example example.com.',
  errBadType: 'This record type is not supported.',
  errRateLimit: 'Too many checks in a short time. Please wait a minute and try again.',
  errBusy: 'The checker is busy right now. Please try again in a few seconds.',
  errFailed: 'The check could not be completed. Please try again.',
  errNetwork: 'Could not reach our server. Check your internet connection and try again.',

  summaryTitle: 'Result',
  summarySame: '{n} of {total} DNS servers show the same records as the domain\'s own name servers.',
  summaryNoTruth: '{n} of {total} DNS servers answered.',
  checkedIn: 'Checked in {s} s',

  authTitle: 'True answer (from the domain\'s own name servers)',
  authFrom: 'Answered by {server}',
  authNone: 'The domain\'s own name servers could not be reached, so only the public DNS servers are compared.',
  authDohNote: 'Our server cannot ask name servers directly right now, so only the public DNS servers are shown.',
  noRecords: 'No records of this type.',
  notExist: 'This domain does not exist (NXDOMAIN).',
  ttl: 'TTL',

  resolversTitle: 'Public DNS servers',
  ms: '{ms} ms',
  same: 'Same',
  geo: 'Other address',
  old: 'Different',
  missing: 'Not found',
  failed: 'No answer',
  nxdomain: 'Does not exist',
  sameHelp: 'Same records as the domain\'s own name servers.',
  geoHelp: 'A different address. Normal for big sites and CDNs, which answer by location.',
  oldHelp: 'Different records: this server may still remember old ones (wait for the TTL) or shows only part of them.',
  missingHelp: 'This server says the records do not exist yet. It may still remember an old "not found" answer.',
  failedHelp: 'This server did not answer in time or refused.',
  anycastNote: 'Big DNS services answer from the location nearest to our server, so the country is where the company is based.',

  traceShow: 'Show the lookup path',
  traceHide: 'Hide the lookup path',
  traceIntro: 'How the true answer was found: from the root servers, to the top-level domain, to the domain\'s own name servers.',
  traceRoot: 'root',
  traceReferral: 'sent us to {zone}',
  traceAnswer: 'answered',
  traceCname: 'alias to {name}',
  traceNx: 'domain does not exist',
  traceNodata: 'no records of this type',
  traceError: 'no answer ({detail})',
  traceCached: 'remembered from an earlier lookup',
  traceSub: 'finding the address of a name server',

  copy: 'Copy',
  copied: 'Copied!',
  showAll: 'Show all ({n})',

  typeHelpA: 'IPv4 address',
  typeHelpAAAA: 'IPv6 address',
  typeHelpCNAME: 'Alias',
  typeHelpMX: 'Mail servers',
  typeHelpNS: 'Name servers',
  typeHelpTXT: 'Text (SPF, verification)',
  typeHelpSOA: 'Zone info',
  typeHelpCAA: 'Allowed SSL issuers',

  howTitle: 'How to check DNS propagation',
  step1Title: 'Enter a domain',
  step1Desc: 'Type or paste a domain name, for example yoursite.com, and choose the record type (A for the website address, MX for email).',
  step2Title: 'Check',
  step2Desc: 'We ask 16 public DNS servers at the same time and also follow the path from the root servers to the domain\'s own name servers.',
  step3Title: 'Compare',
  step3Desc: 'Green means a server already shows the true records. Servers still showing old records will update when their TTL runs out.',
  faqTitle: 'Frequently asked questions',
  faq1Q: 'What is DNS propagation?',
  faq1A: 'When you change a DNS record, DNS servers around the world keep the old answer until its TTL (time to live) runs out. Propagation is the time until all of them show the new record, usually minutes to a few hours, at most 48 hours.',
  faq2Q: 'What is the "true answer"?',
  faq2A: 'Our checker does not trust any cache: it starts at the internet\'s root servers, follows the referrals to the domain\'s own (authoritative) name servers and asks them directly. That answer is what every DNS server will show once propagation is complete.',
  faq3Q: 'Why do some servers show a different IP address?',
  faq3A: 'Big websites and CDNs give each region its own server address, so different IPs for A and AAAA records are often normal. For other record types, a difference usually means that server still remembers the old record.',
  faq4Q: 'Which record type should I check?',
  faq4A: 'A and AAAA show the website\'s address, CNAME an alias, MX the email servers, NS the name servers, TXT texts such as SPF or site verification, SOA the zone details, and CAA which certificate authorities may issue SSL certificates.',
  faq5Q: 'Is the check private?',
  faq5A: 'We only ask public DNS questions about the domain you typed. Nothing is saved, and there is no sign-up. To protect the service, each visitor can run 10 checks a minute.',

  moreTools: 'More free tools',
};

export type Strings = typeof en;

/** Replaces {key} placeholders, like the site's fill() helper. */
export function fill(text: string, values: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (m, k) => (k in values ? String(values[k]) : m));
}
