import { describe, expect, it } from 'vitest';
import { deriveSiteName } from '../siteName';

describe('deriveSiteName — registrable domain', () => {
  it('strips www and returns the brand label', () => {
    expect(deriveSiteName('https://www.google.com')).toBe('Google');
  });
  it('strips all subdomains to the registrable label', () => {
    expect(deriveSiteName('https://drive.google.com')).toBe('Google');
    expect(deriveSiteName('https://support.apple.com')).toBe('Apple');
    expect(deriveSiteName('https://mail.proton.me')).toBe('Proton');
  });
  it('handles multi-part (second-level) TLDs', () => {
    expect(deriveSiteName('https://bbc.co.uk')).toBe('Bbc');
    expect(deriveSiteName('https://docs.example.co.uk')).toBe('Example');
    expect(deriveSiteName('https://a.b.c.co.uk')).toBe('C');
  });
  it('strips numbered www and a trailing dot', () => {
    expect(deriveSiteName('https://www2.example.com')).toBe('Example');
    expect(deriveSiteName('https://example.com.')).toBe('Example');
  });
  it('ignores userinfo, port, path and query', () => {
    expect(deriveSiteName('https://user:pass@example.com:8443/p?q=1')).toBe('Example');
  });
  it('lowercases before processing', () => {
    expect(deriveSiteName('HTTPS://WWW.EXAMPLE.COM')).toBe('Example');
  });
});

describe('deriveSiteName — special hosts', () => {
  it('returns IPv4 hosts verbatim', () => {
    expect(deriveSiteName('http://192.168.1.1:8080')).toBe('192.168.1.1');
  });
  it('returns bracketed IPv6 hosts verbatim', () => {
    expect(deriveSiteName('http://[::1]:3000')).toBe('[::1]');
  });
  it('capitalizes single-label hosts', () => {
    expect(deriveSiteName('http://localhost:3000')).toBe('Localhost');
    expect(deriveSiteName('chrome://settings')).toBe('Settings');
  });
});

describe('deriveSiteName — scheme-less input', () => {
  it('retries parsing with an https prefix', () => {
    expect(deriveSiteName('my-cool-site.com')).toBe('My-cool-site');
  });
});

describe('deriveSiteName — title fallback', () => {
  it('uses the title when the URL has no usable host', () => {
    expect(deriveSiteName('file:///Users/x/a.pdf', 'a.pdf — Reader')).toBe('a.pdf');
    expect(deriveSiteName('data:text/plain,hi')).toBe('Link');
  });
  it('splits the title on the first known separator', () => {
    expect(deriveSiteName(undefined, 'GitHub · Build software')).toBe('GitHub');
    expect(deriveSiteName(undefined, 'Docs | Example')).toBe('Docs');
    expect(deriveSiteName(undefined, 'A - B - C')).toBe('A');
  });
  it('returns Link for empty/whitespace titles and nothing else', () => {
    expect(deriveSiteName(undefined, '   ')).toBe('Link');
    expect(deriveSiteName(undefined)).toBe('Link');
    expect(deriveSiteName('')).toBe('Link');
  });
});
