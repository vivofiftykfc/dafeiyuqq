# Native image transport, 2026-10-22

Only Weixin 4.1.15.13, SHA256
`10f8e995453e2da46d4f2b5080cd6da1f13cc5147746adc119ceae38cb039de5`.

Read-only disk disassembly: `inspect_image_native.py`, evidence in
`runtime/image-failure-disasm.txt` and `runtime/image-task-disasm.txt`.
Caller RVA 0x54a6fb0 invokes 0x2ba7a20 with a 56-byte result, receiver and
UTF-8 path SmallStrings. Callee does not read incoming RCX. It creates its
own image message via 0x1d670f0, type 3, and dispatches via 0x178f040.
Result byte 0 bit 0 means native acceptance; +8/+16 hold native IDs;
+24 is an owned error SmallString. This is not a remote delivery receipt.

`media_bridge.cpp` reuses the existing pinned fingerprint, native allocator,
task queue, callback leases and unload guards. No old-version message
vtable offsets are reused. Build with `integration/build-media.cmd`.
Original build_text DLL remains available for rollback; new build_media DLL
is separately hashed in runtime/native-build-sha256.json.

Python checks the bound account before every send. Images are restricted to
reviewed, hash-pinned public meme assets or the destination conversation's
own generated directory. A private generated image is rejected for a group.
Native uncertainty records a receipt and is never automatically retried.
No focus, clipboard, window switching or main-account injection is used.

Commands: ask for a meme; owner can use `画图 场景描述` for local ComfyUI.
Self scenes apply the existing blue whale-girl reference pack.
This change sends images; it does not implement incoming WeChat image
download/decryption. GIF transmission may be displayed as an ordinary
image by the client; native animated-sticker protocol is not implemented.

## Resource import correction

The image argument is a resource key, not an absolute filesystem path.
RVA 0xa0f450 resolves it beneath the active client's HttpResource cache;
0x9fa70 converts the native path to UTF-8. The bridge copies only the
approved source using CopyFileW with fail-if-exists, then submits that key.
The initial absolute-path test returned false with zero message IDs and no
SEH exception. Corrected import returned success=true, completion_success=true, exception=0, cleanup_code=0. The user confirmed actual receipt in the owner DM on 2026-10-22. The bridge state is running on the bound alt account. Group image delivery and generation-to-WeChat delivery have not separately been verified.
