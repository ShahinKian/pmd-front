const loadNative = process.dlopen;

process.dlopen = function (module, filename, ...args) {
  if (String(filename).toLowerCase().includes("sharp")) {
    throw new Error("Sharp native binaries are unavailable in this regression test.");
  }
  return loadNative.call(this, module, filename, ...args);
};
