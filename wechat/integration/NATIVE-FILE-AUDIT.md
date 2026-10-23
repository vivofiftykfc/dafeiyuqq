# Native media file export, 2026-10-23

Pinned Weixin 4.1.15.13 SHA256:
`10f8e995453e2da46d4f2b5080cd6da1f13cc5147746adc119ceae38cb039de5`.

Read-only disk disassembly is in `runtime/file-send-disasm.txt` and
`runtime/file-send-caller.txt`; utility `inspect_file_native.py`.
Caller 0x54a83c0 passes result/receiver/four SmallStrings to 0x2ba9090.
Incoming RCX is unused. Arguments 6 and 7 feed resolver 0x46ecf70 as
filename and directory. With directory/extension empty, resolve a unique
filename into the client's default file cache, convert via 0x9fa70 and
import an approved source using CopyFileW with fail-if-exists.

The callee's existing-file branch constructs a file message through
0x2bab360, sets type 49 / subtype 6 (0x600000031), receiver +0xb0 and
native path +0x120, then dispatches through 0x178f040. URL/hash are empty;
the imported file must already exist. Result has the same 56-byte ABI
as images, bit 0 is native acceptance and +8/+16 contain native IDs.

`file_send.inc` exposes WxSendFile and WxPrepareFile. The latter imports
only and explicitly skips the send call. Startup ran that non-sending
probe successfully in the bound alt account: exception=0, cleanup_code=0,
completion_success=true, native IDs both zero. It does not prove delivery.
No real file send has been exercised by this deployment.

Build: `integration/build-media-files-v5.cmd`; separately pinned DLL
`vendor/helper-source/native/build_media_files_v5/text_bridge.dll`.
Existing text/image task leases, fingerprint, receiver and unload guards
remain in use. Python validates account identity before each operation.

## Subsequent owner-authorized live acceptance

PNG and MP4 were sent to the bound work group. Both obtained server message IDs and matching source MD5 in the bound sending account DB. PNG remains type 49/6; Weixin converts MP4 to native video type 43. The owner confirmed both arrived and opened/played successfully. See runtime/group-file-live-db-verification.json.
