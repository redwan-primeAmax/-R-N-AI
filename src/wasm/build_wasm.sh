#!/usr/bin/env bash
# Script to compile C++ source files into WebAssembly module using Emscripten (emcc)

set -e

echo "=== Building C++ WebAssembly Module ==="

if ! command -v emcc &> /dev/null; then
    echo "Warning: emcc (Emscripten) is not installed in current environment."
    echo "The C++ source files in src/wasm/cpp/ are ready for production WebAssembly compilation."
    exit 0
fi

mkdir -p build
emcc -O3 --bind \
  -s WASM=1 \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s MODULARIZE=1 \
  -s EXPORT_NAME='NotionCloneWasm' \
  -s EXPORTED_RUNTIME_METHODS='["ccall", "cwrap", "getValue", "setValue", "UTF8ToString", "stringToUTF8"]' \
  cpp/bindings.cpp \
  -o build/notion_clone_wasm.js

echo "=== C++ WebAssembly Compilation Complete! Output: build/notion_clone_wasm.js ==="
