import { describe, expect, it } from 'vitest'
import { ipKey } from '../src'

describe('ipKey', () => {
  it('keeps an IPv4 address as it is', () => {
    expect(ipKey('203.0.113.7')).toBe('203.0.113.7')
  })

  it('groups every IPv6 address of a /64 under one key', () => {
    const key = ipKey('2001:db8:abcd:12::1')

    expect(key).toBe('2001:db8:abcd:12::/64')
    expect(ipKey('2001:0DB8:ABCD:0012:ffff:1:2:3')).toBe(key)
    expect(ipKey('2001:db8:abcd:13::1')).not.toBe(key)
  })

  it('expands :: wherever it appears', () => {
    expect(ipKey('2001:db8::1')).toBe('2001:db8:0:0::/64')
    expect(ipKey('::1')).toBe('0:0:0:0::/64')
    expect(ipKey('fe80::')).toBe('fe80:0:0:0::/64')
  })

  it('treats an IPv4-mapped IPv6 address as IPv4', () => {
    expect(ipKey('::ffff:203.0.113.7')).toBe('203.0.113.7')
  })

  it('keeps anything unparseable as its own key', () => {
    expect(ipKey('unknown')).toBe('unknown')
    expect(ipKey('')).toBe('unknown')
  })
})
