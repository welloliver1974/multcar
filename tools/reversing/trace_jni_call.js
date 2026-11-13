const fs = require('fs');

const buf = fs.readFileSync('unpacked_apk/lib/armeabi-v7a/libobdcore.so');

// Find all calls to sendDataJNI or BleConnector methods in 32-bit armeabi-v7a
// In JNI, calling a Java method:
// (*env)->CallBooleanMethod(env, obj, methodID, ...)
// In Thumb, CallBooleanMethod is at offset in JNINativeInterface struct.
// JNIEnv* is pointer to JNINativeInterface*
// CallBooleanMethod is at function pointer index 38 (0x98) in JNINativeInterface!

console.log('Searching for CallBooleanMethod (offset 0x98 in JNIEnv) in armeabi-v7a...');

// Search for ldr rX, [rY, #0x98] or similar
// In Thumb-2: ldr.w rX, [rY, #0x98] -> 0xd? 0xf8 0x98 0x??
for (let i = 0; i < buf.length - 4; i += 2) {
  const b0 = buf[i];
  const b1 = buf[i+1];
  const b2 = buf[i+2];
  const b3 = buf[i+3];
  if (b1 === 0xf8 && b2 === 0x98) {
    console.log(`Possible JNI CallBooleanMethod at 0x${i.toString(16)}: ${buf.slice(i, i+4).toString('hex')}`);
  }
}
