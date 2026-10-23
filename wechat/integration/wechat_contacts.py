"""Bounded, read-only lookup of the two authorized names in the verified cache.

Layout derived from vendor/helper-source/wxbot_framework/contacts.py.
No database access, no scanning other processes, no contact export.
"""
import struct
from wxbot_framework.account import APP_GLOBAL_RVA, _pointer, read_current_account
from wxbot_framework.contacts import CACHE_PROVIDER_GETTER_RVA, CACHE_PROVIDER_VTABLE_RVA, CONTACT_CACHE_VTABLE_RVA

NAMES = {'主人': 'private', '示例测试群': 'group'}

def resolve(read_memory, base, account):
    def read(address, size):
        value = read_memory(_pointer(address), size)
        if len(value) != size: raise ValueError('Short cache read')
        return value
    def ptr(address): return struct.unpack('<Q', read(address, 8))[0]
    def string(address):
        header = read(address, 32)
        length, capacity = struct.unpack_from('<QQ', header, 16)
        if not 0 < length <= 256 or capacity < length or not (capacity == 15 or 16 <= capacity <= 1048576):
            raise ValueError('Unsupported string layout')
        buffer = address if capacity == 15 else ptr(address)
        value = read(buffer, length)
        if read(address, 32) != header or read(buffer, length) != value: raise ValueError('Cache changed')
        return value.decode('utf-8')
    if read_current_account(read_memory, base) != account: raise ValueError('Account mismatch')
    context = ptr(ptr(base + APP_GLOBAL_RVA) + 0x68)
    if ptr(ptr(context) + 0x38) != base + CACHE_PROVIDER_GETTER_RVA: raise ValueError('Provider mismatch')
    if read(base + CACHE_PROVIDER_GETTER_RVA + 28, 8) != bytes.fromhex('48 83 b9 60 04 00 00 00'): raise ValueError('Getter mismatch')
    provider = ptr(context + 0x460)
    if ptr(provider) != base + CACHE_PROVIDER_VTABLE_RVA: raise ValueError('Provider type mismatch')
    registry = read(provider + 0x90, 16)
    head, count = struct.unpack('<QQ', registry)
    if not 1 <= count <= 512: raise ValueError('Invalid registry count')
    node, visited, cache = ptr(head), set(), None
    for _ in range(count):
        if node == head or node in visited: break
        visited.add(node)
        value = ptr(node + 0x30)
        if value and ptr(value) == base + CONTACT_CACHE_VTABLE_RVA:
            cache = value
            break
        node = ptr(node)
    if not cache: raise ValueError('Contact cache unavailable')
    layout = read(cache + 0xC8, 0x38)
    sentinel, count = struct.unpack_from('<QQ', layout, 8)
    if not 1 <= count <= 100000: raise ValueError('Invalid contact count')
    node, visited, matches = ptr(sentinel), set(), {name: [] for name in NAMES}
    for _ in range(count):
        if node == sentinel or node in visited: raise ValueError('Incomplete cache traversal')
        visited.add(node)
        try:
            wxid = string(node + 0x10)
            contact = ptr(node + 0x30)
            if string(contact + 8) != wxid: raise ValueError('Contact ID changed')
            name = string(contact + 0xD8).strip()
            if name in matches and (wxid.endswith('@chatroom') == (NAMES[name] == 'group')):
                matches[name].append(wxid)
        except (UnicodeError, ValueError):
            pass
        node = ptr(node)
    if node != sentinel or read(cache + 0xC8, 0x38) != layout or read(provider + 0x90, 16) != registry or read_current_account(read_memory, base) != account:
        raise ValueError('Account/cache changed during lookup')
    return {name: ids[0] for name, ids in matches.items() if len(ids) == 1}
