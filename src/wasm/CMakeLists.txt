cmake_minimum_required(VERSION 3.10)
project(NotionCloneWasm CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

set(SOURCE_FILES
    cpp/bindings.cpp
)

add_executable(notion_clone_wasm ${SOURCE_FILES})

# Emscripten flags
set_target_properties(notion_clone_wasm PROPERTIES
    LINK_FLAGS "--bind -O3 -s WASM=1 -s ALLOW_MEMORY_GROWTH=1 -s MODULARIZE=1 -s EXPORT_NAME='NotionCloneWasm' -s EXPORTED_RUNTIME_METHODS='[\"ccall\", \"cwrap\", \"getValue\", \"setValue\", \"UTF8ToString\", \"stringToUTF8\"]'"
)
